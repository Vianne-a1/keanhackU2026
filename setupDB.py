from pymongo import MongoClient
import datetime
import uuid

class MongoDBManager:
    def __init__(self, uri="mongodb://localhost:27017/"):
        self.client = MongoClient(uri)
        self.db = self.client['PolicyWiseDB']
        
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
#xxxxx