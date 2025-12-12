import os
import json
import time
from typing import TypedDict, Optional, List, Dict, Any
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Import Tools
from .tools.sql_search import run_sql_check, run_sql_stats, run_rag_search, query_db_for_name_direct, get_restaurant_suggestions
from .tools.web_search import run_web_check
from .tools.youtube_search import search_youtube_reviews

load_dotenv()
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.environ.get("GROQ_API_KEY"))

# ---------------------------------------------------------
# 1. DEFINE STATE (With History)
# ---------------------------------------------------------
class AgentState(TypedDict):
    query: str
    chat_history: List[dict] # <--- NEW: Contextual Memory
    intent: str
    sql_data: Optional[str]
    rag_data: Optional[str]
    web_data: Optional[str]
    youtube_data: Optional[str]
    coordinates: Optional[Dict[str, float]]
    discovery_data: Optional[List[str]]
    final_response: str

# ---------------------------------------------------------
# 2. DEFINE NODES
# ---------------------------------------------------------

def node_router(state: AgentState):
    print(f"--- ROUTER: Analyzing '{state['query']}' ---")
    prompt = f"""
    Classify query intent:
    1. "SPECIFIC": Specific restaurant by name.
    2. "STATS": List/Top X/Best of.
    3. "DISCOVERY": Dish/General recommendation.
    
    Query: "{state['query']}"
    Output ONLY one word: SPECIFIC, STATS, or DISCOVERY.
    """
    try:
        intent = llm.invoke([HumanMessage(content=prompt)]).content.strip().upper()
    except:
        intent = "DISCOVERY"
    print(f"🧠 Intent: {intent}")
    return {"intent": intent}

def node_specific(state: AgentState):
    query = state['query']
    url, sql, coords = run_sql_check(query)
    rag = run_rag_search(query)
    web = run_web_check(query)
    yt = search_youtube_reviews(query)
    return {"sql_data": sql, "coordinates": coords, "rag_data": rag, "web_data": web, "youtube_data": yt}

def node_discovery(state: AgentState):
    query = state['query']
    web = run_web_check(query)
    # Extract names
    extraction = llm.invoke([HumanMessage(content=f"Extract top 2 restaurant names from text as JSON list: {web}")]).content
    try: names = json.loads(extraction.replace("```json","").replace("```","").strip())
    except: names = []
    
    enriched = []
    coords = None
    for name in names:
        found = query_db_for_name_direct(name)
        if found:
            enriched.append(found)
            if not coords: _, _, coords = run_sql_check(name)
                
    yt = search_youtube_reviews(query)
    return {"web_data": web, "discovery_data": enriched, "coordinates": coords, "youtube_data": yt}

def node_stats(state: AgentState):
    stats = run_sql_stats(state['query'])
    return {"sql_data": stats}

def node_synthesize(state: AgentState):
    intent = state['intent']
    history = state.get('chat_history', [])
    
    # Format History
    history_str = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history[-5:]])
    
    data_summary = {
        "sql": state.get('sql_data'),
        "web": state.get('web_data'),
        "rag": state.get('rag_data'),
        "discovery": state.get('discovery_data'),
        "youtube": state.get('youtube_data')
    }
    
    system_prompt = f"""
    You are 'Munchy Mumbai'. Answer based on Intent: {intent}
    
    PREVIOUS CONVERSATION:
    {history_str}
    
    COLLECTED DATA: {str(data_summary)}
    
    RULES:
    - Use PREVIOUS CONVERSATION to resolve context (e.g. "Where is it?" refers to last place).
    - SPECIFIC: Verdict, Vibe, Data.
    - DISCOVERY: Recommend places found.
    - STATS: List clearly. End with "Which one would you like to know more about?"
    """
    
    response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=state['query'])]).content
    return {"final_response": response}

# ---------------------------------------------------------
# 3. BUILD GRAPH
# ---------------------------------------------------------
workflow = StateGraph(AgentState)
workflow.add_node("router", node_router)
workflow.add_node("specific_agent", node_specific)
workflow.add_node("discovery_agent", node_discovery)
workflow.add_node("stats_agent", node_stats)
workflow.add_node("synthesizer", node_synthesize)

workflow.set_entry_point("router")
def route_decision(state): return state['intent'].lower() + "_agent"
workflow.add_conditional_edges("router", route_decision, {"specific_agent": "specific_agent", "discovery_agent": "discovery_agent", "stats_agent": "stats_agent"})
workflow.add_edge("specific_agent", "synthesizer")
workflow.add_edge("discovery_agent", "synthesizer")
workflow.add_edge("stats_agent", "synthesizer")
workflow.add_edge("synthesizer", END)
app_graph = workflow.compile()

# ---------------------------------------------------------
# 4. EXPORTS
# ---------------------------------------------------------

async def process_user_query(user_query: str, session_id: str, chat_history: List[dict]):
    """Main Agent Entry Point"""
    start_time = time.time()
    inputs = {"query": user_query, "chat_history": chat_history}
    
    final_state = await app_graph.ainvoke(inputs)
    latency = round(time.time() - start_time, 2)
    
    return {
        "response": final_state['final_response'],
        "intent": final_state.get('intent', 'UNKNOWN'),
        "metrics": {"latency": latency},
        "sql": final_state.get('sql_data'),
        "web": final_state.get('web_data'),
        "youtube": final_state.get('youtube_data'),
        "coordinates": final_state.get('coordinates'),
        "discovery": final_state.get('discovery_data')
    }

def get_suggestions(query: str):
    """Simple wrapper for the tool function"""
    return get_restaurant_suggestions(query)