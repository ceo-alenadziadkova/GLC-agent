# Technical debt register

**Purpose:** Track engineering debt, audit findings, and structural follow-ups. This is **not** the product UX backlog — deferred product ideas stay in [IMPROVEMENTS.md](./IMPROVEMENTS.md).

**How to use:** Add rows when audits, reviews, or incidents surface issues; set **Status** to `open`, `in_progress`, or `done`. Prefer linking PRs in **Notes**.

**Related standards:** [.cursor/rules/code-design-standards.mdc](../.cursor/rules/code-design-standards.mdc), [.cursor/rules/no-hardcode.mdc](../.cursor/rules/no-hardcode.mdc), [ARCHITECTURE.md](./ARCHITECTURE.md) (layer boundaries).

---

## Severity

| Level | Meaning |
| --- | --- |
| **P0** | Security, data loss, or production stability risk |
| **P1** | Violates documented architecture or likely to cause regressions |
| **P2** | Maintainability, consistency, or velocity cost |
| **P3** | Nice-to-have cleanup |

---

## Register

| ID | Status | Sev | Area | Finding | Suggested direction | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | open | P2 | `server/src/routes/` | **Oversized route modules** — HTTP layer mixes validation, Supabase access, and branching. Examples (line counts approximate): `audit-requests.ts` (~900+), `audits.ts` (~900+), `snapshot.ts` (~870+), `intake.ts` (~700+), `discover.ts` (~680+), `pipeline.ts` (~610+), `intake-trace-tool.ts` (~540+). Conflicts with “routes stay thin” ([code-design-standards.mdc](../.cursor/rules/code-design-standards.mdc)). | Extract use-cases into `server/src/services/` (or route-scoped helpers), keep routes as orchestration + `apiErrorJson` mapping. Start with highest-churn file. | Code review 2026-04 |
| TD-002 | open | P2 | Frontend handlers | **`void asyncFn()`** in click/effect handlers (e.g. `AppShell`, `Dashboard`, `IntakeWordingWorkspace`, `ClientAuditView`, …). Idiomatic for fire-and-forget only if failures are handled inside or via React Query. | Audit critical paths for unhandled `Promise` rejections; standardise on mutations with `onError` / toast where user-visible failure matters. | Code review 2026-04 |
| TD-003 | open | P3 | `src/app/pages/StrategyLab.tsx` | **Marketing copy and price bands** (e.g. € ranges) still live inline in components. | Move to JSON or shared copy module (future CMS layer without separate CMS product). | Hardcode audit plan |
| TD-004 | open | P2 | Feature flags | **`server/src/config/feature-flags.ts`** still reads **env** at call time. Correct centralisation, but env is not the long-term home for product toggles per [ARCHITECTURE.md](./ARCHITECTURE.md) layering. | Later: single `FEATURE_FLAGS_JSON`, remote config, or DB-backed flags; keep call sites on the facade only. | Implemented facade 2026-04 |
| TD-005 | open | P3 | `server/src/routes/profile.ts` | **`full_name` max length 200** not aligned with shared [request-field-limits.ts](../server/src/config/request-field-limits.ts) (if a shared constant exists or should exist for profile fields). | Reuse or add `PROFILE_FULL_NAME_MAX` in config; use in Zod schema. | Hardcode audit (low) |
| TD-006 | open | P2 | Typecheck / API client | **Root `tsc`:** `AdminRequestQueue.tsx` — `api.listAuditRequests(reqLimit, …)` where `reqLimit` is `50 \| 200` but the client typing expects a narrower literal (e.g. `50`). | Fix `apiService` / route-limits types so `defaultLimit` and `maxLimit` from `@glc/route-limits` are accepted; or overload `listAuditRequests`. | Observed 2026-04 |
| TD-007 | open | P3 | `docs/` | **Flat-doc count** historically exceeded the old **15-file** cap; quota raised to **20** (see [MASTER.md](./MASTER.md)) to admit this register and headroom. | Avoid new top-level docs without updating quota or merging; prefer extending canonical files. | 2026-04-13 |
| TD-008 | done | P2 | Config / connectors | Hardcoded connector timeouts and security.txt limits in services. | **Done:** `SYSTEM_DEFAULTS.connectors`, `connector-runner` ceiling, security.txt connector reads config + feature flag facade. | Landed 2026-04 |
| TD-009 | done | P2 | `feasibility-layer` / `fact-checker` | Magic thresholds and regex embedded in services. | **Done:** `feasibility-rules.ts`, extended `fact-checker-thresholds.ts` (`controlObjectHeuristics`). | Landed 2026-04 |
| TD-010 | done | P2 | Feature-flag scatter | Product toggles read via `process.env` in multiple places. | **Done:** `feature-flags.ts`; services use `isBanditsEnabled`, etc. | Landed 2026-04 |
| TD-011 | open | P3 | Frontend styling | Many pages still use **inline hex**; semantic tokens added in `src/app/config/ui-semantic-colors.ts` but not applied everywhere. | Gradually migrate repeated status colours to `UI_SEMANTIC_COLORS` / CSS variables. | Partial 2026-04 |
| TD-012 | open | P1 | `src/app/components/AuditNavigation.tsx` | Hardcoded release metadata in footer (`Generated: March 9, 2026`, `v2.1.4 • Enterprise`). | Move to frontend build metadata (`VITE_*`) + server-provided generation timestamp where applicable. | Hardcode audit 2026-04 |
| TD-013 | open | P1 | `src/app/data/auditData.ts` | Large embedded business content and commercial ranges (timeframes, costs, impact claims) in runtime TS module. | Move business copy to CMS-json source and keep code focused on shape/types only. | Hardcode audit 2026-04 |
| TD-014 | open | P2 | `server/src/services/control-object-history.ts` | Magic fallback query cap: `.limit(400)` for `pipeline_events`. | Add named config in `server/src/config/system-defaults.ts` and consume via service. | Hardcode audit 2026-04 |
| TD-015 | open | P2 | `src/app/pages/StrategyLab.tsx` | Hardcoded period and value bands (`last_90d`, `Under 1 week · €0–500`, etc.). | Move benchmark period + roadmap bands to `src/app/config/*` or CMS-json. | Hardcode audit 2026-04 |
| TD-016 | open | P2 | `server/migrations/011_intake_tokens.sql` | Mutable policy encoded in DB defaults (`gen_random_bytes(20)`, `interval '7 days'`). | Keep DB safety defaults, but source runtime policy from platform settings/config on token issuance. | Hardcode audit 2026-04 |
| TD-017 | open | P2 | `server/migrations/051_evaluation_datasets_and_execution_mode.sql` | Retention windows hardcoded in trigger (`90/365 days`). | If retention must be runtime-tunable, store policy in DB settings and apply in service policy layer. | Hardcode audit 2026-04 |
| TD-018 | open | P3 | `src/app/components/ui/use-mobile.ts` | Local hardcoded breakpoint `768` risks drift from design tokens. | Move breakpoint to a shared frontend config/token registry. | Hardcode audit 2026-04 |
| TD-019 | open | P3 | `server/src/lib/benchmark-recompute-secret.ts` | Hardcoded custom security header name (`x-benchmark-recompute-secret`). | Move header name to server config (with stable default) and reuse from one source. | Hardcode audit 2026-04 |
| TD-020 | open | P3 | `server/src/config/integrations.ts` | Telegram base URL fallback hardcoded (`https://api.telegram.org`). | Keep as documented fallback, but prefer explicit infra env in production (`TELEGRAM_API_BASE`). | Hardcode audit 2026-04 |
| TD-021 | open | P2 | Audits / intake / DB | **Legacy `product_mode` (`express` / `full` / `free_snapshot`) coexists with canonical `execution_plan.coverage_package`.** | **Does not block main pipeline execution:** `PipelineOrchestrator` resolves phases via `getExecutionPlan()` → `normalizeExecutionPlan` + `executionPlanToPhases` only (`server/src/services/pipeline.ts`). Remaining uses: persisted `audits.product_mode` column, `audit_requests` CHECK (`express`\|`full`), public snapshot filters (`free_snapshot`), intake SLA gates via `full` vs `express` corridor in `@glc/intake-core`, legacy API fields/copy. | Centralize in `server/src/lib/audit-coverage-bridge.ts`; align new surfaces on `coverage_package`; later: intake-core gates keyed by package, trim `product_mode` from API responses, optional DB migration. | 2026-04-13 |

