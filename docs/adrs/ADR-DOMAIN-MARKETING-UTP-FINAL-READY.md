# ADR-DOMAIN-MARKETING-UTP-FINAL-READY
## Final-readiness plan for `marketing_utp`

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 5 (`marketing_utp`) including evidence model, fact-check depth, and governance readiness |

## Context

`marketing_utp` is a high-importance analytic-wing domain. It now has a dedicated FactChecker branch, explicit error typing, and dynamic-adjustment coverage.

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

1. Domain has dedicated `checkMarketing` verification in `FactChecker.domainCollectorChecks`.
2. Unsourced numeric claims for market size, competitor share, and ROI are flagged at high score.
3. Structural mappings to marketing error codes and rule-engine instructions are active for targeted refine loops.
4. Deterministic tests now cover correction generation and dynamic-adjustment patch routing for agent 5.

## Gap Analysis

1. Stretch: enrich marketing validation with external-source confidence tiers when connectors are enabled.
2. Stretch: add deeper claim decomposition for audience and positioning conflict classes.
3. Keep false-positive tuning for persuasive-but-valid copy.

## Decision

1. Introduce a dedicated domain rule path for `marketing_utp` in `FactChecker`.
2. Add marketing-specific structural/fixable/data-gap codes aligned with rule-engine mapping.
3. Keep schema and orchestration unchanged; evolve only domain rules and tests.

## Implementation Plan

1. Done: implemented `checkMarketing` and registered in `domainCollectorChecks`.
2. Done: expanded marketing vocabulary and rule-engine mapping for claim-risk patterns.
3. Done: added tests for unsupported numeric statements and CONTROL_OBJECT mapping.
4. Done: added dynamic-adjustment tests for agent-5 patch generation.

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
