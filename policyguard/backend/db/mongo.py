from pymongo import MongoClient, TEXT
from core.config import MONGO_URI

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        if not MONGO_URI:
            raise RuntimeError("MONGO_URI is not set in .env")
        _client = MongoClient(MONGO_URI)
        _db = _client["policyguard"]
        _ensure_indexes(_db)
    return _db


def _ensure_indexes(db):
    db["users"].create_index("email", unique=True)
    db["companies"].create_index("name", unique=True)
    db["policy_chunks"].create_index([("text", TEXT)])
    db["policy_chunks"].create_index("company_id")
    db["policy_documents"].create_index("company_id")


def users():
    return get_db()["users"]


def companies():
    return get_db()["companies"]


def policy_documents():
    return get_db()["policy_documents"]


def policy_chunks():
    return get_db()["policy_chunks"]
