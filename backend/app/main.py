from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from .agent_logic import process_user_query, get_suggestions

app = FastAPI(title="Munchy Mumbai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Model now includes history
class ChatMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    session_id: str = "default"
    chat_history: List[ChatMessage] = [] # Client sends this

@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    try:
        # Convert Pydantic models to list of dicts for LangGraph
        history_dicts = [{"role": m.role, "content": m.content} for m in request.chat_history]
        
        # Pass history to agent
        result = await process_user_query(request.query, request.session_id, history_dicts)
        return result

    except Exception as e:
        print(f"SERVER ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggest")
async def suggest(request: QueryRequest):
    return get_suggestions(request.query)

@app.get("/health")
async def health():
    return {"status": "ok"}