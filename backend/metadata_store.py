from __future__ import annotations

import json
from datetime import datetime
from typing import Dict, List, Optional

from .config import METADATA_FILE, ensure_directories
from .models import FileMetadata

ensure_directories()


def _default_payload() -> Dict:
    return {"files": [], "synthetic_tree": None}


def load_metadata() -> Dict:
    if not METADATA_FILE.exists():
        return _default_payload()
    try:
        return json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return _default_payload()


def save_metadata(payload: Dict) -> None:
    METADATA_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def list_files() -> List[FileMetadata]:
    data = load_metadata()
    files = []
    for record in data.get("files", []):
        try:
            uploaded_at = record.get("uploaded_at")
            timestamp = (
                datetime.fromisoformat(uploaded_at)
                if uploaded_at
                else datetime.utcnow()
            )
            files.append(
                FileMetadata(
                    file_id=record["file_id"],
                    file_name=record["file_name"],
                    original_path=record["original_path"],
                    uploaded_at=timestamp,
                    size=record.get("size", 0),
                )
            )
        except (KeyError, ValueError):
            continue
    return files


def upsert_file(metadata: FileMetadata) -> None:
    data = load_metadata()
    files = data.setdefault("files", [])
    files = [rec for rec in files if rec.get("file_id") != metadata.file_id]
    files.append(
        {
            "file_id": metadata.file_id,
            "file_name": metadata.file_name,
            "original_path": metadata.original_path,
            "uploaded_at": metadata.uploaded_at.isoformat(),
            "size": metadata.size,
        }
    )
    data["files"] = files
    save_metadata(data)


def get_tree() -> Optional[Dict]:
    data = load_metadata()
    return data.get("synthetic_tree")


def set_tree(tree: Optional[Dict]) -> None:
    data = load_metadata()
    data["synthetic_tree"] = tree
    save_metadata(data)


def delete_file_metadata(file_id: str) -> Optional[Dict]:
    data = load_metadata()
    files = data.get("files", [])
    for index, record in enumerate(files):
        if record.get("file_id") == file_id:
            removed = files.pop(index)
            data["files"] = files
            save_metadata(data)
            return removed
    return None
