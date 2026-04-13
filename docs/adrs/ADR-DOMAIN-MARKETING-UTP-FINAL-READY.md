# ADR-DOMAIN-MARKETING-UTP-FINAL-READY
## Final-readiness plan for `marketing_utp`

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 5 (`marketing_utp`) including evidence model, fact-check depth, and governance readiness |

## Context

`marketing_utp` is currently a high-importance domain in the analytic wing with limited collector-backed checks compared to phases 1–4.

References:
- `server/src/agents/marketing.ts`
- `server/src/services/fact-checker.ts`
- `docs/adrs/GAP-ANALYSIS-PHASE0.md`
- `docs/adrs/ADR-FACT-CHECKER-UNIFIED-KERNEL.md`

## Target State (Final-Ready)

1. Marketing claims are classified and validated with a domain-specific rule set comparable in rigor to technical domains.
2. Unsupported numeric promises and over-claiming language are consistently captured.
3. Decision Layer gets precise domain error signals to support targeted refinement.
4. Domain contributes reliable evidence for Phase 7 strategy synthesis.

## Current State

1. Domain participates in generic FactChecker checks and full CONTROL_OBJECT generation.
2. Orchestration, auto-loop, trace, and observability are already operational.
3. Domain lacks a dedicated collector-hook rule implementation in `FactChecker.domainCollectorChecks`.

## Gap Analysis

1. No specialized `marketing_utp` collector-backed verification branch in `FactChecker`.
2. Error typing for marketing-specific hallucination/overpromise patterns is still under-specified.
3. Final-ready acceptance criteria for marketing quality are not encoded in tests.

## Decision

1. Introduce a dedicated domain rule path for `marketing_utp` in `FactChecker`.
2. Add marketing-specific structural/fixable/data-gap codes aligned with rule-engine mapping.
3. Keep schema and orchestration unchanged; evolve only domain rules and tests.

## Implementation Plan

1. Implement `checkMarketing` and register it in `domainCollectorChecks`.
2. Expand profile/rule-engine vocabulary for marketing-specific claim-risk patterns.
3. Add tests covering:
   - unsupported numeric statements
   - risky promise language
   - internal positioning inconsistency markers
4. Validate Decision Layer outputs for representative marketing scenarios.

## Readiness Criteria

1. Marketing domain has explicit rule coverage comparable to technical domains.
2. Overpromising and unsupported-number patterns are consistently surfaced.
3. Refine recommendations contain specific, domain-actionable error types.
4. Downstream strategy quality improves without schema or pipeline regressions.

## Observability and Test Plan

1. Monitor phase-5 hallucination and risky-promise rates.
2. Track confidence and refine-rate trends after rule rollout.
3. Add regression tests for control-object status counters relevant to marketing.

## Risks and Rollback

1. Aggressive language checks could over-flag persuasive but valid copy.
2. Mitigation: begin with conservative thresholds and iterate from test corpus.
3. Rollback by reverting marketing-specific rule set only.

## Related ADRs

- `ADR-FACT-CHECKER-UNIFIED-KERNEL.md`
- `ADR-AUTO-LOOP-RULE-ENGINE.md`
- `ADR-DECISION-LAYER-GATES.md`
- `ADR-CONTROL-OBJECT-V2-FULL.md`
