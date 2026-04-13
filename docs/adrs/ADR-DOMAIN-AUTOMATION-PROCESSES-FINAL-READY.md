# ADR-DOMAIN-AUTOMATION-PROCESSES-FINAL-READY
## Final-readiness plan for `automation_processes`

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 6 (`automation_processes`) with feasibility-sensitive decisioning and fact-check depth |

## Context

`automation_processes` is in the analytic wing and is explicitly feasibility-gated by Decision Layer for forced refine behavior on low feasibility.

References:
- `server/src/agents/automation.ts`
- `server/src/services/decision-layer.ts`
- `server/src/services/fact-checker.ts`
- `docs/adrs/GAP-ANALYSIS-PHASE0.md`

## Target State (Final-Ready)

1. Automation recommendations are grounded in detected tooling/process evidence.
2. Feasibility-sensitive claims are validated with domain-specific heuristics.
3. Decision outcomes (`refine` vs `accept_with_warnings`) are stable and explainable.
4. Domain quality is sufficient to feed Strategy without avoidable structural noise.

## Current State

1. Domain has full governance plumbing and participates in all CONTROL_OBJECT/auto-loop paths.
2. Decision Layer feasibility guardrail is active for this domain.
3. Domain now has dedicated `checkAutomation` verification in FactChecker.
4. Automation-specific structural error mapping and agent-6 rerun patch routing are covered by tests.

## Gap Analysis

1. Stretch: broaden automation evidence checks with connector-derived integration metadata.
2. Stretch: add stricter separation between optimistic timeline language and evidence-backed rollout plans.
3. Add targeted tests around feasibility-threshold boundaries in combined scenarios.

## Decision

1. Add explicit `automation_processes` verification branch in FactChecker.
2. Keep feasibility guardrail as primary routing protection, but improve upstream evidence validation.
3. Expand domain test matrix for feasibility thresholds and automation-specific errors.

## Implementation Plan

1. Done: implemented automation domain checks for speculative time savings, unverified tool capability, and unrealistic ROI timeline.
2. Done: aligned automation error codes with rule-engine mappings.
3. Done: added deterministic tests for correction generation, CONTROL_OBJECT structural mapping, and agent-6 dynamic-adjustment patches.
4. Next: expand combined feasibility + domain-error test coverage.

## Readiness Criteria

1. Automation has dedicated domain rule coverage in FactChecker.
2. Feasibility-driven refines are supported by explicit evidence/error context.
3. Strategy phase receives cleaner, lower-noise automation outputs.
4. No regression to existing governance and schema contracts.

## Observability and Test Plan

1. Track phase-6 refine causes and feasibility risk-code distribution.
2. Measure confidence gain after auto-loop reruns in automation domain.
3. Keep integration tests green for analytic-wing flow and control-object emission.

## Risks and Rollback

1. Domain tightening may increase refine frequency before prompt/rules converge.
2. Mitigation: stage rollout and compare with baseline evaluation datasets.
3. Rollback by reverting automation-specific checks only.

## Related ADRs

- `ADR-DECISION-LAYER-GATES.md`
- `ADR-FEASIBILITY-RULE-ENGINE.md`
- `ADR-AUTO-LOOP-RULE-ENGINE.md`
- `ADR-CONTROL-OBJECT-V2-FULL.md`
