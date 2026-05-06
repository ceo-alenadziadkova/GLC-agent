# ADR: Delivery Board (backlog + kanban) as primary execution surface; narrative Timeline sunset path

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-05-01 |
| **Scope** | Client and consultant UX for post-audit execution: operational state on top of the orchestration pack, Delivery Board view, Roadmap (Gantt) as time projection, narrative Timeline behind a flag with defined sunset |
| **Supersedes** | — (additive; closes board-view gap from `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`) |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Product framing + phased GLC-PB ticket skeleton (**Accepted**): [`ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md`](./ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md)
- Client unified roadmap: [`ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`](./ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md)
- Orchestration / roadmap sync: [`ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md`](ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md)
- Coverage / execution plan: [`ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`](./ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md)
- Meta orchestrator: [`ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`](./ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md)
- Plan governance: [`ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md`](./ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md)
- Human prompt canon: [`docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`](../instructions/ORCHESTRATOR-INSTRUCTIONS.md)

### ADR lifecycle

After **Accepted**, do not edit normative decision rows in place for material contract changes — publish a superseding ADR. Engineering implementation mapping below may evolve with linked PRs.

### Documentation SSOT (Delivery Board cluster)

Any **long-form draft** ADR pasted in chats or wiki must **defer here** plus [`ORCHESTRATOR-INSTRUCTIONS.md`](../instructions/ORCHESTRATOR-INSTRUCTIONS.md) UX contract — do **not** maintain a parallel full ADR file with duplicated normative §. **Implementation drift:** see **Appendix D** (names, schema columns, rollout env). Operational runbooks: **[DEPLOYMENT.md](../DEPLOYMENT.md)** (Delivery Board / feature-flag matrix).

---

## Decision (summary)

1. **Three Plan views** on `/plan/:id` and `/portal/plan/:id`: `?view=board` (execution), `?view=roadmap` (time), `?view=timeline` (legacy narrative, flag-gated sunset). Bare URLs without `view` resolve per [`parsePortalPlanViewParam`](../../src/app/config/portal-plan.ts): **board when Board rollout mode is `ga`** (consultant + portal shells); rollout lower than **`ga`** still timelines-first where applicable (`portal-plan.ts` SSOT).
2. **Operational layer** `plan_task_delivery` ([`074_plan_task_delivery.sql`](../../server/migrations/074_plan_task_delivery.sql), [`075_plan_task_delivery_manual_title.sql`](../../server/migrations/075_plan_task_delivery_manual_title.sql)): soft state (`column_id`, `position`, `pinned`, `delivery_area`, orphan metadata, `pack_lane_snapshot`, optional `manual_title`) — never mutates pack JSON. Reconcile on pack persist ([`runPlanBoardReconcileAfterPackPersist`](../../server/src/services/plan-board/reconcile-pack.service.ts)).
3. **Stable identity** `canonical_node_key` — deterministic (`@glc/intake-core` [`canonical-node-key.ts`](../../packages/intake-core/src/canonical-node-key.ts)); `pack_graph_node_id` advisory. Manual cards (`source='manual'`) keep `canonical_node_key` **NULL** (CHECK enforced in migration).
4. **Row scope:** `created_by_user_id`; access via audit ownership / `client_id` in route handlers (`resolveAuditPlanBoardAccess`) plus RLS on `plan_task_delivery` (consultant-owner CRUD paths). No duplicate `user_id` column on the operational row.
5. **Cross-view:** `?focus=` ([`plan-cross-nav.ts`](../../src/app/lib/plan-cross-nav.ts)); one **`PATCH`** contract ([`PATCH …/plan/board/cards/:cardId`](../../server/src/routes/audits/index.ts)); React Query namespace **`['plan-board', auditId]`** ([`plan-board-queries.ts`](../../src/app/data/api/plan-board-queries.ts)).
6. **Feature flags:** server [`getPlanDeliveryBoardRolloutMode`](../../server/src/config/feature-flags.ts) / **`FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE`** (`shadow | internal | pilot | ga`; defaults via `SYSTEM_DEFAULTS`). Static client mirrors [`plan-delivery-board-ui.ts`](../../src/app/config/plan-delivery-board-ui.ts).

---

## Engineering SSOT mapping (canonical paths)

