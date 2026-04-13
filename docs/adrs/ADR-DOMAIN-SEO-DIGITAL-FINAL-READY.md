# ADR-DOMAIN-SEO-DIGITAL-FINAL-READY
## Final-readiness plan for `seo_digital`

| Field | Value |
|---|---|
| Status | Accepted |
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

1. Baseline checks exist and were expanded: sitemap/robots/meta coverage plus robots issue severity and structured-data coverage guardrails.
2. Domain participates fully in CONTROL_OBJECT generation and pipeline event observability.
3. Existing thresholds prevent obvious score inflation.

## Gap Analysis

1. Stretch: add deeper competitor/benchmark claim validation when external SEO connectors are enabled.
2. Stretch: improve claim-type precision for advanced SEO scenarios (ranking/traffic assertions).
3. Continue threshold calibration from evaluation datasets to reduce false positives.

## Decision

1. Preserve current architecture and expand rules in-place within `checkSeo`.
2. Strengthen SEO-specific structural/fixable code mapping in profiles and rule engine.
3. Use deterministic test fixtures for canonical SEO edge scenarios.

## Implementation Plan

1. Done: extended SEO fact checks (robots issue flags + structured-data coverage).
2. Done: aligned structural mapping to SEO error codes and rule-engine patches.
3. Done: added regression tests for corrections, CONTROL_OBJECT mapping, and dynamic-adjustment routing.

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
