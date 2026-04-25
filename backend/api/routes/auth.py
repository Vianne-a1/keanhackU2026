from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from db import mongo
from core.auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter()


class OrgRegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    company_name: str


class UserRegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    company_name: str  # company to register under


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/auth/register/org")
def register_org(req: OrgRegisterRequest):
    db_users = mongo.users()
    db_companies = mongo.companies()

    if db_users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    if db_companies.find_one({"name": req.company_name}):
        raise HTTPException(status_code=400, detail="Company name already exists")

    company_id = str(db_companies.insert_one({
        "name": req.company_name,
    }).inserted_id)

    user_id = str(db_users.insert_one({
        "email": req.email,
        "username": req.username,
        "password": hash_password(req.password),
        "role": "org",
        "company_id": company_id,
    }).inserted_id)

    token = create_token(user_id, req.email, "org", company_id)
    return {"token": token, "role": "org", "company_id": company_id}


@router.post("/auth/register/user")
def register_user(req: UserRegisterRequest):
    db_users = mongo.users()
    db_companies = mongo.companies()

    if db_users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    company = db_companies.find_one({"name": req.company_name})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company_id = str(company["_id"])

    db_users.insert_one({
        "email": req.email,
        "username": req.username,
        "password": hash_password(req.password),
        "role": "employee",
        "status": "pending",
        "company_id": company_id,
    })

    return {"message": "Registration submitted. Waiting for admin approval.", "company_name": req.company_name}


@router.get("/pending-users")
def get_pending_users(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("org", "admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    pending = list(mongo.users().find(
        {"company_id": user["company_id"], "status": "pending"},
        {"password": 0}
    ))
    for u in pending:
        u["_id"] = str(u["_id"])
    return pending


@router.post("/users/{user_id}/approve")
def approve_user(user_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("org", "admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    result = mongo.users().update_one(
        {"_id": ObjectId(user_id), "company_id": user["company_id"]},
        {"$set": {"status": "approved"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User approved"}


@router.post("/users/{user_id}/deny")
def deny_user(user_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("org", "admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    result = mongo.users().update_one(
        {"_id": ObjectId(user_id), "company_id": user["company_id"]},
        {"$set": {"status": "denied"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User denied"}


@router.get("/company")
def get_company(user: dict = Depends(get_current_user)):
    company = mongo.companies().find_one({"_id": ObjectId(user["company_id"])})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    member_count = mongo.users().count_documents({"company_id": user["company_id"], "status": {"$ne": "pending"}})
    return {
        "id": str(company["_id"]),
        "name": company.get("name", ""),
        "member_count": member_count,
        "role": user.get("role"),
    }


@router.post("/auth/login")
def login(req: LoginRequest):
    db_users = mongo.users()
    user = db_users.find_one({"email": req.email})

    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("status") == "pending":
        raise HTTPException(status_code=403, detail="Your account is pending admin approval.")

    if user.get("status") == "denied":
        raise HTTPException(status_code=403, detail="Your access request was denied.")

    user_id = str(user["_id"])
    company_id = user["company_id"]
    role = user["role"]

    token = create_token(user_id, req.email, role, company_id)
    return {"token": token, "role": role, "company_id": company_id}
