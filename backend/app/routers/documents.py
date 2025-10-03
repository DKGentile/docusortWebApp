from __future__ import annotations

from typing import Sequence

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Document, DocumentChunk
from ..schemas import DocumentListResponse, DocumentSchema
from ..services.ingestion import extract_and_chunk

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(session: AsyncSession = Depends(get_session)) -> DocumentListResponse:
    result = await session.execute(select(Document).order_by(Document.created_at.desc()))
    documents = result.scalars().all()
    return DocumentListResponse(documents=[DocumentSchema.from_orm(doc) for doc in documents])


@router.post("/upload", response_model=DocumentListResponse, status_code=status.HTTP_201_CREATED)
async def upload_documents(
    files: Sequence[UploadFile] = File(...),
    session: AsyncSession = Depends(get_session),
) -> DocumentListResponse:
    created_documents: list[Document] = []
    for file in files:
        try:
            text, chunks, stored_path = await extract_and_chunk(file)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        document = Document(
            filename=file.filename or "uploaded",
            content_type=file.content_type or "text/plain",
            original_path=stored_path,
        )
        session.add(document)
        await session.flush()

        if not chunks and text.strip():
            chunks = [text.strip()]
        for index, chunk_text in enumerate(chunks or [""]):
            chunk = DocumentChunk(document_id=document.id, chunk_index=index, text=chunk_text)
            session.add(chunk)
        created_documents.append(document)

    await session.commit()
    return DocumentListResponse(documents=[DocumentSchema.from_orm(doc) for doc in created_documents])


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: int, session: AsyncSession = Depends(get_session)) -> None:
    document = await session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await session.delete(document)
    await session.commit()
