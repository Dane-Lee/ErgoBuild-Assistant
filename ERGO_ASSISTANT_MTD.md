# Ergonomic Design Assistant — Master Truth Document

## What this is

A standalone desktop application that acts as an ergonomic design consultant powered by Claude.
It takes natural-language problem descriptions from an early intervention / ergonomics
professional and returns:

1. A conversational analysis of the ergonomic risk factors and recommended interventions
2. A structured engineering payload (forces, materials, preserve-geometries, applicable
   standards) with an audit-trail justification

The tool is internal-workflow only — single user, run locally.

## Phases

- Phase 1 — Intake form + Claude chat for ergonomic brainstorming (no docs yet)
- Phase 2 — Tool-calling to produce structured engineering payloads alongside conversation
- Phase 3 — RAG over uploaded ergonomic guidebooks (PDFs, Word docs) so Claude cites actual standards
- Phase 4 — Image generation for visual concept sketches
- Phase 5 (later) — Optional Autodesk MCP connector for CAD pipeline

Phases 1 and 2 are the MVP. Phase 3 is the first big upgrade once guidebooks are prepped.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express (proxy for Anthropic API calls so the API key stays out of the browser)
- AI: Anthropic API, model `claude-sonnet-4-20250514`
- Future Phase 3: Local vector DB (start file-based, upgrade to ChromaDB or pgvector only if needed)

## Backend endpoints

- `POST /api/analyze` — accepts conversation history, returns Claude response (text + tool_use blocks)
- `GET /api/health` — sanity check

## Environment

- `.env` holds `ANTHROPIC_API_KEY` (server only, never exposed to client)
- Frontend runs on `localhost:5273`
- Backend runs on `localhost:4100`
- Vite proxy routes `/api/*` to the backend so there's no CORS pain

## Build priorities (in order)

1. Get Express + Vite running together, talking to each other
2. Build IntakeForm with domain/population/task/constraints
3. Wire up claudeClient.ts -> backend -> Anthropic API (text only, no tools yet)
4. Add ChatPanel for conversational flow
5. Add tool-calling to the backend; render PayloadPanel
6. Polish styling
7. Add copy-JSON and clear-conversation buttons

## Future considerations (don't build now)

- Guidebook ingestion (Phase 3): `/docs` ingestion route + vector store
- Multi-conversation memory: sidebar of past analyses, stored locally
- Export to PDF: formatted report from chat + payload
- Image generation: Adobe Firefly or similar for concept sketches
