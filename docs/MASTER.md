# GLC Audit Platform — Master Documentation

> **Single source of truth index.** Every knowledge domain of the platform is registered here.
> Each entry points to the canonical document. Never duplicate content — link to it.

---

## Quick Navigation

| What you need | Go to |
|---|---|
| What this product does | [OVERVIEW.md](./OVERVIEW.md) |
| Run locally | [SETUP.md](./SETUP.md) |
| System architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Database schema | [DATABASE.md](./DATABASE.md) |
| API endpoints | [API.md](./API.md) |
| AI pipeline (phases, agents) | [PIPELINE.md](./PIPELINE.md) |
| Agent internals, collectors, fact-checker | [AGENTS.md](./AGENTS.md) |
| React app, pages, hooks | [FRONTEND.md](./FRONTEND.md) |
| Auth, OAuth, protected routes | [AUTH.md](./AUTH.md) |
| Deploy to Vercel/Railway/Supabase | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Security model, RLS, rate limits | [SECURITY.md](./SECURITY.md) |

---

## Knowledge Domain Registry

### 1. Product & Business Logic
**What it is:** An AI-powered 8-domain business audit platform for SMB consulting. Clients submit a company URL; the platform crawls the site, runs analysis across 8 business domains, and produces a structured report with prioritised recommendations.
**Status:** Production-ready MVP
**Canonical doc:** [OVERVIEW.md](./OVERVIEW.md)

---

### 2. System Architecture
**What it is:** Full-stack monorepo. React/Vite frontend (Vercel) + Express/TypeScript backend (Railway) + Supabase (PostgreSQL + Auth + Realtime).
**Status:** Implemented
**Canonical doc:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

### 3. AI Pipeline
**What it is:** Orchestrated 8-phase pipeline. Each phase: collect raw data (no AI) → assemble context → one Claude API call → fact-check → save. Three review gates for consultant enrichment.
**Status:** Implemented (claude-sonnet-4-20250514)
**Canonical doc:** [PIPELINE.md](./PIPELINE.md)

---

### 4. Agent Architecture
**What it is:** BaseAgent abstract class inherited by 8 domain agents + ReconAgent + StrategyAgent. Each agent has dedicated collectors, an instruction builder, and a Zod output schema.
**Status:** Implemented
**Canonical doc:** [AGENTS.md](./AGENTS.md)

---

### 5. Database
**What it is:** 7-table PostgreSQL schema on Supabase. Row Level Security enforces user data isolation. Realtime enabled on `pipeline_events` and `audits`.
**Status:** Implemented — run `server/migrations/001_initial_schema.sql`
**Canonical doc:** [DATABASE.md](./DATABASE.md)

---

### 6. REST API
**What it is:** Express API under `/api/*`. Auth-protected via Supabase JWT. Covers audit CRUD, pipeline lifecycle, review approvals, and report generation.
**Status:** Implemented
**Canonical doc:** [API.md](./API.md)

---

### 7. Authentication & Authorization
**What it is:** Supabase Auth — magic link + Google OAuth. JWT forwarded from frontend to backend in `Authorization: Bearer` header. RLS on all DB tables.
**Status:** Implemented
**Canonical doc:** [AUTH.md](./AUTH.md)

---

### 8. Frontend
**What it is:** React 18 SPA with 7 pages. State via custom hooks (`useAudit`, `usePipeline`, `useAudits`, `useAuth`). Supabase Realtime subscription for live pipeline events.
**Status:** Implemented
**Canonical doc:** [FRONTEND.md](./FRONTEND.md)

---

### 9. Security
**What it is:** RLS on all tables, rate limiting (5 audits/day per user, 30 pipeline calls/hour), token budget per audit (200K default), CORS restricted to known origins.
**Status:** Implemented
**Canonical doc:** [SECURITY.md](./SECURITY.md)

---

### 10. Deployment
**What it is:** Frontend on Vercel, backend on Railway, database on Supabase Cloud (EU Frankfurt for GDPR).
**Status:** Documented, not yet deployed
**Canonical doc:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

### 11. Industry Scoring Weights
**What it is:** Per-industry multipliers for domain scores. Hospitality weights UX/SEO higher; Healthcare weights Security higher. Implemented in `server/src/config/industry-weights.ts`.
**Status:** Implemented
**Canonical doc:** [AGENTS.md#industry-weights](./AGENTS.md#industry-weights)

---

### 12. Token Economics
**What it is:** Per-audit token budget (200K default). Each Claude call logs input/output tokens to `pipeline_events`. Frontend shows running total. Budget enforced before each phase.
**Status:** Implemented
**Canonical doc:** [PIPELINE.md#token-tracking](./PIPELINE.md#token-tracking)

---

## Documentation Governance

### Rules
1. **One fact, one place.** Never write the same information in two documents. Link instead.
2. **MASTER.md is the index only.** No content lives here — only domain registry entries and links.
3. **No new files without a domain.** Before creating a file, verify its domain isn't already covered.
4. **Quota: max 20 docs total** in `/docs/`. Current count: 12.

### How to Update Docs
- Fix a bug in code → update the relevant doc in the same PR
- Add a new API endpoint → update `API.md` only
- Change DB schema → update `DATABASE.md` and run new migration
- New domain knowledge → add to MASTER.md domain registry + create or extend the relevant doc

### Documentation PR Checklist
- [ ] No information duplicated from another doc
- [ ] Cross-links added where content relates to other domains
- [ ] MASTER.md domain registry updated if new domain added
- [ ] Code and doc change in same commit

### Who Owns What
| Document | Owner |
|---|---|
| MASTER.md | Tech Lead |
| PIPELINE.md, AGENTS.md | Backend Lead |
| FRONTEND.md | Frontend Lead |
| DATABASE.md, SECURITY.md | Full-stack / DevOps |
| DEPLOYMENT.md | DevOps |
| OVERVIEW.md | Product |
