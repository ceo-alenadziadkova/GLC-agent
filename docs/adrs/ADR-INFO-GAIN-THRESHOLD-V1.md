# ADR: Info-Gain Threshold for Intake Signal Contributions (v1)

## Status

Accepted (Sprint 3)

## Date

2026-04-23

## Context

`SignalContribution.expectedInfoGainBits` is only useful if we enforce a floor: otherwise teams can mark every question as “high signal” without quantifying marginal diagnostic value.

## Decision

- Canonical constant: `MIN_EXPECTED_INFO_GAIN_BITS_SPRINT2 = 0.3` in `packages/intake-core/src/config/intake-intelligence-sprint2.ts` (shared name for Sprint 2 gate completeness and future Sprint 3 cross-bank lint).
- Sprint 2 gate questions must include at least one `signalContribution` row with `expectedInfoGainBits >= 0.3`.
- Future calibration: product may raise the floor or introduce per-`semanticDomain` thresholds; changes require updating this ADR and the gate metadata rows together.

## Consequences

- Higher friction when authoring metadata (authors must justify numeric info-gain).
- Better alignment between pilot critical signals and stated contribution of each gate question.

## References

- `packages/intake-core/src/config/intake-intelligence-sprint2.ts`
- `packages/intake-core/src/config/intake-intelligence-gate-metadata.ts`
- [ADR-DECISION-IMPACT-METADATA-V1.md](./ADR-DECISION-IMPACT-METADATA-V1.md)
