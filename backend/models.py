from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class FileMetadata(BaseModel):
    file_id: str
    file_name: str
    original_path: str
    uploaded_at: datetime
    size: int


class UploadResponse(BaseModel):
    file_id: str
    file_name: str


class TreeNode(BaseModel):
    name: str
    type: Literal["folder", "file"]
    file_id: Optional[str] = None
    children: Optional[List["TreeNode"]] = Field(default=None)


TreeNode.update_forward_refs()


class SortResponse(BaseModel):
    tree: TreeNode


class ChatRequest(BaseModel):
    message: str
    file_ids: List[str]


class ChatResponse(BaseModel):
    answer: str
