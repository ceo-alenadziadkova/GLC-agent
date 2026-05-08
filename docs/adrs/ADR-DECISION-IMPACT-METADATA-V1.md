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

Lint policy (current):

- hard error if a P0 question misses any required-now field
- hard error if `semanticDomain` is outside Core Diagnostic Spine
- hard error if a **Sprint 2 gate** question misses the full contract (`INTELLIGENCE_SPRINT2_INCOMPLETE`)
- anti-pattern heuristics: **errors** for leading, tautological, vanity, double-barreled labels; **warnings** for generic, outside-scope, low-gain, duplicate-intent, and low-gain `whyAsked` fragments (see `lint-intelligence-contract.ts`)

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

## Baseline Metrics (current)

- total questions: 78
- P0 questions: 16
- fully covered questions (`required_now`): 54 (~69.2%)
- fully covered P0: 16 (100%)
- Sprint 2 gate: 47 ids with **full** contract including `expectedInfoGainBits` ≥ 0.3 (see [`ADR-INFO-GAIN-THRESHOLD-V1.md`](./ADR-INFO-GAIN-THRESHOLD-V1.md))

## Changelog

- **2026-04-23 — Sprint 2:** Introduced the **Sprint 2 gate** (47 bank ids) with full contract rows in `intake-intelligence-gate-metadata.ts`: stewardship, pilot `signalContribution` with `expectedInfoGainBits` floor (**0.3**), `followupPolicy`, `stopCondition`, and removal of `todo` deferrals for gate questions. Lint now errors with `INTELLIGENCE_SPRINT2_INCOMPLETE` for any gate id missing that shape. `PUT /api/audits/:id/brief` continues to expose minimal readiness as `trace` (see `docs/API.md`). Coverage summary `fullyCoveredQuestions` baseline moves to **58** / **78** for `required_now` completeness.
- **2026-04-23 — Sprint 2.5 (lint):** Promoted **leading**, **tautological**, **vanity**, and **double-barreled** anti-pattern findings to **`error`** in `lintIntelligenceContractV1`; generic / outside-scope / low-gain / duplicate-intent remain **`warn`**. Numeric floor **0.3** bits is enforced via Sprint 2 completeness (`ADR-INFO-GAIN-THRESHOLD-V1`).
- **2026-04-23 — Docs sync:** `docs/QUESTION_BANK.md` §16 and this ADR baseline metrics aligned with `intake-intelligence-contract.test.ts` (54 `required_now`, 47 Sprint 2 complete).

## References

- `packages/intake-core/src/config/intake-intelligence-contract.ts`
- `packages/intake-core/src/config/intake-intelligence-gate-metadata.ts`
- `packages/intake-core/src/config/intake-intelligence-sprint2.ts`
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
- Baseline summary: `78` total questions, `16` P0, **`58`** bank ids with `required_now` intelligence (`fullyCoveredQuestions`), **47** Sprint 2 gate ids with full contract (`getIntakeIntelligenceSprint2CoverageSummary`), `100%` P0 coverage for `required_now`.
