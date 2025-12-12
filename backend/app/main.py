from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

# Import Logic
from .agent_logic import process_user_query
# Direct import from tools is more reliable for the suggest endpoint
from .tools.sql_search import get_restaurant_suggestions

app = FastAPI(title="ChaatGPT Production API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MEMORY STORE ---
chat_histories = {}

class QueryRequest(BaseModel):
    query: str
    session_id: str = "default"

@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    try:
        session_id = request.session_id
        user_query = request.query
        
        # 1. Retrieve History
        if session_id not in chat_histories:
            chat_histories[session_id] = []
        current_history = chat_histories[session_id][-6:]
        
        # 2. Call Agent
        result = await process_user_query(user_query, session_id, current_history)
        
        # 3. Update History
        chat_histories[session_id].append({"role": "user", "content": user_query})
        chat_histories[session_id].append({"role": "assistant", "content": result["response"]})
        
        return result

    except Exception as e:
        print(f"SERVER ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Munchy Mumbai API", "version": "1.0"}

# --- THIS WAS MISSING, CAUSING THE 404 ---
@app.post("/suggest")
async def suggest(request: QueryRequest):
    """
    Returns restaurant suggestions + Coordinates for the Map.
    """
    try:
        # This function (from sql_search.py) returns:
        # [{ "name": "...", "area": "...", "coordinates": {lat, lng} }]
        return get_restaurant_suggestions(request.query)
    except Exception as e:
        print(f"SUGGEST ERROR: {e}")
        return []