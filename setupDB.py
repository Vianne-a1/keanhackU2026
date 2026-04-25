import os
from pymongo import MongoClient
import datetime
from core.config import MONGO_URI

class MongoDBManager:
    def __init__(self, uri=None):
        if not uri:
            uri = MONGO_URI
        if not uri:
            raise RuntimeError("MONGO_URI is not set in .env")
            
        self.client = MongoClient(uri)
        self.db = self.client['policyguard']
        
        # Unify Collections
        self.companies = self.db['companies']
        self.users = self.db['users']
        self.policy_documents = self.db['policy_documents']
        self.audit_logs = self.db['audit_logs']
        
        # Create Indexes (Important for performance/uniqueness)
        self.users.create_index("email", unique=True)
        self.companies.create_index("name", unique=True)
        self.policy_documents.create_index("company_id")
        self.audit_logs.create_index("user_id")

    def create_company(self, name):
        company_data = {
            "name": name,
        }
        return self.companies.insert_one(company_data).inserted_id

    def create_user(self, company_id, email, password_hash, role="employee"):
        user_data = {
            "company_id": str(company_id),
            "email": email,
            "password": password_hash,
            "role": role
        }
        return self.users.insert_one(user_data).inserted_id

if __name__ == "__main__":
    db_manager = MongoDBManager()
    print("MongoDB Collections and Indexes Initialized strictly according to schema.")