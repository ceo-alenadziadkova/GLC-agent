# ADR: Diagnostic Adaptive Intake System (Phased Rollout)


| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status         | Accepted (Phased rollout)                                                                                                                                                                      |
| Date           | 2026-04-20                                                                                                                                                                                     |
| Scope          | Intake sequencing, readiness gating, pipeline handoff quality                                                                                                                                  |
| Owners         | Product + Engineering                                                                                                                                                                          |
| Implementation | **Phase-1 pilot (phases 0–9): engineering complete** — [contract](../INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md). Ops/product: flags + KPI rows. **Phase-B/C:** selective code pre-wiring implemented behind flags; production rollout policy remains KPI-gated. |


**Implementation contract (enforcement points, acceptance checklist):** [INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md](../INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md)

**Engineering note:** the pilot slice (Healthcare baseline artifacts, readiness envelope, enforcement points, tests through phase 7, rollout procedures phase 8–9 as code + docs) is **fully implemented**; remaining work is gated enablement and post-KPI expansion only—not missing Phase-1 build-out.

## 1) Context

GLC already has a strong intake foundation:

- unified question bank,
- branch/policy/layout/resolver architecture,
- progressive surfaces (pre-brief, discovery, self-serve, consultant-led),
- server-authored plan rendering,
- downstream pipeline context builder and CONTROL_OBJECT governance.

The missing capability is not data collection itself. The gap is **diagnostic sequencing semantics**: when and why to ask next, when context is enough to proceed, and where to remediate low-confidence signals before pipeline execution.

## 2) Decision Summary

We evolve intake into a **stable intake platform with adaptive orchestration semantics**.

Core principle:

- keep canon and contracts stable,
- move adaptation into versioned sequencing metadata,
- keep resolver as single runtime authority across surfaces,
- separate UX completion from audit execution readiness.

This ADR intentionally separates:

- **Phase-1 must ship core** (small, implementable quickly),
- **Phase-B/C governance expansion** (preserved, but not mandatory in first wave).

Pragmatic rollout policy:

- execute in short, bounded phases (0-9),
- keep implementation quality gates explicit before each expansion step,
- do not open Phase-B/C work before pilot KPI gate is passed.

## 3) Normative Semantics (Keep)

### 3.1 Term Hierarchy (authoritative)


| Term             | Authority                     | Purpose                                         | Execution impact            |
| ---------------- | ----------------------------- | ----------------------------------------------- | --------------------------- |
| Requiredness     | Policy mode/surface rules     | Product obligation to collect fields            | Feeds SLA checks            |
| SLA gate         | Existing compatibility floor  | Backward-compatible completion behavior         | May block progression       |
| Readiness        | New decision-quality gate     | Is context reliable enough for audit execution  | May block start/report      |
| Coverage         | Capability completeness model | Context sufficiency by capability block         | Feeds readiness             |
| signalConfidence | Intake signal reliability     | Reliability of explicit/inferred intake signals | Feeds readiness/remediation |
| dataQuality      | UX/progress metric            | Completion proxy for UX/analytics               | Never execution authority   |


### 3.2 Confidence Boundary (authoritative)

- Intake uses `signalConfidence`.
- Phase governance (CONTROL_OBJECT / Decision Layer) uses `analysisConfidence` / `controlConfidence`.
- These confidence systems must not be merged.

### 3.3 Precedence Order (authoritative)

1. Branch + policy define participation ceiling (`eligible`).
2. Sequencing selects among eligible asks.
3. Layout defines where/when asks appear.
4. UI renders plan output only (no local branching invention).

**Phase-1 implementation alignment:** the runtime resolver keeps ADR precedence (`eligibility → sequencing → layout`) while preserving deterministic surface projection. Sequencing governs ordering within the eligible set; layout remains the final projection for rendered `visible` slots, and UI still consumes server-authored output only.

## 4) Source of Truth and Versioning

### 4.1 Sequencing Artifact

