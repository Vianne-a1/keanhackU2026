import json
from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState

SYSTEM_PROMPT = """You are PolicyGuard, a company compliance assistant.
Your job is to check whether an employee's request follows company policies.

You will be given:
- The employee's question
- Relevant policy excerpts

Reason step by step:
Step 1: What is the employee trying to do?
Step 2: Which policies are relevant?
Step 3: What does each policy say about this?
Step 4: Are there any conflicts or dependencies between policies?
Step 5: Final verdict.

You MUST respond with ONLY valid JSON in this exact format:
{
  "verdict": "approved" | "needs_approval" | "prohibited" | "red_flag",
  "reasoning": "plain English explanation for the employee",
  "citations": ["Policy name §section", ...],
  "confidence": 0.0 to 1.0
}"""


class PolicyReasoningAgent(BaseAgent):
    name = "PolicyReasoningAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        policy_text = "".join(
            f"\n[{c['source']}]\n{c['text']}\n" for c in state.chunks
        ) or "\nNo specific policy found. Use general compliance judgment.\n"

        user_prompt = f"Employee question: {state.query}\n\nRelevant policy excerpts:{policy_text}"

        content = await self.call_llm(SYSTEM_PROMPT, user_prompt)
        result = json.loads(content)

        state.verdict = result.get("verdict", "needs_approval")
        state.reasoning = result.get("reasoning", "")
        state.citations = result.get("citations", [])
        state.confidence = result.get("confidence", 0.0)
        return state
