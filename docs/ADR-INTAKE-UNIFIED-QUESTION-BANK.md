# ADR: Unified question bank, policy/layout layers, and IntakePlan resolver

| Field | Value |
| --- | --- |
| **Status** | Proposed |
| **Date** | 2026-04-05 |
| **Scope** | Intake / question bank / Discovery / Express / Pre-brief / Full brief |

## Context

The product needs multiple intake experiences (full consultant brief, express path, client pre-brief link, public Discovery, client portal) that must stay consistent with branching logic and SLA rules. Today the server already treats the bank as a single branching tree (`branchCondition` + `filterVisibleQuestions`); Discovery further intersects with a whitelist (`DISCOVERY_BANK_IDS`). Express SLA is partly hard-coded in TypeScript (`brief-gates.ts`). The public Discovery UI still duplicates question copy and flow shape in `discovery-flow.ts` while reusing bank ids.

Goals:

- **One canonical semantic tree** for questions (meaning, branches, answer shape).
- **Modes** are projections of that tree, not separate questionnaires.
- **Maintainability**: add a question once; configure participation and presentation through data.
- **Debuggability**: when visible/required sets diverge, engineers see *why* (trace), not only a diff of ids.

Non-goals in this ADR: choosing a specific UI library; implementing adaptive ML-driven questioning.

## Decision

We adopt a **four-layer model**, a **single runtime entry point** `buildIntakePlan(ctx)`, and a **version matrix** stored with every persisted answer set.

### Version matrix (binding)

These versions are part of the architecture, not an implementation detail:

| Version | Refers to |
| --- | --- |
| `questionBankVersion` | Canon artifact (`question-bank.v1.json` lineage). |
| `policyVersion` | Policy artifact (`intake-policy.v1.json` or successor). |
| `layoutVersion` | Layout artifact (`layout-rules.v1.json` or successor). |
| `resolverVersion` | Semantics of `buildIntakePlan` (breaking changes to plan shape or evaluation order). |

**Rule:** every **submit** and every **saved draft** of intake responses stores this version tuple (or a single bundle id that maps to it) alongside answers. Server validation MUST use the same tuple the client used to render (or explicitly migrate with a recorded migration step). This prevents “question disappeared” bugs caused by client and server silently disagreeing on which bank snapshot applied.

### 1. Canon layer (semantic source of truth)

**Artifact:** `question-bank.v1.json` (and generated/typed stubs).

Holds the **immutable semantic definition** of each question entity: **identity** (`id`), **answer contract** (response type, constraints, option sets or references), **branch dependencies** (`branchCondition` / rule refs), and **analysis tags** (e.g. `entityRole`, `outputUse`) as they mature. Human-facing copy may be keys into a catalog or inline strings; wording can evolve without changing the entity contract when possible.

**Does not hold:** per-surface step order, wizard slot ids, mobile vs desktop ordering, or other layout-specific rules. Those belong in the layout layer so the canon does not absorb UI compromises.

### 2. Policy layer (how a question participates in scenarios)

**Artifact:** e.g. `intake-policy.v1.json` (name TBD).

Holds participation separate from coarse `priority`:

- **`mode`** (product scenario): `full | express | discovery | pre_brief | ...` — not the same as UI surface.
- **Per-mode rules** such as `modePolicy` / `requirednessByMode` / `askStrategy` (`always`, `if_needed`, `progressive`, `consultant_only`).

**`priority` (required / recommended / optional)** remains an editorial/research axis. It must **not** be the sole driver of Express or Pre-brief SLA; SLA and exclusions are expressed explicitly in policy to avoid hidden exceptions.

**`surface`** (UI context): e.g. `client_form | consultant_interview | client_portal | internal_review | public_discovery | ...`. The same **mode** (e.g. `discovery`) may appear on more than one surface (public page vs consultant-led flow). Mode and surface are **orthogonal** inputs to the resolver.

### 3. Layout layer (presentation and slots)

**Artifact:** e.g. `layout-rules.v1.json`.