Sequencing logic lives in a **dedicated sequencing artifact** (not policy extension).

Current canonical artifact path and ownership:

- path: `packages/intake-core/src/artifacts/intake-sequencing-pilot-1.0.0.json`,
- runtime owner: Intake Core (Engineering),
- semantic owner: Product + Engineering (joint sign-off for rule changes).

### 4.2 Tuple Contract

`sequencingVersion` is part of persisted `intake_versions` tuple family:

- `questionBankVersion`,
- `policyVersion`,
- `layoutVersion`,
- `resolverVersion`,
- `sequencingVersion`.

Legacy 4-part tuples are migration/compatibility paths only.

## 5) Surface Flow Mapping (Normative Defaults)

These are **architectural semantic zones**, not cosmetic UX variants.

Formal readiness definitions:

- `flow_ready`: enough context to complete the current intake surface coherently.
- `audit_ready`: enough reliable context to authorize pipeline start/report execution.

Canonical status tokens (contract-level):

- `flow_ready`,
- `audit_ready`,
- `blocked`,
- `ready_with_caveats`.

Note: camelCase labels (`flowReady`, `auditReady`) are narrative only; API/persisted contracts must use canonical snake_case tokens.


| Flow                                                          | DSL behavior                          | Readiness policy                                                                                                                                                                                                                                                                                                          | Remediation budget | Consultant override |
| ------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------- |
| Pre-brief (`mode=pre_brief`, `surface=client_form`)           | Minimum context for call handoff      | `flow_ready` only                                                                                                                                                                                                                                                                                                         | 0                  | N/A                 |
| Self-serve brief (`mode=full/express`, `surface=client_form`) | Progressive flow to audit conversion  | `flow_ready` + `audit_ready`                                                                                                                                                                                                                                                                                              | 1-2                | No direct override  |
| Consultant-led (`mode=full`, `surface=consultant_interview`)  | Deep enrichment and expert correction | `audit_ready` advisory + override path                                                                                                                                                                                                                                                                                    | Flexible/manual    | Allowed             |
| Discovery (`mode=discovery`, `surface=public_discovery`)      | Wow-first + conversion signal         | Envelope + trace at convert (`criticalSignalsMode: 'sla_only'`); pilot critical registry does **not** block convert — full pilot gate (`criticalSignalsMode: 'full'`) at `POST /api/audits/:id/pipeline/start` only (see [INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md](../INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md)) | 0                  | N/A                 |


Rules:

- surface policy may tune friction/remediation/blocking,
- surface policy may not redefine core signal semantics or inference precedence,
- policy changes require artifact version bump + parity tests.

Discovery and Pre-brief authority rule:

- completion of `discovery` or `pre_brief` flow does not grant audit execution authority by itself,
- audit execution authority is evaluated only on conversion/start pathways using readiness + pipeline gate rules.

## 6) Phase-1 Must Ship (Core Scope)

This is the **minimum approved implementation package**:

1. Dedicated sequencing artifact + tuple versioning (`sequencingVersion`).
2. Critical signal registry (minimum set only).
  - Phase-1 mandatory semantic keys:
    - `industry`,
    - `website_presence`,
    - `primary_problem`,
    - `operations_bottleneck`,
    - `audit_focus`,
    - Closing-flow bank ids (e.g. `d_closing_flow`) remain **recommended** in the question bank; they are not pilot **critical-signal execution gates** so SLA labels stay aligned with pipeline readiness.
3. Deterministic sequencing transitions (no probabilistic routing).
4. Fallback clarification selector.
5. Readiness gate with Phase-1 statuses:
  - `audit_ready`,
  - `blocked`,
  - optional `ready_with_caveats` only if implemented with max 3 named caveat classes.
6. Precedence enforcement in resolver.
7. Readiness enforcement at:
  - brief recomputation path,
  - discovery conversion boundary,
  - `POST /api/audits/:id/pipeline/start`.
