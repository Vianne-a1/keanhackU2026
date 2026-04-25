import json
from core.base_agent import BaseAgent
from core.pipeline_state import PipelineState

SYSTEM_PROMPT = """You are PolicyGuard, a company compliance assistant.
Your job is to check whether an employee's request follows company policies.

You will be given:
- The employee's question and intent
- Relevant policy excerpts (if any)

Reason step by step:
Step 1: What is the employee trying to do?
Step 2: Which policies are relevant?
Step 3: What does each policy say about this?
Step 4: Are there any conflicts or dependencies between policies?
Step 5: Final verdict.

Choose the verdict that best fits:
- "approved"        — clearly allowed by policy, no further action needed
- "needs_approval"  — allowed but requires manager or admin sign-off first
- "conditional"     — allowed only if specific conditions are met (state them in reasoning)
- "escalate"        — must be reviewed by Legal, HR, or executive before proceeding
- "prohibited"      — explicitly not allowed by policy
- "red_flag"        — serious compliance or fraud risk detected
- "out_of_scope"    — question is not a policy matter or no relevant policy exists

You MUST respond with ONLY valid JSON:
{
  "verdict": "approved" | "needs_approval" | "conditional" | "escalate" | "prohibited" | "red_flag" | "out_of_scope",
  "reasoning": "plain English explanation for the employee",
  "citations": ["Policy name §section", ...],
  "confidence": 0.0 to 1.0
}"""


class PolicyReasoningAgent(BaseAgent):
    name = "PolicyReasoningAgent"

    async def run(self, state: PipelineState) -> PipelineState:
        if not state.chunks:
            policy_text = "\nNo relevant policy found for this question.\n"
        else:
            policy_text = "".join(
                f"\n[{c['source']}]\n{c['text']}\n" for c in state.chunks
            )

        intent_line = f"Intent: {state.intent}\n" if state.intent else ""
        user_prompt = (
            f"Employee question: {state.query}\n"
            f"{intent_line}"
            f"\nRelevant policy excerpts:{policy_text}"
        )

        try:
            content = await self.call_llm(SYSTEM_PROMPT, user_prompt)
            result = json.loads(content)
            state.verdict = result.get("verdict", "out_of_scope")
            state.reasoning = result.get("reasoning", "")
            state.citations = result.get("citations", [])
            state.confidence = result.get("confidence", 0.0)
        except Exception as e:
            state.error = f"[PolicyReasoningAgent] Failed to parse response: {e}"

        return state
