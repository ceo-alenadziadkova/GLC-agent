# ADR: Delivery Board — deferred epics (backlog stubs)

| Field | Value |
| --- | --- |
| **Status** | Proposed |
| **Date** | 2026-05-02 |
| **Scope** | Future work intentionally **out of** [ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md) Appendix G — each epic should promote to **Accepted** via its **own ADR** when prioritized |
| **Supersedes** | — |

---

### Scheduling contract

Product **§2 decision matrix**, **risk register**, and **GLC-PB-xxx** phased ticket framing live in **[`ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md`](./ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md)** (**Proposed**); engineering SSOT remains **[`ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md`](./ADR-DELIVERY-BOARD-OPERATIONAL-LAYER.md)** (**Accepted**).

When product prioritises an epic in the queue below, **publish a separate new Accepted ADR** for that epic (this file stays a stub index). Cross-link from [docs/MASTER.md](../MASTER.md). Do not implement backlog scope from this stub without that ADR.

---

## Promotion queue (engineering)

When product schedules work, **open a new ADR (Accepted)** for that epic alone — keep this file as a stub index only. Recommended order tends to match risk / dependency:

| Order | Epic | Blocker notes |
| --- | --- | --- |
| 1 | **Epic 1** (preserve key on rename) | Manifest schema + `@glc/intake-core` canonical key revision |
| 2 | **Epic 2** (Board → manifest drafts) | Governance signing, no silent pack writes |
| 3 | **Epic 3** (custom columns) | migrations + reconcile column mapping |

---

## Epic 1 — Preserve `canonical_node_key` on semantic rename (Appendix E)

**Decision (target):** allow consultants to optionally keep Board identity when renaming an initiative in Strategy Lab manifest flow, via an explicit manifest field or override that participates in `@glc/intake-core` `canonical_node_key` (not title-slug drift alone).

**ADR (Proposed):** [`ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md`](./ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md) — promote to **Accepted** before implementation.

**Deliverables sketch:** Strategy Lab UX copy + checkbox; reconcile tests for unchanged key; manifest/zod versioning.

---

## Epic 2 — Hybrid Board updates into manifest drafts (“2.1-C” cookbook)

**Decision (target):** selected operational edits (lane, owner hints) enqueue as **draft revision requests** into manifest/signing workflow — never silent writes to persisted pack rows.

**Deliverables sketch:** PATCH extension or companion endpoint; Director/governance gates; SPA affordance scoped to consultants.

---

## Epic 3 — Per-audit custom kanban columns

**Decision (target):** optional persisted column policy per audit replacing fixed `plan-board-columns.ts` IDs for entitled tenants only.

**Deliverables sketch:** migrations; reconcile migration mapping; downgrade path to defaults.

---

