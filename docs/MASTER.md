# GLC Audit Platform — Master documentation

Single source of truth **index** and **knowledge map**. Each domain has one canonical document; do not duplicate facts elsewhere — link here and to that file.

**Documentation quota:** at most **20** markdown files in flat `docs/*.md` (ADR archive under `docs/adrs/` is tracked separately). The [TECH_DEBT.md](./TECH_DEBT.md) register counts toward this quota.

**Single master index:** There is **no** separate `MASTER_DOCUMENTATION.md` or second top-level index. Extend **this file** only for navigation, domain registry, and governance.

---

## Quick navigation

### Product and narrative

| Need | Canonical doc |
| --- | --- |
| Product concept and operating principles | [CONCEPT.md](./CONCEPT.md) |
| Product, modes, deliverables | [PRODUCT.md](./PRODUCT.md) |
| Intake question bank, branching, agent mapping | [QUESTION_BANK.md](./QUESTION_BANK.md) |
| Deferred product/UX backlog | [IMPROVEMENTS.md](./IMPROVEMENTS.md) |
| Translator / product glossary (i18n support) | [GLOSSARY.md](./GLOSSARY.md) |

### Engineering and platform

| Need | Canonical doc |
| --- | --- |
| System architecture, data flow, **config vs DB vs services vs UI**, **strict ENV/CONFIG/SERVICES boundaries**, **copy zones** | [ARCHITECTURE.md](./ARCHITECTURE.md) ([layering](./ARCHITECTURE.md#configuration-layering-config-vs-database-vs-services-vs-ui), [strict boundaries](./ARCHITECTURE.md#strict-layer-boundaries-operational-policy), [copy layering](./ARCHITECTURE.md#6-user-visible-copy-layering-single-source-per-zone)) |
| Phases, wings, review gates, tokens, CONTROL_OBJECT v2 | [PIPELINE.md](./PIPELINE.md) |
| Agents, collectors, fact-check, weights | [AGENTS.md](./AGENTS.md) |
| Database tables, migrations, RLS | [DATABASE.md](./DATABASE.md) |
| REST API (human contract) | [API.md](./API.md) |
| Literal `error` string inventory (generated; see [API.md](./API.md#error-responses)) | [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md) |
| Auth, roles, JWT | [AUTH.md](./AUTH.md) |
| Threat model, rate limits, CORS, snapshot log redaction | [SECURITY.md](./SECURITY.md) |
| React app, routes, hooks, design system | [FRONTEND.md](./FRONTEND.md) ([style guide](./FRONTEND.md#design-system-style-guide)) |
| Local dev, demo seed | [SETUP.md](./SETUP.md) |
| Production deploy (Vercel, Railway, Supabase), env matrix, monitoring hooks | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Engineering debt register | [TECH_DEBT.md](./TECH_DEBT.md) |
| Test matrix, coverage, E2E | [TESTING.md](../TESTING.md) (repo root) |
| CI workflows (tests, secret scan, migration smoke) | [.github/workflows](../.github/workflows) |
| FACT-CHECKER / Decision Layer roadmap vs code | [GAP-ANALYSIS-PHASE0](./adrs/GAP-ANALYSIS-PHASE0.md) |
| Other ADRs (decisions, future phases) | [docs/adrs/](./adrs/) — see tree under [Restructuring log](#restructuring-log) |

Selected ADR quick links:

| Topic | Doc |
| --- | --- |
| Unified question bank, IntakePlan, Question Bank Studio | [ADR-INTAKE-UNIFIED-QUESTION-BANK.md](adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md) |
| Free snapshot scanner | [ADR-FREE-SNAPSHOT-SCANNER.md](adrs/ADR-FREE-SNAPSHOT-SCANNER.md) |
| Intake wording lifecycle + trace IA | [ADR-INTAKE-QUESTION-WORDING-LIFECYCLE.md](adrs/ADR-INTAKE-QUESTION-WORDING-LIFECYCLE.md) |
| Frontend i18n | [ADR-FRONTEND-I18N.md](adrs/ADR-FRONTEND-I18N.md) |
| Domain final-readiness package (6 domains + strategy) | [ADR-DOMAIN-FINAL-READINESS-SUMMARY.md](adrs/ADR-DOMAIN-FINAL-READINESS-SUMMARY.md) |

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

**What it is:** **Modular monolith:** React (Vite) SPA, Express TypeScript API, Supabase (Postgres, Auth, Realtime), Anthropic Claude **only** on the server. This is not a microservices topology.

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

**What it is:** PostgreSQL schema on Supabase; migrations in `server/migrations/` (apply all in numeric order); RLS; Realtime on key tables.

**Why it matters:** Persistence and isolation for audits, events, client portal, intake brief.

**Where it is implemented:** `server/migrations/*.sql`, Supabase project.

**Where to find documentation:** [DATABASE.md](./DATABASE.md)

**Owner:** Full-stack / DevOps (TBD)

**Status:** Implemented (apply all migrations in order)

---

### 6. REST API

**What it is:** Express routes under `/api/*`; JWT for protected routes; public snapshot routes; cache headers on private responses.

**Why it matters:** Contract between frontend and backend; client portal and consultant flows.

**Where it is implemented:** `server/src/routes/`; routers are mounted from `server/src/config/api-route-mounts.ts` (`mountApiRouters` in `server/src/index.ts`). SPA paths: `src/app/config/api-paths.ts` (Vitest contract vs mounts: `server/src/tests/api-paths-mount-contract.test.ts`).

**Where to find documentation:** [API.md](./API.md)

**Owner:** Backend Lead (TBD)

**Status:** Implemented

---

### 7. Authentication and authorization

**What it is:** Supabase Auth (email/password, Google); JWT to backend; roles via `profiles.role` (`consultant` / `client`); consultant-only pipeline mutations.

**Why it matters:** Access control for audits and pipeline execution.

**Where it is implemented:** `server/src/middleware/auth.ts`, `server/src/routes/pipeline.ts` (consultant guards), `src/app/lib/supabase.ts`.

**Where to find documentation:** [AUTH.md](./AUTH.md)

**Owner:** Full-stack Lead (TBD)

**Status:** Implemented

---

### 8. Security

**What it is:** Threat assumptions, RLS summary, JWT verification, rate limiting, CORS, credential separation, GDPR notes, prompt trust-boundary.

**Why it matters:** Operational security and compliance expectations.

**Where it is implemented:** `server/src/middleware/rate-limit.ts`, Supabase policies in migrations, frontend hosting config.

**Where to find documentation:** [SECURITY.md](./SECURITY.md)

**Owner:** Full-stack / DevOps (TBD)

**Status:** Documented; RLS / advisor notes for migrations **`043`–`045`** live in [DATABASE.md](./DATABASE.md)

---

### 9. Frontend application

**What it is:** React 18 SPA: pages, hooks, Realtime subscriptions, API client; **GLC design system** (tokens in `src/styles/theme.css`, light/dark, shadcn-compatible variables).

**Why it matters:** User-facing audit workflow and live pipeline UI.

**Where it is implemented:** `src/app/`, `src/styles/`.

**Where to find documentation:** [FRONTEND.md](./FRONTEND.md) — canonical [**Design system (style guide)**](./FRONTEND.md#design-system-style-guide) (Figma-style foundations + components)

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

### 13. CI/CD and automated quality gates

**What it is:** GitHub Actions workflows, root and server test scripts, secret scanning, migration smoke checks where configured.

**Why it matters:** Regressions and insecure configs are caught before merge or deploy.

**Where it is implemented:** [`.github/workflows`](../.github/workflows), root `package.json` / `server/package.json` scripts.

**Where to find documentation:** [TESTING.md](../TESTING.md); workflow YAML for exact job list.

**Owner:** Tech Lead / DevOps (TBD)

**Status:** Implemented (see CI in repo)

---

### 14. Observability and operations

**What it is:** Structured logging, optional Sentry/Telegram, hosted log drains, snapshot run signals, deploy monitoring notes.

**Why it matters:** Incident response and capacity tuning depend on consistent signals and redaction rules.

**Where it is implemented:** `server/src` logging, Sentry/Telegram wiring; see [DEPLOYMENT.md](./DEPLOYMENT.md) § Monitoring.

**Where to find documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md) (monitoring, runbooks), [SECURITY.md](./SECURITY.md) (snapshot log redaction).

**Owner:** DevOps / Backend (TBD)

**Status:** Documented

---

### 15. Roadmap, ADRs, and technical decisions

**What it is:** Architecture Decision Records and gap analyses for future phases; engineering backlog in [TECH_DEBT.md](./TECH_DEBT.md); product backlog in [IMPROVEMENTS.md](./IMPROVEMENTS.md).

**Why it matters:** Separates **historical / proposed** design from **current behaviour** documented in flat `docs/*.md`.

**Where it is implemented:** [docs/adrs/](./adrs/); code references in ADR headers and migrations.

**Where to find documentation:** This registry + [docs/adrs/](./adrs/); do not duplicate ADR prose inside flat topic files — link instead.

**Owner:** Tech Lead (TBD)

**Status:** Mixed (some ADRs describe future work; see each file)

---

## Documentation governance

### Rules

1. **One fact, one place.** If it is already documented in the canonical file, link to it (`See: /docs/<FILE>.md#anchor`).
2. **Code and docs together.** Any change to user-visible behaviour, API contracts, auth rules, schema, pipeline sequencing, or deployment requirements must update the relevant **existing** canonical doc in the **same PR**. If the truth is unknown, add a **Needs Review** note instead of guessing.
3. **No new flat `docs/*.md` files** unless the team agrees to replace or merge an existing file and stay within the **20-file flat-doc quota** (see top of this file). **Do not** add a second master index (e.g. `MASTER_DOCUMENTATION.md`); keep **MASTER.md** as the only index.
4. **API error inventory:** [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md) lists route `error` literals; `./scripts/api-errors-inventory.sh` prints `rg` matches to stdout — use it to refresh grouped tables after route changes; do not drift the literal tables away from code by casual edits.
5. **Structure rule.** Canonical topic docs stay at `docs/*.md`. **ADR archive:** `docs/adrs/*`. **Obsolete stubs only:** `docs/archive/*` (short pointer + link to replacement; no duplicate facts).

### Documentation PR checklist

- [ ] Canonical doc updated (not a second copy elsewhere)
- [ ] Cross-links added where another domain is affected
- [ ] [MASTER.md](./MASTER.md) domain registry updated if a new concern spans domains or ownership changes
- [ ] Migrations order / schema changes reflected in [DATABASE.md](./DATABASE.md) when SQL changes
- [ ] **Needs Review** used for anything not verified against code or production
- [ ] If API error copy or codes changed: update `server/src/config/api-error-codes.ts` / messages JSON; refresh literal tables in [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md) using `./scripts/api-errors-inventory.sh` output where applicable

### Who updates the master document

**Tech Lead** (or delegate) keeps [MASTER.md](./MASTER.md) aligned with the canonical map when domains split/merge or ownership changes.

---

## Restructuring log

### Current primary documentation tree (flat docs + ADR archive; quota: 20)

```text
docs/
  MASTER.md                              # Only master index + knowledge map + governance + log
  CONCEPT.md
  PRODUCT.md
  ARCHITECTURE.md
  PIPELINE.md
  AGENTS.md
  API.md
  API_ERRORS_INVENTORY.md              # Generated — see governance rules
  AUTH.md
  SECURITY.md
  DATABASE.md
  FRONTEND.md
  GLOSSARY.md
  QUESTION_BANK.md
  IMPROVEMENTS.md
  TECH_DEBT.md
  SETUP.md
  DEPLOYMENT.md
  archive/
    README.md                            # Policy for obsolete doc stubs only
  adrs/
    ADR-AUTO-LOOP-RULE-ENGINE.md
    ADR-AUTO-REMEDIATION.md
    ADR-CAUSAL-DAG.md
    ADR-CONTROL-OBJECT-V1.md
    ADR-CONTROL-OBJECT-V2-FULL.md
    ADR-DECISION-LAYER-GATES.md
    ADR-DOMAIN-BENCHMARKS.md
    ADR-DOMAIN-AUTOMATION-PROCESSES-FINAL-READY.md
    ADR-DOMAIN-FINAL-READINESS-SUMMARY.md
    ADR-DOMAIN-MARKETING-UTP-FINAL-READY.md
    ADR-DOMAIN-SECURITY-COMPLIANCE-FINAL-READY.md
    ADR-DOMAIN-SEO-DIGITAL-FINAL-READY.md
    ADR-DOMAIN-STRATEGY-FINAL-READY.md
    ADR-DOMAIN-TECH-INFRASTRUCTURE-FINAL-READY.md
    ADR-DOMAIN-UX-CONVERSION-FINAL-READY.md
    ADR-FACT-CHECKER-UNIFIED-KERNEL.md
    ADR-FEASIBILITY-RULE-ENGINE.md
    ADR-FREE-SNAPSHOT-SCANNER.md
    ADR-FRONTEND-I18N.md
    ADR-INTAKE-QUESTION-WORDING-LIFECYCLE.md
    ADR-INTAKE-UNIFIED-QUESTION-BANK.md
    ADR-ML-BANDITS.md
    ADR-MULTIMODAL-TRUTH.md
    ADR-PHASE-PROFILES.md
    ADR-SAFETY-MODE-EXECUTION.md
    ADR-TRUTH-REGISTRY-ASSUMPTIONS.md
    GAP-ANALYSIS-PHASE0.md
```

### Consolidation (2026-04)

| Action | Item |
| --- | --- |
| Removed duplicate index | `MASTER_DOCUMENTATION.md` merged into **`MASTER.md`** — one master file only |

### Consolidation (2026-04-13) — SSOT pass

| Action | Item |
| --- | --- |
| Registry | Added domains **CI/CD**, **Observability**, **Roadmap/ADR**; split Quick navigation (product vs engineering); clarified modular monolith |
| Governance | Second master file forbidden; `docs/archive/` for obsolete stubs; `API_ERRORS_INVENTORY.md` regeneration rule |
| Deduped | Supabase/migrations pointers → [DATABASE.md](./DATABASE.md#overview) in SETUP/DEPLOYMENT; AGENTS intake → links to QUESTION_BANK + API |
| ADR folder | **`docs/adrs/`** kept as-is (no rename to `adr`) |

#### Duplication report (2026-04-13)

| Topic | Was duplicated across | Consolidated into |
| --- | --- | --- |
| Schema bootstrap / migration order | SETUP, DEPLOYMENT | [DATABASE.md](./DATABASE.md#overview) |
| Intake bank / tuple / API behaviour | AGENTS, QUESTION_BANK, API | AGENTS → short pointer; detail in QUESTION_BANK + API |
| API errors: codes vs literals | API, API_ERRORS_INVENTORY, code | SoT: `api-error-codes.ts` + JSON; human summary [API.md](./API.md#error-responses); inventory generated |
| Stack narrative | CLAUDE.md, ARCHITECTURE | CLAUDE → pointer to ARCHITECTURE + MASTER |

---

### Historical: restructuring (2026-03)

#### Documentation tree at the time (13 files)

Previously the index lived in `MASTER_DOCUMENTATION.md` with `MASTER.md` as a short pointer. That split caused drift; the long-form index now lives only here.

```text
docs/
  MASTER_DOCUMENTATION.md
  MASTER.md
  PRODUCT.md
  ...
```

#### Structural diff summary (2026-03)

| Action | Item |
| --- | --- |
| Added | `MASTER_DOCUMENTATION.md`, `PRODUCT.md` |
| Replaced / removed | `OVERVIEW.md` (superseded by `PRODUCT.md`) |
| Merged | `DEMO.md` into `SETUP.md` (Demo section) |
| Removed | `ARCHITECTURE-upd.md`, `CONCEPT-upd.md` (content merged or superseded by canonical docs) |
| Slimmed | `MASTER.md` — pointer only (superseded 2026-04 by full index in `MASTER.md`) |

#### Duplication report (consolidated)

| Topic | Was duplicated across | Consolidated into |
| --- | --- | --- |
| Product overview vs long concept doc | `OVERVIEW.md`, `CONCEPT-upd.md` | [PRODUCT.md](./PRODUCT.md) + links to technical docs |
| Architecture narrative vs `ARCHITECTURE-upd` | `ARCHITECTURE.md`, `ARCHITECTURE-upd.md` | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Pipeline / gates / parallel wings | `PIPELINE.md`, `ARCHITECTURE.md`, concept docs | [PIPELINE.md](./PIPELINE.md) (behaviour), [ARCHITECTURE.md](./ARCHITECTURE.md) (high-level flow) |
| Master index | `MASTER.md` vs `MASTER_DOCUMENTATION.md` | [MASTER.md](./MASTER.md) only (since 2026-04) |
| Demo steps vs setup | `DEMO.md`, `SETUP.md` | [SETUP.md](./SETUP.md) |
| Table count / schema drift | `DATABASE.md`, older lines in `SECURITY.md` | [DATABASE.md](./DATABASE.md) as schema source; [SECURITY.md](./SECURITY.md) defers details |

#### Knowledge domains identified

Product; System architecture; AI pipeline; Agents and collectors; Data storage; REST API; Authentication and authorization; Security; Frontend; Local setup and demo; Deployment; Token economics and industry weights (cross-linked to Pipeline and Agents).