8. Server-authored explainability traces for sequencing/remediation decisions.

Phase-1 pilot bounds (to prevent scope creep):

- pilot vertical: `healthcare`,
- max critical signals in Phase-1 registry: 6,
- max remediation asks on self-serve surfaces: 2,
- max transition types in pilot ruleset: 6.

Phase-1 explicit non-goals:

- full caveat ownership machinery,
- full lifecycle governance for bridge content,
- full envelope replacement in all downstream components.

Phase-1 Definition of Done (DoD):

- canonical readiness API fields and enums are the only accepted vocabulary in contracts,
- tuple compatibility (`sequencingVersion` + legacy fallback) is tested,
- precedence invariant is enforced in resolver and validated by tests,
- readiness enforcement points are active and covered by server tests,
- surface parity snapshots remain stable for pilot surfaces.

## 6.1) Pragmatic Rollout Phases (0-9)

### Phase 0: Baseline + inventory (1-2 days)

- freeze current baseline for artifacts/contracts/enforcement points,
- produce a focused gap list against Phase-1 must ship and record DoD checks.

### Phase 1: Contracts and schemas (no complex logic)

- lock canonical readiness fields and enums,
- lock tuple contract with `sequencingVersion` and compatibility fallback,
- lock minimal sequencing artifact and critical signal registry schemas.

### Phase 2: Deterministic sequencing core

- enforce `branch/policy -> sequencing -> layout -> UI` precedence as runtime invariant,
- keep pilot transition set bounded; no probabilistic routing/ML in Phase-1.

### Phase 3: Critical signals + readiness gate

- keep Phase-1 registry to six mandatory keys only,
- keep baseline package-agnostic readiness evaluator,
- enforce default unknown safety rule.

### Phase 4: Remediation (soft, bounded)

- keep fallback clarification selector deterministic,
- keep remediation budget bounded by surface policy,
- defer session-level reopening suppression until post-pilot KPI gate.

### Phase 5: Enforcement points

- keep checks at `PUT /brief` recompute path (observability),
- keep checks at discover conversion boundary and pipeline start boundary,
- keep execution authority separate from discovery/pre-brief completion.

### Phase 6: UI contract (minimal and strict)

- one-question focus,
- compact explainability hint ("why asked"),
- remediation checkpoint language instead of generic hard errors,
- no UI-local branching; only server-authored states.

### Phase 7: Tests and quality gates

- readiness contract tests,
- tuple compatibility tests (including fallback),
- precedence tests,
- boundary enforcement tests,
- remediation idempotence tests,
- surface parity tests.

### Phase 8: Pilot rollout (single vertical)

- rollout sequence: internal -> limited traffic -> full,
- monitor completion, readiness-qualified context, and drop-off non-regression.

### Phase 9: Phase-B/C expansion

- only after pilot KPI gate,
- then expand signal metadata, package-aware readiness, caveat taxonomy, Context Envelope, and bridge-question governance.

## 7) Phase-B/C Expansion (Preserve, Do Not Lose)

These are required directionally, but not blocking Phase-1 shipment:

- full signal registry metadata (`sourcesByPriority`, `normalizerRef`, conflict rules, unknown rules),
- expanded ask-slot contract fields (`unlocksSignals`, `guardDomain`, `transitionRuleRef`, etc.),
- richer caveat class governance and ownership model,
- full runtime state model across lifecycle statuses,
- Project Context Envelope standardization before ContextBuilder,
- execution-plan-aware readiness by Starter/Pro/Complete scope + cross-plan baseline,
- bridge-question lifecycle governance (KPI, owner, removal criterion),
- expanded surface matrices per vertical packs.
- broader bridge-question lifecycle governance and optimization loops.

## 8) Resolver Decomposition (Anti-Monolith Rule)

Single authority does not mean single monolith file. Resolver runtime must remain modular:

