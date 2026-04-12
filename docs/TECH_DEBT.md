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

---

## Intentionally excluded / library zones

The following are treated as **library or imported bulk data**, not routine GLC app debt, unless we explicitly decide to refactor:

- `server/src/snapshot/**` (including fetch heuristics, tiered fetch, page anomaly helpers)
- `server/src/lib/site-html-signals.ts`
- `server/src/lib/wappalyzer-imported-rules.ts`

Documented in project rules / audits; do not bulk-rewrite without a dedicated initiative.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-04-13 | Initial register; doc quota raised to 20 in MASTER / README / CLAUDE; merged findings from hardcode-hardening work and code-design-standards review. |
