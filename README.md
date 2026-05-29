# ErgoBuild Assistant

An internal-workflow desktop app that acts as an ergonomic design consultant powered by Claude.
Describe an ergonomic problem in plain language and get back (1) a conversational analysis of
risk factors and interventions, and (2) a structured engineering payload (forces, materials,
preserve-geometries, applicable standards) with an audit-trail justification.

Single user, runs locally. See `ERGO_ASSISTANT_MTD.md` for the master spec.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS (dev server on `localhost:5273`)
- Backend: Node.js + Express (proxy for the Anthropic API, on `localhost:4100`)
- AI: Anthropic API, model `claude-sonnet-4-20250514`

The backend exists only to keep the API key out of the browser. Vite proxies `/api/*` to the
backend so there is no CORS friction.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your Anthropic API key to `.env`:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
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

## API

- `GET /api/health` — sanity check
- `POST /api/analyze` — body `{ messages, system }`; returns Claude's response content
  (text blocks + `tool_use` blocks for `generate_ergonomic_payload`).

## Roadmap

- Phase 1 (done): intake form + Claude chat
- Phase 2 (done): tool calling → structured engineering payload
- Phase 3: RAG over uploaded ergonomic guidebooks
- Phase 4: image generation for concept sketches
- Phase 5: optional Autodesk MCP connector