1. Eligibility evaluator (branch + policy ceiling),
2. Signal evaluator (critical/inferred/unknown handling),
3. Sequencing evaluator (stage/intent transitions),
4. Readiness evaluator,
5. Remediation selector,
6. Layout projection,
7. Plan assembly + traces.

## 9) Legacy Derived Fields: Authority Note

To prevent semantic drift:

- existing `dataQualityScore` remains UX/analytics,
- existing AI-readiness style heuristics remain advisory,
- new readiness gate is orchestration authority.

No legacy derived field may implicitly authorize pipeline start.

Clarification:

- Phase-1 readiness is a package-agnostic baseline gate,
- it is not the final package-aware readiness model for Starter/Pro/Complete scopes.

Package-aware readiness is Phase-B/C.

Baseline blocking rule (Phase-1):

- `blocked` refers to baseline audit execution readiness only.
- Package-aware insufficiency for Starter/Pro/Complete scopes is deferred to Phase-B/C.

Canonical API fields for Phase-1 readiness contract:

- `flowReadinessStatus`: `flow_ready` | `blocked`,
- `auditReadinessStatus`: `audit_ready` | `blocked` | `ready_with_caveats`.

No alternative readiness field names or enum vocabularies are allowed in Phase-1 APIs.

## 10) Unknown Handling Principle

`unknown` is valid UX, but not automatically valid execution evidence.

Per-signal policy must define whether unknown:

- is accepted for `flow_ready`,
- triggers remediation,
- allows `audit_ready` with caveat,
- or blocks audit readiness.

Default safety rule:

- if no per-signal unknown policy is defined, `unknown` may satisfy `flow_ready` but cannot independently satisfy `audit_ready`.
- `unknown` is never positive evidence and cannot raise `signalConfidence` above `low` by itself.

## 11) Pipeline Boundary Rule

Intake does not replace phase governance.

- Intake produces structured project context primitives.
- Pipeline phases produce evaluative governance objects (CONTROL_OBJECT and Decision Layer outcomes).
- Review gates remain human expert enrichment points and must not be silently duplicated by intake logic.

## 12) Risks and Mitigations (Focused)

1. Resolver obesity
  - Mitigation: enforced internal decomposition and module boundaries.
2. Governance overload in first wave
  - Mitigation: strict Phase-1 core scope; move advanced controls to Phase-B/C.
3. Surface drift
  - Mitigation: server-authored sequencing; no UI-local branching.
4. Signal registry drift
  - Mitigation: single registry artifact + CI lint.
5. Readiness gaming
  - Mitigation: critical signals require downstream-risk justification.

## 13) Validation Strategy

### Phase-1 required tests

- tuple compatibility/parity tests including `sequencingVersion`,
- precedence tests (`branch/policy -> sequencing -> layout`),
- readiness gate tests at enforcement points,
- pilot flow sequence snapshots,
- server/client parity tests for surface behavior.
- sequencing trace contract tests (reasons include semantic transition cause, not only question IDs),
- remediation idempotence tests (same missing/low-confidence signal is not repeatedly reopened within one self-serve pass).

### Phase-B/C tests (planned / partially active)

- evidence precedence conflict traces,
- execution-plan-aware readiness tests by package scope (active baseline added),
- caveat policy matrix tests (active limited expansion coverage),
- full signal registry integrity and ownership tests (active metadata + lint guardrails).

## 14) Implementation Checklist (Phased)

### Must ship in Phase-1

- Add sequencing artifact + `sequencingVersion`.
- Add minimal critical signal registry.
- Implement deterministic sequencing core.
- Implement fallback clarifications.
- Implement readiness gate and enforcement points.
- Implement resolver precedence and explainability traces.
- Add CI tests for tuple parity, precedence, readiness blocking.
- Add UI/UX contract for adaptive flow rendering (one-question focus, low-friction remediation checkpoint, no overload).

### Phase-B/C (rollout after pilot proves value)

