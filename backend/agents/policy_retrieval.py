from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState
from db import mongo


class PolicyRetrievalAgent(BaseAgent):
    name = "PolicyRetrievalAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        try:
            results = mongo.policy_chunks().find(
                {
                    "company_id": state.company_id,
                    "$text": {"$search": state.query},
                },
                {"score": {"$meta": "textScore"}, "text": 1, "title": 1}
            ).sort([("score", {"$meta": "textScore"})]).limit(4)

            state.chunks = [
                {"source": r["title"], "text": r["text"]}
                for r in results
            ]
        except Exception:
            # fallback: return all chunks for this company (no query match)
            results = mongo.policy_chunks().find(
                {"company_id": state.company_id},
                {"text": 1, "title": 1}
            ).limit(4)
            state.chunks = [
                {"source": r["title"], "text": r["text"]}
                for r in results
            ]

        return state
