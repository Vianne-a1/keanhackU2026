from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from core.pipeline_state import PipelineState
from agents.contract_analysis import ContractAnalysisAgent
from services.document_parser import parse_document
from core.auth import get_current_user
from db import mongo
from datetime import datetime, timezone

router = APIRouter()

agent = ContractAnalysisAgent()


@router.post("/upload-contract")
async def upload_contract(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if not file.filename.endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported.")

    try:
        file_bytes = await file.read()
        contract_text = parse_document(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if not contract_text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from the file.")

    state = PipelineState(query=contract_text, company_id=user.get("company_id", "default"))

    try:
        state = await agent.run(state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    mongo.audit_logs().insert_one({
        "user_id": user["sub"],
        "contract_filename": file.filename,
        "verdict": state.verdict,
        "reasoning": state.reasoning,
        "timestamp": datetime.now(timezone.utc)
    })

    return {
        "verdict": state.verdict,
        "reasoning": state.reasoning,
        "citations": state.citations,
        "confidence": state.confidence,
    }