---

## Hardcode audit report (2026-04)

### High severity

| File:Line | Hardcoded value | Why problematic | Recommended fix |
| --- | --- | --- | --- |
| `src/app/components/AuditNavigation.tsx:141` | `Generated: March 9, 2026` | Stale date in production UI; creates trust mismatch. | Read generated timestamp from backend payload or dedicated frontend runtime metadata. |
| `src/app/components/AuditNavigation.tsx:142` | `v2.1.4 • Enterprise` | Release info drifts from actual deploy version/edition. | Inject `VITE_APP_VERSION`/`VITE_APP_EDITION` at build-time and centralize in frontend config. |
| `src/app/data/auditData.ts` | Multiple static cost/time/impact business strings | Business logic/content mixed into runtime code; hard to localize/CMS and risky to maintain. | Move to CMS-json content source and keep TS module as typed adapter only. |

### Medium severity

| File:Line | Hardcoded value | Why problematic | Recommended fix |
| --- | --- | --- | --- |
| `server/src/services/control-object-history.ts:67` | `.limit(400)` | Query cap is operational behavior hidden in service code. | Move to `SYSTEM_DEFAULTS` and reference a named config constant. |
| `src/app/pages/StrategyLab.tsx:20` | `Under 1 week · €0–500` | Business range embedded in UI component and locked to one market format. | Move to frontend config/CMS-json (`strategy bands`). |
| `src/app/pages/StrategyLab.tsx:21` | `1–3 months · €1K–6K` | Same as above. | Move to frontend config/CMS-json. |
| `src/app/pages/StrategyLab.tsx:22` | `3–6 months · €6K–20K` | Same as above. | Move to frontend config/CMS-json. |
| `src/app/pages/StrategyLab.tsx:54` | `period: 'last_90d'` | Product policy period hardwired in page logic. | Define default benchmark period in config; allow backend override. |
| `server/migrations/011_intake_tokens.sql:5` | `gen_random_bytes(20)` | Token policy changes require schema migration. | Keep DB-safe default, but enforce policy in service/config at issuance. |
| `server/migrations/011_intake_tokens.sql:10` | `interval '7 days'` | Token TTL tied to DB default, not runtime policy controls. | Use platform settings/config for issuance TTL; DB default as fallback only. |
| `server/migrations/051_evaluation_datasets_and_execution_mode.sql:44-46` | `INTERVAL '365 days'`, `INTERVAL '90 days'` | Retention policy hardcoded at DB trigger layer. | If mutable, externalize retention policy to DB settings + service policy layer. |

