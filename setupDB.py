from pymongo import MongoClient
from pymongo.errors import OperationFailure
import datetime
import uuid
import os


def load_local_env(env_path=".env"):
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_local_env()

class MongoDBManager:
    def __init__(self, uri=None):
        uri = uri or os.getenv("MONGODB_URI")
        if not uri:
            raise ValueError(
                "Missing MongoDB URI. Set MONGODB_URI before running setupDB.py."
            )

        self.client = MongoClient(uri)
        # Fail early with a clear message if Atlas credentials are invalid.
        try:
            self.client.admin.command("ping")
        except OperationFailure as exc:
            raise RuntimeError(
                "MongoDB authentication failed. Verify username/password in MONGODB_URI "
                "and confirm your Atlas DB user permissions."
            ) from exc

        self.db = self.client['DB']
        
        # Collections
        self.orgs = self.db['organizations']
        self.users = self.db['users']
        self.docs = self.db['documents']
        
        # Create Indexes (Important for performance/uniqueness)
        self.users.create_index("email", unique=True)
        self.docs.create_index("org_id")

    def create_org(self, name):
        org_data = {
            "_id": str(uuid.uuid4()),
            "name": name,
            "created_at": datetime.datetime.utcnow()
        }
        return self.orgs.insert_one(org_data).inserted_id

    def create_user(self, org_id, name, email, role="User"):
        user_data = {
            "_id": str(uuid.uuid4()),
            "org_id": org_id,
            "name": name,
            "email": email,
            "role": role
        }
        return self.users.insert_one(user_data).inserted_id

# Initialize
db_manager = MongoDBManager()
print("MongoDB Collections and Indexes Initialized.")
