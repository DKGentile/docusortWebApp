from __future__ import annotations

from datetime import datetime
from typing import Sequence

from pydantic import BaseModel


class DocumentChunkSchema(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    text: str

    class Config:
        orm_mode = True


class DocumentSchema(BaseModel):
    id: int
    filename: str
    content_type: str
    created_at: datetime

    class Config:
        orm_mode = True


class DocumentListResponse(BaseModel):
    documents: Sequence[DocumentSchema]


class QueryRequest(BaseModel):
    question: str
    document_ids: Sequence[int] | None = None
    max_chunks: int = 5


class QueryResponse(BaseModel):
    answer: str
    context: list[DocumentChunkSchema]


class SynthesisRequest(QueryRequest):
    output_type: str = "text"
    output_title: str | None = None


class GeneratedDocumentResponse(BaseModel):
    title: str
    body: str
    context: list[DocumentChunkSchema]
