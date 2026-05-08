# ADR: Per-audit custom Delivery Board columns (Epic 3)

| Field | Value |
| --- | --- |
| **Status** | **Accepted** |
| **Date** | 2026-05-06 |
| **Scope** | Optional persisted kanban column policy per audit: custom stable `column_id` values with explicit semantic roles for engine rules; entitled consultant accounts only |
| **Supersedes** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Operational layer SSOT: [`ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md`](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md).
- Follow-up index: [`ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md`](./ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md).

---

## Context

Delivery Board used a fixed six-column id union in code (`plan-board-columns.ts`). Product needs **per-audit** columns (labels and stable ids) without breaking reconcile, client visibility, transition policy, or strict manual `in_progress` governance.

---

## Decision

1. **Persisted policy** on `audits.plan_board_column_policy` (nullable `jsonb`). When absent or when the feature is off or the **audit owner** is not entitled, the server resolves the **built-in default** preset (current fixed ids + default titles).
2. **Schema v1** includes:
   - `schema_version: 1`
   - `columns`: ordered array of `{ id, title }` (stable slug `id`, display `title`)
   - `semantics`: map of **exactly** the six keys `backlog | next_up | in_progress | review | done | blocked` → `id` that exists in `columns`. Values must be **pairwise distinct** (one column per semantic role).
   - Additional columns **without** a semantic are allowed (consultant-only buckets); they do not receive new pack cards from reconcile and are hidden from the portal client column filter unless given a client-visible semantic (only the four workflow semantics are client-visible: `next_up`, `in_progress`, `review`, `done`).
3. **Entitlement:** `FEATURE_PLAN_BOARD_CUSTOM_COLUMNS` (feature-flags facade) plus `profiles.plan_board_custom_columns_entitled = true` for the **audit owner** (`audits.user_id`). Platform admins follow existing plan-board access patterns for mutations. No separate “tenant” table — owner profile is the gate.
4. **Reconcile:** new pack-backed rows use `semantics.backlog` as `column_id` (not a hardcoded literal). Backlog **card count** for tail positions uses the same landing column id.
5. **Policy updates:** `PATCH …/plan/board/column-policy` replaces policy (or `reset: true`). Before persisting, every `plan_task_delivery` row for the audit is remapped: `old_column_id → semantic (via old resolved policy) → new_column_id` (via new semantics). Unknown historical ids map to **backlog** semantic.
6. **Downgrade:** `reset: true` (or clearing policy after remap) writes `plan_board_column_policy = null` **after** remapping cards to **canonical default ids** matching each semantic (`PLAN_BOARD_COLUMN_DEFAULT_IDS`).

---

## Consequences

- Positive: Consultants can align board language with engagement models without altering pack graphs; engine rules stay semantic-driven.
- Negative: Larger API surface and validation burden; SPA must consume server-provided columns (no fixed column array for entitled audits).

---

## Implementation map

| Area | Location |
| --- | --- |
| Migration | [`server/migrations/079_audits_plan_board_column_policy.sql`](../../server/migrations/079_audits_plan_board_column_policy.sql) |
| Limits / validation | [`server/src/config/plan-board-column-policy-limits.ts`](../../server/src/config/plan-board-column-policy-limits.ts), [`server/src/services/plan-board/plan-board-column-policy.service.ts`](../../server/src/services/plan-board/plan-board-column-policy.service.ts) |
| GET board | [`get-plan-board.controller.ts`](../../server/src/routes/audits/controllers/get-plan-board.controller.ts) |
| PATCH policy | [`patch-plan-board-column-policy.controller.ts`](../../server/src/routes/audits/controllers/patch-plan-board-column-policy.controller.ts) |
| Reconcile hook | [`plan-board-reconcile-transactional-payload.ts`](../../server/src/services/plan-board/plan-board-reconcile-transactional-payload.ts), [`reconcile-pack.service.ts`](../../server/src/services/plan-board/reconcile-pack.service.ts) |
| SPA | [`BoardView.tsx`](../../src/app/pages/portal-plan/board/BoardView.tsx), [`plan-board-queries.ts`](../../src/app/data/api/plan-board-queries.ts), [`audits-orchestration.ts`](../../src/app/data/api/audits-orchestration.ts) |
