from __future__ import annotations

from typing import Iterable, Sequence

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import DocumentChunk


async def fetch_chunks(session: AsyncSession, document_ids: Sequence[int] | None = None) -> list[DocumentChunk]:
    stmt = select(DocumentChunk)
    if document_ids:
        stmt = stmt.where(DocumentChunk.document_id.in_(document_ids))
    stmt = stmt.order_by(DocumentChunk.document_id, DocumentChunk.chunk_index)
    result = await session.execute(stmt)
    return result.scalars().all()


def rank_chunks(question: str, chunks: Sequence[DocumentChunk], top_k: int = 5) -> list[DocumentChunk]:
    if not chunks:
        return []
    texts = [chunk.text for chunk in chunks]
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(texts + [question])
    question_vector = matrix[-1]
    chunk_vectors = matrix[:-1]
    similarities = cosine_similarity(chunk_vectors, question_vector).ravel()
    paired = list(zip(similarities, chunks))
    paired.sort(key=lambda item: item[0], reverse=True)
    top_chunks = [chunk for _, chunk in paired[:top_k]]
    return top_chunks
