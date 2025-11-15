from __future__ import annotations

from typing import Dict, List, Optional

import chromadb

from .config import CHROMA_DIR

COLLECTION_NAME = "documents"


def _get_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(COLLECTION_NAME)


_COLLECTION = _get_collection()


def add_chunks(
    file_id: str,
    file_name: str,
    chunks: List[str],
    embeddings: List[List[float]],
) -> None:
    ids = [f"{file_id}:{idx}" for idx in range(len(chunks))]
    metadatas = [{"file_id": file_id, "file_name": file_name} for _ in chunks]
    _COLLECTION.upsert(
        ids=ids,
        metadatas=metadatas,
        documents=chunks,
        embeddings=embeddings,
    )


def query(
    query_embedding: List[float],
    file_ids: Optional[List[str]] = None,
    top_k: int = 10,
) -> List[Dict]:
    where = {"file_id": {"$in": file_ids}} if file_ids else None
    results = _COLLECTION.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
    )
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    return [
        {"text": doc, "metadata": meta, "distance": dist}
        for doc, meta, dist in zip(documents, metadatas, distances)
    ]


def delete_file(file_id: str) -> None:
    _COLLECTION.delete(where={"file_id": file_id})