### Low severity

| File:Line | Hardcoded value | Why problematic | Recommended fix |
| --- | --- | --- | --- |
| `src/app/components/ui/use-mobile.ts:3` | `MOBILE_BREAKPOINT = 768` | Risks mismatch with design-system breakpoints. | Move breakpoint to shared `src/app/config/*` token/constants module. |
| `server/src/lib/benchmark-recompute-secret.ts:3` | `x-benchmark-recompute-secret` | Security header contract hidden in utility file. | Centralize in server config and import everywhere. |
| `server/src/config/integrations.ts:5` | `https://api.telegram.org` | Acceptable fallback, but should not become hidden environment contract. | Keep fallback documented; require env in non-dev infra profiles. |

## Hardcode externalization backlog (P0/P1/P2)

- **P0** Replace runtime UI hardcode that misrepresents release/business state:
  - `AuditNavigation` footer metadata from central frontend runtime config.
  - `auditData` business narrative moved to CMS-json source (same shape adapter).
- **P1** Externalize behavior-affecting constants:
  - Service query caps (`control-object-history`) into `SYSTEM_DEFAULTS`.
  - `StrategyLab` benchmark period + range labels into frontend config/CMS-json.
  - Token/retention mutable policy to service policy layer backed by config or platform settings.
- **P2** Consistency cleanup:
  - Shared UI breakpoint constants.
  - Shared security header constants.
  - Explicit infra-env policy for integration base URLs in production profiles.

## Intentionally excluded / library zones

The following are treated as **library or imported bulk data**, not routine GLC app debt, unless we explicitly decide to refactor:

- `server/src/snapshot/**` (including fetch heuristics, tiered fetch, page anomaly helpers)
- `server/src/lib/site-html-signals.ts`
- `server/src/lib/wappalyzer-imported-rules.ts`

Documented in project rules / audits; do not bulk-rewrite without a dedicated initiative.

---

## Hardcode externalization implementation (2026-04-13)

Completed in this pass (mapped to architecture ownership):

- **Backend config layer**
  - `server/src/services/evaluation-dataset-writer.ts` now reads insert retries from `SYSTEM_DEFAULTS.evaluationDatasets.insertMaxRetries` (no inline retry cap).
  - `server/src/services/pipeline.ts` no longer keeps a hardcoded refine fallback string; copy comes from `pipeline-orchestrator-copy.v1.json`.
  - `server/src/config/integrations.ts` now enforces `TELEGRAM_API_BASE` in production; default URL remains dev fallback only.
- **Frontend config + CMS-json layer**
  - `src/app/pages/SettingsPage.tsx` moved password minimum length and route hash fragments to `src/app/config/settings-page-defaults.ts`.
  - Settings page user-facing toasts now use `src/app/data/workspace-page-copy.en.json` instead of inline literals for key validation/error/success messages.
  - `src/app/lib/intake-client-copy.ts` now uses CMS-json default timing (`workspace-page-copy.en.json`) instead of inline `within 24 hours`.
- **Shared package policy config**
  - `packages/intake-core/src/core/plan-derived.ts` moved confidence blend weights to `intake-plan-derived-policy.v1.json`.
  - `packages/intake-core/src/intake-brief-catalog-meta.ts` moved question-ID grouping and importance weights to `intake-brief-catalog-meta.v1.json` (`enrichmentPolicy`).
- **Cursor guardrail**
  - Added `.cursor/rules/no-hardcode-enforcement.mdc` to enforce layer-aware externalization for new code.

Remaining follow-ups stay in Register rows (especially SQL literals and broad copy migration in older pages).

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-04-13 | Initial register; doc quota raised to 20 in MASTER / README / CLAUDE; merged findings from hardcode-hardening work and code-design-standards review. |
| 2026-04-13 | Implemented hardcode externalization pass: backend retry/copy/env enforcement, frontend settings constants + copy centralization, intake-core policy JSON extraction, and new Cursor no-hardcode guardrail rule. |
