from dataclasses import dataclass, field


@dataclass
class PipelineState:
    query: str
    company_id: str

    # filled by QueryUnderstandingAgent
    domains: list[str] = field(default_factory=list)

    # filled by PolicyRetrievalAgent
    chunks: list[dict] = field(default_factory=list)

    # filled by PolicyReasoningAgent
    verdict: str = ""
    reasoning: str = ""
    citations: list[str] = field(default_factory=list)
    confidence: float = 0.0

    error: str = ""
