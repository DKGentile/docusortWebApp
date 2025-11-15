from __future__ import annotations

from typing import List

from .config import CHAT_MODEL_NAME, get_openai_client
from .ingestion import get_embedding_model
from . import vector_store


def build_context(query: str, selected_file_ids: List[str], top_k: int = 10) -> str:
    model = get_embedding_model()
    query_embedding = model.encode([query])[0].tolist()
    matches = vector_store.query(
        query_embedding=query_embedding,
        file_ids=selected_file_ids or None,
        top_k=top_k,
    )
    if not matches:
        return ""
    parts = []
    for match in matches:
        meta = match.get("metadata", {})
        header = f"File: {meta.get('file_name', 'unknown')} (id: {meta.get('file_id')})"
        parts.append(f"{header}\n{match.get('text', '')}")
    return "\n\n---\n\n".join(parts)


def ask_llm(query: str, selected_file_ids: List[str]) -> str:
    context = build_context(query, selected_file_ids)
    client = get_openai_client()
    user_content = (
        "You are an AI assistant that answers questions using ONLY the provided context. "
        "If the answer is not in the context, say you do not know.\n\n"
        f"Context:\n{context or 'No relevant context found.'}\n\nQuestion:\n{query}"
    )
    response = client.responses.create(
        model=CHAT_MODEL_NAME,
        input=[
            {"role": "system", "content": "Helpful assistant for document Q&A."},
            {"role": "user", "content": user_content},
        ],
    )
    return response.output[0].content[0].text  # type: ignore[index]