- Expand signal registry schema and ownership fields (baseline metadata-aware evaluation now implemented; broader schema remains rollout-gated).
- Expand ask-slot contract and rule packs.
- Add full caveat taxonomy and ownership model (limited caveat expansion implemented; full model deferred).
- Introduce Project Context Envelope in ContextBuilder integration (implemented behind `FEATURE_PROJECT_CONTEXT_ENVELOPE`).
- Add execution-plan-aware readiness for package scopes (implemented behind `FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE`).
- Add bridge-question lifecycle governance (implemented in sequencing artifact + lint rules; rollout still gated).
- Document Phase-B/C trigger criteria (for example, pilot readiness lift > X%, cross-vertical sequencing stability).
- Enforce pilot success gate for rollout beyond pilot:
  - no completion regression,
  - measurable lift in readiness-qualified context.

Current implementation note:

- Caveat taxonomy ownership metadata and ask-slot governance metadata are codified in intake-core artifacts/config, while production behavior is still controlled by KPI-gated rollout flags and ordered expansion policy.

## 15) Industry Expansion Priorities (Phase-B/C)

Current industry model is intentionally uneven: universal core + selected branch packs.  
Next expansion should prioritize business impact with minimal flow inflation.

Priority order:

1. `E-commerce` (high impact, low/medium effort),
2. `SaaS / Software` (high impact, medium effort),
3. `Retail` (medium/high impact, low effort).

### 15.1 E-commerce (first)

Recommended branch probes:

- order funnel drop-off point (product page/cart/checkout/payment),
- fulfillment/returns handling maturity (manual/partial/systemized),
- marketplace vs own-site dependency split.

Expected lift:

- stronger `conversion` + `operations` + `channel risk` signal quality.

### 15.2 SaaS / Software (second)

Recommended branch probes:

- activation bottleneck (where users fail to reach first value),
- current monetization motion (trial/freemium/demo-led/sales-led),
- retention pressure point (activation/retention/expansion).

Expected lift:

- stronger `strategy` + `ux_conversion` + `automation` fit for SaaS contexts.

### 15.3 Retail (third)

Recommended branch probes:

- online/offline channel split,
- inventory/price synchronization pain across channels,
- returns/repeat purchase handling shape.

Expected lift:

- stronger `operations` + `channel consistency` context.

### 15.4 Rollout Constraints (normative)

- Treat these probes as **Diagnostic Depth**, not Phase-1 Critical Signals.
- Self-serve surfaces: max 2 industry probes per pass.
- Discovery/pre-brief: max 0-1 probe based on strongest available signal.
- Add via bank/policy/sequencing artifacts only (no UI-local hardcoded branching).
- Follow `QUESTION_BANK.md` protocol for any new question ID or option change.

## 16) UI/UX Contract (Adaptive Flow Experience)

Adaptive intake must feel like guided discovery, not a dense form.

Normative UX rules:

- one-question focus per step (no multi-question overload blocks),
- lightweight value-first explainability (“why asked”) with compact default state,
- soft progress cues (“what we already understand / what remains”), not punitive completion framing,
- remediation checkpoint language:
  - “Before we proceed, we need 1-2 clarifications” (never generic hard validation error),
- blocked states must route to targeted clarification steps, not dead-end screens,
- surfaces render server-authored sequencing states only.

Transition behavior guidance:

- transitions should feel linear and predictable,
- no abrupt full-page jank unless crossing a section/stage boundary,
- avoid unexplained topic jumps between stages.

## 17) References

- `packages/intake-core/src/question-bank.v1.json`
- `packages/intake-core/src/branch-rules.v1.json`
- `packages/intake-core/src/intake-policy.v1.json`
- `packages/intake-core/src/artifacts/intake-vertical-expansion-roadmap.v1.json`
- `packages/intake-core/src/core/build-intake-plan.ts`
- `src/app/lib/discovery-flow.ts`
- `docs/QUESTION_BANK.md`
- `docs/adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md`

