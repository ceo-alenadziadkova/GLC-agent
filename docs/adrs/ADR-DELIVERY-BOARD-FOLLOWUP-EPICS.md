# ADR: Delivery Board — deferred epics (backlog stubs)

| Field | Value |
| --- | --- |
| **Status** | Proposed |
| **Date** | 2026-05-02 |
| **Scope** | Future work intentionally **out of** [ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md) Appendix G — each epic should promote to **Accepted** via its **own ADR** when prioritized |
| **Supersedes** | — |

---

## Scheduling contract

Product **§2 decision matrix**, **risk register**, and **GLC-PB-xxx** phased ticket framing live in **[`ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md`](./ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md)** (**Accepted**); engineering SSOT remains **[`ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md`](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md)** (**Accepted**).

When product prioritises an epic in the **Promotion queue** below, **publish a separate new Accepted ADR** for that epic (this file stays a stub index). Cross-link from [docs/MASTER.md](../MASTER.md). Do not implement backlog scope from this stub without that ADR.

Epic decisions already promoted and shipped remain linked from §**Shipped epics** for traceability — they no longer belong in the promotion queue.

---

## Shipped epics (Accepted)

| Epic | ADR | Notes |
| --- | --- | --- |
| **Epic 1** — preserve Board identity on initiative rename | [`ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md`](./ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md) (**Accepted**) | Optional **`board_identity_key`** on Strategy initiatives → [`canonical_node_key`](../../packages/intake-core/src/canonical-node-key.ts); Strategy Lab **`StrategyLabInitiativeEditDrawer`**, phase-7 patch merge; reconcile coverage in **`server/src/tests/plan-board-reconcile.test.ts`**. |
| **Epic 3** — custom kanban columns | [`ADR-PLAN-BOARD-CUSTOM-COLUMNS-EPIC3.md`](./ADR-PLAN-BOARD-CUSTOM-COLUMNS-EPIC3.md) (**Accepted**) | **`audits.plan_board_column_policy`**, entitlement on **`profiles.plan_board_custom_columns_entitled`**, **`GET`** **`columns[]`**, **`PATCH …/column-policy`**, reconcile landing column + SPA dynamic columns (**`079_*`** migration). |

---

## Promotion queue (engineering)

When product schedules work, **open a new ADR (Accepted)** for that epic alone — keep this file as a stub index only. Recommended order tends to match risk / dependency:

| Order | Epic | Blocker notes |
| --- | --- | --- |
| 1 | **Epic 2 follow-ups** | Optional deeper Board↔manifest scope per product queue |

---

## Rebaseline priorities (2026-05-08)

This backlog was re-triaged after Plan Workspace parity verification:

- **GLC-PB-019 (narrative timeline retirement):** core delivery is shipped; only residual cleanup (`planNarrativeTimeline` flag/env retirement) should be scheduled after a clean monitoring window.
- **GLC-PB-020 (board identity UX):** backend and main UI controls are shipped; additional UX polish is optional and should not block operational roadmap work.
- **Epic 2 follow-ups:** remains the only active engineering promotion queue item from this stub.

---

## Epic 4 (proposal stub) — Gantt interactive schedule edits

**Product goal:** Align Plan Roadmap (Gantt) with tracker-style **drag-adjusted timelines** alongside existing pack-derived bars.

**Not in Accepted product scope yet:** Accepted matrix [ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1 §4](./ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md) excludes calendar↔kanban sync without manifest/pack. This epic implies **explicit write targets**:

- Draft **manifest timeline fields** (`POST …/manifest-snapshots` / roadmap manifest payloads), or  
- **Separate planned-date overlay** on `plan_task_delivery` / new table keyed by `canonical_node_key`, merged in [`buildRoadmapGanttProjection`](../../src/app/lib/roadmap-gantt-mapper.ts).

**Contracts to resolve:** `expected_pack_version` / 409 reconcile, critical-path parity, optimistic UI for bar drag-end → PATCH shape, entitlement (consultant-only vs client read-only roadmap).

Promote via **new Accepted ADR** before implementation funding.

---

## Epic 1 — Preserve `canonical_node_key` on semantic rename (Appendix E)

**Decision:** consultants may **opt in** per save to preserve Board card identity when renaming an initiative, via an explicit manifest field (**`board_identity_key`**) that participates in `@glc/intake-core` **`canonical_node_key`** materialisation — not title-slug drift alone. Default behaviour remains rename-as-new-card when the checkbox is off.

**ADR (Accepted):** [`ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md`](./ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md) — implementation summarized in §**Implementation (shipped)** there.

