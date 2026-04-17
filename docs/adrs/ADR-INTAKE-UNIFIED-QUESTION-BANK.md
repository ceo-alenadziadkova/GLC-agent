# ADR: Unified question bank, policy/layout layers, and IntakePlan resolver

| Field | Value |
| --- | --- |
| **Status** | Accepted (Implemented) |
| **Date** | 2026-04-05 (accepted/implemented update: 2026-04-09) |
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

**`priority` (required / recommended / )** remains an editorial/research axis. It must **not** be the sole driver of Express or Pre-brief SLA; SLA and exclusions are expressed explicitly in policy to avoid hidden exceptions.

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
- `stepPlan` ( ordered steps for wizards)
- `reasonsById` / `debugTrace`
- `versions`: `{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }` echoing what was used to build the plan

**Derived outputs (formal contract, implement incrementally):** the resolver is a **knowledge-input layer**, not only a form driver. The plan SHOULD eventually expose (stub empty until implemented):

- `derivedFacts` — normalized signals computed from answers (e.g. segment flags, coarse maturity hints)
- `coverage` — which domains / report dimensions have minimum input
- `confidence` — heuristic strength of triage or pre-report conclusions

Related  fields already envisioned: `missingForReport`, `nextRecommended` (adaptive UX). They are **not** required in the first shipping tranche but belong to the **documented** evolution of `IntakePlan` so the core does not need redesign when they land.

The mental model shifts from “which questions are visible?” to **“what data-collection plan does this context need?”**

### Explainability first

Before replacing production gates with the new resolver, the implementation must expose **explainability** (`whyVisible` / `whyHidden`, matched rules) on the plan object. Explainability is **mandatory** for migration, not  polish. Otherwise parity migrations against Discovery/Express will be slow and brittle.

### Performance and packaging (directional)

- **Compile** canon + policy into an internal **DAG** (or explicit dependency index) at build or startup; evaluate visibility in topological or dependency order without re-walking raw JSON on every event.
- **Incremental recompute**: on answer change, track `dirtyIds` and re-evaluate only questions whose branch deps or policy deps are affected (**reverse-edge** invalidation); cache unchanged regions of the plan where safe.
- **Client**: prefer running the same `intake-core` locally for instant branching; server validates submits with the **same version tuple** as the client.
- **API**:  compact `brief-schema` snapshot for a product version; payloads remain `{ id, value, ... }` plus stored version metadata.

### Rejected alternatives

We explicitly reject:

- **Separate question lists per mode** (parallel `DISCOVERY_BANK_IDS_V2.ts`-style sources of truth).
- **Express / Pre-brief SLA derived only from `priority`** without explicit policy (hides exceptions and industry-specific rules).
- **Layout metadata inside the canon JSON** (couples semantics to one screen’s compromises).
- **Server-only branching with no shared core** (guarantees client/server drift unless every change is duplicated and tested twice).

These patterns are known to reintroduce duplication and unexplained diffs; code review should block regressions toward them.

### Rollout (high level)

#### Phase 0 — Contract (before behavior changes)

- Publish a short **glossary** (this ADR’s state semantics + mode vs surface).
- Fix **canonical fixture set** (e.g. `hotel_no_site`, `solo_with_site`, `real_estate_small_team`) and the **snapshot format** (fields compared in regression: `eligible`, `visible`, `required`, `deferred`, `hidden`,  `layoutSlots`,  `derived` stubs).

**Phase 1** — Introduce policy data that reproduces current behavior (Discovery whitelist, Express required set) with **no UX change**.

**Phase 2** — Implement `buildIntakePlan` + **fixture-driven regression** against Phase 0 snapshots.

**Phase 2b** — **Debug tooling**: a CLI and/or internal page that runs `buildIntakePlan(ctx)` and prints **trace output** (parity tests show diffs; trace explains them quickly).

**Phase 3** — **Bank/policy linter** in CI (unknown branch keys, invalid references, conflicting layout slots, layout rules that reference unknown question ids).

**Phase 4** — Switch server gates and validation to `intake-core` with version tuple on persist.

**Phase 5** — Align client wizards and public Discovery to consume `IntakePlan` (or equivalent selectors); remove parallel hard-coded question lists where redundant.

**Phase 6** — Introduce `layout-rules` without changing canon semantics.

## Implementation checklist (as of 2026-04-09)

