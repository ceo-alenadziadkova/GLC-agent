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

**Derived outputs (implemented v1):** the resolver is a **knowledge-input layer**, not only a form driver. On every `IntakePlan`:

- `derivedFacts` — signals from answers (AI readiness, segment hints, optional `reportAnchors`)
- `coverage.byDomain` — share of SLA-visible primary-feed bank questions answered per slice
- `confidence` — heuristic blend of readiness + visible data quality
- `missingForReport` — domain keys where that slice still has unanswered in-scope primary questions (`missing_for_report` on `GET .../brief/schema`)

**`nextRecommended`** remains **partial** — Phase **F** in the matrix.

The mental model shifts from “which questions are visible?” to **“what data-collection plan does this context need?”**

### Explainability first

Before replacing production gates with the new resolver, the implementation must expose **explainability** (`whyVisible` / `whyHidden`, matched rules) on the plan object. Explainability is **mandatory** for migration, not optional polish. Otherwise parity migrations against Discovery/Express will be slow and brittle.

### Performance and packaging (backlog — to implement)

These items were described as directional; they are **on the execution roadmap** (see Phase **C** and **D** below).

- **Compile** canon + policy into an internal **DAG** (or explicit dependency index) at build or startup; evaluate visibility in topological or dependency order without re-walking raw JSON on every event (**stub-level topo order for branch eval is implemented** in `buildBranchAwareStubEvalOrder`; startup DAG precompute still backlog).
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

### Optional metadata on canon (Phase E — partial)

Strong candidates on **canon** over time: `reportUse` (**shipped for selected ids** + linter whitelist), plus `confidenceImpact`, `sensitivity`, `askOnce`, `answerFreshnessDays`, `owner`, `introducedInVersion`, `deprecatedAt`. Add remaining keys as derived-layer and reporting needs firm up; unknown keys stay lint-guarded via the canon key whitelist in `lint-bank-policy.ts`.

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

## Implementation coverage matrix (A–G)

Normative checklist from the phased backlog. **Partial** = MVP / v1 shipped, known gaps remain. **Not started** = no production code yet.

| ID | Intent | Status | Evidence / drift tests | Known gap |
| -- | ------ | ------ | ------------------------ | --------- |
| **A** | Single source for Discovery + legacy brief; catalog / API / anti-drift | **Partial** | Legacy brief: SPA re-exports `server/src/schemas/intake-brief.ts` — `src/app/data/brief-spa-parity.test.ts` (same array refs + identity ids + required set). Discovery: `makeDiscoveryQuestion` + `DISCOVERY_WIZARD_BANK_IDS`; `src/app/lib/discovery-flow.test.ts` (wizard ids ⊆ policy). Bank wizard UI: `src/app/data/bank-question-ui-catalog-parity.test.ts` (every `QUESTION_BANK_V1_STUBS` id resolves via `bankQuestionUiCatalog`). | Discovery **options** still defined in `discovery-flow.ts` (public UX). No **server-driven discovery copy** fragment. `bankQuestionUiCatalog` hand-maintained, not generated. SPA pulls **Zod** via `intake-brief` import (bundle cost). |
| **A2** | Internal trace ≡ `intake-plan-debug` | **Done (v1)** | `/admin/intake-trace` (`IntakeTraceTool.tsx`); CLI `server/scripts/intake-plan-debug.ts` | Plain text output; not structured / filterable “viewer”. |
| **B** | `derivedFacts`, `coverage`, `confidence` + gaps on `IntakePlan` | **Done (v1)** | Same + `missingForReport` / `missing_for_report`; agent prompts: `intake_missing_report_domains` via `ContextBuilder` + `buildIntakePlan` (`collected_by` surface); trace summary strip in `IntakeTraceTool.tsx`. | Richer `segmentHints` optional follow-on. |
| **C** | Fewer redundant branch evals / dependency awareness | **Partial (v1.1)** | Predicate cache + **`buildBranchAwareStubEvalOrder`** (topo order on `BRANCH_RULE_RESPONSE_KEYS` / provider stub ids) in `evaluateCanonEligibility`; `branch-condition-deps.ts` + `branch-condition-deps.test.ts` | No precompiled DAG at startup; still one full pass per plan build (order is now dependency-aware). **C2** incremental recompute not started. |
| **C2** | Incremental recompute on answer change | **Not started** | — | Use `BRANCH_RULE_RESPONSE_KEYS` + dirty set when benchmarks justify. |
| **D** | Compact `brief-schema` API | **Done (v1)** | `GET /api/audits/:id/brief/schema`, `build-brief-schema-snapshot.ts`, `brief-route.test.ts`, `brief-profile-platform.ts#getBriefSchema` | Option lists for UI remain client-side until v2. |
| **E** | Optional canon metadata + linter | **Partial (v1)** | `reportUse` on `RawQuestion` + `question-bank.v1.json` (`a1`, `f1`); `REPORT_USE_BY_ID` / `getQuestionBankReportUse`; `lintCanonQuestionMetadataKeys` + `CANON_QUESTION_JSON_KEYS` in `lint-bank-policy.ts`; `server/src/tests/question-bank-report-use.test.ts`. Derived `reportAnchors` + `GET .../brief/schema` `derived.report_anchors`; agent prompt line via `intake_report_anchors` (`context-builder.ts`). | Not all stubs tagged; optional keys (`confidenceImpact`, etc.) still unpicked. |
| **F** | Interactive trace viewer + `nextRecommended` (flag) | **Partial (v1.2)** | **`Question trace`**: filters + reset / expand-all (visible list) / collapse-all; `@tanstack/react-virtual` when ≥20 rows; **Branch dependencies** panel (static upstream/downstream from `BRANCH_RULE_RESPONSE_KEYS` + `QUESTION_BANK_V1_STUBS`); row action **Branch links** scrolls to panel (`intake-trace-branch-links.ts`). | `nextRecommended` flag-gated; graph is list edges, not canvas. |
| **G** | Intake analytics + A/B by version tuple | **Not started** | — | Event schema + ingestion keyed by `intake_versions`. |