| Concern | Location |
| --- | --- |
| HTTP surface | [`server/src/routes/audits/index.ts`](../../server/src/routes/audits/index.ts): `GET/PATCH …/plan/board`, `POST …/cards`, `POST …/reconcile`, `POST …/telemetry/view-opened` |
| Zod schemas | [`server/src/schemas/plan-board.ts`](../../server/src/schemas/plan-board.ts) |
| Columns / transitions | [`plan-board-columns.ts`](../../server/src/config/plan-board-columns.ts), [`plan-board-transitions.ts`](../../server/src/config/plan-board-transitions.ts) |
| Governance read-only parity | [`plan-board-operational-policy.ts`](../../server/src/config/plan-board-operational-policy.ts) (`409 PLAN_BOARD_GOVERNANCE_BLOCKED`) |
| Client-visible subset | [`plan-board-client-view.ts`](../../server/src/services/plan-board/plan-board-client-view.ts) |
| Reconcile pure function | [`reconcile.ts`](../../server/src/services/plan-board/reconcile.ts) + tests [`plan-board-reconcile.test.ts`](../../server/src/tests/plan-board-reconcile.test.ts) |
| Pack hook | [`orchestration-pack-persist-run.service.ts`](../../server/src/services/orchestration/orchestration-pack-persist-run.service.ts) |
| SPA Board | [`BoardView.tsx`](../../src/app/pages/portal-plan/board/BoardView.tsx); shell/tabs [`PortalPlanPage.tsx`](../../src/app/pages/portal-plan/PortalPlanPage.tsx), [`PlanViewSegmentedNav.tsx`](../../src/app/pages/strategy-lab/PlanViewSegmentedNav.tsx) |
| Telemetry | [`plan-board-pipeline-events.ts`](../../server/src/services/plan-board/plan-board-pipeline-events.ts); event types [`pipeline-event-types.ts`](../../server/src/config/pipeline-event-types.ts) (`plan_board_reconciled`, `plan_board_card_moved`, …) |

---

## Appendix A — Decision matrix (planning brief)

| # | Question | Decision |
| --- | --- | --- |
| 2.1 | Management model | Soft operational layer (A); hybrid mutations into manifest deferred |
| 2.2 | Stable id at rebuild | `canonical_node_key` + advisory `pack_graph_node_id` |
| 2.3 | Manual backlog | Allowed; risky transitions flagged in UI/copy |
| 2.4 | Mutation surface | Single `PATCH` endpoint + shared React Query mutation |
| 2.5 | Degraded pack | Read-only ops + banner + `409` governance |
| 2.6 | Concurrency | Optimistic UI + `expected_pack_version`; idempotency key on `PATCH`; **DB-wide serialize reconcile vs PATCH**

---

## Appendix B — Acceptance phases (DoD sketch)

| Phase | Gates |
| --- | --- |
| **P0** | `view=board` parses; segmented control gated by rollout mode; Board renders behind flag; Lighthouse/a11y bar on Board; Legacy plan redirect tests green |
| **P1** | Migration applied; `@glc/intake-core` canonical key tests + reconcile tests; **`GET/PATCH`** live; **`@dnd-kit`** drag + keyboard **Move to column** (+ RTL regression); rollout **defaults**: repo `SYSTEM_DEFAULTS` / static SPA flags (currently **`ga`** for Board tab — override with **`FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE=shadow`** for conservative staging — see **[DEPLOYMENT.md](../DEPLOYMENT.md)**) |
| **P2** | Consultant manual `POST /cards`; orphan UI affordances + optional **`POST /reconcile`** UX |
| **P3** | Board parity cues vs narrative Timeline satisfied; permanent **`?view=timeline` → board** redirect; Timeline component removal deferred one release |

---

## Appendix C — Advisory lock vs connection pooling

A design that holds `pg_try_advisory_lock` across **multiple** REST/RPC calls from `supabase-js` is **incorrect** behind PostgREST’s per-request transactions: locks acquired in one RPC/auto-commit txn do not serialize the next `.from()` call.

Serializing reconcile vs `PATCH` therefore requires either **one server-side Postgres routine** wrapping lock + mutations in a single transaction, a **direct session-scoped Postgres client** outside the pooled PostgREST path, or accepting the rare overlap risk (optimistic versioning on card rows reduces damage). **Shipped:** pack-persist reconcile uses **`plan_board_apply_reconcile_batch`** (`078_plan_board_reconcile_apply_batch.sql`) when **`FEATURE_PLAN_BOARD_RECONCILE_TRANSACTIONAL_APPLY`** is on — advisory lock + single transaction for reconcile DML + `plan_board_reconciled` event; concurrent **`PATCH`** remains a separate request path (TD-024 monitoring unchanged). **Operational decision:** **[TECH_DEBT.md](../TECH_DEBT.md) TD-024** stays **`accepted_risk`** for residual overlap unless monitoring clears it.

---

## Implementation note (migrations)

