# DocuSort

DocuSort is a local proof-of-concept for organizing and querying personal documents with retrieval-augmented generation (RAG). It lets you upload PDFs, DOCX, and TXT files, stores originals locally, embeds their contents in a shared ChromaDB collection, and offers a ChatGPT-style UI with a synthetic "Sort" tree to condition questions on selected files.

## Prerequisites

- Python 3.10+
- Node.js 18+ with npm
- An OpenAI API key added to `OPENAI_API_KEY_VALUE` in `backend/config.py` (or exported as `OPENAI_API_KEY`)

## Backend Setup (FastAPI)

1. Navigate to `backend/`.
2. Create and activate a virtual environment (recommended).
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Update `backend/config.py` with your OpenAI key (or export `OPENAI_API_KEY`).
5. Start the API with auto-reload:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

The backend stores data under `backend/data/` (uploads, ChromaDB files, and metadata).

## Frontend Setup (Vite + React)

1. Navigate to `frontend/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the provided localhost URL (default `http://localhost:5173`).

## Workflow

1. Use the left sidebar to upload documents. They will be saved below `backend/data/uploads/` and indexed into the shared Chroma collection. You can remove a document at any time via the small "x" delete control next to its name; this deletes the upload and its embeddings.
2. Click **Sort** to ask the OpenAI model for a synthetic folder tree. The JSON tree is saved in `backend/data/metadata.json`.
3. Select files/folders in either Tree View or Flat View. Chat queries automatically include the selected file IDs to restrict the RAG context. If no files are selected, the assistant will search across all embedded documents.
4. Ask questions in the chat panel; responses cite only the retrieved context chunks.

## Project Structure

```
.
|- backend/
|  |- chat_rag.py         # Builds RAG context and calls OpenAI chat
|  |- config.py           # Paths, model names, OpenAI client helper
|  |- data/               # Uploads, persistent chroma data, metadata.json
|  |- ingestion.py        # Extraction, chunking, embeddings, metadata tracking
|  |- main.py             # FastAPI app + endpoints
|  |- metadata_store.py   # Helpers to read/write metadata.json
|  |- models.py           # Pydantic request/response models
|  |- requirements.txt
|  |- sort_tree.py        # Generates synthetic folder tree via OpenAI
|  \- vector_store.py     # ChromaDB wrapper (single shared collection)
|- frontend/              # React + Vite SPA
|  |- src/                # App, Sidebar, TreeView, Chat, API helpers
|  \- package.json
\- README.md
```

## Notes

- The prototype uses sentence-transformers for embeddings, so the first ingestion call will download weights.
- ChromaDB operates in persistent mode under `backend/data/chroma/`; delete this directory to reset the vector store.
- PDF/DOCX extraction happens locally using `pdfplumber` and `python-docx`.
- The synthetic tree is informational only; files on disk are not moved.
