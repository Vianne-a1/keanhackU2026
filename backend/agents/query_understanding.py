import json
from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState

SYSTEM_PROMPT = """You are a compliance query analyzer. Given an employee's question, identify:
1. The policy domains involved (e.g. procurement, travel, hr, legal, data_sharing, it_security, finance, operations)
2. A concise search phrase capturing the core policy topic
3. What the employee is actually trying to do

Respond with ONLY valid JSON:
{
  "domains": ["domain1", "domain2"],
  "search_query": "concise phrase capturing the core policy topic",
  "intent": "one sentence: what the employee is actually trying to do"
}"""


class QueryUnderstandingAgent(BaseAgent):
    name = "QueryUnderstandingAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        try:
            content = await self.call_llm(SYSTEM_PROMPT, f"Employee question: {state.query}")
            result = json.loads(content)
            state.domains = result.get("domains", [])
            state.search_query = result.get("search_query", state.query)
            state.intent = result.get("intent", "")
        except Exception as e:
            state.domains = []
            state.search_query = state.query
            state.intent = ""
        return state
