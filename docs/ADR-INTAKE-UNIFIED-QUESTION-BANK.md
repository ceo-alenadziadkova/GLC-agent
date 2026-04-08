# ADR: Unified question bank, policy/layout layers, and IntakePlan resolver


| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| **Status** | Accepted — **core shipped** (resolver, version tuple, gates, layout v1.1.0). **Backlog:** derived plan fields, perf index, API schema snapshot, client copy dedup, tooling/analytics (see [Phased implementation backlog](#phased-implementation-backlog-post-mvp-tranche)). |
| **Date**   | 2026-04-05                                                            |
| **Scope**  | Intake / question bank / Discovery / Express / Pre-brief / Full brief |


## Context

The product needs multiple intake experiences (full consultant brief, express path, client pre-brief link, public Discovery, client portal) that must stay consistent with branching logic and SLA rules. The server resolves visibility via **`buildIntakePlan`** (canon branches + `intake-policy.v1.json` + optional `layout-rules.v1.json` surfaces). Discovery participation is the explicit list **`modes.discovery.included`** in that policy (re-exported at runtime as `DISCOVERY_BANK_IDS` for helpers such as `is-visible.ts`). Pre-brief **bank** participation is **`modes.pre_brief.bankIncluded`** (optional on **legacy frozen** policy snapshots — if absent, pre-brief eligible is wider than the current product default): the client pre-brief surface shows those stub ids (plus identity and synthetic `revenue_model`), while **`slaVisibleBankIds`** on the plan keeps the wider branch-visible bank set used to compute **`required`** for full/express audits. Express / full SLA required bank ids are derived from the same policy through `computeRequiredBankIdsFromPolicy` / `brief-gates.ts`. **Pre-brief submit** uses the same express resolver (**`PRE_BRIEF_REQUIRED_SUBMIT_IDS`** = express `requiredAlways` + `requiredIfVisible` in policy; runtime = **`resolveExpressSlaRequiredIds`**). The public Discovery UI may still duplicate question copy while reusing bank ids; layout consumption is migrating toward the shared plan.

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


| Version               | Refers to                                                                            |
| --------------------- | ------------------------------------------------------------------------------------ |
| `questionBankVersion` | Canon artifact (`question-bank.v1.json` lineage).                                    |
| `policyVersion`       | Policy artifact (`intake-policy.v1.json` or successor).                              |
| `layoutVersion`       | Layout artifact (`layout-rules.v1.json` or successor).                               |
| `resolverVersion`     | Semantics of `buildIntakePlan` (breaking changes to plan shape or evaluation order). |


**Rule:** every **submit** and every **saved draft** of intake responses stores this version tuple (or a single bundle id that maps to it) alongside answers. Server validation MUST use the same tuple the client used to render (or explicitly migrate with a recorded migration step). This prevents “question disappeared” bugs caused by client and server silently disagreeing on which bank snapshot applied.

**Implemented (this repo):** `PUT /api/audits/:id/brief` persists **`intake_versions`**; **`validateIntakeVersionsForBriefWrite`** accepts the **current** tuple, **frozen** tuples registered in `resolve-intake-artifacts.ts`, omit-body replay, unsupported-stored repair, and client-driven upgrade to current with **`intake_version_migration`** (`028_intake_version_migration.sql`). Validation, gates, and `assertBriefReady` resolve **policy + layout + bank stubs** via **`resolveIntakeArtifacts(tuple)`** so a stored draft keeps the same semantic snapshot as when it was saved.

### 1. Canon layer (semantic source of truth)

**Artifact:** `question-bank.v1.json` (and generated/typed stubs).

Holds the **immutable semantic definition** of each question entity: **identity** (`id`), **answer contract** (response type, constraints, option sets or references), **branch dependencies** (`branchCondition` / rule refs), and **analysis tags** (e.g. `entityRole`, `outputUse`) as they mature. Human-facing copy may be keys into a catalog or inline strings; wording can evolve without changing the entity contract when possible.

**Does not hold:** per-surface step order, wizard slot ids, mobile vs desktop ordering, or other layout-specific rules. Those belong in the layout layer so the canon does not absorb UI compromises.

### 2. Policy layer (how a question participates in scenarios)

**Artifact:** e.g. `intake-policy.v1.json` (name TBD).

Holds participation separate from coarse `priority`:

- `**mode`** (product scenario): `full | express | discovery | pre_brief | ...` — not the same as UI surface.
- **Per-mode rules** such as `modePolicy` / `requirednessByMode` / `askStrategy` (`always`, `if_needed`, `progressive`, `consultant_only`).

`**priority` (required / recommended / optional)** remains an editorial/research axis. It must **not** be the sole driver of Express or Pre-brief SLA; SLA and exclusions are expressed explicitly in policy to avoid hidden exceptions.

`**surface`** (UI context): e.g. `client_form | consultant_interview | client_portal | internal_review | public_discovery | ...`. The same **mode** (e.g. `discovery`) may appear on more than one surface (public page vs consultant-led flow). Mode and surface are **orthogonal** inputs to the resolver.

### 3. Layout layer (presentation and slots)

**Artifact:** e.g. `layout-rules.v1.json`.

Holds: step groups, display order overrides per surface, and logical **slots**. Runtime **`layoutSlots`** is **`Record<string, string[]>`**: ordered candidate question ids per slot (first entry is the primary head for that slot; the full list supports strict 1:1 slot semantics and alignment with **`stepPlan`**). Layout still must not change eligibility — only order/group eligible ids.

**Hard boundary:** layout rules **must not** change **semantic eligibility** (whether a question is in play under branch + policy for the current context). Layout may **only** order, group, defer presentation, or map **already eligible** questions into slots and steps. If this rule is violated, layout becomes a hidden second policy engine.

### 4. Runtime layer (resolver engine)

**Artifact:** shared `intake-core` (or equivalent) used by server validation and, where feasible, the browser.

**API:**

```ts
buildIntakePlan(ctx): IntakePlan
```

#### IntakePlan state semantics (glossary)

These definitions are **normative** for code and tests; they must not drift informally across teams.


| Term         | Definition                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **eligible** | Passes branch rules **and** policy for the current `(mode, surface, …)`; the question is **in play** for this context. Not yet a statement about whether it is on-screen this instant. |
| **visible**  | Should be **shown** in the current UI state (eligible, not suppressed by layout deferral for this step, and consistent with `stepPlan` / current wizard position if applicable).       |
| **required** | Blocks **completion** of the current **mode** (e.g. submit SLA) until satisfied; subset of eligible, defined by policy + mode, not by layout.                                          |
| **deferred** | **Eligible** but intentionally **not asked yet** per `askStrategy` or layout step sequencing (e.g. progressive disclosure). Must not be conflated with “hidden because excluded.”      |
| **hidden**   | **Not eligible** for this context: excluded by branch, policy, or surface rules.                                                                                                       |


`reasonsById` / `debugTrace` MUST be able to justify each classification (e.g. “hidden: branch `no_website`”, “deferred: layout step 3”, “required: policy express SLA”).

#### IntakePlan shape (minimum and extensions)

Minimum:

- Sets (or ordered lists) for `eligible`, `visible`, `required`, `hidden`, `deferred`
- `slaVisibleBankIds` — bank stub ids used as the visibility input for SLA / `required` (equals `eligible` except for `collectionMode === 'pre_brief'`, where the UI surface is narrower)
- `layoutSlots` — `Record<string, string[]>`: per logical slot, ordered bank question ids (see layout layer above)
- `stepPlan` (optional ordered steps for wizards)
- `reasonsById` / `debugTrace`
- `versions`: `{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }` echoing what was used to build the plan

**Derived outputs (formal contract — backlog, to implement):** the resolver is a **knowledge-input layer**, not only a form driver. The following are **scheduled work** (extend `IntakePlan` in `server/src/intake/core/types.ts` and populate from resolver or a thin post-pass; start with empty objects / neutral defaults and tests):

- `derivedFacts` — normalized signals computed from answers (e.g. segment flags, coarse maturity hints)
- `coverage` — which domains / report dimensions have minimum input
- `confidence` — heuristic strength of triage or pre-report conclusions

Related fields on the same backlog: `missingForReport`, `nextRecommended` (adaptive UX). They belong to the **documented** evolution of `IntakePlan` so the core does not need redesign; **they are not deferred indefinitely** — see Phase **B** and **F** in the backlog below.

The mental model shifts from “which questions are visible?” to **“what data-collection plan does this context need?”**

### Explainability first

Before replacing production gates with the new resolver, the implementation must expose **explainability** (`whyVisible` / `whyHidden`, matched rules) on the plan object. Explainability is **mandatory** for migration, not optional polish. Otherwise parity migrations against Discovery/Express will be slow and brittle.

### Performance and packaging (backlog — to implement)

These items were described as directional; they are **on the execution roadmap** (see Phase **C** and **D** below).

- **Compile** canon + policy into an internal **DAG** (or explicit dependency index) at build or startup; evaluate visibility in topological or dependency order without re-walking raw JSON on every event.
- **Incremental recompute**: on answer change, track `dirtyIds` and re-evaluate only questions whose branch deps or policy deps are affected (**reverse-edge** invalidation); cache unchanged regions of the plan where safe.
- **Client**: already shares `intake-core` where imported; continue to prefer thin mirrors (`pre-brief-bank-included.json`, `express-policy-ids`) and **reduce** remaining duplicate copy (Phase **A**).
- **API**: compact **`brief-schema`** (or equivalent) snapshot for a product / version tuple — **scheduled** (Phase **D**); payloads remain `{ id, value, ... }` plus stored version metadata.

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

**Phase 3** — **Bank/policy linter** in CI (unknown branch keys, invalid references, discovery and pre_brief policy ids, layout surfaces referencing unknown bank ids; conflicting layout slots as needed).

**Phase 4** — Switch server gates and validation to `intake-core` with version tuple on persist.

**Phase 5** — Align client wizards and public Discovery to consume `IntakePlan` (or equivalent selectors); remove parallel hard-coded question lists where redundant.

**Phase 6** — Introduce `layout-rules` without changing canon semantics. **Done** in repo (`layout-rules.v1.json`); further surface expansion remains ordinary product work.

### Optional metadata on canon (backlog — Phase E)

Strong candidates **to add** on **canon** over time: `reportUse`, `confidenceImpact`, `sensitivity`, `askOnce`, `answerFreshnessDays`, `owner`, `introducedInVersion`, `deprecatedAt`. Implement as the derived-layer and reporting needs firm up; lint/schema must accept unknown keys until each is adopted.

## Consequences

### Positive

- Single semantic tree; modes and surfaces are configuration, not forks.
- Clear separation: semantics (canon), participation (policy), presentation (layout), execution (resolver).
- SLA and exclusions are explicit; less “magic” tied only to `priority`.
- Explainability and fixture snapshots reduce regression risk as the bank grows.
- **Fixture-based regression and support** become easier because visibility and exclusion are **explained**, not inferred from scattered conditionals.
- **Version tuple on draft/submit** makes client/server mismatch diagnosable and preventable.

**assertBriefReady / mixed drafts:** the pipeline guard derives validation **surface** from **`intake_brief.collected_by`** (`consultant` → consultant surface, otherwise client), consistent with brief GET/PUT perspective. Per-field provenance or “partial mixed” drafts are not modeled; if that becomes a product issue, add an explicit field rather than inferring from responses alone.

### Negative / trade-offs

- More artifacts to version and keep in sync (canon, policy, layout); CI linting and schema versioning become mandatory.
- Full `IntakePlan` is more work than a thin `filterVisibleStubs`; team must resist growing ad-hoc logic outside the resolver.
- **Resolver centralization creates a gravity well:** if governance is weak, special cases accumulate in policy instead of simplifying the bank or rules. Reviews should treat new policy branches as a cost to justify.

### Product and tooling extensions (backlog — Phases F–G)

The **architectural decision** (four layers + `buildIntakePlan` + version tuple) is fixed. The following are **scheduled follow-ons**, not rejected:

- **Analytics loop (Phase G):** event log (`question_shown`, `question_answered`, `question_skipped`, drop-off at step); per-question and per-mode completion metrics; A/B on layout or policy bundles (versioned).
- **Internal tooling (Phase F):** “Question Bank Studio” (visual tree, policy preview), fixture lab, **interactive trace viewer** (extends Phase 2b CLI).
- **Adaptive questioning (Phase F, after `nextRecommended` on plan):** `nextRecommended` driven by simple heuristics on top of the same `IntakePlan` pipeline, without changing the four-layer split.

## Phased implementation backlog (post-MVP tranche)

Order is **recommended** dependencies first; parallelize within a phase where safe.

| Phase | Theme | Outcomes / exit criteria |
| ----- | ----- | ------------------------- |
| **A** | **Client presentation dedup** | **In progress:** Discovery — `makeDiscoveryQuestion` + bank labels + `DISCOVERY_WIZARD_BANK_IDS` + policy sync test. **Legacy brief:** `src/app/data/briefQuestions.ts` re-exports enriched `BRIEF_QUESTIONS` / identity rows from `server/src/schemas/intake-brief.ts` (no duplicate BASE arrays); `intakeIdentityFieldIds.ts` re-exports `INTAKE_IDENTITY_FIELD_IDS` from the same module. **Remaining:** trim bundle (Zod pulled with schema) if needed; optional server-driven Discovery copy. |
| **A2** | **Phase 2b completion** | **Done (v1):** consultant route `/admin/intake-trace` (`IntakeTraceTool.tsx`) runs `buildIntakePlan` + `formatPlanTrace` on pasted JSON — parity with `server/scripts/intake-plan-debug.ts`. |
| **B** | **`IntakePlan` derived layer v1** | **Done (v1):** `derivedFacts`, `coverage`, `confidence` on every plan (`plan-derived.ts`); tests in `build-intake-plan.test.ts`; documented in [QUESTION_BANK.md](./QUESTION_BANK.md). Extend with `missingForReport` / richer facts as needed. |
| **C** | **Resolver performance v1** | **Done (v1):** `evaluateCanonEligibility` caches predicate results per unique `branchCondition` per plan build. **`BRANCH_RULE_RESPONSE_KEYS`** (`branch-condition-deps.ts`) documents response-key deps for each `BRANCH_RULES` entry; tests require deps map ↔ rules parity. **Next:** topological stub order or incremental invalidation (C2) if profiling warrants it. |
| **C2** | **Incremental recompute (optional)** | On answer updates in wizard hooks, invalidate by reverse edges; benchmark before/after on large banks — ship only if win is clear. |
| **D** | **`brief-schema` API** | **Done (v1):** `GET /api/audits/:id/brief/schema` — plan sets + `questions[]` (bank label/section/priority per visible id) + `derived` summary; same auth/surface tuple rules as `GET .../brief`. Options/refs for UI remain client-side until a v2 extension. |
| **E** | **Canon metadata** | Add agreed subset of optional canon fields; extend linter; wire into `derivedFacts` / agent context where useful. |
| **F** | **Trace viewer + adaptive stub** | Interactive trace UI (builds on A2); implement `nextRecommended` as plan field + simple heuristic behind feature flag. |
| **G** | **Analytics** | Instrument intake surfaces with versioned events; dashboards or exports; A/B hooks keyed by policy/layout tuple. |

**Tech-debt hygiene (ongoing):** any new surface must call `buildIntakePlan` (or shared selectors); no new parallel id lists without policy/lint coverage.

## Follow-up documentation

- Operational detail stays in [QUESTION_BANK.md](./QUESTION_BANK.md) (human-readable mirror of branching and agent mapping).
- This ADR is the **decision record**. Implementation paths: [ARCHITECTURE.md](./ARCHITECTURE.md) (intake resolver section), [`server/src/intake/core/`](../server/src/intake/core/), [`intake-policy.v1.json`](../server/src/intake/intake-policy.v1.json), [`layout-rules.v1.json`](../server/src/intake/layout-rules.v1.json). Index link: [MASTER.md](./MASTER.md).

## References

- `server/src/intake/core/build-intake-plan.ts`, `server/src/intake/core/evaluate-canon.ts`, `server/src/intake/core/evaluate-policy.ts`, `server/src/intake/core/evaluate-layout.ts`, `server/src/intake/core/load-policy.ts`, `server/src/intake/intake-policy.v1.json`, `server/src/intake/layout-rules.v1.json`
- `server/src/intake/branch-rules.ts`, `server/src/intake/is-visible.ts`, `server/src/intake/discovery.ts` (thin export of policy discovery set), `server/src/intake/brief-gates.ts`
- `server/src/services/brief-validator.ts` (persisted brief validation; version tuple + surface alignment on save and `assertBriefReady`)
- `src/app/lib/discovery-flow.ts` (to be reduced to policy/layout consumers over time)

