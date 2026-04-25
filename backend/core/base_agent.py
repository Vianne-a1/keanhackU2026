import re
import httpx
from abc import ABC, abstractmethod
from core.config import OPENROUTER_API_KEY, LLM_MODEL
from core.pipeline_state import PipelineState


class BaseAgent(ABC):
    name: str = "BaseAgent"

    async def call_llm(self, system: str, user: str) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )

        data = response.json()
        if "error" in data:
            raise RuntimeError(f"[{self.name}] LLM error: {data['error']['message']}")

        content = data["choices"][0]["message"]["content"].strip()

        # extract JSON block if wrapped in markdown fences
        if "```" in content:
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
            if match:
                return match.group(1)

        # extract raw JSON object if present anywhere in content
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return match.group(0)

        return content

    @abstractmethod
    async def run(self, state: PipelineState) -> PipelineState:
        pass
