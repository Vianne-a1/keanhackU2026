import os
from pymongo import MongoClient

# Use an environment variable when deploying:
#   MONGODB_URI="your-mongodb-uri"
# The fallback below keeps the existing shared test database behavior.
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://KeanHackU2026:KHU26@cluster0.afqfzif.mongodb.net/?appName=Cluster0",
)

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)

db = client["contract_audit_db"]

contracts_collection = db["contracts"]
audits_collection = db["audits"]
