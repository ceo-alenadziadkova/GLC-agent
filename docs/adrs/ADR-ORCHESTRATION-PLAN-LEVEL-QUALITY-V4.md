# ADR: Plan-level orchestration quality gate (backlog V4)

| Field | Value |
| ----- | ----- |
| **Status** | Proposed — **no implementation** of plan-level `CONTROL_OBJECT` or extended deterministic gates beyond current plan governance until this ADR is **Accepted** with explicit acceptance criteria and schema/API notes |
| **Date** | 2026-04-20 |
| **Parent planning** | [ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md](./ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md) (ideal backlog row **V4**, meta-phase **Q**) |

## Context

The product dialogue called for an optional **plan-level** artifact (e.g. **OrchestrationControlObject**) and stronger deterministic gates on whole-plan quality: cycles, orphan dependencies, and policy violations — **separate** from per-domain `CONTROL_OBJECT` v1 and from site-evidence FactChecker semantics ([`server/src/services/orchestration/README.md`](../../server/src/services/orchestration/README.md) non-goals).

**Already shipped (not V4):** [ADR-ORCHESTRATION-PLAN-GOVERNANCE-CANON.md](./ADR-ORCHESTRATION-PLAN-GOVERNANCE-CANON.md) defines mandatory governance evaluation on persist, `decision_hint` (`accept_plan` / `accept_with_warnings` / `refine_plan`), confidence/risk coverage behavior, and blocking `refine_plan` on build endpoints. That layer stays the baseline; V4 is about **additional** structured plan quality and/or a dedicated plan-level control surface if product requires it.

## Decision

1. **V4 scope is deferred** until product prioritizes meta-phase **Q** and this ADR is updated to **Accepted**.
2. **Before any code or migration** for V4, this document must list: acceptance criteria, Zod/schema impact on `glc_orchestration_pack` or sidecar tables, API/contract changes, feature-flag names (via [`server/src/config/feature-flags.ts`](../../server/src/config/feature-flags.ts) only), and telemetry keys (via [`server/src/config/orchestration-telemetry-policy.ts`](../../server/src/config/orchestration-telemetry-policy.ts) only).
3. **Domain-level** `CONTROL_OBJECT` v1, Decision Layer, and FactChecker remain unchanged; plan-level artifacts **must not** replace or duplicate those per-phase semantics.
4. **Relationship to graph builder:** Any new global gates (e.g. orphan dependency reporting beyond today’s repair paths) must be specified here and implemented in orchestration services with thresholds in `orchestration-*-policy.ts` modules — not inline in routes or UI.

## Consequences

### Positive

- Clear gate between “governance on persist” (canon ADR) and “optional plan-level CO / extended quality” (this ADR).
- Prevents ad-hoc plan-level fields that bypass documentation and parity tests.

### Trade-offs

- V4 work starts with documentation and schema design latency, not immediate coding.

## Implementation notes (when Accepted)

- Extend [`orchestration-plan-governance.service.ts`](../../server/src/services/orchestration/orchestration-plan-governance.service.ts) and related policy modules only after acceptance criteria are fixed.
- Update the DoD matrix in [`server/src/services/orchestration/README.md`](../../server/src/services/orchestration/README.md) when behavior ships.
- Keep rollout percentages and phase history only in the rollout ADR.
