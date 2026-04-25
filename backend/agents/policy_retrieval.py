import json
from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState
from db import mongo

SYSTEM_PROMPT = """You are a policy retrieval assistant.
Given an employee's question and intent, and a list of numbered policy excerpts, return the indices of the excerpts most relevant to answering the question.

Respond with ONLY valid JSON:
{"relevant": [0, 2, 5]}

Return at most 5 indices. Return an empty list if nothing is relevant."""


class PolicyRetrievalAgent(BaseAgent):
    name = "PolicyRetrievalAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        all_chunks = list(mongo.policy_chunks().find(
            {"company_id": state.company_id},
            {"text": 1, "title": 1}
        ).limit(80))

        if not all_chunks:
            state.chunks = []
            return state

        chunk_list = "\n\n".join(
            f"[{i}] ({c['title']})\n{c['text'][:400]}"
            for i, c in enumerate(all_chunks)
        )

        intent_line = f"Intent: {state.intent}\n" if state.intent else ""
        user_prompt = (
            f"Employee question: {state.query}\n"
            f"{intent_line}"
            f"Search topic: {state.search_query}\n\n"
            f"Policy excerpts:\n{chunk_list}"
        )

        try:
            content = await self.call_llm(SYSTEM_PROMPT, user_prompt)
            result = json.loads(content)
            indices = result.get("relevant", [])
            state.chunks = [
                {"source": all_chunks[i]["title"], "text": all_chunks[i]["text"]}
                for i in indices
                if isinstance(i, int) and i < len(all_chunks)
            ]
        except Exception:
            state.chunks = [
                {"source": c["title"], "text": c["text"]}
                for c in all_chunks[:4]
            ]

        return state
