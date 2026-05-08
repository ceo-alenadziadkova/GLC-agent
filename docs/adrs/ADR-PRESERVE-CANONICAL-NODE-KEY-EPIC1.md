# ADR: Preserve `canonical_node_key` on manifest rename (Epic 1)

| Field | Value |
| --- | --- |
| **Status** | **Accepted** |
| **Date** | 2026-05-03 |
| **Scope** | Optional stable Board identity when a consultant renames an initiative in Strategy Lab without treating it as a new logical work item |
| **Supersedes** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Delivery Board operational layer (**Appendix E** — shipped preserve-identity behaviour and links): [`ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md`](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md).
- Follow-up deferred-epics stub (Epics 2–3 queue; Epic 1 in **Shipped epics**): [`ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md`](./ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md).
- Canonical key implementation: [`packages/intake-core/src/canonical-node-key.ts`](../../packages/intake-core/src/canonical-node-key.ts).

---

## Context

Renaming an initiative changes slugified title input to [`canonicalNodeKey`](../../packages/intake-core/src/canonical-node-key.ts); reconcile then treats the old card as orphan (`node_removed` / lane mismatch) and may auto-create a new row. That is correct when the rename is semantically “new work,” but consultants sometimes need a **cosmetic or clarified** title without breaking Board history.

---

## Decision

1. **Explicit override only:** introduce a manifest-level optional **stable key** **participating in** canonical key materialisation when the consultant selects **“Keep Board card identity on rename”** in Strategy Lab (per-initiative save via [`StrategyLabInitiativeEditDrawer.tsx`](../../src/app/pages/strategy-lab/StrategyLabInitiativeEditDrawer.tsx)).
2. **No silent preservation:** default remains current behaviour (title drives hash); preserving identity is **opt-in** per save.
3. **Server truth:** [`canonicalNodeKeyFromManifestAndNode`](../../packages/intake-core/src/canonical-node-key.ts) reads manifest fields + pack node metadata; reconcile tests cover unchanged key when override matches.
4. **Governance:** override fields are included in manifest signing / snapshot semantics already governed by [`ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md`](./ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md) — no duplicate signing pipeline.

---

## Consequences

- **Positive:** fewer orphan storms on benign renames; clearer consultant mental model.
- **Negative:** broader manifest schema + UX complexity; abuse risk if consultants always preserve keys — mitigate with copy and optional audit log (future).

---

## Implementation (shipped)

| Area | Work |
| --- | --- |
| `@glc/intake-core` | Optional `board_identity_key` in canonical key materialisation |
| Manifest / pack | Optional field on graph nodes; Zod in **`glc-orchestration-pack.ts`** |
| Strategy Lab | Per-initiative edit sheet + checkbox + warning from **`strategy-lab-copy.ts`**; `PATCH …/pipeline/phases/7/result` merges initiative patches in **`patch-pipeline-phase-result.controller.ts`** |
| Reconcile | **`server/src/tests/plan-board-reconcile.test.ts`** — match-after-rename with `board_identity_key` |
| Signing | **`orchestration-roadmap-manifest-signature.test.ts`** — adjunct `board_identity_key` does not change manifest signature |

**Legacy:** audit-wide `preserve_board_identity_on_rename` in Strategy Lab orchestration panel remains documented as deprecated until removal in a later cleanup PR.

---

## Rollback

Clear per-initiative `board_identity_key` (uncheck “Keep Board card identity”, save) or revert `audit_strategy` initiative JSON via existing phase-result / admin flows — cards revert to title-hash canonical keys on next reconcile.
