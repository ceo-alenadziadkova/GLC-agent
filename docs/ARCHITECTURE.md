# System Architecture

## Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              React 18 SPA  (Vite + TypeScript)              │
│                  Deployed on Vercel                         │
└───────────────┬─────────────────────┬───────────────────────┘
                │  REST API calls      │  Supabase Realtime
                │  /api/*              │  (WebSocket)
                ▼                     ▼
┌───────────────────────┐   ┌─────────────────────────────────┐
│   Express Backend     │   │         Supabase Cloud          │
│  Node.js + TypeScript │   │   PostgreSQL + Auth + Realtime  │
│   Deployed on Railway │   │     EU Frankfurt (GDPR)         │
└───────────┬───────────┘   └─────────────────────────────────┘
            │                         ▲
            │  Service role key        │  Reads/writes DB
            └─────────────────────────┘
            │
            │  Anthropic API
            ▼
┌───────────────────────┐
│   Claude API          │
│  claude-sonnet-4-     │
│  20250514             │
└───────────────────────┘
```

## Component Responsibilities

### Frontend (React/Vite → Vercel)
- Renders all UI: 7 pages + reusable components
- Manages auth state via `useAuth()` (Supabase JS client)
- Submits audit creation and pipeline actions to backend via `apiService.ts`
- Subscribes to `pipeline_events` and `audits` tables via Supabase Realtime for live updates
- **Never** calls Claude directly — all AI goes through the backend

### Backend (Express → Railway)
- Validates Supabase JWT on every protected request (`middleware/auth.ts`)
- Owns the full pipeline orchestration: collect → assemble → call Claude → fact-check → save
- Uses Supabase **service role key** to bypass RLS for server-side reads/writes
- One Claude API call per pipeline phase; never streams to frontend (Realtime handles progress)
- Enforces rate limits and token budget

### Supabase (PostgreSQL + Auth + Realtime)
- PostgreSQL stores all persistent state (audits, domains, strategy, events, intake brief, client portal tables — see [DATABASE.md](./DATABASE.md))
- Auth issues JWTs for frontend users; backend verifies them
- Realtime publishes row changes from `pipeline_events` and `audits` to subscribed frontend clients
- RLS enforces data isolation; consultants and linked clients have distinct access patterns — policies evolve with migrations ([DATABASE.md](./DATABASE.md))

### Anthropic Claude
- Called exclusively from backend agents (one call per phase)
- Uses `tool_use` with JSON schema to guarantee structured output
- Model: `claude-sonnet-4-20250514`

---

## Data Flow: Creating and Running an Audit

```
1. User submits URL in NewAudit.tsx
2. Frontend → POST /api/audits → backend creates audit row (status: 'created')
3. Frontend navigates to /pipeline/:id, subscribes to pipeline_events via Realtime
4. User clicks "Start" → POST /api/audits/:id/pipeline/start
5. Backend:
   a. Runs ReconAgent (Phase 0):
      - CrawlerCollector fetches up to the configured page limit (no AI; see [AGENTS.md](./AGENTS.md))
      - ReconCollector extracts tech stack, social profiles, structured data (no AI)
      - ContextBuilder assembles briefing
      - One Claude call → company profile JSON
      - FactChecker validates result
      - Saves to audit_recon + audit_domains
      - Emits pipeline_events rows
6. Supabase Realtime → frontend receives events → PipelineMonitor updates UI
7. Review gate: frontend shows "Approve" button
8. User approves → POST /api/audits/:id/reviews/0 with optional notes
9. Backend runs Auto Wing (Phases 1–4) **in parallel**, then emits review gate 2 if configured for the product mode
10. User approves gate 2 → Analytic Wing (Phases 5–6) **in parallel**, then Phase 7 (Strategy) **without** a gate between 6 and 7
11. After Strategy completes, review gate 3 (phase `7` in the reviews API) when in full mode
12. audit.status → `completed`, overall_score set
13. User navigates to /reports/:id and /strategy/:id
```

Details: [PIPELINE.md](./PIPELINE.md). API: [API.md](./API.md).

---

## ADR — TypeScript-first (v1)

| Field | Decision |
|-------|----------|
| **Status** | Accepted |
| **Context** | Ship snapshot, express, and full audit flows on the existing Node/TypeScript stack and Supabase. |
| **Decision** | Orchestration, collectors, agents, API, and reports stay **TypeScript** (Express, Zod, Anthropic SDK). |
| **Consequence** | Optional Python (heavy crawl, OCR, ML) is **out of scope** for v1 unless promoted later with explicit ADR and infra work. |

---

## Monorepo Layout

```
/                        ← Git root
├── src/                 ← Frontend source
│   └── app/
├── public/
├── index.html
├── vite.config.ts
├── package.json         ← Frontend package (pnpm)
├── docs/                ← All documentation (this folder)
├── server/              ← Backend source
│   ├── src/
│   ├── migrations/
│   └── package.json     ← Backend package (npm)
├── CLAUDE.md            ← Claude Code context file
└── README.md
```

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Supabase Realtime instead of SSE/WebSocket from Express | Realtime is already available via Supabase; avoids maintaining a separate event stream server |
| Service role key only on backend | Anon key on frontend can only access rows permitted by RLS — prevents data leaks |
| One Claude call per phase | Maximises context quality, minimises token waste from intermediate calls |
| Collectors separated from agents | Allows retrying analysis without re-crawling; raw data cached in `collected_data` table |
| Railway for backend | Zero-config Node.js deployment; easy env var management; no cold starts on hobby tier |
| EU Frankfurt Supabase region | GDPR compliance for EU clients |

---

## Logical audit state

There is no single `audit_state.json` file in production. Persistent state is normalised across PostgreSQL tables listed in [DATABASE.md](./DATABASE.md). A JSON “document” shape is useful for exports and debugging only.
