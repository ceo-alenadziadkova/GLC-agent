# GLC Audit Platform — Master documentation

Single source of truth **index** and **knowledge map**. Each domain has one canonical document; do not duplicate facts elsewhere — link here and to that file.

**Documentation quota:** at most **13** markdown files in `/docs` (flat layout, no subfolders).

---

## Quick navigation

| Need | Canonical doc |
|------|----------------|
| Product, modes, deliverables | [PRODUCT.md](./PRODUCT.md) |
| System architecture, data flow | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Phases, wings, review gates, tokens | [PIPELINE.md](./PIPELINE.md) |
| Agents, collectors, fact-check, weights | [AGENTS.md](./AGENTS.md) |
| Database tables, migrations, RLS overview | [DATABASE.md](./DATABASE.md) |
| REST API | [API.md](./API.md) |
| Auth, roles, JWT | [AUTH.md](./AUTH.md) |
| Threat model, rate limits, CORS, credentials | [SECURITY.md](./SECURITY.md) |
| React app, routes, hooks | [FRONTEND.md](./FRONTEND.md) |
| Local dev, migrations order, demo seed | [SETUP.md](./SETUP.md) |
| Production deploy (Vercel, Railway, Supabase) | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Legacy entry / short pointer | [MASTER.md](./MASTER.md) |

---

## Knowledge domain registry

### 1. Product and business logic

**What it is:** B2B audit product: URL plus progressive intake context, multi-phase analysis, scored domains, report and strategy deliverables. Supports `full`, `express`, and `free_snapshot` modes.

**Why it matters:** Defines scope of engineering work and what clients receive.

**Where it is implemented:** Product behaviour is encoded in `server/src/types/audit.ts`, `server/src/services/pipeline.ts`, UI pages under `src/app/pages/`.

**Where to find documentation:** [PRODUCT.md](./PRODUCT.md) (includes Intake Experience layers, readiness contract, and mode thresholds)

**Owner:** Product / Tech Lead (TBD)

**Status:** Implemented (MVP)

---

### 2. System architecture

**What it is:** React (Vite) frontend, Express TypeScript backend, Supabase (Postgres, Auth, Realtime), Anthropic Claude via backend only.

**Why it matters:** Boundaries (no Claude on client, service role server-only) prevent security and cost failures.

**Where it is implemented:** `src/app/`, `server/src/`, `server/src/middleware/auth.ts`.

**Where to find documentation:** [ARCHITECTURE.md](./ARCHITECTURE.md)

**Owner:** Tech Lead (TBD)

**Status:** Implemented

---

### 3. AI pipeline orchestration

**What it is:** Phase 0 recon; parallel auto wing (1–4); parallel analytic wing (5–6) then strategy phase 7; review gates; token budget; quality/consistency checks.

**Why it matters:** Correct sequencing and gates match `PipelineOrchestrator` behaviour and API contracts.

**Where it is implemented:** `server/src/services/pipeline.ts`, `server/src/services/consistency-checker.ts`.

**Where to find documentation:** [PIPELINE.md](./PIPELINE.md)

**Owner:** Backend Lead (TBD)

**Status:** Implemented

---

### 4. Agents, collectors, and scoring

**What it is:** `BaseAgent` pattern; programmatic collectors; one Claude call per phase; Zod output validation; fact-checker; industry weights for overall score.

**Why it matters:** Enforces data-first execution and reduces hallucinated scores.

**Where it is implemented:** `server/src/agents/`, `server/src/collectors/`, `server/src/services/fact-checker.ts`, `server/src/config/industry-weights.ts`.

**Where to find documentation:** [AGENTS.md](./AGENTS.md)

**Owner:** Backend Lead (TBD)

**Status:** Implemented

---

### 5. Data storage

**What it is:** PostgreSQL schema on Supabase; migrations `001`–`012`; RLS; Realtime on key tables.

**Why it matters:** Persistence and isolation for audits, events, client portal, intake brief.

**Where it is implemented:** `server/migrations/*.sql`, Supabase project.

**Where to find documentation:** [DATABASE.md](./DATABASE.md)

**Owner:** Full-stack / DevOps (TBD)

**Status:** Implemented (apply all migrations in order)

---

### 6. REST API

**What it is:** Express routes under `/api/*`; JWT for protected routes; public snapshot routes; cache headers on private responses.

**Why it matters:** Contract between frontend and backend; client portal and consultant flows.

**Where it is implemented:** `server/src/routes/`.

**Where to find documentation:** [API.md](./API.md)

**Owner:** Backend Lead (TBD)

**Status:** Implemented

---

### 7. Authentication and authorization

**What it is:** Supabase Auth (magic link, Google); JWT to backend; roles via `profiles.role` (`consultant` / `client`); consultant-only pipeline mutations.

**Why it matters:** Access control for audits and pipeline execution.

**Where it is implemented:** `server/src/middleware/auth.ts`, `server/src/routes/pipeline.ts` (consultant guards), `src/app/lib/supabase.ts`.

**Where to find documentation:** [AUTH.md](./AUTH.md)

**Owner:** Full-stack Lead (TBD)

**Status:** Implemented

---

### 8. Security

**What it is:** Threat assumptions, RLS summary, JWT verification, rate limiting, CORS, credential separation, GDPR notes.

**Why it matters:** Operational security and compliance expectations.

**Where it is implemented:** `server/src/middleware/rate-limit.ts`, Supabase policies in migrations, frontend hosting config.

**Where to find documentation:** [SECURITY.md](./SECURITY.md)

**Owner:** Full-stack / DevOps (TBD)

