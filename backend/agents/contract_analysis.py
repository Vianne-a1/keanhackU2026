import json
from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState

SYSTEM_PROMPT = """You are a contract risk analyst. Analyze the vendor contract text provided and identify:

1. Fraud signals: ghost services, unusual bank account changes, suspicious payment terms
2. Unfair clauses: automatic long-term renewal, no opt-out window, hidden fees, one-sided termination

Reason step by step:
Step 1: Summarize what this contract is about.
Step 2: Identify any fraud signals.
Step 3: Identify any unfair or predatory clauses.
Step 4: Overall risk verdict.

Respond with ONLY valid JSON:
{
  "verdict": "approved" | "needs_approval" | "red_flag",
  "reasoning": "plain English summary for the employee",
  "red_flags": ["specific issue 1", "specific issue 2"],
  "citations": ["Section X — description", ...],
  "confidence": 0.0 to 1.0
}

If no issues are found, set verdict to "approved" and red_flags to [].
"""


class ContractAnalysisAgent(BaseAgent):
    name = "ContractAnalysisAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        contract_text = state.query  # pipeline_state reuses query field for contract text

        # truncate to avoid token limits
        if len(contract_text) > 6000:
            contract_text = contract_text[:6000] + "\n...[truncated]"

        user_prompt = f"Analyze this vendor contract:\n\n{contract_text}"
        content = await self.call_llm(SYSTEM_PROMPT, user_prompt)
        result = json.loads(content)

        state.verdict = result.get("verdict", "needs_approval")
        state.reasoning = result.get("reasoning", "")
        state.citations = result.get("citations", []) + [
            f"⚠ {flag}" for flag in result.get("red_flags", [])
        ]
        state.confidence = result.get("confidence", 0.0)
        return state
