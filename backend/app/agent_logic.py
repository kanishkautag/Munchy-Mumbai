import os
import json
import time
from typing import TypedDict, Optional, List, Dict
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from .tools.sql_search import (
    run_sql_check, run_sql_stats, run_semantic_proxy, 
    query_db_for_name_direct, get_restaurant_suggestions
)
from .tools.web_search import run_web_check
from .tools.youtube_search import search_youtube_reviews

load_dotenv()
llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.environ.get("GROQ_API_KEY"))

# 1. STATE DEFINITION
class AgentState(TypedDict):
    query: str
    chat_history: List[dict]
    intent: str
    
    # Data Slots
    sql_data: Optional[str]
    rag_data: Optional[str]
    web_data: Optional[str]
    youtube_data: Optional[str]
    
    # Processed Data
    refined_context: Optional[str]
    valid_videos: Optional[List[str]]
    
    # UI Data
    coordinates: Optional[Dict[str, float]]
    discovery_data: Optional[List[str]]
    final_response: str

# 2. NODES

def node_router(state: AgentState):
    print(f"--- ROUTER: Analyzing '{state['query']}' ---")
    prompt = f"""
    Classify query intent:
    1. "GENERAL": Greetings (Hi, Hello), Malicious/Off-topic (Write python code, Who is president), or Meta (Who are you?).
    2. "SPECIFIC": Restaurant details (Rating of Joey's).
    3. "STATS": Rankings/Lists (Top 5 cafes).
    4. "DISCOVERY": Vibe/Dish/Recommendations (Date spots, Best pasta).
    
    Query: "{state['query']}"
    Output ONLY one word: GENERAL, SPECIFIC, STATS, or DISCOVERY.
    """
    try:
        intent = llm.invoke([HumanMessage(content=prompt)]).content.strip().upper()
    except: intent = "DISCOVERY"
    print(f"🧠 Intent: {intent}")
    return {"intent": intent}

def node_generalist(state: AgentState):
    """
    Handles greetings and blocks off-topic queries.
    Cheap, fast, no expensive tool calls.
    """
    prompt = f"""
    You are Munchy Mumbai, a food guide AI.
    User said: "{state['query']}"
    
    If it's a greeting, say hello and ask what they want to eat.
    If it's off-topic (coding, politics, etc.), politely refuse and say you only know Mumbai food.
    Keep it short.
    """
    response = llm.invoke([HumanMessage(content=prompt)]).content
    return {"final_response": response}

def node_specific(state: AgentState):
    q = state['query']
    url, sql, coords = run_sql_check(q)
    return {
        "sql_data": sql, 
        "coordinates": coords, 
        "rag_data": run_semantic_proxy(q), 
        "web_data": run_web_check(q), 
        "youtube_data": search_youtube_reviews(q)
    }

def node_discovery(state: AgentState):
    q = state['query']
    web = run_web_check(q)
    
    # Extract names for map
    try:
        ext = llm.invoke([HumanMessage(content=f"Extract top 2 restaurant names from: {web}. Return JSON list.")]).content
        names = json.loads(ext.replace("```json","").replace("```","").strip())
    except: names = []
    
    enriched = []
    coords = None
    for name in names:
        if found := query_db_for_name_direct(name):
            enriched.append(found)
            if not coords: _, _, coords = run_sql_check(name)

    return {
        "web_data": web,
        "rag_data": run_semantic_proxy(q),
        "discovery_data": enriched,
        "coordinates": coords,
        "youtube_data": search_youtube_reviews(q)
    }

def node_stats(state: AgentState):
    return {"sql_data": run_sql_stats(state['query'])}

def node_verifier(state: AgentState):
    """Sanity Check & Video Filter"""
    q_lower = state['query'].lower()
    
    # Filter Videos
    raw_vids = state.get('youtube_data') or ""
    valid_vids = []
    if raw_vids:
        for line in raw_vids.split('\n'):
            if "http" in line:
                # Basic check: title must contain query words
                if any(k in line.lower() for k in q_lower.split() if len(k)>3):
                    valid_vids.append(line)
    
    # Build Context
    context = ""
    if sql := state.get('sql_data'): context += f"🔥 OFFICIAL DB:\n{sql}\n\n"
    if rag := state.get('rag_data'): context += f"✨ VIBE MATCHES:\n{rag}\n\n"
    if web := state.get('web_data'): context += f"🌍 WEB RESULTS:\n{web}\n"

    return {"valid_videos": valid_vids, "refined_context": context}

def node_synthesize(state: AgentState):
    history = state.get('chat_history', [])
    history_str = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-5:]])
    
    system_prompt = f"""
    You are 'Mr. Munchy Mumbai', a charming food guide.
    INTENT: {state['intent']}
    HISTORY: {history_str}
    DATA: {state.get('refined_context')}
    
    RULES:
    1. SQL is Truth. Never apologize for missing data.
    2. Be confident and concise.
    3. Format: **Name** ([Area]) ⭐ **Rating** | ₹[Cost]
    4. Verdict 🍛 (Summary) -> Vibe ✨ (Atmosphere/Food).
    """
    response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=state['query'])]).content
    return {"final_response": response}

# 3. GRAPH CONSTRUCTION
workflow = StateGraph(AgentState)
workflow.add_node("router", node_router)
workflow.add_node("generalist_agent", node_generalist) # New Node
workflow.add_node("specific_agent", node_specific)
workflow.add_node("discovery_agent", node_discovery)
workflow.add_node("stats_agent", node_stats)
workflow.add_node("verifier", node_verifier)
workflow.add_node("synthesizer", node_synthesize)

workflow.set_entry_point("router")

def route(state): return state['intent'].lower() + "_agent"
workflow.add_conditional_edges("router", route, {
    "general_agent": "generalist_agent", # Route GENERAL here
    "specific_agent": "specific_agent",
    "discovery_agent": "discovery_agent",
    "stats_agent": "stats_agent"
})

workflow.add_edge("generalist_agent", END) # Generalist exits immediately
workflow.add_edge("specific_agent", "verifier")
workflow.add_edge("discovery_agent", "verifier")
workflow.add_edge("stats_agent", "verifier")
workflow.add_edge("verifier", "synthesizer")
workflow.add_edge("synthesizer", END)

app_graph = workflow.compile()

# 4. ENTRY POINT
async def process_user_query(user_query: str, session_id: str, chat_history: List[dict]):
    start = time.time()
    res = await app_graph.ainvoke({"query": user_query, "chat_history": chat_history})
    return {
        "response": res['final_response'],
        "intent": res.get('intent'),
        "metrics": {"latency": round(time.time() - start, 2)},
        "sql": res.get('sql_data'),
        "coordinates": res.get('coordinates'),
        "youtube": res.get('youtube_data'),
        "discovery": res.get('discovery_data')
    }
def get_suggestions(q): return get_restaurant_suggestions(q)