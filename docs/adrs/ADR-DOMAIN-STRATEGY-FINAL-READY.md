
# ADR-DOMAIN-STRATEGY-FINAL-READY

## Final-readiness plan for `strategy`

- Status: Accepted
- Date: 2026-04-13
- Owners: Engineering
- Scope: Phase 7 strategy synthesis quality and dependency contract with upstream domain phases

## Context

`strategy` is the synthesis phase that aggregates results from phases 1–6, review notes, and weighted scoring. It has no standalone collector layer and depends on upstream domain quality.

References:

- `server/src/agents/strategy.ts`
- `server/src/services/pipeline.ts`
- `server/src/services/context-builder.ts`
- `docs/PIPELINE.md`

## Target State (Final-Ready)

1. Strategy output is deterministic given stable upstream domain artifacts.
2. Cross-domain contradictions are minimized before final review gate.
3. Strategy recommendations preserve traceability to upstream claims and assumptions.
4. Final report quality is robust even when some domains required refine cycles.

## Current State

1. Strategy is integrated as final sequential phase with full lifecycle events.
2. Weighted overall scoring and review-gate orchestration are implemented.
3. Upstream governance (CONTROL_OBJECT, decisioning, auto-loop) already provides quality signals.
4. Upstream domain fact-check depth is now improved across all six domains, reducing strategy noise and contradiction risk.

## Gap Analysis

1. Remaining work is mostly strategy-specific rubric/acceptance formalization rather than upstream domain parity.
2. No explicit strategy-specific readiness rubric ties synthesis quality to upstream domain health.
3. Limited explicit acceptance criteria for contradiction handling in synthesis output.

## Decision

1. Treat strategy as a downstream contract phase; do not add a separate fact-check subsystem for Phase 7.
2. Use upstream domain readiness gates as primary strategy-quality controls.
3. Add strategy acceptance checks focused on cross-domain consistency and actionability.

## Implementation Plan

1. Define strategy readiness rubric based on upstream domain indicators.
2. Add tests ensuring stable synthesis behavior with mixed upstream quality states.
3. Enhance observability by correlating strategy outcomes with upstream `decision_hint` patterns.

## Acceptance Checklist

- [x] **Mixed-quality synthesis fixture:** one upstream domain at `accept_with_warnings`, others `accept`, strategy must remain coherent and actionable.
- [x] **Contradiction detection fixture:** conflicting upstream assumptions should surface as explicit strategy caveats, not silently merged recommendations.
- [x] **Traceability fixture:** each high-priority strategy recommendation must map to at least one upstream domain signal.
- [x] **Gate stability fixture:** final review gate remains deterministic under repeated runs with identical upstream artifacts.
- [x] **Regression fixture:** report generation and strategy persistence paths remain backward-compatible.

## Readiness Delta (Strategy Closure)

1. Mixed-quality and deterministic final-gate fixtures are covered in `server/src/tests/pipeline-governance-events.test.ts`.
2. Contradiction and traceability strategy-context fixtures are covered in `server/src/tests/context-builder-utils.test.ts`.
3. Strategy persistence regression contract is covered in `server/src/tests/strategy-agent-persistence.test.ts`.
4. Report generation compatibility with strategy persistence is covered in `server/src/tests/reports-route.test.ts`.

Suggested test targets:

- `server/src/tests/context-builder-utils.test.ts` (strategy context composition fixtures)
- `server/src/tests/save-domain-result.test.ts` (strategy persistence safety)
- `server/src/tests/pipeline-governance-events.test.ts` (final gate and event determinism)
- `server/src/tests/decision-layer.test.ts` (routing consistency for upstream mixes used by strategy inputs)

## Readiness Criteria

1. Strategy output remains coherent when one or more domains are `accept_with_warnings`.
2. Key recommendations are traceable to upstream domain evidence.
3. Final review gate receives consistent quality-gate signals.
4. No regression in report generation and delivery flows.

## Observability and Test Plan

1. Track strategy phase confidence/quality outcomes against upstream domain status mix.
2. Add integration fixtures for cross-domain conflict scenarios.
3. Monitor final gate (`after phase 7`) quality pass-rate stability.

## Risks and Rollback

1. Improving strategy strictness can expose latent upstream quality debt.
2. Mitigation: phase in criteria with transparent reporting to consultants.
3. Rollback by relaxing strategy acceptance thresholds, not by weakening core schema.

## Related ADRs

- `ADR-DECISION-LAYER-GATES.md`
- `ADR-CONTROL-OBJECT-V2-FULL.md`
- `ADR-AUTO-LOOP-RULE-ENGINE.md`
- `ADR-CAUSAL-DAG.md`
