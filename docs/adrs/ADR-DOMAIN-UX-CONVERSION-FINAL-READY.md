# ADR-DOMAIN-UX-CONVERSION-FINAL-READY
## Final-readiness plan for `ux_conversion`

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 4 (`ux_conversion`) from accessibility/crawl evidence to governance and routing |

## Context

`ux_conversion` uses crawler + accessibility collector data, then flows through FactChecker, Decision Layer, and auto/review gates.

References:
- `server/src/agents/ux.ts`
- `server/src/collectors/accessibility.ts`
- `server/src/services/fact-checker.ts`
- `docs/PIPELINE.md`

## Target State (Final-Ready)

1. UX/conversion claims are consistently tied to measurable evidence.
2. Accessibility-related score inflation is prevented by deterministic checks.
3. Domain errors are actionable for targeted reruns and consultant review.
4. Phase-4 output quality is reliable enough to unblock Gate 2 confidently.

## Current State

1. `checkUx` already validates image-alt coverage and score consistency.
2. Domain is fully integrated with CONTROL_OBJECT, decisioning, and event emission.
3. Review-gate flow after auto wing is already operational.

## Gap Analysis

1. Validation coverage is narrow and does not yet include broader conversion/UX evidence classes.
2. Error taxonomy remains partly generic, reducing precision for dynamic adjustments.
3. No explicit domain-level readiness matrix for gate-quality acceptance.

## Decision

1. Extend UX checks within the existing FactChecker kernel; no new service layer.
2. Normalize UX-specific fixable/structural codes to improve rerun quality.
3. Define gate-oriented readiness criteria aligned with Phase 4 as a review checkpoint.

## Implementation Plan

1. Add additional UX/conversion evidence checks in `checkUx`.
2. Update phase profile error types and corresponding rule-engine mappings.
3. Expand test coverage for gate-boundary scenarios (`accept_with_warnings` vs `refine`).

## Readiness Criteria

1. High-impact UX claims cannot remain unvalidated without explicit uncertainty labels.
2. Phase 4 produces stable decision hints for identical input evidence.
3. Gate-quality regressions are caught by deterministic tests.
4. Observability data is sufficient for consultant-side explainability.

## Observability and Test Plan

1. Track Phase 4 refine rate and reasons over time.
2. Validate that `error_sources` and `claim_sources` remain coherent for UX claims.
3. Keep pipeline integration tests green for review-gate emissions.

## Risks and Rollback

1. Wider checks may increase conservative scoring in early runs.
2. Mitigation: calibrate thresholds and compare confidence gain trends.
3. Rollback by reverting UX-only check expansions.

## Related ADRs

- `ADR-CONTROL-OBJECT-V2-FULL.md`
- `ADR-DECISION-LAYER-GATES.md`
- `ADR-AUTO-LOOP-RULE-ENGINE.md`
- `ADR-FACT-CHECKER-UNIFIED-KERNEL.md`