- [x] **Phase 0 — Contract**: glossary and canonical fixture/snapshot format are defined and used in tests.
- [x] **Phase 1 — Policy data parity**: discovery inclusion and express required rules are represented in policy artifacts.
- [x] **Phase 2 — Resolver**: `buildIntakePlan(ctx)` implemented with state sets, versions, and reason traces.
- [x] **Phase 2b — Debug tooling**: plan trace available via route/CLI/internal tooling.
- [x] **Phase 3 — Linting**: bank/policy/layout linters implemented and wired into test/lint workflow.
- [x] **Phase 4 — Server gates + persist tuple**: server validation/gates use intake-core; version tuple is persisted on writes.
- [x] **Phase 5 — Client alignment and dedup**: client Discovery consumes server-provided fragment and shared resolver; public pre-brief and authenticated brief question bundles are plan-driven, and legacy `revenue_model` is bridged to bank id `a10` for backward compatibility.
  - **Update (current engine):** client answer keys use **`a10`** only; the read-merge alias is removed. Frozen policy tuples may still reference `revenue_model` in artifacts — see [AGENTS.md](../AGENTS.md) and [QUESTION_BANK.md](../QUESTION_BANK.md).
- [x] **Phase 6 — Layout layer**: layout rules are separated from canon/policy and applied in resolver without changing semantic eligibility.

## Governance for frozen artifact tuples

1. **When to add a frozen tuple**
   - Add a new entry to `FROZEN_ARTIFACT_REGISTRY` only when shipping a breaking artifact bundle that must keep historical draft/submit validation reproducible.
   - Do not add frozen tuples for non-breaking wording-only updates.

2. **What must be shipped together**
   - Frozen `question-bank`, `policy`, and `layout` artifacts.
   - Registry entry keyed by full tuple.
   - Tests covering tuple resolution and brief write validation paths.
   - Changelog note in docs describing migration/compatibility intent.

3. **Deprecation policy**
   - A frozen tuple may be marked deprecated only after all persisted rows using it are migrated or explicitly accepted as read-only historical.
   - Removal requires: migration evidence, release note, and tests updated to reject removed tuple with explicit error.

4. **Write-path policy**
   - New writes should use current tuple.
   - Legacy tuples are accepted only for deterministic replay/migration scenarios validated by `validateIntakeVersionsForBriefWrite`.

### Metadata (phased)

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
- **Internal tooling — Question Bank Studio:** visual canon map (all bank ids + sections + optional branch edges), optional **layout-rules** wizard steps between section and question per surface, structure metrics (depth/leaves on the visible tree), policy mode overlay, trace via **presets or pasted JSON** (same `buildIntakePlan` call as analytics would replay), **Plan footprint**, and inspector **resolver reasons** (`reasonsById`) plus SLA pointer to `brief-gates.ts`. JSON-serializable payloads: `src/app/lib/question-bank-studio-payload.ts` (`buildQuestionBankStudioPayloadPhase1` / `Phase2` include `layoutSurface` and `layoutStep` nodes when enabled). **Rollout:** consultants only; `VITE_QUESTION_BANK_STUDIO` (default on, `=0` disables tab + redirects full page); Settings `#question-bank-studio` and **`/admin/question-bank-studio`**. Vitest: canon tree completeness/order (`question-bank-studio-canon-tree.test.ts`) and branch edge parity vs `computeBranchTopology` (`question-bank-studio-branch-parity.test.ts`). UI copy clarifies canon vs runtime. Server-side analytics event **replay** on the canvas remains follow-up once a stable export/API exists.
- **Adaptive questioning:** `nextRecommended` driven by simple heuristics (e.g. information-gain scores) on top of the same `IntakePlan` pipeline, without changing the four-layer split.

## Follow-up documentation

- Operational detail stays in [QUESTION_BANK.md](./QUESTION_BANK.md) (human-readable mirror of branching and agent mapping).
- This ADR is the **decision record**; when implementation lands, link the concrete file paths and package name from [MASTER.md](./MASTER.md) or [ARCHITECTURE.md](./ARCHITECTURE.md).

## Operational notes (bundle shape; do not regress in docs or tests)

