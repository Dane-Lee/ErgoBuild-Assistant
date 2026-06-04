# ErgoBuild Assistant

An internal-workflow desktop app that acts as an ergonomic design consultant powered by Claude.
Describe an ergonomic problem in plain language and get back (1) a conversational analysis of
risk factors and interventions, and (2) a structured engineering payload (forces, materials,
preserve-geometries, applicable standards) with an audit-trail justification.

Single user, runs locally. See `ERGO_ASSISTANT_MTD.md` for the master spec.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS (dev server on `localhost:5273`)
- Backend: Node.js + Express (proxy for the Anthropic API, on `localhost:4100`)
- AI: Anthropic API, model `claude-sonnet-4-6`

The backend exists only to keep the API key out of the browser. Vite proxies `/api/*` to the
backend so there is no CORS friction.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your API keys to `.env` (copy from `.env.example`):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   VOYAGE_API_KEY=pa-...        # only needed for the Phase 3 reference library (RAG)
   ```

3. Run both server and client together:

   ```bash
   npm run dev
   ```

   - Client: http://localhost:5273
   - Backend health check: http://localhost:4100/api/health

## Scripts

- `npm run dev` — run Express + Vite together
- `npm run dev:server` — backend only
- `npm run dev:client` — frontend only
- `npm run build` — typecheck the client and produce a production bundle
- `npm run rag:ingest` — build/extend the reference-library vector store (Phase 3)

## API

- `GET /api/health` — sanity check
- `GET /api/rag/status` — whether the reference library is built (`{ ready, model, documents, chunks }`)
- `POST /api/analyze` — body `{ messages, system }`; returns `{ content, stop_reason, sources }`.
  `content` is Claude's response (text blocks + `tool_use` for `generate_ergonomic_payload`);
  `sources` lists the guidebook documents retrieved for this turn.

## Reference library (Phase 3 RAG)

When built, the backend retrieves relevant passages from your ergonomic guidebooks for each
question and injects them into the prompt, so `design_justification` cites real sources.

- **Pipeline** (`server/rag/`): `pdf.js` (text extraction) → `chunk.js` (overlapping ~1,200-char
  chunks) → `voyage.js` (Voyage AI embeddings) → file-based vector store at
  `server/rag/store/index.json`; `retrieve.js` does cosine top-k with a per-source cap for diversity.
- **Corpus**: PDFs live in `corpus/` (gitignored). `server/rag/ingest-manifest.json` lists every
  text-bearing document; `subset-*.json` are smaller manifests for partial/free-tier ingests.
  Scanned PDFs with no text layer are listed under `ocrPending` (see OCR below).
- **Build it**: put a `VOYAGE_API_KEY` in `.env`, then `npm run rag:ingest`. Ingestion is
  resumable (checkpointed) and rate-limit aware; restart the server afterward to load the store.
- **Free-tier note**: an unpaid Voyage key is capped at 3 RPM / 10K TPM. Use a small batch and
  spacing for large runs, e.g.:

  ```bash
  VOYAGE_BATCH_SIZE=24 VOYAGE_MIN_INTERVAL_MS=63000 npm run rag:ingest
  ```

  Adding a payment method (free credits still apply) lifts the throttle and lets the full corpus
  ingest in minutes.
- Corpus PDFs and the generated vector store are **gitignored** — they never get committed.

## Roadmap

- Phase 1 (done): intake form + Claude chat
- Phase 2 (done): tool calling → structured engineering payload
- Phase 3 (in progress): RAG over ergonomic guidebooks — file-based store live; 140 text-bearing
  documents indexed on the free tier; full corpus + scanned-PDF OCR pending a paid Voyage key
- Phase 4: image generation for concept sketches
- Phase 5: optional Autodesk MCP connector

Plus, beyond the original spec: light/dark mode, a saved-analyses history sidebar
(localStorage), and a "Report" button that exports the analysis to a printable PDF.