Orchestration / director deep-dive jobs use **`072_director_deep_dive_jobs.sql`**. Plan delivery Board tables begin at **`074_plan_task_delivery.sql`**.

---

## Appendix D — Spec vs implemented shape (engineering SSOT)

Long-form drafts sometimes describe a simpler flag and schema than shipped code. Normative shipped behavior:

| Topic | Shipped SSOT |
| --- | --- |
| Board enablement | **Rollout mode** `planDeliveryBoardRolloutMode` / **`FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE`** (`shadow` … `ga`), not a single boolean. UI surfaces follow [`plan-delivery-board-ui.ts`](../../src/app/config/plan-delivery-board-ui.ts). |
| `canonical_node_key` | **Nullable**: required for `source='pack'`, **NULL** for `source='manual'` (enforced by `CHECK` in [`074_plan_task_delivery.sql`](../../server/migrations/074_plan_task_delivery.sql)). |
| Row ownership | **No** `user_id` column on `plan_task_delivery`; consultant identity lives in **`created_by_user_id`**; audit scoping in handlers + RLS. |
| Serialize reconcile vs PATCH | **Appendix C** + **`[TECH_DEBT.md](../TECH_DEBT.md)` TD-024** — pack reconcile applies via **`plan_board_apply_reconcile_batch`** when enabled; **`accepted_risk`** remains for concurrent **`PATCH`** vs reconcile timing unless monitoring clears it. |
| Appendix §2.3 strict (manual **`in_progress`**) | **On by default** in `SYSTEM_DEFAULTS` / [`isPlanBoardStrictManualInProgressBlocked`](../../server/src/config/feature-flags.ts). Env **`FEATURE_PLAN_BOARD_STRICT_MANUAL_IN_PROGRESS=false`** relaxes. When strict is **`true`**, **`source='manual'`** rows reject entering **`in_progress`** (**`409`** **`PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED`**) and emit **`plan_board_manual_in_progress_blocked`** telemetry. |

---

## Appendix E — Preserve Board identity across initiative title edits

**Canonical approach:** [`ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md`](./ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md) (**Accepted**) — per-initiative Strategy Lab editor + explicit opt-in on save.

**Shipped:** optional **`board_identity_key`** on **`StrategyInitiative`** (validated Zod), persisted onto orchestration **`graph.nodes`**, feeds [`canonicalNodeKeyFromManifestAndNode`](../../packages/intake-core/src/canonical-node-key.ts): when present, the computed `canonical_node_key` is **stable across title edits** for the same manifest signature + lane. Consultants may also set the field via **`PATCH /api/audits/:id/pipeline/phases/7/result`** or strategy JSON tooling when Strategy Lab UI is unavailable.

---

## Appendix F — P3 narrative Timeline removed (SPA)

- The former **`PortalTimelinePage.tsx`** narrative surface **no longer ships**. Legacy timeline URLs remain redirect-only (`?view=timeline` to `?view=board`).
- **`?view=timeline`** on canonical Plan URLs **`replace`**s to **`?view=board`** when Board rollout is on, else **`roadmap`** ([**`PortalPlanPage.tsx`](../../src/app/pages/portal-plan/PortalPlanPage.tsx)**).
- Legacy **`/timeline/:id`** and **`/portal/timeline/:id`** resolve through [**`LegacyPlanPathRedirect.tsx`**](../../src/app/pages/portal-plan/LegacyPlanPathRedirect.tsx) to **`/plan…?view=board`** (foreign query pairs preserved).

---

## Appendix G — Follow-on work (outside this ADR)

Draft epic list (Proposed): **[ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md](./ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md)** — promote each epic with a **new** ADR when scheduled. GA does **not** block on:

- **`Appendix E`:** Epic 1 **Accepted** — per-initiative Strategy Lab editor + `board_identity_key` merge on phase-7 patch (**[ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md](./ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md)**).
- **Hybrid Board → manifest edits** (“2.1-C” cookbook): edits on Board flowing back into draft manifest revision flow.
- **Per-audit custom kanban columns** (new persisted policy + migrations).
- **`GET /timeline` skip on Board tab:** SPA toggle **`planBoardDeferTimelineFetchOnBoardTabEnabled`** ([`app-feature-flags.ts`](../../src/app/config/app-feature-flags.ts)) + unified Plan wiring — see **[DEPLOYMENT.md](../DEPLOYMENT.md)** (section *Delivery Board — monitoring*); rollback = set toggle `false`.
- **Operational monitoring (TD-024 accepted risk):** same DEPLOYMENT runbook (`pipeline_events`, HTTP **`409`**); escalate if clustered post-reconcile.
