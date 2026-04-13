# ADR-DOMAIN-AUTOMATION-PROCESSES-FINAL-READY
## Final-readiness plan for `automation_processes`

| Field | Value |
|---|---|
| Status | Proposed |
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
2. Decision Layer already includes feasibility guardrail for this domain.
3. Domain-specific collector-hook checks are not implemented in `FactChecker`.

## Gap Analysis

1. Missing dedicated automation rule branch in `FactChecker`.
2. Generic checks are insufficient for execution-risk patterns specific to automation scope.
3. Domain-specific test scenarios for feasibility + fact validation are incomplete.

## Decision

1. Add explicit `automation_processes` verification branch in FactChecker.
2. Keep feasibility guardrail as primary routing protection, but improve upstream evidence validation.
3. Expand domain test matrix for feasibility thresholds and automation-specific errors.

## Implementation Plan

1. Implement domain checks for automation evidence consistency and unsupported claims.
2. Add profile/rule-engine error codes mapped to automation risk classes.
3. Add tests for:
   - low-feasibility forced refine
   - unsupported automation assumptions
   - stable routing around threshold boundaries.

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
