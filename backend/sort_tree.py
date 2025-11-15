from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

from .config import CHAT_MODEL_NAME, get_openai_client
from .metadata_store import list_files, set_tree


CATEGORY_MAP = {
    ".pdf": "PDFs",
    ".docx": "Word Documents",
    ".txt": "Text Files",
}


def build_metadata_tree(files: List[Dict]) -> Dict:
    buckets: Dict[str, List[Dict]] = defaultdict(list)
    for record in files:
        ext = Path(record["file_name"]).suffix.lower()
        category = CATEGORY_MAP.get(ext, "Other")
        buckets[category].append(record)

    children = []
    for category in sorted(buckets.keys()):
        items = buckets[category]
        children.append(
            {
                "name": category,
                "type": "folder",
                "children": [
                    {"name": item["file_name"], "type": "file", "file_id": item["file_id"]}
                    for item in items
                ],
            }
        )

    return {
        "name": "My Documents",
        "type": "folder",
        "children": children,
    }


def generate_tree() -> Dict:
    files = list_files()
    file_records = [
        {
            "file_id": f.file_id,
            "file_name": f.file_name,
            "size": f.size,
        }
        for f in files
    ]
    if not file_records:
        tree = build_metadata_tree([])
        set_tree(tree)
        return tree
    client = get_openai_client()
    description = "\n".join(
        f"- {record['file_name']} (size: {record['size']} bytes, id: {record['file_id']})"
        for record in file_records
    )
    prompt = (
        "Organize the following files into a logical folder tree for knowledge workers. "
        "Respond ONLY with JSON matching the schema described.\n"
        "Files:\n"
        f"{description}"
    )
    response = client.responses.create(
        model=CHAT_MODEL_NAME,
        input=[
            {"role": "system", "content": "You output strictly valid JSON for folder trees."},
            {"role": "user", "content": prompt},
        ],
    )
    try:
        content = response.output[0].content[0].text  # type: ignore[index]
        tree = json.loads(content)
        if not isinstance(tree, dict):
            raise ValueError("Tree is not a JSON object")
    except Exception:
        tree = build_metadata_tree(file_records)
    else:
        tree["name"] = "My Documents"
    set_tree(tree)
    return tree
