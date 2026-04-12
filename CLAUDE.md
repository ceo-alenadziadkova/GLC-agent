# Claude Code Context — GLC Audit Platform

This file gives Claude Code the context needed to work effectively in this repo.

## What This Project Is

A full-stack B2B SaaS platform for AI-powered business audits. A consultant submits a company URL; the system crawls the site and runs analysis across 8 business domains using Claude AI, producing a scored report with strategic recommendations.

**Status:** Production-ready MVP. All phases implemented. Frontend connected to live backend.

---

## Architecture in One Paragraph

React 18 + Vite frontend (Vercel) talks to an Express + TypeScript backend (Railway) via REST. The backend orchestrates an 8-phase AI pipeline: programmatic collectors gather data (no AI), then one `claude-sonnet-4-20250514` call per phase analyses and scores. Results are stored in Supabase PostgreSQL. The frontend subscribes to `pipeline_events` and `audits` via Supabase Realtime for live updates. Supabase Auth handles email/password + Google OAuth; RLS enforces user data isolation.

---

## Critical Rules (Don't Break These)

1. **Never call Claude from the frontend.** All AI goes through the Express backend.
2. **Never use service role key on frontend.** `SUPABASE_SERVICE_KEY` is backend-only.
3. **One Claude call per phase.** Don't add intermediate Claude calls inside agents.
4. **Collectors never call Claude.** Collectors are programmatic only (fetch + cheerio).
5. **Always filter DB queries by `userId`.** Backend routes must include `user_id = req.userId` in queries, even though service role key bypasses RLS.
6. **All protected routes need `requireAuth` middleware.** Check `server/src/routes/` patterns.
7. **Primary docs live flat in `/docs/*.md` with a 15-file quota.** Treat `docs/adrs/` as legacy ADR archive: do not expand it by default.
8. **No emoji in source code.** Use Phosphor React icons instead — e.g. `<CircleIcon size={20} color="#df3434" weight="fill" />`. Emoji are allowed only in agent prompt strings (LLM instructions) and user-facing log messages emitted to `pipeline_events`.
9. **Question bank changes are cross-system, never JSON-only.** Any change to `packages/intake-core/src/question-bank.v1.json` or answer options must be synchronized with `bank-question-ui-overrides.ts`, `choice-specify-triggers.ts`, `ai-readiness.ts`, `answer-normalizers.ts`, discovery mapping (`src/app/lib/discovery-flow.ts`, `server/src/routes/discover.ts` when relevant), tests, and docs (`docs/QUESTION_BANK.md`; `docs/API.md` if contract behavior changes). Follow `docs/QUESTION_BANK.md` §15 and `.cursor/rules/intake-question-bank-change-protocol.mdc`.
10. **`server/src/snapshot/` in automated checks.** That tree is ignored by ESLint and excluded from server Vitest coverage (see `eslint.config.js`, `server/vitest.config.ts`). It is still compiled by `tsc`. Treat it as library-style snapshot code when auditing or refactoring.

---

## Key Files & Their Roles

| File | Role |
|---|---|
| `server/src/services/pipeline.ts` | Pipeline orchestrator — phase sequencing, review gates, error recovery |
| `server/src/agents/base.ts` | BaseAgent — collect → assemble → call → fact-check → save pattern |
| `server/src/services/context-builder.ts` | Assembles Claude context for each agent call |
| `server/src/services/fact-checker.ts` | Validates Claude scores against raw metrics |
| `server/src/middleware/auth.ts` | JWT verification for all protected routes |
| `server/src/config/industry-weights.ts` | Domain score weights per industry |
| `server/src/schemas/domain-output.ts` | Zod schemas for Claude response validation |
| `src/app/data/apiService.ts` | Frontend API client — adds auth headers, typed methods |
| `src/app/data/auditTypes.ts` | TypeScript types + `DOMAIN_KEYS` constant |
| `src/app/lib/supabase.ts` | Supabase client init (anon key) |
| `src/app/hooks/usePipeline.ts` | Supabase Realtime subscription to pipeline_events |
| `src/app/components/AppShell.tsx` | Layout with audit-aware navigation (`useCurrentAuditId`) |
| `packages/intake-core` (`@glc/intake-core`) | Shared intake: `buildIntakePlan`, question bank JSON, SLA gates, validation helpers, **choice “specify other”** (`choiceValueNeedsSpecify`, …) — import only this package from app/server (no `server/src/intake`, no duplicate `src/app/lib` shim) |

---

## Data Model Quick Reference

