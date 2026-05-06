# Technical debt register

**Purpose:** Track engineering debt, audit findings, and structural follow-ups. This is **not** the product UX backlog — deferred product ideas stay in [IMPROVEMENTS.md](./IMPROVEMENTS.md).

**How to use:** Add rows when audits, reviews, or incidents surface issues; set **Status** to `open`, `in_progress`, `done`, or `accepted_risk` (documented trade-off, no further work unless product reopens). Prefer linking PRs in **Notes**.

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
| TD-001 | open | P2 | `` | **Oversized route modules** — HTTP layer mixes validation, Supabase access, and branching. Examples (line counts approximate): `audit-requests.ts` (~900+), `audits.ts` (~900+), `snapshot.ts` (~870+), `intake.ts` (~700+), `discover.ts` (~680+), `pipeline.ts` (~610+), `intake-trace-tool.ts` (~540+). Conflicts with “routes stay thin” ([code-design-standards.mdc](../.cursor/rules/code-design-standards.mdc)). | Extract use-cases into `` (or route-scoped helpers), keep routes as orchestration + `apiErrorJson` mapping. Start with highest-churn file. | Code review 2026-04 |
| TD-002 | open | P2 | Frontend handlers | **`void asyncFn()`** in click/effect handlers (e.g. `AppShell`, `Dashboard`, `IntakeWordingWorkspace`, `ClientAuditView`, …). Idiomatic for fire-and-forget only if failures are handled inside or via React Query. | Audit critical paths for unhandled `Promise` rejections; standardise on mutations with `onError` / toast where user-visible failure matters. | Code review 2026-04 |
| TD-003 | open | P3 | `StrategyLab` | **Marketing copy and price bands** (e.g. € ranges) still live inline in components. | Move to JSON or shared copy module (future CMS layer without separate CMS product). | Hardcode audit plan |
| TD-004 | open | P2 | Feature flags | **`feature_flags`** still reads **env** at call time. Correct centralisation, but env is not the long-term home for product toggles per [ARCHITECTURE.md](./ARCHITECTURE.md) layering. | Later: single `FEATURE_FLAGS_JSON`, remote config, or DB-backed flags; keep call sites on the facade only. | Implemented facade 2026-04 |
| TD-005 | open | P3 | `profile` | **`full_name` max length 200** not aligned with shared request-field-limits.ts (if a shared constant exists or should exist for profile fields). | Reuse or add `PROFILE_FULL_NAME_MAX` in config; use in Zod schema. | Hardcode audit (low) |
| TD-006 | done | P2 | Typecheck / API client | **`listAuditRequests` limit typing** — `defaultLimit` / `maxLimit` from `@glc/route-limits` must widen cleanly for callers. | **Done:** explicit `limit`/`offset` `number` params on `auditRequestsApi.listAuditRequests`; hook uses `reqLimit: number`. | Refactor `admin-request-queue` 2026-04 |
| TD-007 | open | P3 | `docs/` | **Flat-doc count** historically exceeded the old **15-file** cap; quota raised to **20** (see [MASTER.md](./MASTER.md)) to admit this register and headroom. | Avoid new top-level docs without updating quota or merging; prefer extending canonical files. | 2026-04-13 |
| TD-008 | done | P2 | Config / connectors | Hardcoded connector timeouts and security.txt limits in services. | **Done:** `SYSTEM_DEFAULTS.connectors`, `connector-runner` ceiling, security.txt connector reads config + feature flag facade. | Landed 2026-04 |
| TD-009 | done | P2 | `feasibility-layer` / `fact-checker` | Magic thresholds and regex embedded in services. | **Done:** `feasibility-rules.ts`, extended `fact-checker-thresholds.ts` (`controlObjectHeuristics`). | Landed 2026-04 |
| TD-010 | done | P2 | Feature-flag scatter | Product toggles read via `process.env` in multiple places. | **Done:** `feature-flags.ts`; services use `isBanditsEnabled`, etc. | Landed 2026-04 |
| TD-011 | open | P3 | Frontend styling | Many pages still use **inline hex**; semantic tokens added in `ui_semantic_colors` but not applied everywhere. | Gradually migrate repeated status colours to `UI_SEMANTIC_COLORS` / CSS variables. | Partial 2026-04 |
| TD-012 | open | P1 | `AuditNavigation` | Hardcoded release metadata in footer (`Generated: March 9, 2026`, `v2.1.4 • Enterprise`). | Move to frontend build metadata (`VITE_*`) + server-provided generation timestamp where applicable. | Hardcode audit 2026-04 |
| TD-013 | open | P1 | `auditData` | Large embedded business content and commercial ranges (timeframes, costs, impact claims) in runtime TS module. | Move business copy to CMS-json source and keep code focused on shape/types only. | Hardcode audit 2026-04 |
| TD-014 | open | P2 | `control_object_history` | Magic fallback query cap: `.limit(400)` for `pipeline_events`. | Add named config in `system_defaults` and consume via service. | Hardcode audit 2026-04 |
| TD-015 | open | P2 | `StrategyLab` | Hardcoded period and value bands (`last_90d`, `Under 1 week · €0–500`, etc.). | Move benchmark period + roadmap bands to `*` or CMS-json. | Hardcode audit 2026-04 |
| TD-016 | open | P2 | `server/migrations/011_intake_tokens.sql` | Mutable policy encoded in DB defaults (`gen_random_bytes(20)`, `interval '7 days'`). | Keep DB safety defaults, but source runtime policy from platform settings/config on token issuance. | Hardcode audit 2026-04 |
| TD-017 | open | P2 | `server/migrations/051_evaluation_datasets_and_execution_mode.sql` | Retention windows hardcoded in trigger (`90/365 days`). | If retention must be runtime-tunable, store policy in DB settings and apply in service policy layer. | Hardcode audit 2026-04 |
| TD-018 | open | P3 | `use_mobile` | Local hardcoded breakpoint `768` risks drift from design tokens. | Move breakpoint to a shared frontend config/token registry. | Hardcode audit 2026-04 |
| TD-019 | open | P3 | `benchmark_recompute_secret` | Hardcoded custom security header name (`x-benchmark-recompute-secret`). | Move header name to server config (with stable default) and reuse from one source. | Hardcode audit 2026-04 |
| TD-020 | open | P3 | `integrations` | Telegram base URL fallback hardcoded (`https://api.telegram.org`). | Keep as documented fallback, but prefer explicit infra env in production (`TELEGRAM_API_BASE`). | Hardcode audit 2026-04 |
| TD-021 | open | P2 | Audits / intake / DB | **Legacy `product_mode` (`express` / `full` / `free_snapshot`) coexists with canonical `execution_plan.coverage_package`.** | **Does not block main pipeline execution:** `PipelineOrchestrator` resolves phases via `getExecutionPlan()` → `normalizeExecutionPlan` + `executionPlanToPhases` only (`pipeline`). Remaining uses: persisted `audits.product_mode` column, `audit_requests` CHECK (`express`\|`full`), public snapshot filters (`free_snapshot`), intake SLA gates via `full` vs `express` corridor in `@glc/intake-core`, legacy API fields/copy. | Centralize in `audit_coverage_bridge`; align new surfaces on `coverage_package`; later: intake-core gates keyed by package, trim `product_mode` from API responses, optional DB migration. | 2026-04-13 |
| TD-022 | done | P2 | Strategy Lab / Plan / Gantt | **Post-audit UX follow-up (2026-05)** — progressive disclosure on Gantt toolbar, empty-state differentiation on Roadmap page, shared planning chrome layout, iCal line folding, dead `stepsStrip` copy. | **Done:** minimal primary Gantt toolbar row; `StrategyPlanningChrome`; `countTimelineLaneItems` + copy for mapper-empty vs API-empty; DESCRIPTION folding in `roadmap-gantt-ical.ts`; `stepsStrip` removed from copy SSOT (tests use `journeyStrip`). | Landed 2026-05 |
| TD-023 | done | P3 | Delivery Board | **Roadmap parity on Board** — `GET …/plan/board` now attaches **`timeline_parity`** (`top_7d` / `top_30d`, `top_priorities.reason_code`, `milestones`, `season_preset`), produced by **`buildPlanBoardTimelineParity`** sharing logic with **`GET …/timeline`**. SPA Board prefers this block over timeline rows when rendering priority chips (`BoardView.tsx`). | Optional follow-up: skip **`GET …/timeline`** entirely on Board-only workloads (conditional **`includeTimeline`** gated on parity freshness / feature flag). | Landed 2026-05 |
| TD-024 | accepted_risk | P3 | Delivery Board | **Reconcile racing `PATCH`** — cross-request overlap with concurrent **`PATCH …/plan/board/cards`** cannot be fully eliminated without broader locking on card moves; pack-persist reconcile itself is now **atomic** via **`plan_board_apply_reconcile_batch`** (`078_plan_board_reconcile_apply_batch.sql`, advisory `pg_advisory_xact_lock`, **`FEATURE_PLAN_BOARD_RECONCILE_TRANSACTIONAL_APPLY`** default **on**, legacy loop on RPC failure / flag `false`). | **Still monitor** unusual **`409`** / **`plan_board_conflict_409`** shortly after **`plan_board_reconciled`**; alert worker `alert_plan_board_conflict_burst_post_reconcile` unchanged (`server/src/config/alerts-config.ts`). **Ops gate:** sustained incident-worthy bursts over **two consecutive weeks** remain the signal to review disabling transactional apply only as rollback / deeper redesign — see `ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md` §GLC-PB-023. | ADR Delivery Board 2026-05; GLC-PB-023 landed |
| TD-025 | open | P3 | Delivery Board | **Manual accessibility bar (Lighthouse) on `?view=board`** per ADR Appendix B P0 wording — not automated in CI. | Run Lighthouse a11y category on Board after major UI changes; record score in release checklist. | ADR Delivery Board 2026-05 |
| TD-026 | done | P2 | Pipeline / snapshot UX | **Flow stability audit §3–§4 (2026-05):** silent `audit_recon` update on snapshot persist; `stateRef` vs React state when paginating pipeline events; wording drift on upgrade/review transactions. | Snapshot: check `error` on `audit_recon.update` and throw. SPA: sync `stateRef` with `useLayoutEffect` before paint. Docs: record mitigations below (RPC **080**/**082**, ordering **081** + `id` tie-break). | Landed 2026-05 |
| TD-027 | open | P2 | DB / pipeline | **Multi-row writes without a single transaction** where paired updates are user-visible or safety-critical. | Use SQL RPC (`BEGIN`…`COMMIT`) when both sides must appear together (see **080**, **082**). **Candidates (review before RPC):** `recoverStalledPipelines` (`pipeline_events` insert + `audits` update); domain persistence paths that emit `pipeline_events` + mutate `audit_domains` in separate round-trips. **Acceptable best-effort:** background recovery with existing alerts; `request_missing_data` without a paired event (by design). | Arch audit §8 2026-05; [ARCHITECTURE.md](./ARCHITECTURE.md) |
| TD-028 | open | P2 | E2E / scaling checklist | **Browser Playwright coverage** for cross-user RLS, concurrent `POST …/pipeline/next` (“double continue”), and pipeline UI ordering under parallel phases — not implemented as dedicated `e2e/*.spec.ts` flows. | **Vitest** already covers API isolation (`server/src/tests/user-isolation.test.ts`) and claim conflicts (`pipeline-route-concurrency.test.ts`); see [e2e/README.md](../e2e/README.md). Add Playwright when stable credentials + API proxy for CI are agreed. | Scaling readiness backlog 2026-05 |
| TD-029 | open | P2 | Tests / feature flags | **Uniform test pattern:** business tests should use `vi.mock('../config/feature-flags.js', importOriginal)` or `vi.spyOn` on [`feature-flags.ts`](../server/src/config/feature-flags.ts) — not scattered `process.env.FEATURE_*` (except the dedicated integration file). | Migrate any remaining stragglers; keep env-only checks in [`feature-flags-plan-delivery-rollout-env.integration.test.ts`](../server/src/tests/feature-flags-plan-delivery-rollout-env.integration.test.ts) as the single facade-wiring integration. | Header comment in integration test 2026-05 |
| TD-030 | open | P3 | Frontend / Realtime | **`pipeline-realtime-schema`** — table/column constants + strict parsers (`event_seq` optional); not a full typed mirror of every `pipeline_events` / `audits` column on Realtime payloads. | Extend typings/parsers when new UI fields are subscribed; avoid duplicating the whole DB schema in TS. | Scaling checklist P2 #12 2026-05 |
| TD-031 | open | P3 | Server / observability | **One-off hygiene:** periodic grep for direct `.from('pipeline_events').insert` outside [`insert-pipeline-event.ts`](../server/src/services/pipeline/events/insert-pipeline-event.ts) / `insertPipelineEventRow` to ensure `{ error }` handling or centralization. | Run before major pipeline refactors; most paths already guarded. | Scaling checklist P0 #1.2 tail 2026-05 |

---

## Flow stability reconciliation (2026-05)

Snapshot of internal **§3 Flow stability** / **§4 State & data risks** versus the codebase after mitigations:

| Topic | Mitigation |
| --- | --- |
| Distributed lease / parallel block cancel | UUID+hostname lease tokens; `assertNotCancelled` after parallel `allSettled`. |
| Free snapshot upgrade domains | Ownership in TS; transactional reset via **`080_upgrade_snapshot_reset_domains_and_reviews_rpc.sql`** (`upgrade_snapshot_reset_audit_domains_and_reviews`). |
| Review approve + `pipeline_events` | **`082_pipeline_approve_review_emit_event_atomic_rpc.sql`** (`pipeline_approve_review_emit_approved_event_atomic`) — single transaction for `review_points` approve + `review_approved` event. |
| `pipeline_events` ordering | DB: migration **`084`** adds `event_seq` (monotonic); API lists order by `event_seq DESC`, `created_at DESC`, `id DESC`; indexes **081** + **084**. SPA: `comparePipelineEventsNewestFirst` in [`pipeline-event-sort.ts`](../src/app/lib/pipeline-event-sort.ts) prefers `event_seq` when present, else time/`id`. |
| Snapshot → `audit_recon` | **`persistSnapshotCacheResult`** checks `audit_recon` update `error` (log + throw); UX row and `audit_domains` / `audits` paths already guarded. |
| `usePipeline` pagination cursor | **`stateRef`** synced with **`useLayoutEffect`** so **`loadMoreEvents`** reads the latest committed `event_page.next_before` before the next paint. |
| Alert worker window on `pipeline_events` | Failed time-window **select** logs `alerts.pipeline_events_window_query_failed`; that tick skips failure/latency/token/plan-board metrics (no silent partial use of rows). |

Residual (by design or low priority): **`request_missing_data`** updates `review_points` only — no paired `pipeline_events` row.

---

## Hardcode audit report (2026-04)

### High severity

| File:Line | Hardcoded value | Why problematic | Recommended fix |
| --- | --- | --- | --- |
| `AuditNavigation` | `Generated: March 9, 2026` | Stale date in production UI; creates trust mismatch. | Read generated timestamp from backend payload or dedicated frontend runtime metadata. |
| `AuditNavigation` | `v2.1.4 • Enterprise` | Release info drifts from actual deploy version/edition. | Inject `VITE_APP_VERSION`/`VITE_APP_EDITION` at build-time and centralize in frontend config. |
| `auditData` | Multiple static cost/time/impact business strings | Business logic/content mixed into runtime code; hard to localize/CMS and risky to maintain. | Move to CMS-json content source and keep TS module as typed adapter only. |

### Medium severity

| File:Line | Hardcoded value | Why problematic | Recommended fix |
| --- | --- | --- | --- |
| `control_object_history` | `.limit(400)` | Query cap is operational behavior hidden in service code. | Move to `SYSTEM_DEFAULTS` and reference a named config constant. |
| `StrategyLab` | `Under 1 week · €0–500` | Business range embedded in UI component and locked to one market format. | Move to frontend config/CMS-json (`strategy bands`). |
| `StrategyLab` | `1–3 months · €1K–6K` | Same as above. | Move to frontend config/CMS-json. |
| `StrategyLab` | `3–6 months · €6K–20K` | Same as above. | Move to frontend config/CMS-json. |
| `StrategyLab` | `period: 'last_90d'` | Product policy period hardwired in page logic. | Define default benchmark period in config; allow backend override. |
| `server/migrations/011_intake_tokens.sql:5` | `gen_random_bytes(20)` | Token policy changes require schema migration. | Keep DB-safe default, but enforce policy in service/config at issuance. |
| `server/migrations/011_intake_tokens.sql:10` | `interval '7 days'` | Token TTL tied to DB default, not runtime policy controls. | Use platform settings/config for issuance TTL; DB default as fallback only. |
| `server/migrations/051_evaluation_datasets_and_execution_mode.sql:44-46` | `INTERVAL '365 days'`, `INTERVAL '90 days'` | Retention policy hardcoded at DB trigger layer. | If mutable, externalize retention policy to DB settings + service policy layer. |

### Low severity

| File:Line | Hardcoded value | Why problematic | Recommended fix |
| --- | --- | --- | --- |
| `use_mobile` | `MOBILE_BREAKPOINT = 768` | Risks mismatch with design-system breakpoints. | Move breakpoint to shared `*` token/constants module. |
| `benchmark_recompute_secret` | `x-benchmark-recompute-secret` | Security header contract hidden in utility file. | Centralize in server config and import everywhere. |
| `integrations` | `https://api.telegram.org` | Acceptable fallback, but should not become hidden environment contract. | Keep fallback documented; require env in non-dev infra profiles. |

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

- `**` (including fetch heuristics, tiered fetch, page anomaly helpers)
- `site_html_signals`
- `wappalyzer_imported_rules`

Documented in project rules / audits; do not bulk-rewrite without a dedicated initiative.

---

## Gantt P3 backend prerequisites (Portal roadmap)

Client-side Gantt P2 uses browser `localStorage` baseline snapshots, client-side CPM/slack, and client-built `.ics`. **Durable product behavior** needs server contracts:

- **Drag-to-edit**: authenticated `PATCH` (or equivalent) for task plan windows with validation, optimistic concurrency, dependency checks; expose via feature flag (e.g. `roadmap_gantt_drag_edit`).
- **Real percent complete**: persisted field on timeline tasks (optional `PATCH`); replace time-based “schedule elapsed” where authoritative completion exists.
- **Server baseline history**: persist snapshots or versions + explicit baseline endpoints (`POST` / read on timeline or pack).
- **iCal / export parity**: optional server-generated `.ics` aligned with sprint CSV and report truth.

Until then, copy `roadmapGanttBaselineLocalNotice` documents the local-only baseline limitation.

---

## Hardcode externalization implementation (2026-04-13)

Completed in this pass (mapped to architecture ownership):

- **Backend config layer**
 - `evaluation_dataset_writer` now reads insert retries from `SYSTEM_DEFAULTS.evaluationDatasets.insertMaxRetries` (no inline retry cap).
 - `pipeline` no longer keeps a hardcoded refine fallback string; copy comes from `pipeline-orchestrator-copy.v1.json`.
 - `integrations` now enforces `TELEGRAM_API_BASE` in production; default URL remains dev fallback only.
- **Frontend config + CMS-json layer**
 - `SettingsPage` moved password minimum length and route hash fragments to `settings_page_defaults`.
 - Settings page user-facing toasts now use `workspace_page_copy.en` instead of inline literals for key validation/error/success messages.
 - `intake_client_copy` now uses CMS-json default timing (`workspace-page-copy.en.json`) instead of inline `within 24 hours`.
- **Shared package policy config**
 - `plan_derived` moved confidence blend weights to `intake-plan-derived-policy.v1.json`.
 - `intake_brief_catalog_meta` moved question-ID grouping and importance weights to `intake-brief-catalog-meta.v1.json` (`enrichmentPolicy`).
- **Cursor guardrail**
 - Added `.cursor/rules/no-hardcode-enforcement.mdc` to enforce layer-aware externalization for new code.

Remaining follow-ups stay in Register rows (especially SQL literals and broad copy migration in older pages).

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-04-13 | Initial register; doc quota raised to 20 in MASTER / README / CLAUDE; merged findings from hardcode-hardening work and code-design-standards review. |
| 2026-04-13 | Implemented hardcode externalization pass: backend retry/copy/env enforcement, frontend settings constants + copy centralization, intake-core policy JSON extraction, and new Cursor no-hardcode guardrail rule. |
| 2026-05-01 | **Strategy Lab + Roadmap + Timeline audit closure delta:** Journey strip + `PortalPlanChrome` (Roadmap \| Timeline + workbench); manifest signing unified via `manifest-change-signature.ts`; bucket helpers shared (`time-bucket-normalization.ts`); baseline snapshots versioned (`schemaVersion`); no `window.confirm` in app source; orchestrator tabs and Gantt deps sub-tabs use `aria-controls`; `useIsMobile` uses `matchMedia`; dependency SVG paths memoized (`canMove={false}` on timeline). Remaining backlog: iCal hardening, plan layout DRY, copy structure — see subsection below. |
| 2026-05-01 | **TD-022:** Gantt primary toolbar tucks zoom/density into More; overview strip `grab`/`grabbing` cursors; Portal Roadmap page distinguishes timeline rows present but Gantt projection empty vs true empty timeline; RFC 5545-style folding for long iCal text; `StrategyPlanningChrome` dedupes Strategy Lab vs Plan sticky headers; manifest preview already uses `AbortController` via `useDebouncedOrchestratorManifestPreview`; governance errors use `coerceOrchestrationPlanGovernance`. |

## Strategy Lab + Roadmap + Timeline — audit closure delta (2026-05)

External audit scores referenced a **prior** codebase snapshot. Against the current tree, treat these as **already addressed** unless regressed:

- Сквозная IA: `src/app/pages/strategy-lab/StrategyJourneyHeader.tsx` (+ `StrategyJourneyStrip.tsx` совместимый реэкспорт), `src/app/pages/portal-plan/PortalPlanChrome.tsx`, `src/app/pages/strategy-lab/PlanViewSegmentedNav.tsx`.
- Manifest signature: `src/app/lib/manifest-change-signature.ts` (wizard + orchestration panel).
- Time buckets: `src/app/lib/time-bucket-normalization.ts` + orchestration buckets module.
- Baseline persistence: `src/app/lib/roadmap-gantt-baseline-storage.ts` with schema pin + purge toast.
- Gantt toolbar split: `src/app/components/roadmap-gantt/RoadmapGanttToolbar.tsx`.

Remaining work stays as normal P1/P2 engineering (tablet summary visibility edge cases, heavy monolith splits beyond chrome + toolbar, optional row virtualization at very large task counts). **Plan URL:** canonical `/plan/:id` and `/portal/plan/:id` render `PortalPlanPage` under `PortalPlanOrchestrationProvider` (`useOrchestrationReadModel` for conditional pack GET + timeline); each tab tree mounts on first visit then stays in the DOM (`hidden` + `inert` when inactive) so later `view` toggles keep local UI state; orchestration UI E2E optionally checks legacy → `/plan` URL replace after login (`orchestration-plan-legacy-canonical.spec.ts`); `protected-routes` includes plan + legacy roadmap/timeline; segmented nav prefers `buildAppRoute.plan` / `portalPlan`; legacy paths redirect via `LegacyPlanPathRedirect`.

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `server/src/routes/`
- `server/src/services/`
- `src/app/pages/strategy-lab/StrategyLabPage.tsx`
- `server/src/config/feature-flags.ts`
- `server/src/routes/profile.ts`
- `src/design-system/tokens/colors.ts` (semantic UI + intake trace graph via `var(--*)`)
- `src/app/components/AuditNavigation.tsx`
- `src/app/data/auditData.ts`
- `server/src/services/control-object-history.ts`
- `server/src/config/system-defaults.ts`
- `src/app/config/*`
- `src/app/components/ui/use-mobile.ts`
- `server/src/lib/benchmark-recompute-secret.ts`
- `server/src/config/integrations.ts`
- `server/src/services/pipeline.ts`
- `server/src/lib/audit-coverage-bridge.ts`
- `src/app/components/AuditNavigation.tsx:141`
- `src/app/components/AuditNavigation.tsx:142`
- `server/src/services/control-object-history.ts:67`
- `src/app/components/ui/use-mobile.ts:3`
- `server/src/lib/benchmark-recompute-secret.ts:3`
- `server/src/config/integrations.ts:5`
- `server/src/snapshot/**`
- `server/src/lib/site-html-signals.ts`
- `server/src/lib/wappalyzer-imported-rules.ts`
- `server/src/services/evaluation-dataset-writer.ts`
- `src/app/pages/SettingsPage.tsx`
- `src/app/config/settings-page-defaults.ts`
- `src/app/data/workspace-page-copy.en.json`
- `src/app/lib/intake-client-copy.ts`
- `packages/intake-core/src/core/plan-derived.ts`
- `packages/intake-core/src/intake-brief-catalog-meta.ts`
- `server/src/config/request-field-limits.ts`
- `src/app/config/`
- `server/src/snapshot/`
