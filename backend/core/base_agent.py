import httpx
from abc import ABC, abstractmethod
from core.config import GEMINI_API_KEY, LLM_MODEL
from core.pipeline_state import PipelineState


class BaseAgent(ABC):
    name: str = "BaseAgent"

    async def call_llm(self, system: str, user: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models"
            f"/{LLM_MODEL}:generateContent?key={GEMINI_API_KEY}"
        )
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "system_instruction": {"parts": [{"text": system}]},
                    "contents": [{"role": "user", "parts": [{"text": user}]}],
                    "generationConfig": {"responseMimeType": "application/json"},
                },
            )

        data = response.json()
        if "error" in data:
            raise RuntimeError(f"[{self.name}] LLM error: {data['error']['message']}")

        candidates = data.get("candidates", [])
        if not candidates or "content" not in candidates[0]:
            raise RuntimeError(f"[{self.name}] Gemini returned no content. Full response: {data}")

        content = candidates[0]["content"]["parts"][0]["text"].strip()

        return content

    @abstractmethod
    async def run(self, state: PipelineState) -> PipelineState:
        pass
