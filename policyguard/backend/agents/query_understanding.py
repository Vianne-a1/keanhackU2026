from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState

DOMAIN_KEYWORDS = {
    "procurement": ["buy", "purchase", "subscription", "software", "tool", "license", "pay", "card", "spend", "cost", "price", "invoice"],
    "it_security": ["install", "access", "account", "password", "device", "laptop", "cloud", "saas", "api", "vpn", "admin"],
    "data_sharing": ["share", "send", "export", "customer data", "personal data", "third party", "vendor data", "upload", "transfer"],
    "travel": ["travel", "flight", "hotel", "trip", "conference", "book", "reimburse", "expense"],
    "hr": ["hire", "fire", "leave", "vacation", "sick", "remote", "wfh", "work from home", "raise", "promotion"],
    "legal": ["contract", "sign", "agreement", "nda", "clause", "legal", "lawyer", "liability"],
}


class QueryUnderstandingAgent(BaseAgent):
    name = "QueryUnderstandingAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        q = state.query.lower()
        detected = [domain for domain, keywords in DOMAIN_KEYWORDS.items()
                    if any(kw in q for kw in keywords)]

        state.domains = detected if detected else list(DOMAIN_KEYWORDS.keys())
        return state