Holds: step groups, display order overrides per surface, **first-visible candidate** per logical slot (mapping presentation without duplicating question entities in the canon).

**Hard boundary:** layout rules **must not** change **semantic eligibility** (whether a question is in play under branch + policy for the current context). Layout may **only** order, group, defer presentation, or map **already eligible** questions into slots and steps. If this rule is violated, layout becomes a hidden second policy engine.

### 4. Runtime layer (resolver engine)

**Artifact:** shared `intake-core` (or equivalent) used by server validation and, where feasible, the browser.

**API:**

```ts
buildIntakePlan(ctx): IntakePlan
```

#### IntakePlan state semantics (glossary)

These definitions are **normative** for code and tests; they must not drift informally across teams.

| Term | Definition |
| --- | --- |
| **eligible** | Passes branch rules **and** policy for the current `(mode, surface, …)`; the question is **in play** for this context. Not yet a statement about whether it is on-screen this instant. |
| **visible** | Should be **shown** in the current UI state (eligible, not suppressed by layout deferral for this step, and consistent with `stepPlan` / current wizard position if applicable). |
| **required** | Blocks **completion** of the current **mode** (e.g. submit SLA) until satisfied; subset of eligible, defined by policy + mode, not by layout. |
| **deferred** | **Eligible** but intentionally **not asked yet** per `askStrategy` or layout step sequencing (e.g. progressive disclosure). Must not be conflated with “hidden because excluded.” |
| **hidden** | **Not eligible** for this context: excluded by branch, policy, or surface rules. |

`reasonsById` / `debugTrace` MUST be able to justify each classification (e.g. “hidden: branch `no_website`”, “deferred: layout step 3”, “required: policy express SLA”).

#### IntakePlan shape (minimum and extensions)

Minimum:

- Sets (or ordered lists) for `eligible`, `visible`, `required`, `hidden`, `deferred`
- `layoutSlots` (slot id to resolved question id or null)
- `stepPlan` (optional ordered steps for wizards)
- `reasonsById` / `debugTrace`
- `versions`: `{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }` echoing what was used to build the plan

**Derived outputs (formal contract, implement incrementally):** the resolver is a **knowledge-input layer**, not only a form driver. The plan SHOULD eventually expose (stub empty until implemented):

- `derivedFacts` — normalized signals computed from answers (e.g. segment flags, coarse maturity hints)
- `coverage` — which domains / report dimensions have minimum input
- `confidence` — heuristic strength of triage or pre-report conclusions

Related optional fields already envisioned: `missingForReport`, `nextRecommended` (adaptive UX). They are **not** required in the first shipping tranche but belong to the **documented** evolution of `IntakePlan` so the core does not need redesign when they land.

The mental model shifts from “which questions are visible?” to **“what data-collection plan does this context need?”**

### Explainability first

Before replacing production gates with the new resolver, the implementation must expose **explainability** (`whyVisible` / `whyHidden`, matched rules) on the plan object. Explainability is **mandatory** for migration, not optional polish. Otherwise parity migrations against Discovery/Express will be slow and brittle.

### Performance and packaging (directional)

- **Compile** canon + policy into an internal **DAG** (or explicit dependency index) at build or startup; evaluate visibility in topological or dependency order without re-walking raw JSON on every event.
- **Incremental recompute**: on answer change, track `dirtyIds` and re-evaluate only questions whose branch deps or policy deps are affected (**reverse-edge** invalidation); cache unchanged regions of the plan where safe.
- **Client**: prefer running the same `intake-core` locally for instant branching; server validates submits with the **same version tuple** as the client.
- **API**: optional compact `brief-schema` snapshot for a product version; payloads remain `{ id, value, ... }` plus stored version metadata.

### Rejected alternatives

We explicitly reject:

- **Separate question lists per mode** (parallel `DISCOVERY_BANK_IDS_V2.ts`-style sources of truth).
- **Express / Pre-brief SLA derived only from `priority`** without explicit policy (hides exceptions and industry-specific rules).
- **Layout metadata inside the canon JSON** (couples semantics to one screen’s compromises).
- **Server-only branching with no shared core** (guarantees client/server drift unless every change is duplicated and tested twice).

