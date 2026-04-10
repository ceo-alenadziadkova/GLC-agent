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

#### Public routes, abuse control, and scaling

Unauthenticated surfaces (Discover, tokenized pre-brief intake, marketing brief) rely on **split per-route limiters** in `server/src/middleware/rate-limit.ts` (see env vars in [ADR-INTAKE-UNIFIED-QUESTION-BANK](./adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md) operational notes). That mitigates abuse but is **not** a full product security boundary by itself.

**Horizontal scale:** limiters use **`RedisStore`** when **`RATE_LIMIT_REDIS_URL`** is set. If it is **unset**, `express-rate-limit` falls back to **`MemoryStore`**: each Node process keeps **separate** counters, so a client can obtain up to **N × per-process budget** against **N** instances. Treat **`RATE_LIMIT_REDIS_URL` as required for multi-instance production** on those public routes. (This is infrastructure operations, not part of the intake ADR’s functional model.)

**Authenticated brief writes (`intake_versions`):** supported artifact tuples are validated on **PUT**; unsupported → **400**, mismatch with stored row → **409** (except allowed upgrades). The **server** persists answers and the effective tuple — clients cannot force an unsupported bundle or skip validation by tuple alone. See [API.md](./API.md).

**SPA vs API releases:** the stored **version tuple** and PUT rules reduce “client rendered one bank snapshot, server validated another” drift; they do **not** remove every UX edge case if the SPA and API ship incompatible `@glc/intake-core` resolver changes out of sync. Prefer **aligned** frontend and backend releases when changing intake semantics.

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

## Open-source collector libraries

Server-side crawling still uses Cheerio and custom BFS; the following libraries extend **robots.txt**, **sitemap XML**, and optional **deep audits**:

| Concern | Package | Notes |
|---|---|---|
| robots.txt (Allow/Disallow, wildcards, crawl-delay, Sitemap:) | [robots-parser](https://www.npmjs.com/package/robots-parser) ([repo](https://github.com/samclarke/robots-parser)) | Used for snapshot policy (`server/src/snapshot/robots-guard.ts`) and SEO collector checks (`server/src/collectors/seo.ts`). |
| Sitemap urlset + sitemap index | [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) | Bounded recursive fetch in `server/src/lib/sitemap-discovery.ts`. |
| Programmatic Lighthouse | [lighthouse](https://www.npmjs.com/package/lighthouse) + [chrome-launcher](https://www.npmjs.com/package/chrome-launcher) | Gated by `AUDIT_LIGHTHOUSE` / `AUDIT_DEEP_SCAN`; see [Using Lighthouse programmatically](https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md#using-programmatically). |
| Accessibility rules in a real browser | [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) + [Playwright](https://playwright.dev/) | Gated by `AUDIT_AXE_PLAYWRIGHT` / `AUDIT_DEEP_SCAN`. |
| Multi-URL Lighthouse orchestration (target full audit) | [Unlighthouse](https://github.com/harlan-zw/unlighthouse) (MIT) | **Not integrated yet.** Preferred direction for **capped** site sampling + Lighthouse runs across multiple URLs (see subsection below). Context7: `/harlan-zw/unlighthouse`. |

### Target architecture: Lighthouse and Unlighthouse

**Goal:** separate **marginal-cost-sensitive** paths (free snapshot) from **depth-first** paths (full audit) for all Chrome-heavy performance work.

| Mode | Target direction | Where we are today |
| --- | --- | --- |
| **Full audit** (consultant pipeline) | **Multi-URL performance sampling**: run Lighthouse across a **bounded** set of URLs derived from the crawl (key templates, not the whole site). Implement as an **Unlighthouse-class** flow (Unlighthouse itself or equivalent orchestration), with strict caps on URL count, wall time, and concurrency so deploys stay predictable. | **Interim:** `PerformanceCollector` runs **one** programmatic Lighthouse pass on the submitted `companyUrl` via `server/src/lib/lighthouse-audit.ts`, gated by `AUDIT_LIGHTHOUSE` / `AUDIT_DEEP_SCAN`. |
| **Free snapshot** (`/api/snapshot`) | **No Unlighthouse.** Stay within [ADR-FREE-SNAPSHOT-SCANNER.md](adrs/ADR-FREE-SNAPSHOT-SCANNER.md): tiered HTTP + cheerio, optional Playwright for thin homepage only. **Optional future product:** at most **one** **explicit opt-in** programmatic Lighthouse (single URL) — never a default on every anonymous completion. | **Matches target for “no Lighthouse default”:** snapshot does not call Lighthouse; snapshot Playwright stays scoped to the ADR. |

**Rationale:** Full audit promises depth across real pages; snapshot promises speed and low marginal cost. A multi-page Chrome farm on default snapshot traffic would break latency and cost SLOs unless it is strictly opt-in and separately budgeted.

**Context7 library IDs** (for `query-docs` when the MCP is available): `/googlechrome/lighthouse`, `/naturalintelligence/fast-xml-parser`, `/microsoft/playwright`, `/dequelabs/axe-core`. The npm `robots-parser` project is not indexed on Context7; use the [package README](https://github.com/samclarke/robots-parser/blob/master/README.md) or npm page.

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

**Intake contract:** progressive layers, collection modes, and field semantics are defined in product terms in [PRODUCT.md](./PRODUCT.md#intake-experience-progressive-model) (`intake_brief` table plus derived readiness fields — see [DATABASE.md](./DATABASE.md)).

**Unified intake resolver (ADR):** Runtime entry point `buildIntakePlan()` ships in the workspace package **`@glc/intake-core`** ([`packages/intake-core`](../packages/intake-core/src/index.ts)). Canon rules: [`branch-rules.ts`](../packages/intake-core/src/branch-rules.ts) + [`question-bank.v1.json`](../packages/intake-core/src/question-bank.v1.json). Policy artifact: [`intake-policy.v1.json`](../packages/intake-core/src/intake-policy.v1.json). Layout artifact: [`layout-rules.v1.json`](../packages/intake-core/src/layout-rules.v1.json). The SPA imports **`@glc/intake-core`** (e.g. [`src/app/hooks/useIntakeWizard.ts`](../src/app/hooks/useIntakeWizard.ts), [`src/app/lib/discovery-flow.ts`](../src/app/lib/discovery-flow.ts)). Server build compiles the package to `packages/intake-core/dist` before `tsc`. Full decision record: [ADR-INTAKE-UNIFIED-QUESTION-BANK.md](adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md).
