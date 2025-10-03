from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..schemas import GeneratedDocumentResponse, QueryRequest, QueryResponse, SynthesisRequest
from ..services.llm import llm_client
from ..services.retrieval import fetch_chunks, rank_chunks

router = APIRouter(prefix="/api", tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def query_documents(payload: QueryRequest, session: AsyncSession = Depends(get_session)) -> QueryResponse:
    chunks = await fetch_chunks(session, payload.document_ids)
    top_chunks = rank_chunks(payload.question, chunks, payload.max_chunks)
    answer = await llm_client.generate(question=payload.question, context=top_chunks)
    return QueryResponse(answer=answer, context=top_chunks)


@router.post("/synthesize", response_model=GeneratedDocumentResponse)
async def synthesize_document(payload: SynthesisRequest, session: AsyncSession = Depends(get_session)) -> GeneratedDocumentResponse:
    chunks = await fetch_chunks(session, payload.document_ids)
    top_chunks = rank_chunks(payload.question, chunks, payload.max_chunks)
    if not top_chunks:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No relevant context found")
    instruction = (
        "Create a structured document that fulfils the user's request based on the provided context."
        " Provide clear headings, bullet points where appropriate, and ensure the output can be reused as a template."
    )
    body = await llm_client.generate(question=payload.question, context=top_chunks, instruction=instruction)
    title = payload.output_title or payload.question
    return GeneratedDocumentResponse(title=title, body=body, context=top_chunks)
