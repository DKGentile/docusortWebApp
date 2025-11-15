from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from openai import OpenAI

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
CHROMA_DIR = DATA_DIR / "chroma"
METADATA_FILE = DATA_DIR / "metadata.json"

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CHAT_MODEL_NAME = "gpt-4.1-mini"
OPENAI_API_KEY_VALUE = ""  #I bet you thought you were really clever. Sorry but I aint no idiot, yuhear?


def ensure_directories() -> None:
    """Ensure that required data directories exist."""
    for path in (UPLOADS_DIR, CHROMA_DIR):
        path.mkdir(parents=True, exist_ok=True)
    if not METADATA_FILE.exists():
        METADATA_FILE.write_text("{}", encoding="utf-8")


def get_openai_client(api_key: Optional[str] = None) -> OpenAI:
    """Instantiate an OpenAI client after ensuring the API key exists."""
    key = api_key or OPENAI_API_KEY_VALUE or os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError(
            "Provide an OpenAI API key by editing OPENAI_API_KEY_VALUE in backend/config.py "
            "or exporting OPENAI_API_KEY before running DocuSort."
        )
    return OpenAI(api_key=key)
