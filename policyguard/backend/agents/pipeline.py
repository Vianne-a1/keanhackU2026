from core.pipeline_state import PipelineState
from agents.query_understanding import QueryUnderstandingAgent
from agents.policy_retrieval import PolicyRetrievalAgent
from agents.policy_reasoning import PolicyReasoningAgent

# TODO: from db.mongo import save_chat_history

AGENTS = [
    QueryUnderstandingAgent(),
    PolicyRetrievalAgent(),
    PolicyReasoningAgent(),
]


async def run_pipeline(query: str, company_id: str) -> dict:
    state = PipelineState(query=query, company_id=company_id)

    for agent in AGENTS:
        state = await agent.run(state)
        if state.error:
            break

    # TODO: await save_chat_history(state)

    return {
        "verdict": state.verdict,
        "reasoning": state.reasoning,
        "citations": state.citations,
        "confidence": state.confidence,
        "domains_checked": state.domains,
    }
