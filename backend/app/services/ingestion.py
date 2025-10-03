from __future__ import annotations

import io
from pathlib import Path

from fastapi import UploadFile
from pypdf import PdfReader
from docx import Document as DocxDocument

from ..config import get_settings

settings = get_settings()


async def iter_file_text(file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".json"}:
        content = await file.read()
        return content.decode("utf-8", errors="ignore")
    if suffix in {".pdf"}:
        data = await file.read()
        reader = PdfReader(io.BytesIO(data))
        parts: list[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)
    if suffix in {".docx"}:
        data = await file.read()
        document = DocxDocument(io.BytesIO(data))
        return "\n".join(p.text for p in document.paragraphs)
    raise ValueError(f"Unsupported file type: {suffix or 'unknown'}")


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    words = normalized.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end == len(words):
            break
        start = max(0, end - overlap)
    return chunks


def ensure_storage_dir() -> Path:
    path = Path("backend/storage")
    path.mkdir(parents=True, exist_ok=True)
    return path


def persist_upload(file: UploadFile, content: bytes) -> str:
    storage_dir = ensure_storage_dir()
    filename = file.filename or "uploaded"
    target_path = storage_dir / filename
    counter = 1
    while target_path.exists():
        target_path = storage_dir / f"{target_path.stem}_{counter}{target_path.suffix}"
        counter += 1
    target_path.write_bytes(content)
    return str(target_path)


async def extract_and_chunk(file: UploadFile) -> tuple[str, list[str], str]:
    """Return original text and chunks."""
    content_bytes = await file.read()
    await file.seek(0)
    text = await iter_file_text(file)
    await file.seek(0)
    path = persist_upload(file, content_bytes)
    chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
    return text, chunks, path
