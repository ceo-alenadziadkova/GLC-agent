# ADR-DOMAIN-SECURITY-COMPLIANCE-FINAL-READY
## Final-readiness plan for `security_compliance`

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-04-13 |
| Owners | Engineering |
| Scope | Domain phase 2 (`security_compliance`) with security collector evidence and governance routing |

## Context

`security_compliance` runs via `SecurityAgent` and `SecurityCollector`, then goes through FactChecker and Decision Layer.

Primary references:
- `server/src/agents/security.ts`
- `server/src/collectors/security.ts`
- `server/src/services/fact-checker.ts`
- `server/src/services/decision-layer.ts`
- `docs/SECURITY.md`

## Target State (Final-Ready)

1. Security claims are grounded in explicit header/SSL/cookie/CORS evidence.
2. False-positive security narratives are consistently downgraded or flagged.
3. Compliance-sensitive findings trigger human attention when confidence is low.
4. Decision routing remains deterministic for repeated inputs.

## Current State

1. Domain has dedicated checks in `checkSecurity` (`SSL`, critical headers).
2. CONTROL_OBJECT emission and trace plumbing are complete and shared with other domains.
3. Feasibility and confidence weighting are already integrated in the governance path.

## Gap Analysis

1. Security checks focus on a narrow set of controls and do not yet cover richer compliance evidence patterns.
2. Mapping from security-specific failures to structural/data-gap codes is still partially generic.
3. Domain acceptance criteria are not formalized in a dedicated readiness matrix.

## Decision

1. Keep single-pass architecture and avoid separate compliance orchestration branch.
2. Extend domain checks inside existing `FactChecker` and collector outputs.
3. Standardize security error taxonomy to support targeted dynamic adjustment.

## Implementation Plan

1. Extend security rule coverage for high-risk compliance claims using existing collector payload.
2. Align `error_types` in phase profile with rule-engine instructions for security-specific refine loops.
3. Add deterministic tests for header combinations, SSL edge cases, and decision routing outcomes.

## Readiness Criteria

1. High-risk security claims always map to explicit evidence or uncertainty labels.
2. Structural inconsistencies are surfaced with stable domain-specific error codes.
3. Refine decisions include actionable `active_error_types` for targeted reruns.
4. Existing contract tests and API payload shape remain backward-compatible.

## Observability and Test Plan

1. Monitor phase-2 confidence and hallucination rates in evaluation datasets.
2. Track `human_attention_required` reasons for compliance-heavy reports.
3. Assert `control_object` event completeness in integration tests.

## Risks and Rollback

1. Expanded rule coverage may increase refine frequency initially.
2. Mitigation: threshold calibration via config constants and staged rollout.
3. Rollback path: revert security-specific heuristics while preserving schema.

## Related ADRs

- `ADR-CONTROL-OBJECT-V2-FULL.md`
- `ADR-DECISION-LAYER-GATES.md`
- `ADR-FACT-CHECKER-UNIFIED-KERNEL.md`
- `ADR-SAFETY-MODE-EXECUTION.md`
