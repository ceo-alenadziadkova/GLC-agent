# ADR: Idea-only product line (proposed track — not accepted scope)

## Status

Proposed (placeholder). **Not** Accepted — there is no committed “idea-only” product in the current contract.

## Context

Stakeholders occasionally ask for a path where a user **only** writes or dictates a pitch, without a public site URL or a full structured intake, and still receives a **detailed, multi-function implementation plan** (marketing, sales, product) comparable to outcomes from the audit-first pipeline.

The **current** decision record remains [ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1](./ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1.md): roadmaps and orchestration packs are **downstream of evidence** when the audit contract is met; NL ingress is **non-authoritative** and does not replace bank semantics.

## Proposal (if this line is ever prioritized)

If the organization decides to pursue an **idea-only** or “pitch-first” SKU, the following must be addressed in a **new Accepted ADR** (or supersede this file), not in ad hoc copy:

1. **Product contract** — What is explicitly delivered (e.g. hypothesis-only roadmap, shorter evidence bar, consultant-in-the-loop gate, or combination). What is **not** promised (e.g. “viral” or channel-scale outcomes without measurement).
2. **Validation path** — How inputs are verified (interviews, attachments, third-party data opt-in, paid research), and how conflicts with LLM output are surfaced.
3. **Privacy / DPA** — Extends [ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md](./ADR-NL-INGRESS-LLM-OPS-CHECKLIST.md); may require additional consent for storing long-form idea content.
4. **Measurement** — Success metrics for the SKU (separate from `kpi_orchestration_*` technical telemetry); how Product proves value vs audit-first.
5. **Engineering** — Whether new API routes, feature flags, or a distinct pipeline mode are required; must follow [`server/src/config/feature-flags.ts`](../../server/src/config/feature-flags.ts) facade rules (JSDoc on that module links here for future idea-SKU flags — **additive** next to existing toggles).

## Telemetry boundary (do not conflate)

- **`kpi_orchestration_*` fields** (see [`orchestration-telemetry-policy.ts`](../../server/src/config/orchestration-telemetry-policy.ts)) measure **runtime and product-engineering health** of the orchestration path (timelines, pack builds, LLM cost/cache, governance actions). They are **not** a proxy for “pitch quality,” viral outcomes, or revenue attribution.
- **Idea-SKU or GTM business outcomes** require separate instrumentation (e.g. the draft `idea_sku_*` table below) and, where relevant, client-side or CRM-linked measurement — see [client-outcome-measurement.md](../operations/client-outcome-measurement.md). Renaming or overloading `kpi_orchestration_*` to stand in for business success would break DoD-7 and dashboard contracts ([ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA](./ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md)).
- **Additive rule:** a future Accepted ADR for this line adds routes/flags/metrics **alongside** the existing audit-first pipeline; it does not replace [ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1](./ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1.md) bank semantics or NL merge rules.

## Path to a superseding Accepted ADR (checklist)

When Product commits to an idea-only or pitch-first SKU, **replace or accept** this file via a new **Accepted** ADR (do not “soft launch” in copy alone):

1. **Sign-off** — Product + Legal (privacy) + Engineering agree on the **Product contract** §1 and explicit non-goals.
2. **Validation** — Document interview/attachment/research path §2; consultant gate if required.
3. **Metrics** — Promote a **frozen** version of the metrics table (or revision) with distinct names from `kpi_orchestration_*`.
4. **Engineering work order** — List flags, migrations, and API surfaces; verify additive behavior with [AGENTS.md](../AGENTS.md) §Additive change gate.
5. **Changelog** on the new ADR — link this proposed file as superseded.

## Draft metrics (if this SKU is accepted — for the superseding ADR)

These are **not** in force until an Accepted ADR; they inform Product how to measure an idea-only line without conflating it with `kpi_orchestration_*` runtime health.

| Metric | Definition | Not |
|--------|------------|-----|
| `idea_sku_session_start` | Count of sessions that begin on the idea-only path (if built) with explicit consent | Not the same as `kpi_orchestration_timeline_view` |
| `idea_sku_brief_merge_rate` | Share of sessions where the user **confirmed** at least one merged bank field from assist | Not a quality score by itself |
| `idea_sku_consultant_escalation_rate` | Handoffs to consultant review when contract requires human gate | — |
| `idea_sku_outcome_satisfaction` | Post-delivery NPS/CSAT **for this SKU only** (separate from audit NPS) | — |

Business review: compare **time-to-value** and **retention/upsell to audit** against audit-first cohorts; do not use orchestration LLM cost alone as success.

## Consequences (while status is Proposed)

- No engineering work is **required** by this document; it is a **parking lot** for product strategy.
- Marketing and in-product copy should continue to default to **audit-first** unless an Accepted ADR changes the contract.
- [IMPROVEMENTS.md](../IMPROVEMENTS.md) “Delivery OS” items (export to trackers, swimlanes) apply to the **shipped** orchestration model first; an idea-only line might reuse or fork those capabilities after acceptance.

## Changelog

- **2026-04-23:** Added **Telemetry boundary**, **Path to a superseding Accepted ADR** checklist, and **Additive rule** (engineering) — Proposed status unchanged; no new product commitment.
- **2026-04-23:** Added draft **metrics** table for a possible future Accepted ADR (still not in force).
- **2026-04-23:** Initial Proposed ADR (readiness follow-up; no product commitment).
