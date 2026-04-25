from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from db import mongo
from core.auth import get_current_user, require_upload_permission
from services.document_parser import parse_document

router = APIRouter()

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def chunk_text(text: str) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + CHUNK_SIZE])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c for c in chunks if c.strip()]


@router.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    user: dict = Depends(require_upload_permission),
):
    if not file.filename.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    file_bytes = await file.read()
    try:
        text = parse_document(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from the file.")

    company_id = user["company_id"]
    title = file.filename.rsplit(".", 1)[0]

    doc_id = str(mongo.policy_documents().insert_one({
        "company_id": company_id,
        "title": title,
        "filename": file.filename,
        "uploaded_by": user["sub"],
        "uploaded_at": datetime.now(timezone.utc),
    }).inserted_id)

    chunks = chunk_text(text)
    mongo.policy_chunks().insert_many([
        {
            "company_id": company_id,
            "doc_id": doc_id,
            "title": title,
            "text": chunk,
            "chunk_index": i,
        }
        for i, chunk in enumerate(chunks)
    ])

    return {"message": f"Uploaded and indexed {len(chunks)} chunks.", "doc_id": doc_id}


@router.get("/policies")
def list_policies(user: dict = Depends(get_current_user)):
    docs = mongo.policy_documents().find(
        {"company_id": user["company_id"]},
        {"_id": 1, "title": 1, "filename": 1, "uploaded_at": 1}
    )
    return [
        {**d, "_id": str(d["_id"])}
        for d in docs
    ]


@router.delete("/policies/{doc_id}")
def delete_policy(doc_id: str, user: dict = Depends(require_upload_permission)):
    doc = mongo.policy_documents().find_one({"_id": ObjectId(doc_id), "company_id": user["company_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    mongo.policy_documents().delete_one({"_id": ObjectId(doc_id)})
    mongo.policy_chunks().delete_many({"doc_id": doc_id})
    return {"message": "Document deleted"}
