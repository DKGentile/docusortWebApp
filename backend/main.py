from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import chat_rag, ingestion, vector_store
from .config import UPLOADS_DIR, ensure_directories
from .metadata_store import delete_file_metadata, get_tree, list_files, set_tree
from .models import ChatRequest, ChatResponse, TreeNode, UploadResponse
from .sort_tree import build_metadata_tree, generate_tree

ensure_directories()

app = FastAPI(title="DocuSort API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _allowed_file(filename: str) -> bool:
    return filename.lower().endswith((".pdf", ".docx", ".txt"))


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    if not _allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    file_id = ingestion.generate_file_id()
    save_path = UPLOADS_DIR / f"{file_id}_{file.filename}"
    with save_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    ingestion.ingest_file(file_id, file.filename, save_path)
    return UploadResponse(file_id=file_id, file_name=file.filename)


@app.get("/api/files")
async def list_uploaded_files():
    files = list_files()
    return [
        {
            "file_id": f.file_id,
            "file_name": f.file_name,
            "size": f.size,
            "uploaded_at": f.uploaded_at.isoformat(),
        }
        for f in files
    ]


@app.post("/api/sort", response_model=TreeNode)
async def sort_files() -> TreeNode:
    tree_data = generate_tree()
    return TreeNode(**tree_data)


@app.get("/api/tree")
async def get_latest_tree():
    tree_data = get_tree()
    if not tree_data:
        files = list_files()
        tree_data = build_metadata_tree(
            [
                {
                    "file_id": f.file_id,
                    "file_name": f.file_name,
                    "size": f.size,
                }
                for f in files
            ]
        )
    return tree_data


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    answer = chat_rag.ask_llm(request.message, request.file_ids)
    return ChatResponse(answer=answer)


@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    record = delete_file_metadata(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found.")
    vector_store.delete_file(file_id)
    file_path = Path(record.get("original_path", ""))
    try:
        if file_path.exists():
            file_path.unlink()
    except OSError:
        pass
    set_tree(None)
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
