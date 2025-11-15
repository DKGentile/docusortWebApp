from __future__ import annotations

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

import pdfplumber
from docx import Document
from sentence_transformers import SentenceTransformer

from .config import EMBEDDING_MODEL_NAME
from .metadata_store import upsert_file
from .models import FileMetadata
from . import vector_store

logger = logging.getLogger(__name__)


def generate_file_id() -> str:
    return str(uuid.uuid4())


def get_embedding_model() -> SentenceTransformer:
    if not hasattr(get_embedding_model, "_model"):
        setattr(get_embedding_model, "_model", SentenceTransformer(EMBEDDING_MODEL_NAME))
    return getattr(get_embedding_model, "_model")


def extract_text(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    try:
        if ext == ".pdf":
            with pdfplumber.open(str(file_path)) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        if ext == ".docx":
            doc = Document(str(file_path))
            return "\n".join(p.text for p in doc.paragraphs)
        if ext == ".txt":
            return file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as exc:  # pragma: no cover - logging only
        logger.exception("Failed to extract text from %s: %s", file_path, exc)
    logger.warning("Unsupported or empty file: %s", file_path)
    return ""


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> List[str]:
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
        if start < 0:
            start = 0
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def ingest_file(file_id: str, file_name: str, file_path: Path) -> None:
    metadata = FileMetadata(
        file_id=file_id,
        file_name=file_name,
        original_path=str(file_path),
        uploaded_at=datetime.utcnow(),
        size=file_path.stat().st_size if file_path.exists() else 0,
    )
    upsert_file(metadata)
    text = extract_text(file_path)
    if not text.strip():
        logger.warning("Skipping empty file %s", file_name)
        return
    chunks = chunk_text(text)
    if not chunks:
        logger.warning("No chunks produced for %s", file_name)
        return
    model = get_embedding_model()
    embeddings = model.encode(chunks, convert_to_numpy=True).tolist()
    vector_store.add_chunks(file_id, file_name, chunks, embeddings)
