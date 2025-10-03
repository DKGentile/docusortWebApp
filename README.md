# Docusort Knowledge Workspace

This project delivers a lightweight document intelligence workspace. Users can upload heterogeneous documents (legal, financial, operational, etc.), query them with natural language, and synthesise bespoke outputs that leverage the uploaded sources.

The repository is split into:

- **backend/** – FastAPI service that stores uploaded files, chunks their contents, retrieves relevant sections, and orchestrates language model calls.
- **frontend/** – Minimal static client for uploads, question answering, and document synthesis.

## Features

- 📄 Multi-format ingestion (PDF, DOCX, TXT, Markdown, CSV, JSON).
- 🧠 Retrieval augmented responses using TF–IDF similarity over chunked documents.
- 🤖 Pluggable LLM client (OpenAI Chat Completions by default, with graceful fallback when an API key is absent).
- 🧾 Document synthesis endpoint for generating structured outputs such as financial summaries or legal briefs.
- 🗑️ Library management with deletion support.

## Getting started

### 1. Backend API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Environment variables can be placed in `backend/.env` (see `app/config.py`). At a minimum, set `OPENAI_API_KEY` (or `openai_api_key`) if you want the API to call OpenAI. Without an API key the service will fall back to returning the retrieved context snippets.

### 2. Frontend client

The frontend is a static site. You can open `frontend/index.html` directly in a browser or serve it through any static web host. When running locally, make sure the backend is available at `http://localhost:8000` or adjust `API_BASE` inside `frontend/main.js`.

For live reloading during development you can run a simple dev server, e.g.:

```bash
cd frontend
python -m http.server 5173
```

Then visit `http://localhost:5173`.

### 3. Usage flow

1. Upload one or multiple documents using the **Upload documents** card.
2. Run natural-language queries in **Ask a question**. Optionally select the subset of documents to search.
3. Generate new outputs in **Create a tailored document**. Provide a description (e.g. *"Make me a profit and loss spreadsheet that shows all of my properties"*) and optionally a custom title.

### Architecture overview

1. **Ingestion:** files are written to `backend/storage` and split into overlapping word chunks for retrieval.
2. **Retrieval:** a lightweight TF–IDF vectoriser identifies the most relevant chunks per request.
3. **Generation:** the top chunks are supplied to the configured LLM for question answering or synthesis. When an LLM is unavailable, the API still returns the selected context so that the user can manually inspect the relevant sections.

## Extending the system

- Swap out the retrieval logic in `backend/app/services/retrieval.py` for a vector database.
- Integrate user authentication and multi-tenant storage by augmenting `Document` with an owner identifier.
- Add structured export formats (CSV, XLSX) for synthesis outputs.

## License

This project is provided as-is for demonstration purposes.
