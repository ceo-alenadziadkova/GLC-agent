# Claude Code Context — GLC Audit Platform

This file gives Claude Code the context needed to work effectively in this repo.

## What This Project Is

A full-stack B2B SaaS platform for AI-powered business audits. A consultant submits a company URL; the system crawls the site and runs analysis across 8 business domains using Claude AI, producing a scored report with strategic recommendations.

**Status:** Production-ready MVP. All phases implemented. Frontend connected to live backend.

---

## Architecture in One Paragraph

React 18 + Vite frontend (Vercel) talks to an Express + TypeScript backend (Railway) via REST. The backend orchestrates an 8-phase AI pipeline: programmatic collectors gather data (no AI), then one `claude-sonnet-4-20250514` call per phase analyses and scores. Results are stored in Supabase PostgreSQL. The frontend subscribes to `pipeline_events` and `audits` via Supabase Realtime for live updates. Supabase Auth handles magic link + Google OAuth; RLS enforces user data isolation.

---

## Critical Rules (Don't Break These)

1. **Never call Claude from the frontend.** All AI goes through the Express backend.
2. **Never use service role key on frontend.** `SUPABASE_SERVICE_KEY` is backend-only.
3. **One Claude call per phase.** Don't add intermediate Claude calls inside agents.
4. **Collectors never call Claude.** Collectors are programmatic only (fetch + cheerio).
5. **Always filter DB queries by `userId`.** Backend routes must include `user_id = req.userId` in queries, even though service role key bypasses RLS.
6. **All protected routes need `requireAuth` middleware.** Check `server/src/routes/` patterns.
7. **No subfolders in `/docs/`.** Documentation lives flat in `docs/`.

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
/login               Login.tsx          (public)
/portfolio           Portfolio.tsx      (protected)
/audit/new           NewAudit.tsx       (protected)
/pipeline/:id        PipelineMonitor    (protected) — Realtime
/audit/:id           AuditWorkspace     (protected) — Realtime
/audit/:id/:domainId AuditWorkspace     (protected)
/reports/:id         ReportViewer       (protected)
/strategy/:id        StrategyLab        (protected)
```

---

## Backend Route Patterns

All routes under `/api/`. All except health check require `requireAuth` middleware.

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

Full docs in `docs/`. See [docs/MASTER.md](./docs/MASTER.md) for index.

When you add a feature, update the relevant doc file. Don't create new doc files without a strong reason — the quota is 20 docs maximum.
