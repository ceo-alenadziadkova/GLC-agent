# ADR-DOMAIN-TECH-INFRASTRUCTURE-FINAL-READY
## Final-readiness plan for `tech_infrastructure`

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 1 (`tech_infrastructure`) from collector signals to Decision Layer routing |

## Context

`tech_infrastructure` is executed in Phase 1 by `TechAgent`, consumes crawler/performance collectors, passes through `FactChecker.verify()`, and is routed by `DecisionLayer` using `CONTROL_OBJECT`.

Key references:
- `server/src/agents/tech.ts`
- `server/src/services/fact-checker.ts`
- `server/src/services/decision-layer.ts`
- `server/src/config/phase-profiles.ts`
- `docs/AGENTS.md`
- `docs/PIPELINE.md`

## Target State (Final-Ready)

1. Collector-backed facts are consistently validated against performance and HTTP evidence.
2. Domain-level errors map deterministically to `errors.fixable|structural|data_gaps`.
3. Confidence weighting and feasibility produce stable routing (`accept` / `accept_with_warnings` / `refine`).
4. Domain emits actionable trace and assumptions for root-cause analysis and auto-loop refinement.

## Current State

1. Domain-specific collector checks exist (`checkTech`) and enforce core guardrails (`compression`, `cache policy`).
2. Governance contract is already v2.x compatible through `buildControlObject()`.
3. Auto-loop, agent-performance scoring, and evaluation dataset hooks are implemented and reusable by this domain.

## Gap Analysis

1. `checkTech` currently relies on a small set of heuristics and misses richer infra signals (hosting topology, dependency health, CDN mismatch).
2. Error typing is still mostly generic for several correction paths (`score_consistency_flag` overuse).
3. Domain-specific readiness criteria are not formalized as acceptance tests.

## Decision

1. Keep current architecture (`collector -> agent -> fact checker -> decision layer`) unchanged.
2. Expand `tech_infrastructure` fact-check rule set incrementally inside `FactChecker` without adding new orchestration paths.
3. Promote domain-specific error types in `phase-profiles` and align them with `rule-engine` mappings.
4. Gate final-readiness on deterministic tests for rule behavior and decision outcomes.

## Implementation Plan

1. Add new tech evidence checks in `FactChecker.checkTech` for high-risk infra claims.
2. Extend `phase-profiles` / `truth-registry` error vocabulary for infra-specific structural/fixable codes.
3. Add/update tests:
   - `server/src/tests/fact-checker.test.ts`
   - `server/src/tests/decision-layer.test.ts`
   - `server/src/tests/control-object-contract.test.ts`
4. Validate event payloads in `pipeline_events` for `control_object` and `refine_recommended`.

## Readiness Criteria

1. All high-risk infra claims are either confirmed, downgraded, or explicitly marked uncertain.
2. Decision hint remains stable under repeated runs with identical collector input.
3. Domain-specific error codes appear in CONTROL_OBJECT for representative failure cases.
4. No regression in existing CONTROL_OBJECT contract tests.

## Observability and Test Plan

1. Track confidence drift per run via `evaluation_datasets`.
2. Watch `agent_performance` trend for phase 1 in aggregate table.
3. Add fixtures for both healthy and degraded infra profiles to keep tests deterministic.

## Risks and Rollback

1. Over-aggressive rules may reduce acceptable scores and create false refines.
2. Mitigation: rollout under existing feature-flag boundaries and keep threshold constants centralized.
3. Rollback: revert only domain-rule deltas, keep CONTROL_OBJECT contract unchanged.

## Related ADRs

- `ADR-CONTROL-OBJECT-V2-FULL.md`
- `ADR-DECISION-LAYER-GATES.md`
- `ADR-PHASE-PROFILES.md`
- `ADR-FACT-CHECKER-UNIFIED-KERNEL.md`
