from fastapi import APIRouter, HTTPException

from database import audits_collection


router = APIRouter(prefix="/api/audits", tags=["Feature 2 - Audit History"])


@router.get("/user/{user_id}")
def get_audits_by_user(user_id: str):
    audits = list(audits_collection.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1))
    return {"user_id": user_id, "total": len(audits), "audits": audits}


@router.get("/{audit_id}")
def get_audit_by_id(audit_id: str):
    audit = audits_collection.find_one({"audit_id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit
