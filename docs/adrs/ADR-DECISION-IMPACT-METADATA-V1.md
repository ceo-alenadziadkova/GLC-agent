# ADR: Decision-Impact Metadata for Intake Question Bank (v1)

## Status
Accepted (Sprint 1 baseline)

## Date
2026-04-22

## Context

The intake system already supports readiness, caveats, sequencing, and critical signal evaluation, but question metadata has been primarily UI-oriented. To evolve from a broad questionnaire into a decision-oriented adaptive navigator, each high-priority question must explicitly describe:

- why it is asked,
- which downstream decisions it changes,
- and which semantic domain it belongs to.

At the same time, Sprint 1 must remain stable and deterministic:

- no embedding-based dedup gate yet,
- no runtime crash on incomplete metadata,
- no forced full-bank enrichment in a single iteration.

## Decision

Introduce `Intake Intelligence Contract v1` in `@glc/intake-core`:

- canonical module: `packages/intake-core/src/config/intake-intelligence-contract.ts`
- required-now fields:
  - `whyAsked`
  - `semanticDomain`
  - `decisionImpact` (min 1)
- optional-with-todo fields:
  - `signalContribution`
  - `followupPolicy`
  - `stopCondition`
  - `todo` metadata (`ownerDomain`, `reviewByIsoDate`, `todoReason`)

P0 coverage in Sprint 1 is strictly:

1. all question ids referenced by critical signals registry
2. all Section `F` (goals) questions

Canonical critical-signals registry path:

- `packages/intake-core/src/artifacts/intake-critical-signals-pilot-1.0.0.json`

Lint policy in Sprint 1:

- hard error if a P0 question misses any required-now field
- hard error if `semanticDomain` is outside Core Diagnostic Spine
- anti-pattern heuristics are warnings only

Runtime policy in Sprint 1:

- incomplete intelligence metadata must not break rendering or plan computation
- fallback emits `intelligence_metadata_incomplete` trace for diagnostics
- UI/schema consumers only receive decision-impact metadata when required-now fields are complete

## Consequences

### Positive

- decision semantics become explicit for the most critical intake nodes
- CI enforces quality where it matters most (P0)
- rollout remains safe due to deterministic lint and runtime fallback

### Trade-offs

- full bank is not enriched in Sprint 1 (coverage intentionally partial)
- anti-pattern checks can produce warning noise until wording governance matures

### Out of Scope (Sprint 1)

- embedding-based semantic dedup
- numeric information-gain runtime scoring
- NL ingress orchestration
- stage-aware runtime branching expansion

## Sequenced follow-up roadmap (locked)

Post-Sprint implementation order is fixed to avoid policy drift:

1. Sprint 2 (Phase 1b): explanatory UI surface consumes `whyAsked` and `decisionImpact`.
2. Sprint 2.5: deterministic Question Quality Engine v2 with calibrated anti-pattern policy.
3. Sprint 3: runtime prioritization/depth execution (`currentPriority`, `skipPolicy`, stop/follow-up semantics).
4. Only after Sprint 3: NL ingress orchestration into the same decision graph.

## Baseline Metrics (Sprint 1)

- total questions: 78
- P0 questions: 17
- fully covered questions (required-now): 17 (21.8%)
- fully covered P0: 17 (100%)

## References

- `packages/intake-core/src/config/intake-intelligence-contract.ts`
- `packages/intake-core/src/artifacts/intake-critical-signals-pilot-1.0.0.json`
- `packages/intake-core/src/core/lint-bank-policy/lint-intelligence-contract.ts`
- `packages/intake-core/src/core/build-intake-plan.ts`
- `docs/QUESTION_BANK.md`

## Verification / DoD (Sprint 1)

Run targeted tests:

- `pnpm -w exec vitest run packages/intake-core/src/tests/intake-intelligence-contract.test.ts`
- `pnpm -w exec vitest run packages/intake-core/src/tests/lint-intelligence-contract.test.ts`
- `pnpm -w exec vitest run packages/intake-core/src/tests/intelligence-fallback-runtime.test.ts`

Expected invariants:

- All P0 ids have `required_now` (`whyAsked`, `semanticDomain`, `decisionImpact`).
- Lint emits hard errors for missing `required_now` and invalid `semanticDomain`.
- Runtime keeps question flow operational and emits `intelligence_metadata_incomplete` trace on incomplete metadata.
- Baseline summary remains deterministic (`78` total, `17` P0, `17` fully covered, `100%` P0 coverage).
