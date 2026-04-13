# ADR-DOMAIN-SEO-DIGITAL-FINAL-READY
## Final-readiness plan for `seo_digital`

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 3 (`seo_digital`) including sitemap/robots/meta checks and governance outputs |

## Context

`seo_digital` is driven by SEO + crawl collectors, validated by `FactChecker.checkSeo`, then routed by Decision Layer.

References:
- `server/src/agents/seo.ts`
- `server/src/collectors/seo.ts`
- `server/src/services/fact-checker.ts`
- `docs/AGENTS.md`

## Target State (Final-Ready)

1. SEO scoring claims are always consistent with sitemap, robots, and metadata evidence.
2. High-impact SEO assumptions are clearly separated from validated facts.
3. Domain-level errors drive precise refine patches (not generic score warnings only).
4. Governance outputs remain stable and explainable for consultants.

## Current State

1. Baseline checks exist for sitemap, robots, and metadata coverage.
2. Domain participates fully in CONTROL_OBJECT generation and pipeline event observability.
3. Existing thresholds prevent obvious score inflation.

## Gap Analysis

1. Current SEO checks are foundational, but not comprehensive for advanced claim patterns.
2. Domain-specific error classes are not fully mapped for all recurring SEO inconsistencies.
3. Readiness thresholds are not yet documented as domain DoD.

## Decision

1. Preserve current architecture and expand rules in-place within `checkSeo`.
2. Strengthen SEO-specific structural/fixable code mapping in profiles and rule engine.
3. Use deterministic test fixtures for canonical SEO edge scenarios.

## Implementation Plan

1. Extend fact-check patterns for advanced SEO claim reliability.
2. Update phase profile error catalog for SEO-specific inconsistency classes.
3. Add regression tests for scorer consistency and routing behavior.

## Readiness Criteria

1. No unsupported high-confidence SEO claim passes without downgrade/flag.
2. Decision outcomes are reproducible for equivalent collector payloads.
3. SEO-specific error types are present in representative refine scenarios.
4. CONTROL_OBJECT schema compatibility remains intact.

## Observability and Test Plan

1. Monitor phase-3 confidence distribution and refine rate trends.
2. Correlate error sources with collector evidence for root-cause analysis.
3. Keep contract tests green for event payloads and schema validation.

## Risks and Rollback

1. Rule expansion may temporarily increase warning volume.
2. Mitigation: tune thresholds and review false positives from test corpus.
3. Rollback by reverting SEO-only heuristics, keeping orchestration unchanged.

## Related ADRs

- `ADR-CONTROL-OBJECT-V2-FULL.md`
- `ADR-PHASE-PROFILES.md`
- `ADR-DECISION-LAYER-GATES.md`
- `ADR-FACT-CHECKER-UNIFIED-KERNEL.md`