- **Shared resolver package:** runtime canon/policy/layout + `buildIntakePlan` live in **`@glc/intake-core`** (`packages/intake-core`). Server build runs `pnpm --filter @glc/intake-core run build` before `tsc`; the SPA must import **`@glc/intake-core`** (not `server/src/intake`). ESLint blocks `server/src/intake` imports under `src/`.
- **Choice “Other / specify” triggers:** `choiceValueNeedsSpecify`, `choiceSpecifyResponseKey`, and `CHOICE_OPTION_LABELS_REQUIRING_SPECIFY` live only in **`packages/intake-core/src/choice-specify-triggers.ts`**. App and server import them from **`@glc/intake-core`** — no second copy under `src/app/lib` (avoids diverging validation vs UI).
- **Visibility / data quality:** `filterVisibleQuestions` and stored **`data_quality_score`** derive visible sets only via **`buildIntakePlan`** (see `visibility-from-plan.ts` in the package).
- **Public rate limits:** Discover / pre-brief intake / marketing brief use **split** per-route limiters in `server/src/middleware/rate-limit.ts` (`discoverSessionCreateLimiter`, `discoverPublicReadLimiter`, `discoverAnalyticsPublicLimiter`, `intakePublicReadLimiter`, `intakePublicWriteLimiter`, `marketingBriefPublicLimiter`). Tune with env vars `PUBLIC_DISCOVER_CREATE_MAX_PER_HOUR`, `PUBLIC_DISCOVER_READ_MAX_PER_HOUR`, `PUBLIC_DISCOVER_ANALYTICS_MAX_PER_HOUR`, `PUBLIC_INTAKE_READ_MAX_PER_HOUR`, `PUBLIC_INTAKE_WRITE_MAX_PER_HOUR`, `PUBLIC_MARKETING_BRIEF_MAX_PER_HOUR` (optional `PUBLIC_INTAKE_LEGACY_MAX_PER_HOUR` for the deprecated combined limiter).
- **`GET /api/audits/:id/brief`** — field **`questions`** is **`getBriefQuestionsByIds(plan.visible)`** where each id is resolved from the **classic brief catalog** (`intake-policy.v1.json` → **`modes.classic_brief.main`**, implemented as export **`BRIEF_QUESTIONS`** in `@glc/intake-core` — policy-driven, not a duplicate questionnaire). **Identity bank stubs** from **`modes.pre_brief.identityFieldIds`** (e.g. **`a11`**, **`a12`**, **`a2`**, **`a5`**) are **not** in `classic_brief.main`; they appear in **`questions`** only if **`plan.visible`** includes them. Values live in **`brief.responses`** under **bank ids** (and side keys such as **`…__other`**, **`intake_industry_specify`**). See [API.md](../API.md).
- **Public pre-brief** — **`GET /api/intake/:token`** prepends **`INTAKE_IDENTITY_BRIEF_QUESTIONS`** (policy **`identityFieldIds`** as bank stems + **`intake_industry_specify`**), then **`getBriefQuestionsByIds(plan.visible)`**; keep parity tests aligned if that assembly changes.
- **Policy** — **`modes.pre_brief.bankIncluded`** lists the narrow pre-brief **bank** slice (plus **`identityFieldIds`** for who-you-are fields); runtime uses **`PRE_BRIEF_BANK_INCLUDED_IDS`** derived from the same policy JSON. **`a10`** (revenue) is inside **`bankIncluded`** alongside other express-facing ids.
- **Lint** — **`syntheticRequired`** may list **`a10`** even though it is a bank id; **`lintSyntheticCollision`** allowlists **`INTAKE_REVENUE_BANK_ID`** (`ALLOWED_SYNTHETIC_BANK_OVERLAP` in `packages/intake-core/src/core/lint-bank-policy/canon-constants.ts`).
- **Legacy rows without `intake_versions`:** validation and prompt assembly use the **current** engine tuple when the column is `NULL` or the stored tuple is unsupported (repair on next write, logged in `intake_version_migration`). See [API.md](../API.md) (`PUT` brief) and [DATABASE.md](../DATABASE.md).
- **Rate limiting:** public Discover / intake / marketing-brief limiters use **`RedisStore`** when **`RATE_LIMIT_REDIS_URL`** is set; otherwise they fall back to **`MemoryStore`** (per process). Without Redis, caps are not coordinated across horizontally scaled instances — set Redis in multi-instance production.
- **`intake_versions` on write:** the body must be a **supported** frozen or current artifact tuple, or omitted to reuse the stored tuple. Unsupported tuple → **`400`**; conflict with stored tuple → **`409`** (except allowed upgrades). The tuple persisted on save matches the `versions` field from `buildIntakePlan`; server validation is authoritative.
- **SPA vs server releases:** ship compatible **`@glc/intake-core`** semantics together where possible. The version tuple and PUT validation reduce client/server artifact skew; they do not remove all UX risk if resolver code diverges across deployments.

## References

- `packages/intake-core/src/is-visible.ts`, `packages/intake-core/src/branch-rules.ts`, `packages/intake-core/src/discovery.ts`, `packages/intake-core/src/brief-gates.ts`
- `src/app/lib/discovery-flow.ts` — uses `buildIntakePlan` from `@glc/intake-core`
