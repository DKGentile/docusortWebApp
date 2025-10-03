from __future__ import annotations

import textwrap
from typing import Sequence

try:
    from openai import AsyncOpenAI
    from openai.error import OpenAIError
except Exception:  # pragma: no cover - optional dependency
    AsyncOpenAI = None  # type: ignore
    OpenAIError = Exception  # type: ignore

from ..config import get_settings
from ..models import DocumentChunk

settings = get_settings()


SYSTEM_PROMPT = "You are an assistant that answers questions about a collection of documents uploaded by the user."
FALLBACK_TEMPLATE = textwrap.dedent(
    """
    Unable to reach the configured language model. The following information was retrieved from the most relevant document sections:

    {context}
    """
)


class LLMClient:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None
        if AsyncOpenAI and settings.openai_api_key:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(self, *, question: str, context: Sequence[DocumentChunk], instruction: str | None = None) -> str:
        context_text = "\n\n".join(
            f"Document {chunk.document_id} (chunk {chunk.chunk_index + 1}):\n{chunk.text}" for chunk in context
        )
        user_prompt = textwrap.dedent(
            f"""
            {instruction or "Answer the user's question using the provided context."}

            Question: {question}

            Context:
            {context_text or 'No relevant context was found.'}
            """
        ).strip()
        if self._client:
            try:
                response = await self._client.chat.completions.create(
                    model=settings.llm_model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                )
                content = response.choices[0].message.content if response.choices else None
                if content:
                    return content.strip()
            except OpenAIError:
                pass
        return FALLBACK_TEMPLATE.format(context=context_text or "No context available to answer the question.").strip()


llm_client = LLMClient()
