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

Match Command Station's stack for consistency:

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express (lightweight — only purpose is to proxy Anthropic API calls so the API key stays out of the browser)
- AI: Anthropic API, model `claude-sonnet-4-20250514`
- Future Phase 3: Local vector DB (start with simple file-based RAG, upgrade to ChromaDB or pgvector only if needed)

## File structure

```
ergo-assistant/
├── package.json
├── .env                       # ANTHROPIC_API_KEY
├── .gitignore                 # node_modules, .env, dist
├── README.md
├── ERGO_ASSISTANT_MTD.md      # this file
│
├── server/
│   ├── index.js               # Express server, port 4100
│   ├── claudeProxy.js         # forwards requests to Anthropic API
│   └── ergoTool.js            # tool-calling schema definition
│
└── client/
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── components/
        │   ├── IntakeForm.tsx
        │   ├── ChatPanel.tsx
        │   ├── PayloadPanel.tsx
        │   └── ConstraintTags.tsx
        ├── lib/
        │   ├── claudeClient.ts    # frontend wrapper that calls local backend
        │   └── systemPrompt.ts    # ergonomic consultant system prompt
        └── types/
            └── payload.ts         # TypeScript types for the structured payload
```

## The tool-calling schema

The backend defines this tool, which Claude is instructed to call for every analysis:

```js
{
  name: "generate_ergonomic_payload",
  description: "Generates a structured engineering payload from an ergonomic problem.",
  input_schema: {
    type: "object",
    properties: {
      study_name: { type: "string" },
      primary_risk_factors: { type: "array", items: { type: "string" } },
      design_interventions: { type: "array", items: { type: "string" } },
      preserve_geometries: {
        type: "array",
        items: { type: "string" },
        description: "Human contact surfaces that must maintain exact shape for user comfort or safety (grip zones, seat pans, pad surfaces, etc.)"
      },
      spatial_constraints: {
        type: "array",
        items: { type: "string" },
        description: "Existing infrastructure or workspace features any intervention must accommodate without disturbing (cart heights, aisle widths, existing equipment footprints, etc.)"
      },
      force_load_newtons: { type: "number" },
      task_frequency_per_hour: {
        type: "number",
        description: "Estimated number of times this task is performed per hour. Drives fatigue/cumulative exposure reasoning."
      },
      daily_exposure_hours: {
        type: "number",
        description: "Estimated hours per shift the worker performs this task. Drives sustained-load reasoning."
      },
      material_options: { type: "array", items: { type: "string" } },
      safety_factor: { type: "number" },
      applicable_standards: { type: "array", items: { type: "string" } },
      design_justification: { type: "string" }
    },
    required: [
      "study_name",
      "primary_risk_factors",
      "design_interventions",
      "force_load_newtons",
      "safety_factor",
      "design_justification"
    ]
  }
}
```

## System prompt (Phase 2)

```
You are an expert Ergonomic Systems Engineer and design consultant.

For every user request, you must BOTH:
1. Respond conversationally — identify risk factors, propose interventions, ask clarifying questions
2. Call the generate_ergonomic_payload tool to output structured engineering parameters

When generating the payload:
- Convert imperial units (lbs, inches) to metric (Newtons, mm) automatically
- force_load_newtons: derive from body-mass estimates for the user population (95th percentile male ~115kg = ~1130N full body lean; scale for grip/push forces). For lifted-object loads, report the static weight in Newtons (1 lb ≈ 4.45 N); do not invent multipliers unless citing a specific standard.
- task_frequency_per_hour and daily_exposure_hours: extract from the user's description if stated; if not, ask a clarifying question in your conversational response rather than guessing.
- safety_factor: typically 2.0–3.0 for ergonomic fixtures; higher for medical or high-risk
- preserve_geometries: HUMAN CONTACT surfaces only — grip zones, seat pans, pad surfaces, handles. Things a person physically touches.
- spatial_constraints: existing infrastructure and workspace features the intervention must work around — cart heights, aisle widths, existing equipment footprints, box dimensions, etc. NOT human contact points.
- applicable_standards: always cite at least one — ISO 9241, NIOSH lifting equation, RULA, REBA, ANSI/HFES 100, NASA-STD-3001, ADA, ISO 11228 series, etc.
- design_justification: 2–3 sentences citing which standard or anthropometric source drove each key number

Never guess vaguely. If information is missing (especially frequency or duration), state your assumption explicitly in design_justification AND ask the clarifying question in your conversational response.
```

## UI layout

A single-page app with three sections stacked top-to-bottom:

1. Intake card — Domain dropdown, user population text field, problem description textarea,
   constraint tag selector, task frequency per hour (number), daily exposure hours (number),
   "Analyze" button. The two numeric fields are optional — if blank, Claude will ask about them
   in the conversation.
2. Chat panel (left, 50%) — conversational thread between user and Claude, with follow-up input at the bottom
3. Payload panel (right, 50%) — structured engineering output with copy-JSON button

Visual style: clean, professional, neutral palette. No emoji. Match Command Station's aesthetic.
A persisted light/dark mode toggle lives in the header.

## Backend endpoints

- `POST /api/analyze` — accepts conversation history, returns Claude response (text blocks + tool_use blocks)
- `GET /api/health` — sanity check

## Environment

- `.env` holds `ANTHROPIC_API_KEY` (server only, never exposed to client)
- Frontend runs on `localhost:5273` (moved off the Vite default 5173 to avoid colliding with other local projects)
- Backend runs on `localhost:4100`
- Vite proxy config routes `/api/*` to the backend so there's no CORS pain

## Future considerations (don't build now)

- Guidebook ingestion: when Dane prepares the guidebooks, Phase 3 adds a `/docs` ingestion route and a vector store
- Multi-conversation memory: a sidebar of past analyses, stored locally
- Export to PDF: generate a formatted report from chat + payload
- Image generation: integrate Adobe Firefly or similar for concept sketches

## Build priorities (in order)

1. Get Express + Vite running together, talking to each other
2. Build IntakeForm with domain/population/task/constraints/frequency/duration
3. Wire up claudeClient.ts -> backend -> Anthropic API (text only, no tools yet)
4. Add ChatPanel for conversational flow
5. Add tool-calling to the backend; render PayloadPanel
6. Polish styling
7. Add copy-JSON and clear-conversation buttons

## Refinement log

Issues caught during early testing and the fixes applied to this MTD:

- `preserve_geometries` was being used for two different concepts (human contact surfaces AND
  existing infrastructure). Split into `preserve_geometries` (human contact only) and
  `spatial_constraints` (workspace/infrastructure).
- No exposure dimension in the schema. Added `task_frequency_per_hour` and `daily_exposure_hours`.
  Lifting 20 lbs once is fine; lifting it 200 times a shift is an injury claim. Also added matching
  fields to the intake form.
- Force-load math was inventing multipliers. System prompt now instructs Claude to report static
  weight in Newtons (1 lb ≈ 4.45 N) and not fabricate scaling factors unless citing a real standard.
- Anthropometric reasoning was generic. Not fixing in the prompt — this is the core motivation for
  Phase 3 RAG over real guidebooks. Hardcoding fixes here would mask the real solution.