**Delivered (high level):** Strategy Lab initiative edit sheet (**title + description + checkbox**) in [`StrategyLabInitiativeEditDrawer.tsx`](../../src/app/pages/strategy-lab/StrategyLabInitiativeEditDrawer.tsx); copy in [`strategy-lab-copy.ts`](../../src/app/config/strategy-lab-copy.ts); merge on **`PATCH …/pipeline/phases/7/result`** ([`patch-pipeline-phase-result.controller.ts`](../../server/src/routes/audits/controllers/patch-pipeline-phase-result.controller.ts)); Zod on pack nodes ([`glc-orchestration-pack.ts`](../../server/src/schemas/glc-orchestration-pack.ts)); reconcile tests; adjunct key excluded from manifest signature (`packages/intake-core/src/tests/orchestration-roadmap-manifest-signature.test.ts`).

**Follow-through (Epic 1 ADR Legacy):** audit-wide **`preserve_board_identity_on_rename`** in Strategy Lab orchestration panel stays documented as **deprecated** until a later cleanup removes it — prefer per-initiative control in the drawer.

**Current state (2026-05):**

- Backend propagation for **`board_identity_key`** and canonical key derivation are shipped.
- Strategy Lab exposes a **per-initiative** edit surface (**Radix Sheet**): title rename, description, and explicit **keep Board identity** checkbox with warning copy when identity preservation is off on a renamed title (**`StrategyLabPage`** wires **`StrategyLabInitiativeEditDrawer`**).
- Manifest signature compatibility: **`packages/intake-core/src/tests/orchestration-roadmap-manifest-signature.test.ts`**.

---

## Epic 2 — Hybrid Board updates into manifest drafts (“2.1-C” cookbook)

**Decision (target):** selected operational edits (lane, owner hints) enqueue as **draft revision requests** into manifest/signing workflow — never silent writes to persisted pack rows.

**Shipped (2026‑05):** `POST /api/audits/:id/roadmap/manifest/draft-revisions` (idempotent companion; **`FEATURE_MANIFEST_DRAFT_REVISIONS_FROM_BOARD`**), draft table `audit_roadmap_manifest_draft_revisions`, merge into **`RoadmapManifestPayload`** **`schema_version` 3** **`node_execution_hints`** on **`POST …/manifest-snapshots`** + queue clear; **`PATCH …/plan/board/cards`** **`lane`** → **`409`** **`PLAN_BOARD_LANE_MANIFEST_DRAFT_REQUIRED`** when the flag is on; pack rebuild applies hints via **`applyRoadmapNodeExecutionHintsToPack`**.

**Deliverables sketch:** ~~PATCH extension or companion endpoint~~ companion endpoint shipped; ~~Director/governance gates~~ reused `isPlanBoardOperationalReadOnlyPack`; ~~SPA affordance~~ BoardView + Strategy Lab digest/banner — see `docs/API.md` and orchestration manifests.

---

## Epic 3 — Per-audit custom kanban columns

**ADR (Accepted):** [`ADR-PLAN-BOARD-CUSTOM-COLUMNS-EPIC3.md`](./ADR-PLAN-BOARD-CUSTOM-COLUMNS-EPIC3.md).

**Shipped (engineering):** **`079_audits_plan_board_column_policy.sql`**, **`plan-board-column-policy.service.ts`**, **`PATCH /api/audits/:id/plan/board/column-policy`**, extended **`GET …/plan/board`** **`columns[]`**, reconcile uses **`landingPackCardColumnId`**, SPA **`BoardView`** consumes server column order/titles (**`FEATURE_PLAN_BOARD_CUSTOM_COLUMNS`** + owner entitlement gate).

---

## Gated readiness — TD-024 hardening (GLC-PB-023)

**Shipped (engineering):** migration **`078_plan_board_reconcile_apply_batch.sql`** (`plan_board_apply_reconcile_batch`), server path in `runPlanBoardReconcileAfterPackPersist`, flag **`FEATURE_PLAN_BOARD_RECONCILE_TRANSACTIONAL_APPLY`** (default **on**; legacy apply on RPC failure or flag `false`).

**Operational gate (still normative):** incident-worthy conflict bursts over **two consecutive weeks** (`alert_plan_board_conflict_burst_post_reconcile` / TD-024) mean **review** rollback (`FEATURE_PLAN_BOARD_RECONCILE_TRANSACTIONAL_APPLY=false`) or deeper coordination with card **`PATCH`** locking — not “wait to ship RPC.”

---

## Optional decision notes (GLC-PB-024 / GLC-PB-025)

### GLC-PB-024 — Strict manual `in_progress`

- **Resolved:** default **strict deny** (`SYSTEM_DEFAULTS.featureFlags.planBoardStrictManualInProgressBlocked`); env **`FEATURE_PLAN_BOARD_STRICT_MANUAL_IN_PROGRESS=false`** relaxes. Telemetry **`plan_board_manual_in_progress_blocked`** + user messages live in API copy.

### GLC-PB-025 — Richer reconciliation diff panel

- **Resolved (bounded):** `POST …/plan/board/reconcile/preview` returns **counts + capped title samples** (`sample_new_backlog_cards`, `sample_orphan_node_removed`); SPA dialog lists samples when preview flag is on. Full diff grid remains backlog if product requests it later.

---