```
audits (1)
  ├── audit_recon (1:1)      — Phase 0 output
  ├── audit_domains (1:6)    — Phases 1-6 output (one row per domain_key)
  ├── audit_strategy (1:1)   — Phase 7 output
  ├── pipeline_events (1:N)  — Immutable event log (Realtime source)
  ├── collected_data (1:N)   — Raw collector cache (reuse on retry)
  └── review_points (1:3)    — Gate approvals + consultant/interview notes
```

Domain keys: `tech_infrastructure` | `security_compliance` | `seo_digital` | `ux_conversion` | `marketing_utp` | `automation_processes`

Scores: 1 (Critical) → 2 (Needs Work) → 3 (Moderate) → 4 (Good) → 5 (Excellent)

---

## Phase Map

```
0:Recon → Gate1 → 1:Tech → 2:Security → 3:SEO → 4:UX → Gate2 → 5:Marketing → 6:Automation → Gate3 → 7:Strategy
```

Review gates: after phases 0, 4, 7. Consultant adds notes that become context for next phases.

---

## Frontend Routes

```
/                    RootEntry → MarketingHome (public) or redirect by role / OAuth → /login
/snapshot            SnapshotPage       (public) — marketing shell + SnapshotLanding
/express-audit       ExpressAuditPage   (public)
/audit               FullAuditPage      (public marketing) — before /audit/:id
/discovery, /audit/discover  DiscoveryPublicPage (public)
/brief               PublicBriefPage    (public)
/faq                 FaqPage            (public)
/login               Login.tsx          (public)
/dashboard           Dashboard          (protected consultant)
/portfolio           → /dashboard       (redirect)
/audit/new           NewAudit.tsx       (protected)
/pipeline/:id        PipelineMonitor    (protected) — Realtime
/audit/:id           AuditWorkspace     (protected) — Realtime
/audit/:id/:domainId AuditWorkspace     (protected)
/reports/:id         ReportViewer       (protected)
/strategy/:id        StrategyLab        (protected)
/portal              ClientPortal       (protected client)
/portal/audit/:id    ClientAuditView    (protected client)
/intake/:token       IntakeBrief        (public)
```

---

## Backend Route Patterns

All routes under `/api/`. All except health check, public snapshot start/poll/quota (`/api/snapshot` GET/POST except `POST /claim`), intake/discover/marketing brief, require `requireAuth` middleware.

```
POST   /api/audits
GET    /api/audits
GET    /api/audits/:id
DELETE /api/audits/:id
POST   /api/audits/:id/pipeline/start
POST   /api/audits/:id/pipeline/next
GET    /api/audits/:id/pipeline/status
POST   /api/audits/:id/reviews/:phase
GET    /api/audits/:id/report
```

---

## Adding a New Agent (Checklist)

1. Create `server/src/agents/your-agent.ts` extending `BaseAgent`
2. Implement: `phaseNumber`, `domainKey`, `getCollectors()`, `buildInstructions()`, `outputSchema`
3. Register in `server/src/services/pipeline.ts` phase map
4. Add `domain_key` value to `server/src/types/audit.ts` and `src/app/data/auditTypes.ts`
5. Add industry weights for new domain in `server/src/config/industry-weights.ts`

---

## Adding a New Page (Checklist)

1. Create `src/app/pages/YourPage.tsx`
2. Add route in `src/app/routes.tsx` — wrap with `<ProtectedRoute>` unless public
3. If it needs audit data: use `useAudit(id)` or `usePipeline(id)` hooks
4. Update `buildNav()` in `AppShell.tsx` if it needs a nav entry

---

## Common Patterns

**Emitting a pipeline event from an agent:**
```typescript
await this.emitEvent('log', { message: 'Starting security header check' });
```

**Checking token budget:**
```typescript
// Handled automatically by PipelineService before each phase
// Don't add manual token checks inside agents
```

**Making a Claude call:**
```typescript
// Use BaseAgent.callClaude(context) — handles tool_use format,
// Zod validation, and retry with corrective prompt automatically
```

---

## Documentation

Full docs in `docs/`. See [docs/MASTER.md](./docs/MASTER.md) for index, knowledge map, and governance.

When you add a feature, update the relevant **existing** doc file in the same PR. Don't create new doc files without a strong reason — the quota is **15** markdown files maximum in flat `docs/*.md` (ADR archive in `docs/adrs/` is out of scope for routine updates). See [docs/MASTER.md](./docs/MASTER.md).

**ENV vs config vs services:** product defaults and numeric limits belong in `server/src/config/` (e.g. `SYSTEM_DEFAULTS`) first; server env is for infrastructure/secrets or documented ops overrides — [ARCHITECTURE.md — Strict layer boundaries](./docs/ARCHITECTURE.md#strict-layer-boundaries-operational-policy), [DEPLOYMENT.md — Environment layers](./docs/DEPLOYMENT.md#environment-layers-infrastructure-vs-ops-overrides), `server/.env.example`.