These patterns are known to reintroduce duplication and unexplained diffs; code review should block regressions toward them.

### Rollout (high level)

**Phase 0 — Contract (before behavior changes)**

- Publish a short **glossary** (this ADR’s state semantics + mode vs surface).
- Fix **canonical fixture set** (e.g. `hotel_no_site`, `solo_with_site`, `real_estate_small_team`) and the **snapshot format** (fields compared in regression: `eligible`, `visible`, `required`, `deferred`, `hidden`, optional `layoutSlots`, optional `derived` stubs).

**Phase 1** — Introduce policy data that reproduces current behavior (Discovery whitelist, Express required set) with **no UX change**.

**Phase 2** — Implement `buildIntakePlan` + **fixture-driven regression** against Phase 0 snapshots.

**Phase 2b** — **Debug tooling**: a CLI and/or internal page that runs `buildIntakePlan(ctx)` and prints **trace output** (parity tests show diffs; trace explains them quickly).

**Phase 3** — **Bank/policy linter** in CI (unknown branch keys, invalid references, conflicting layout slots, layout rules that reference unknown question ids).

**Phase 4** — Switch server gates and validation to `intake-core` with version tuple on persist.

**Phase 5** — Align client wizards and public Discovery to consume `IntakePlan` (or equivalent selectors); remove parallel hard-coded question lists where redundant.

**Phase 6** — Introduce `layout-rules` without changing canon semantics.

### Optional metadata (phased)

Strong candidates later on **canon**: `reportUse`, `confidenceImpact`, `sensitivity`, `askOnce`, `answerFreshnessDays`, `owner`, `introducedInVersion`, `deprecatedAt`. Not all are required for the first migration tranche.

## Consequences

### Positive

- Single semantic tree; modes and surfaces are configuration, not forks.
- Clear separation: semantics (canon), participation (policy), presentation (layout), execution (resolver).
- SLA and exclusions are explicit; less “magic” tied only to `priority`.
- Explainability and fixture snapshots reduce regression risk as the bank grows.
- **Fixture-based regression and support** become easier because visibility and exclusion are **explained**, not inferred from scattered conditionals.
- **Version tuple on draft/submit** makes client/server mismatch diagnosable and preventable.

### Negative / trade-offs

- More artifacts to version and keep in sync (canon, policy, layout); CI linting and schema versioning become mandatory.
- Full `IntakePlan` is more work than a thin `filterVisibleStubs`; team must resist growing ad-hoc logic outside the resolver.
- **Resolver centralization creates a gravity well:** if governance is weak, special cases accumulate in policy instead of simplifying the bank or rules. Reviews should treat new policy branches as a cost to justify.

### Future extensions (non-binding; not part of the core decision)

These are **explicitly out of scope** for ADR acceptance but aligned with the same architecture:

- **Analytics loop:** event log (`question_shown`, `question_answered`, `question_skipped`, drop-off at step); per-question and per-mode completion metrics; A/B on layout or policy bundles (versioned).
- **Internal tooling:** “Question Bank Studio” (visual tree, policy preview), fixture lab, **interactive trace viewer** (extends Phase 2b).
- **Adaptive questioning:** `nextRecommended` driven by simple heuristics (e.g. information-gain scores) on top of the same `IntakePlan` pipeline, without changing the four-layer split.

## Follow-up documentation

- Operational detail stays in [QUESTION_BANK.md](./QUESTION_BANK.md) (human-readable mirror of branching and agent mapping).
- This ADR is the **decision record**; when implementation lands, link the concrete file paths and package name from [MASTER.md](./MASTER.md) or [ARCHITECTURE.md](./ARCHITECTURE.md).

## References

- `server/src/intake/is-visible.ts`, `server/src/intake/branch-rules.ts`, `server/src/intake/discovery.ts`, `server/src/intake/brief-gates.ts`
- `src/app/lib/discovery-flow.ts` (to be reduced to policy/layout consumers over time)
