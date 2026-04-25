from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from audit_service import run_contract_audit

router = APIRouter(
    prefix="/api/contracts",
    tags=["Contract Fraud/Fairness Audit"]
)


class ContractAuditRequest(BaseModel):
    contract_text: str


@router.post("/audit-text")
def audit_contract_text(request: ContractAuditRequest):
    contract_text = request.contract_text.strip()

    if not contract_text:
        raise HTTPException(
            status_code=400,
            detail="contract_text cannot be empty"
        )

    result = run_contract_audit(contract_text)
    return result