# Product MVP roadmap (v8) — code sync and remaining scope

**Status:** living notes (amend in follow-up commits)  
**Date:** 2026-04-23 (resync)  
**Replaces / duplicates:** the chat-only “Orchestrator + Client Roadmap v8” plan; canonical rollout rows remain in [ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md](./ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md).

This document reconciles the v8 plan with the **current repository** so backlog estimates, file paths, and **done vs remaining** work match reality. Many v8 line items were already implemented when v8 was written; do not schedule duplicate effort.

**DoD-1 (ADR-CLIENT *Current UX gaps* vs V-rows):** some v8 checklists ask for an “empty” gap list. We **do not** delete the four strategic gap bullets in [ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md](./ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md#current-ux-gaps-to-close) — that would lose intent. Instead, that section is **reconciled** (2026-04-23) with the V1–V12 table below and with the *Product MVP — §5 UX gap closers* subsection in this document (explicit **out of scope** for the minimal MVP): engineering tracks **V5–V8 / V10 / V11** row status; the four **§5-style** closers are **out of scope** for the *minimal* Product MVP until product promotes epics. **Non-negotiables** in the same ADR section (manifest, vN+1, graph SSOT) stay mandatory.

### v8 “critical path” vs repository — what to treat as **already Done**

Chat-only v8 called out Φ1 (CI baselines, DoD-7/8), ETag, `useOrchestrationReadModel`, lazy graph chunk, consultant cockpit, and a new telemetry key as if they were mostly future work. In tree they are **shipped** (see tables below). **Φ6 / V10** in v8 was costed as 2–3 weeks for a *new* surface; the **minimum cockpit** (route, pack GET + conditional cache, initiatives table, critical path, governance display, rebuild) is already present — remaining work is **ops DoD-4**, **E2E depth**, **governance CTA product choice** (see [DoD-4 / DoD-6](#dod-4-slo-and-dod-6-governance)), and polish — not greenfield from zero. **V5.4 (React.lazy for xyflow)** is **Done** in [`PortalTimelinePackGraphPanel`](../../src/app/components/glc/PortalTimelinePackGraphPanel.tsx); Strategy Lab uses the same panel or [`PackGraphConsultantCanvas`](../../src/app/features/strategy-lab/PackGraphConsultantCanvas.tsx) (`consultant_full`).

---

## V1–V12 — implementation status (repository truth)

| Row | Theme | Status | Anchor(s) in repo |
| --- | -- | -- | -- |
| V1 | `plan_horizon` / calendar | **Done** | [orchestration-roadmap-presets.ts](../../server/src/config/orchestration-roadmap-presets.ts) |
| V2 | Manifest-first wizard | **Done** | portal manifest routes, `roadmap-manifest` services |
| V3 | Meta-Director ADR v1.1 → Zod pack | **Partial → tightening** | SSOT: [`server/src/schemas/glc-orchestration-pack.ts`](../../server/src/schemas/glc-orchestration-pack.ts). Top-level + **nested** regression: [`server/src/tests/glc-orchestration-pack-adr-v1-1-parity.test.ts`](../../server/src/tests/glc-orchestration-pack-adr-v1-1-parity.test.ts). New ADR fields still require a schema + test update in the same PR. |
| V4 | Plan-level `CONTROL_OBJECT` | **Proposed / out of Product MVP** | [ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md](./ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md) |
| V5 | Client dependency graph UX | **Partial** | [`PortalTimelinePackGraphPanel`](../../src/app/components/glc/PortalTimelinePackGraphPanel.tsx) (lazy `xyflow`), [`PackGraphConsultantCanvas`](../../src/app/features/strategy-lab/PackGraphConsultantCanvas.tsx) (`consultant_full`), limits in [`orchestration-ui-limits.ts`](../../src/app/config/orchestration-ui-limits.ts). Optional: canvas perf polish. |
| V6 | Evidence taxonomy UX | **Partial** | [`EvidenceDrilldownPanel`](../../src/app/components/glc/EvidenceDrilldownPanel.tsx); post-audit: [`ClientPostAuditCockpitSection`](../../src/app/pages/client-audit-view/sections/ClientPostAuditCockpitSection.tsx) |
| V7 | Cross-lane narratives | **Partial** | [`orchestration-lane-pair-narratives.ts`](../../src/app/lib/orchestration-lane-pair-narratives.ts), [`PortalTimelinePage`](../../src/app/pages/PortalTimelinePage.tsx) |
| V8 | Execution packs in journey | **Partial** (core flows shipped) | [`execution-pack-errors.ts`](../../src/app/lib/execution-pack-errors.ts); repeat / conflict dialog when a pack already exists — [`PortalTimelinePage`](../../src/app/pages/PortalTimelinePage.tsx) + `executionPackRepeatFlowEnabled` + copy in [`orchestration-roadmap-ui-copy.en.ts`](../../src/app/config/orchestration-roadmap-ui-copy.en.ts) |
| V9 | New lanes / directors | **Backlog** (post-MVP) | — |
| V10 | Consultant parity cockpit | **Partial (MVP minimum shipped)** | [`ConsultantOrchestrationCockpitPage`](../../src/app/pages/ConsultantOrchestrationCockpitPage.tsx), `useOrchestrationReadModel`, route under `P.auditOrchestrationById`. E2E: API + ETag (see E2E section). |
| V11 | vN→vN+1 revision story | **Partial** | [`RevisionHistoryPanel`](../../src/app/features/strategy-lab/RevisionHistoryPanel.tsx) in Strategy Lab; client summary uses `buildOrchestrationRevisionStorySummary` |
| V12 | Prompt / synthesis quality | **Ongoing** | [`orchestration-synthesis-fallback.test.ts`](../../server/src/tests/orchestration-synthesis-fallback.test.ts), telemetry in [`orchestration-telemetry-policy.ts`](../../server/src/config/orchestration-telemetry-policy.ts) |

---

## Architectural improvements from v8 §12 — already implemented (do not re-plan)

| # | v8 name | In repo |
| -- | -- | -- |
| 1 | Single `useOrchestrationReadModel` | [`src/app/data/api/use-orchestration-read-model.ts`](../../src/app/data/api/use-orchestration-read-model.ts) — shared query keys, conditional `If-None-Match` on refetch |
| 2 | ETag on `GET …/orchestration/pack` | [`get-orchestration-pack.controller.ts`](../../server/src/routes/audits/controllers/get-orchestration-pack.controller.ts) — `ETag`, `304` |
| 3 | `verify:orchestration-contract` | [`package.json`](../../package.json) → [`scripts/verify-orchestration-contract.mjs`](../../scripts/verify-orchestration-contract.mjs) |

**DoD-7** is enforced in CI with `pnpm run audit:orchestration-telemetry` (script gate). An ESLint rule for `kpi_orchestration_*` remains an optional follow-up, not a merge blocker if the script passes.

**DoD-8** is enforced with `pnpm build && pnpm run audit:bundle-main-budget` in [`.github/workflows/test.yml`](../../.github/workflows/test.yml).

---

## Feature flag defaults (code, not the old “all false” ladder table)

v8’s rollout table listed many flags as default `false`. **Repository defaults** for orchestration UX features are **on** in [`src/app/config/app-feature-flags.ts`](../../src/app/config/app-feature-flags.ts) and [`server/src/config/system-defaults/feature-flags-defaults.ts`](../../server/src/config/system-defaults/feature-flags-defaults.ts). [`src/app/config/orchestration-contract-parity.test.ts`](../../src/app/config/orchestration-contract-parity.test.ts) requires SPA static flags to match server `SYSTEM_DEFAULTS` for several keys—**treat the repo as the source of truth**; production may still override via `FEATURE_*` env as documented in [DEPLOYMENT.md](../DEPLOYMENT.md).

Relevant pairs include: `packGraphConsultantCanvasEnabled`, `evidenceDrilldownEnabled`, `executionPackRepeatFlowEnabled`, `consultantOrchestrationCockpitEnabled`, `laneCrossNarrativesEnabled` (V7; config-driven, not always mirrored 1:1 to a server `FEATURE_` name).

---

## Product MVP — §5 UX gap closers: explicit **out of scope** for the minimal MVP

**Product decision (2026-04-23 resync):** the four gap closers in v8 §5 (Now/Next/Later board, what-if manifest comparison, set-level effort/impact/risk aggregator, set-level confidence) are **not** required to call **Product MVP** “done” in this codebase. They remain **separate epics** when product reprioritizes. Implementation hints and suggested flags stay in the table below; no work is committed until a ticket promotes them.

| Gap | Suggested flags (when implemented) | Notes |
| -- | -- | -- |
| Now/Next/Later board | `nowNextLaterBoardEnabled` (SPA) + env if new API | Group by `node.time_bucket` |
| What-if manifest comparison | `manifestScenarioCompareEnabled` | Two `POST /manifest-preview` + diff |
| Set-level effort/impact/risk | `orchestrationSetAggregatorEnabled` | Proposed: `src/app/lib/orchestration-set-aggregator.ts` (not in tree until implemented) |
| Set-level confidence | (often same surface as set aggregator) | Min-confidence + distribution badge |

Rough sizing when pulled in: **S–M each** (UI + tests).

---

## DoD-4 (SLO) and DoD-6 (governance)

**DoD-4 (Performance / observability):** p95 SLOs and minimum Grafana (or Datadog) dashboard rows for orchestration are documented in [DEPLOYMENT.md — Orchestration SLO (Product MVP)](../DEPLOYMENT.md#orchestration-slo-product-mvp) (“Baseline targets”, **DoD-4**). Satisfying DoD-4 is an **ops** milestone (panels + alerts), not only merging TypeScript.

**DoD-6 (Governance `decision_hint` visible client + consultant):**

- **Client / report:** `decision_hint` and revision summary appear where packs are shown (e.g. [`ClientPostAuditCockpitSection`](../../src/app/pages/client-audit-view/sections/ClientPostAuditCockpitSection.tsx), timeline).
- **Consultant cockpit:** [`ConsultantOrchestrationCockpitPage`](../../src/app/pages/ConsultantOrchestrationCockpitPage.tsx) **renders** `governance.decision_hint` and guidance for `refine_plan`; it provides **rebuild pack** and deep links to manifest / Strategy Lab. There are **no** separate one-click `accept_plan` / `accept_with_warnings` buttons—acceptance is expressed through existing workflows (refine + rebuild), not a new govern-only endpoint. If product needs explicit CTA, track as a follow-up UX item.

---

## Φ1 / DoD-7 / DoD-8 — CI and baselines (done in tree)

- **DoD-7 (no ad-hoc `kpi_orchestration_*` strings):** `scripts/orchestration-telemetry-keys-check.mjs` — `pnpm run audit:orchestration-telemetry`; [`.github/workflows/test.yml`](../../.github/workflows/test.yml).
- **DoD-8 (main chunk gzip budget):** `scripts/bundle-main-gzip-budget.mjs` + `scripts/bundle-main-gzip-budget.json` — after `pnpm build`.
- **Contract verification (DX):** `pnpm verify:orchestration-contract` — Zod pack tests + `orchestration-contract-parity.test.ts`.

---

## Open questions (v8 §10) — resolution

| ID | Question | Resolution in repo |
| -- | -- | -- |
| OQ1 | Shadow DTO for pack? | Server SSOT: `GlcOrchestrationPack` from Zod. Client uses `GlcOrchestrationPackView` in [`orchestration-pack.types.ts`](../../src/app/data/audit/contracts/report/orchestration-pack.types.ts) *intentionally* (guards + report). Align with Zod via `orchestration-contract-parity.test.ts` — not “delete client types”. |
| OQ2 | ETag on `GET /orchestration/pack`? | **Yes:** [`get-orchestration-pack.controller.ts`](../../server/src/routes/audits/controllers/get-orchestration-pack.controller.ts). SPA: `useOrchestrationReadModel` + API client. |
| OQ3 | Index on `audit_roadmap_manifest_snapshots`? | Rely on migrations `069`–`071` and rollout ADR; add indexes only in new migrations when needed. |
| OQ4 | Director LLM stability in production? | Ops: dashboards using `ORCHESTRATION_TELEMETRY_METRICS` (see [DEPLOYMENT.md](../DEPLOYMENT.md)). |
| OQ5 | E2E for consultant cockpit? | [`e2e/orchestration-consultant-cockpit.spec.ts`](../../e2e/orchestration-consultant-cockpit.spec.ts) — ETag, body shape, and **304** when `If-None-Match` matches. Optional UI walkthrough when stable auth + `E2E_ORCHESTRATION_UI` (or project convention) is available. |

---

## Telemetry and duplicate backlog items (v8 §8 / §12)

- `kpi_orchestration_consultant_cockpit_view` is in [`orchestration-telemetry-policy.ts`](../../server/src/config/orchestration-telemetry-policy.ts) and logged on consultant pack GET (when the feature gate allows) — do **not** re-add as a new metric.
- ETag is **not** a remaining server task.

---

## V5 / V6 / V7 / V8 — path and semantics

- **V6.2 post-audit evidence breakdown** — [`ClientPostAuditCockpitSection.tsx`](../../src/app/pages/client-audit-view/sections/ClientPostAuditCockpitSection.tsx) (not `report-viewer/`; report viewer has related orchestration components under `features/report-viewer/`).
- **V7 cross-lane narrative selection** — `weight >= 0.7` and `relation` in `strong` \| `direct_blocker` \| `medium` (see [`orchestration-lane-pair-narratives.ts`](../../src/app/lib/orchestration-lane-pair-narratives.ts)).

---

## `useOrchestrationReadModel` — who uses it (intentional split, not drift)

- **Portal timeline** (`/portal/audit/:id/timeline`): typically `includePack: false` so the page does **not** double-fetch `GET …/orchestration/pack` when the **audit** payload (loader / React Query) already embeds the current `glc_orchestration_pack`. The hook still loads **`GET /timeline`** under `glcKeys.timeline.detail` for lane/milestone DTOs. This is the default pattern for **read-heavy** portal views: one authoritative pack from audit context + timeline API. If a portal feature must match the **exact** ETag/304 behavior of the standalone pack GET, switch that surface to `includePack: true` (or invalidate both keys on pack mutation — already done in cockpit rebuild flow).
- **Consultant cockpit** (`/audit/:id/orchestration`): `includeTimeline: false`; pack uses `glcKeys.orchestrationPack.detail` with `If-None-Match` on refetch ([`use-orchestration-read-model.ts`](../../src/app/data/api/use-orchestration-read-model.ts)).
- **Strategy Lab** uses audit-embedded pack for orchestration panel math; it does not need the pack GET for every paint. Adopt the shared hook only when a Lab feature must share the same **server-normalized** pack row + version as the cockpit (e.g. after future “single cache” hardening).

---

## V3 (Zod vs ADR v1.1) — status

- **SSOT:** [`server/src/schemas/glc-orchestration-pack.ts`](../../server/src/schemas/glc-orchestration-pack.ts).
- **Regression:** `glc-orchestration-pack-adr-v1-1-parity.test.ts` — (1) every ADR unified-output **top-level** key exists on the v2 Zod object; (2) a **nested** sample payload (routing `domain_weights` coverage, `confidence_map.unlock_conditions`, `risk_layer.cross_domain`, `metrics_framework`, `data_gaps`, `top_actions`) parses.
- **Migrations:** no `072_*.sql` for JSONB-only field adds; add SQL only for relational columns/indexes.

---

## Remaining “first slices” after this resync (for planners)

Focus order for **net-new** work, given much of v8 is already shipped:

1. **Ops:** wire DoD-4 SLO panels/alerts in Grafana (or chosen observer) per [DEPLOYMENT.md](../DEPLOYMENT.md).
2. **V3:** any new ADR v1.1 field → Zod + parity test in one PR; optional `ARCHITECTURE.md` note when `pack.version=2` narrative changes.
3. **E2E:** expand orchestration E2E matrix when creds are stable; optional full UI consultant path behind env.
4. **§5 gap closers:** only when product promotes them from “out of scope” to explicit epics.
5. **V5 polish:** only if perf UX reports justify (profiler + `orchestration-ui-limits`).

---

## References

- Rollout and V1–V12 rows: [ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md](./ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md)
- Client UX gaps list: [ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md](./ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md)
- ADR v1.1: [ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md](./ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md)
