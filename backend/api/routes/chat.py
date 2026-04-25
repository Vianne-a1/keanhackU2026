from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from agents.pipeline import run_pipeline
from core.auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    query: str


@router.post("/chat")
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    try:
        return await run_pipeline(req.query, user["company_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