**Status:** Documented; align RLS narrative with latest migrations via [DATABASE.md](./DATABASE.md)

---

### 9. Frontend application

**What it is:** React 18 SPA: pages, hooks, Realtime subscriptions, API client.

**Why it matters:** User-facing audit workflow and live pipeline UI.

**Where it is implemented:** `src/app/`.

**Where to find documentation:** [FRONTEND.md](./FRONTEND.md)

**Owner:** Frontend Lead (TBD)

**Status:** Implemented

---

### 10. Local development and demo

**What it is:** Tooling, env vars, running servers, ordered migrations, optional seeded demo audit.

**Why it matters:** Onboarding and repeatable demos without running full AI pipeline.

**Where it is implemented:** `package.json`, `server/package.json`, `server/scripts/seed-demo.ts`.

**Where to find documentation:** [SETUP.md](./SETUP.md)

**Owner:** Tech Lead (TBD)

**Status:** Documented

---

### 11. Deployment and infrastructure

**What it is:** Vercel (frontend), Railway (backend), Supabase Cloud; production environment variables.

**Why it matters:** How the running system is hosted.

**Where it is implemented:** Hosting providers; `DEPLOYMENT.md` references.

**Where to find documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md)

**Owner:** DevOps (TBD)

**Status:** Documented (**Needs Review:** whether a specific production deployment is live is environment-specific; see [DEPLOYMENT.md](./DEPLOYMENT.md) and your hosting dashboards)

---

### 12. Token economics and industry weights

**What it is:** Per-audit token budget; logged usage; weighted overall score by industry.

**Why it matters:** Cost control and fair cross-industry scoring.

**Where it is implemented:** `audits.token_budget`, `pipeline_events`, `server/src/config/industry-weights.ts`.

**Where to find documentation:** [PIPELINE.md#token-tracking](./PIPELINE.md#token-tracking), [AGENTS.md#industry-weights](./AGENTS.md#industry-weights)

**Owner:** Backend Lead (TBD)

**Status:** Implemented

---

## Documentation governance

### Rules

1. **One fact, one place.** If it is already documented in the canonical file, link to it (`See: /docs/<FILE>.md#anchor`).
2. **Code and docs together.** Any change to user-visible behaviour, API contracts, auth rules, schema, pipeline sequencing, or deployment requirements must update the relevant **existing** canonical doc in the **same PR**. If the truth is unknown, add a **Needs Review** note instead of guessing.
3. **No new doc files** unless the team agrees to replace or merge an existing file and stay within the **13-file** quota.
4. **Flat `/docs`.** No subfolders under `docs/` (project convention).

### Documentation PR checklist

- [ ] Canonical doc updated (not a second copy elsewhere)
- [ ] Cross-links added where another domain is affected
- [ ] `MASTER_DOCUMENTATION.md` domain registry updated if a new concern spans domains or ownership changes
- [ ] Migrations order / schema changes reflected in [DATABASE.md](./DATABASE.md) when SQL changes
- [ ] **Needs Review** used for anything not verified against code or production

### Who updates the master document

**Tech Lead** (or delegate) keeps [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md) aligned with the canonical map when domains split/merge or ownership changes.

---

## Restructuring log (2026-03)

### New documentation tree (13 files, flat)

```text
docs/
  MASTER_DOCUMENTATION.md   # This file — index + knowledge map + governance + restructuring log
  MASTER.md                 # Short pointer to MASTER_DOCUMENTATION.md
  PRODUCT.md
  ARCHITECTURE.md
  PIPELINE.md
  AGENTS.md
  API.md
  AUTH.md
  SECURITY.md
  DATABASE.md
  FRONTEND.md
  SETUP.md
  DEPLOYMENT.md
```

### Structural diff summary

| Action | Item |
|--------|------|
| Added | `MASTER_DOCUMENTATION.md`, `PRODUCT.md` |
| Replaced / removed | `OVERVIEW.md` (superseded by `PRODUCT.md`) |
| Merged | `DEMO.md` into `SETUP.md` (Demo section) |
| Removed | `ARCHITECTURE-upd.md`, `CONCEPT-upd.md` (content merged or superseded by canonical docs) |
| Slimmed | `MASTER.md` — pointer only |

### Duplication report (consolidated)

| Topic | Was duplicated across | Consolidated into |
|-------|------------------------|-------------------|
| Product overview vs long concept doc | `OVERVIEW.md`, `CONCEPT-upd.md` | [PRODUCT.md](./PRODUCT.md) + links to technical docs |
| Architecture narrative vs `ARCHITECTURE-upd` | `ARCHITECTURE.md`, `ARCHITECTURE-upd.md` | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Pipeline / gates / parallel wings | `PIPELINE.md`, `ARCHITECTURE.md`, concept docs | [PIPELINE.md](./PIPELINE.md) (behaviour), [ARCHITECTURE.md](./ARCHITECTURE.md) (high-level flow) |
| Master index vs registry prose | `MASTER.md` | [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md) |
| Demo steps vs setup | `DEMO.md`, `SETUP.md` | [SETUP.md](./SETUP.md) |
| Table count / schema drift | `DATABASE.md`, older lines in `SECURITY.md` | [DATABASE.md](./DATABASE.md) as schema source; [SECURITY.md](./SECURITY.md) defers details |

### Knowledge domains identified

Product; System architecture; AI pipeline; Agents and collectors; Data storage; REST API; Authentication and authorization; Security; Frontend; Local setup and demo; Deployment; Token economics and industry weights (cross-linked to Pipeline and Agents).
