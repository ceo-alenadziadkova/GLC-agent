# ADR: Preserve `canonical_node_key` on manifest rename (Epic 1)

| Field | Value |
| --- | --- |
| **Status** | Proposed |
| **Date** | 2026-05-03 |
| **Scope** | Optional stable Board identity when a consultant renames an initiative in Strategy Lab without treating it as a new logical work item |
| **Supersedes** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Delivery Board operational layer (stable key today = hash of manifest signature + lane + normalized title): [`ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md`](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md) Appendix **E** (deferred here).
- Follow-up epic index: [`ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md`](./ADR-DELIVERY-BOARD-FOLLOWUP-EPICS.md) — **Epic 1**.
- Canonical key implementation: [`packages/intake-core/src/canonical-node-key.ts`](../../packages/intake-core/src/canonical-node-key.ts).

---

## Context

Renaming an initiative changes slugified title input to [`canonicalNodeKey`](../../packages/intake-core/src/canonical-node-key.ts); reconcile then treats the old card as orphan (`node_removed` / lane mismatch) and may auto-create a new row. That is correct when the rename is semantically “new work,” but consultants sometimes need a **cosmetic or clarified** title without breaking Board history.

---

## Decision (target — not binding until Accepted)

1. **Explicit override only:** introduce a manifest-level optional **stable key** (or stable alias list) **participating in** canonical key materialisation when the consultant selects **“Keep Board card identity”** in Strategy Lab.
2. **No silent preservation:** default remains current behaviour (title drives hash); preserving identity is **opt-in** per save.
3. **Server truth:** [`computeCanonicalNodeKey`](../../packages/intake-core/src/canonical-node-key.ts) (or successor) reads manifest fields + pack node metadata; reconcile tests cover unchanged key when override matches.
4. **Governance:** override fields are included in manifest signing / snapshot semantics already governed by [`ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md`](./ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md) — no duplicate signing pipeline.

---

## Consequences

- **Positive:** fewer orphan storms on benign renames; clearer consultant mental model.
- **Negative:** broader manifest schema + UX complexity; abuse risk if consultants always preserve keys — mitigate with copy and optional audit log (future).

---

## Implementation sketch (engineering — post-Acceptance)

| Area | Work |
| --- | --- |
| `@glc/intake-core` | Extend key inputs with optional stable id from manifest node |
| Manifest Zod / API | Add optional field + validation |
| Strategy Lab | Checkbox + warning string from copy module |
| Reconcile | Tests: same override → same `canonical_node_key` across title edits |

### Implementation progress (2026 — backend tract)

Shipped **without Strategy Lab UX** (product sign-off still required to mark this ADR **Accepted**):

- **`board_identity_key`** on **`StrategyInitiative`** (`server/src/schemas/domain-output.ts`), propagated through **`OrchestrationActionNode`**, **`buildOrchestrationGraph`** graph nodes, persisted pack Zod (**`glc-orchestration-pack.ts`**), and consumed in **`reconcileBoardWithPack`** via **`canonicalNodeKeyFromManifestAndNode`** (**`packages/intake-core`**).
- **Tests:** `@glc/intake-core` canonical-key cases; **`server/src/tests/plan-board-reconcile.test.ts`** match-after-rename scenario.

Remaining for full Epic closure: Strategy Lab checkbox + manifest signing semantics review + promoting this ADR to **Accepted**.

---

## Status gate

Promote to **Accepted** only after product sign-off on UX copy, manifest shape, and rollback story (clear override → revert to title-hash behaviour).
