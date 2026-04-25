import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from core.config import JWT_SECRET

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer()

ROLES_WITH_UPLOAD = {"org", "admin"}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str, email: str, role: str, company_id: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "company_id": company_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    return decode_token(credentials.credentials)


def require_upload_permission(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ROLES_WITH_UPLOAD:
        raise HTTPException(status_code=403, detail="Upload permission required (admin or org account)")
    return user