## Phased implementation backlog (post-MVP tranche)

Order is **recommended** dependencies first; parallelize within a phase where safe.

| Phase | Theme | Outcomes / exit criteria |
| ----- | ----- | ------------------------- |
| **A** | **Client presentation dedup** | **Partial — see coverage matrix.** Drift tests: `brief-spa-parity.test.ts`, `bank-question-ui-catalog-parity.test.ts`, Discovery policy test in `discovery-flow.test.ts`. |
| **A2** | **Phase 2b completion** | **Done (v1):** consultant route `/admin/intake-trace` (`IntakeTraceTool.tsx`) runs `buildIntakePlan` + `formatPlanTrace` on pasted JSON — parity with `server/scripts/intake-plan-debug.ts`. |
| **B** | **`IntakePlan` derived layer v1** | **Done (v1):** `derivedFacts`, `coverage`, `confidence`, `missingForReport` on every plan; compact schema field `missing_for_report`. Extend with richer `segmentHints` as needed. |
| **C** | **Resolver performance v1** | **Partial (v1.1) — see coverage matrix.** Predicate cache + **`buildBranchAwareStubEvalOrder`** + tests. Precompiled DAG / incremental stub eval per event still out of scope until benchmarks warrant it. |
| **C2** | **Incremental recompute (optional)** | On answer updates in wizard hooks, invalidate by reverse edges; benchmark before/after on large banks — ship only if win is clear. |
| **D** | **`brief-schema` API** | **Done (v1):** `GET /api/audits/:id/brief/schema` — plan sets + `questions[]` (bank label/section/priority per visible id) + `derived` summary; same auth/surface tuple rules as `GET .../brief`. Options/refs for UI remain client-side until a v2 extension. |
| **E** | **Canon metadata** | **Partial (v1):** `reportUse` + linter whitelist; extend with more keys and agent wiring as needed. |
| **F** | **Trace viewer + adaptive stub** | **Partial (v1.2):** Question trace + branch link panel + virtual list + Plan JSON; optional: canvas graph, Question Bank Studio. |
| **G** | **Analytics** | Instrument intake surfaces with versioned events; dashboards or exports; A/B hooks keyed by policy/layout tuple. |

**Tech-debt hygiene (ongoing):** any new surface must call `buildIntakePlan` (or shared selectors); no new parallel id lists without policy/lint coverage.

## Follow-up documentation

- Operational detail stays in [QUESTION_BANK.md](./QUESTION_BANK.md) (human-readable mirror of branching and agent mapping).
- This ADR is the **decision record**. Implementation paths: [ARCHITECTURE.md](./ARCHITECTURE.md) (intake resolver section), [`server/src/intake/core/`](../server/src/intake/core/), [`intake-policy.v1.json`](../server/src/intake/intake-policy.v1.json), [`layout-rules.v1.json`](../server/src/intake/layout-rules.v1.json). Index link: [MASTER.md](./MASTER.md).

## References

- `server/src/intake/core/build-intake-plan.ts`, `server/src/intake/core/evaluate-canon.ts`, `server/src/intake/core/evaluate-policy.ts`, `server/src/intake/core/evaluate-layout.ts`, `server/src/intake/core/load-policy.ts`, `server/src/intake/intake-policy.v1.json`, `server/src/intake/layout-rules.v1.json`
- `server/src/intake/branch-rules.ts`, `server/src/intake/is-visible.ts`, `server/src/intake/discovery.ts` (thin export of policy discovery set), `server/src/intake/brief-gates.ts`
- `server/src/services/brief-validator.ts` (persisted brief validation; version tuple + surface alignment on save and `assertBriefReady`)
- `src/app/lib/discovery-flow.ts` (public copy/options still local; ids guarded by policy + bank tests)

