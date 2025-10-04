# DocuSort Web Workspace

DocuSort is a React + Vite workspace for document intelligence workflows. It supports uploading PDF/DOCX files, running retrieval-augmented chat over the uploaded corpus, and generating property-level profit & loss packages that can be downloaded as CSV or XLSX.

## Features

- Document repository with drag-and-drop uploads and auto-generated summaries.
- RAG chat interface that grounds responses in retrieved document chunks.
- Profit & loss generator that aggregates retrieved figures and exports CSV/XLSX packages.
- Context selectors for previous chats and focused documents, plus mobile-friendly collapsible sidebar.
- Built with Vite, React Query, Tailwind UI styling, and an Express + TypeScript backend.

## Prerequisites

- Node.js 18+
- npm 9+
- An OpenAI API key (optional but required for live embeddings and completions).

## Run the app in development

Two terminals:

```bash
#start the API server
cd server
npm run dev

#start the Vite client
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:3000 (modify with `PORT`)

## Available API endpoints

| Method | Endpoint              | Description |
| ------ | --------------------- | ----------- |
| POST   | `/api/upload`         | Upload PDF/DOCX files, extract text, chunk, embed, and store metadata. |
| GET    | `/api/docs`           | List uploaded documents and summaries. |
| GET    | `/api/chats`          | List chat summaries (title + last message). |
| GET    | `/api/chats/:id`      | Retrieve a full chat transcript. |
| POST   | `/api/chat`           | Send a prompt, retrieve top-k chunks, and get an AI-grounded answer. |
| POST   | `/api/generate/pnl`   | Aggregate retrieved financial figures and export CSV/XLSX. |

## Notes

- Uploaded files are stored in `server/uploads/`; generated artifacts live in `server/generated/`.
- Vector data is held in-memory but wrapped so it can be swapped for persistent storage later.
- The server exposes `/uploads` and `/generated` as static routes for direct downloads.
- When no OpenAI key is present, embeddings and responses degrade gracefully with deterministic fallbacks.

## Next steps

- Integrate a persistent vector database (e.g., Pinecone, pgvector) by swapping the in-memory store.
- Harden table parsing in `generatePnlPackage` with domain-specific rules or LLM-assisted extraction.
- Add authentication and access controls for multi-tenant workspaces.
