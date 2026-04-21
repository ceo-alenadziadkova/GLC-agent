# Diagnostic Adaptive Intake — implementation contract

This page is the **engineering contract** for the ADR Diagnostic Adaptive Intake pilot. Normative product intent stays in [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-SYSTEM.md](./adrs/ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-SYSTEM.md). API field names and examples are summarized in [API.md](./API.md) (`GET /api/audits/:id/brief/schema`, `PUT /api/audits/:id/brief`, pipeline start, discover convert).

## Baseline freeze note (Phase 0)

### Baseline report (frozen start point)

- Canon artifacts and tuple contracts are fixed at:
  - `packages/intake-core/src/question-bank.v1.json`
  - `packages/intake-core/src/intake-policy.v1.json`
  - `packages/intake-core/src/layout-rules.v1.json`
  - `packages/intake-core/src/artifacts/intake-sequencing-pilot-1.0.0.json`
  - `packages/intake-core/src/artifacts/intake-critical-signals-pilot-1.0.0.json`
  - `packages/intake-core/src/artifacts/surface-matrix-pilot.v1.json`
- Intake tuple authority is `questionBankVersion + policyVersion + layoutVersion + resolverVersion + sequencingVersion` with legacy 4-part fallback only in compatibility paths.
- Sequencing artifact ownership:
  - runtime owner: Intake Core (Engineering),
  - semantic owner: Product + Engineering (joint sign-off),
  - canonical path: `packages/intake-core/src/artifacts/intake-sequencing-pilot-1.0.0.json`.
- Pilot vertical for this rollout slice is **Healthcare** (single-vertical guardrail for Phase-1).
- Surface zones covered by baseline snapshots:
  - `pre_brief + client_form`,
  - `self_serve + client_form`,
  - `interview + consultant_interview`,
  - `discovery + public_discovery`.
- No-regression snapshot suite:
  - `packages/intake-core/src/tests/intake-surface-no-regression.snapshot.test.ts`.

### Invariants (must stay true)

- Unified question bank remains the single source of question semantics.
- Resolver remains server-authoritative; UI renders authored output only.
- Precedence order stays fixed: branch/policy -> sequencing -> layout -> remediation/readiness.
- Readiness enums are canonical and shared across intake-core + server API contracts.
- Pipeline execution authority remains at API boundaries (brief recompute observability, discover convert boundary mode, pipeline start hard gate).
- Intake readiness and downstream CONTROL_OBJECT/review-gate governance remain separate layers.

### Phase-0 gap baseline (Phase-1 must ship alignment)

- Sequencing tuple and artifact contract are implemented (`sequencingVersion` included with compat fallback paths).
- Canonical readiness fields are implemented (`flowReadinessStatus`, `auditReadinessStatus`).
- Minimal pilot critical registry (6 keys) is implemented with traceable evaluator output.
- Boundary enforcement exists at brief recompute (observability), discover convert, and pipeline start.
- Remaining intentional limits for Phase-1: session-level remediation reopen suppression and full caveat governance remain deferred.

### Already implemented

- Source-of-truth layering is fixed: question-bank canon + policy/layout artifacts + server-side `buildIntakePlan` runtime authority.
- Pilot sequencing artifact and version tuple (`sequencingVersion`) are active in resolver + write-validation compatibility paths.
- Six pilot critical signals are evaluated end-to-end with structured trace and surfaced in brief/schema API payloads.
- Readiness boundary enforcement is active at `pipeline/start` and `discover/convert` (feature-flag gated), while `PUT brief` always recomputes readiness for observability.
- Intake vs review-gate vs CONTROL_OBJECT boundaries stay split: intake emits execution-context readiness; pipeline governance remains in phase decision layers.

### Not implemented yet (intentional Phase-1/Phase-B/C deferrals)

- Full caveat taxonomy/ownership and runtime `ready_with_caveats` emission (status token reserved).
- Package-aware readiness by Starter/Pro/Complete execution scope (Phase-B/C direction only).
- Full bridge-question lifecycle governance and expanded vertical pack rollout controls.
- Product KPI gate automation (completion/funnel lift) in CI; KPI remains Product analytics responsibility.

## Canonical enums and fields

- **Flow readiness:** `flow_ready` | `blocked` (`FlowReadinessStatus`).
- **Audit readiness:** `audit_ready` | `blocked` | `ready_with_caveats` (`AuditReadinessStatus`). **Current rollout slice:** `ready_with_caveats` is emitted for express baseline readiness when full-scope required context is still missing (caveat class `full_scope_required_gaps`).
- **Trace:** `IntakeReadinessTraceEntry[]` with `code`, `semanticCause`, optional `questionId`, `signalKey`, `detail`.
- **Intake version tuple:** `questionBankVersion`, `policyVersion`, `layoutVersion`, `resolverVersion`, `sequencingVersion`.
- **Signal confidence (pilot critical signals only):** `high` | `medium` | `low` | `unknown` per signal key — **orthogonal** to `derived.confidence_overall` on the brief schema (UX / resolver aggregate).

## Six pilot critical signals

Registry: `packages/intake-core/src/artifacts/intake-critical-signals-pilot-1.0.0.json` — keys `industry`, `website_presence`, `primary_problem`, `operations_bottleneck`, `audit_focus`, `delivery_shape_baseline` (each maps to bank ids + `normalizerRef`).

## Unknown handling

- Answers with `source: 'unknown'` count as answered for SLA-style checks but **fail** pilot critical-signal execution readiness when `unknownBlocksAuditReady` is true in the artifact (current default).
- Unknown-sourced cells are reflected in `signalConfidence` as **`low`** when they block, or **`medium`** when answered with explicit client/consultant evidence.

## Precedence (one line)

**Canon → policy (eligibility ceiling) → sequencing pilot (deterministic order) → layout projection → remediation (max 2, eligible-only) → readiness envelope.**

## Discovery conversion boundary (two enforcement levels)

The same evaluator (`evaluateIntakeReadinessEnvelope`) runs at convert and at pipeline start; the difference is **`criticalSignalsMode`**:

- **Convert** (`POST /api/discover/:token/convert`): always evaluate the envelope for **observability and trace**. Use **`sla_only`** so conversion is **not** blocked by the pilot six-signal registry (avoids blocking right after discovery when many cells are `unknown` or incomplete). SLA-style blocking for the mapped brief patch still applies inside the envelope when relevant.
- **Pipeline start** (`POST /api/audits/:id/pipeline/start`): use **`full`** so the pilot critical-signal registry participates in **`audit_ready`** / `blocked` under **`FEATURE_DIAGNOSTIC_INTAKE_PILOT`**.

Stricter blocking at convert (e.g. `full_at_convert`) would be a separate product change and is **not** Phase-1.

## Three enforcement points

1. **`POST /api/audits/:id/pipeline/start`** — full readiness (`criticalSignalsMode: 'full'`), gated by **`FEATURE_DIAGNOSTIC_INTAKE_PILOT`** (default off): when disabled, readiness does not block start.
2. **`POST /api/discover/:token/convert`** — same feature flag; when enabled, envelope runs with **`criticalSignalsMode: 'sla_only'`** (see *Discovery conversion boundary* above); when disabled, readiness does not block convert.
3. **`PUT /api/audits/:id/brief` (save)** — always recomputes `evaluateIntakeReadinessEnvelope` for **observability** (structured log); **does not** reject the write when audit readiness is `blocked` (UX may continue saving drafts; execution remains blocked at pipeline start).

## Caveat classes (phase-limited, max 3)

- `full_scope_required_gaps` — express baseline gate is satisfied, but full-scope required set still has gaps.
- `unknown_source_signal_evidence` — reserved for future policy activation.
- `surface_limited_context` — reserved for future policy activation.

## Phase-1 scope

Pilot diagnostics are **not package-aware** beyond existing SLA / execution-plan modes; vertical packs and governance metrics stay out of Phase-1.

## Acceptance checklist (engineering)

| # | Assertion | Covered by |
| --- | --- | --- |
| 1 | Healthcare pilot emits semantic trace for unanswered critical signals | `packages/intake-core/src/tests/intake-diagnostic-readiness.test.ts` |
| 2 | `sla_only` skips pilot registry with explicit trace | same |
| 3 | Repeated envelope evaluation is deterministic for fixed inputs | same |
| 4 | Sequencing pilot reorders `nextRecommended` for pilot industries | same |
| 5 | `signalConfidence` / `critical_signals` exposed on plan + brief schema without replacing `confidence_overall` | `build-brief-schema-snapshot` + plan assembly tests |
| 6 | Remediation queue length ≤ 2, idempotent, only **eligible** bank ids | `evaluate-remediation-pilot` tests |
| 7 | Unknown-sourced critical signal blocks audit readiness when artifact flag true | `intake-diagnostic-readiness` + critical-signals evaluator |
| 8 | `FEATURE_DIAGNOSTIC_INTAKE_PILOT=false` skips blocking on pipeline start | `server/src/services/pipeline-routes/__tests__/pipeline-route.use-cases.test.ts` |
| 9 | PUT brief logs readiness trace codes without failing on `blocked` | `brief-write` (manual / integration via logger) |
|10 | Pilot industry snapshots: nextRecommended + trace stable for Healthcare fixtures and multi-surface snapshots | `intake-diagnostic-readiness`, `intake-surface-no-regression.snapshot` |
|11 | Express `slaProductMode` does not block `audit_ready` on full-only SLA gaps (baseline package-agnostic rule) | `intake-diagnostic-readiness` |
|12 | Sequencing artifact `dependencyRules` emit deterministic `sequencing_dep_*` trace codes | `intake-diagnostic-readiness` |
|13 | Pipeline start forwards `slaProductMode` from `intakeBriefGateModeFromExecutionPlan` into the envelope | `pipeline-route.use-cases` |

**Gap / resume:** `POST …/pipeline/resume-from-cancelled` delegates to `pipeline/next` and does not re-run start; no duplicate start gate (documented here only).

## Phase-1 engineering closure (checklist vs automated tests)

Product **pilot KPI** (completion regression, readiness-qualified lift) stays with Product/analytics — not asserted in CI.

Engineering re-verification for this rollout slice:

- `pnpm vitest run packages/intake-core/src/tests/intake-diagnostic-readiness.test.ts`
- `pnpm vitest run packages/intake-core/src/tests/evaluate-remediation-pilot.test.ts`
- `(cd server && pnpm vitest run src/services/pipeline-routes/__tests__/pipeline-route.use-cases.test.ts src/tests/build-brief-schema-snapshot.test.ts src/tests/intake-frozen-artifacts.test.ts)`

## Pragmatic rollout checklist (phases 0-9)

This checklist is the single execution tracker for rollout phases (no separate checklist file required).

### Phase 0 - baseline + gap inventory

- [x] Freeze baseline artifacts, tuple, and enforcement points.
- [x] Record gap baseline against Phase-1 must ship.
- [x] Record Phase-1 DoD assertions and invariants.

### Phase 1 - contracts/schemas

- [x] Canonical readiness fields and enums are locked.
- [x] `sequencingVersion` tuple compatibility path is locked.
- [x] Minimal sequencing/critical-signal schema baseline is locked.

### Phase 2 - deterministic sequencing core

- [x] Precedence invariant is enforced (`branch/policy -> sequencing -> layout -> UI`).
- [x] Pilot transitions are bounded; no probabilistic routing/ML.

### Phase 3 - critical signals + readiness

- [x] Six-signal pilot registry is enforced.
- [x] Baseline package-agnostic readiness evaluator is active.
- [x] Unknown default safety rule is enforced.

### Phase 4 - remediation

- [x] Fallback clarification selector is active.
- [x] Surface remediation budgets are bounded.
- [x] Session-level reopen suppression remains deferred by design (YAGNI until KPI gate).

### Phase 5 - enforcement points

- [x] `PUT /api/audits/:id/brief` recompute observability path is active.
- [x] `POST /api/discover/:token/convert` boundary check is active (`sla_only`).
- [x] `POST /api/audits/:id/pipeline/start` hard gate is active (`full` mode under feature flag).
- [x] Discovery/pre-brief completion is not execution authority by itself.

### Phase 6 - UI contract

- [x] One-question focus and explainability hint are the expected interaction model.
- [x] Remediation checkpoint UX is non-generic and guided.
- [x] UI remains server-authored with no local branching invention.

### Phase 7 - quality gates

- [x] Contract/readiness tests: `packages/intake-core/src/tests/intake-diagnostic-readiness.test.ts`.
- [x] Tuple compatibility tests: `packages/intake-core/src/tests/intake-version-tuple.test.ts`.
- [x] Precedence/guardrails tests: `packages/intake-core/src/tests/lint-sequencing-pilot-guardrails.test.ts`.
- [x] Boundary enforcement tests: `server/src/services/pipeline-routes/__tests__/pipeline-route.use-cases.test.ts`, `server/src/tests/discover-route.test.ts`.
- [x] Remediation idempotence tests: `packages/intake-core/src/tests/evaluate-remediation-pilot.test.ts`.
- [x] Surface parity tests: `packages/intake-core/src/tests/intake-surface-no-regression.snapshot.test.ts`.

### Phase 8 - pilot rollout (single vertical)

- [x] Single pilot vertical is fixed for this rollout slice (Healthcare).
- [x] Rollout order is fixed: internal -> limited traffic -> full.
- [x] KPI monitoring targets are fixed: completion non-regression, readiness-qualified context lift, no drop-off increase.

### Phase 9 - Phase-B/C expansion gate

- [x] Phase-B/C starts only after pilot KPI gate.
- [x] Expansion scope stays deferred until gate pass: package-aware readiness, expanded registry metadata, caveat taxonomy, Context Envelope, bridge-question governance.

## Rollout

- Default: pilot flag **off** (`SYSTEM_DEFAULTS.featureFlags.diagnosticIntakePilotEnabled`).
- Ops: `FEATURE_DIAGNOSTIC_INTAKE_PILOT=true` to enable blocking + structured `intake_readiness_blocked` logs on start.

## Intake analytics (ADR observability)

Batched **`POST /api/audits/:id/brief/analytics-events`** and **`POST /api/discover/analytics-events`** accept the existing funnel event types plus **`sequencing_transition_taken`**, **`signal_confidence_changed`**, **`readiness_blocked`**, **`remediation_asked`**, and **`guard_question_triggered`**, with optional fields (`trace_codes`, `remediation_bank_ids`, `next_recommended`, readiness statuses, `signal_key`, etc.) — see [`server/src/schemas/intake-analytics-events.ts`](../server/src/schemas/intake-analytics-events.ts) (single Zod source of truth).

## Pilot success gate (before Phase-B/C)

Do not expand to package-aware readiness, full signal-registry metadata, or ContextBuilder envelope work until:

- **No regression** in intake completion / wizard completion rates vs pre-pilot baseline (product-defined window).
- **Measurable lift** in readiness-qualified context (e.g. share of starts where `auditReadinessStatus === 'audit_ready'` under pilot, or downstream proxy agreed with Product).

Until then, keep Phase-B/C items in the ADR as directional only.

## Post-KPI controlled expansion order (Phase 4)

After the pilot success gate is passed, expand strictly in this order:

1. execution-plan-aware readiness (Starter/Pro/Complete scope-aware),
2. richer critical-signal registry metadata (`sourcesByPriority`, conflict rules),
3. limited `ready_with_caveats` taxonomy expansion (2-3 classes first),
4. Project Context Envelope before ContextBuilder,
5. bridge-question lifecycle governance (owner, KPI, removal policy).

Expansion remains deterministic by default; no probabilistic sequencing in this track.

## Remediation idempotence (session-level, deferred)

Pilot **`remediation_queue`** is derived from **unanswered** eligible bank ids on the sequencing allow-list (deterministic per evaluation). **Per-signal** “already asked once for low-confidence signal *X*” across a self-serve session is **not** in Phase-1: it would require explicit brief metadata or plan state — add only when a product case is approved (YAGNI).

## QA trace playbook (pilot hardening)

Use this checklist when support/QA asks “why was this question shown now?”:

1. Confirm tuple and pilot artifacts in the payload (`intake_versions.sequencingVersion` + critical registry versioned artifacts).
2. Read resolver order evidence in trace:
  - eligibility/policy constraint first,
  - sequencing cause (`sequencing_*` trace codes),
  - layout projection and remediation queue.
3. Validate readiness boundary behavior by endpoint:
  - `PUT /api/audits/:id/brief`: recompute trace only (no write rejection),
  - `POST /api/discover/:token/convert`: `criticalSignalsMode: 'sla_only'`,
  - `POST /api/audits/:id/pipeline/start`: `criticalSignalsMode: 'full'` under pilot flag.
4. For blocked outcomes, confirm top semantic causes are deterministic and map to known pilot signal keys (`industry`, `website_presence`, `primary_problem`, `operations_bottleneck`, `audit_focus`, `delivery_shape_baseline`).

## KPI decision checkpoint (expand vs hold)

Record one decision row per review window. Expansion is allowed only when all gates pass.

| Window | Completion regression | Readiness-qualified lift | False blocked trend | Decision |
| --- | --- | --- | --- | --- |
| YYYY-MM-DD..YYYY-MM-DD | pass/fail | pass/fail | pass/fail | `expand` or `hold` |

Decision policy:

- `expand` only when all three gates are **pass**.
- `hold` when any gate is **fail**, and iterate only inside the current pilot scope.
- Keep expansion order fixed per this contract; do not skip directly to downstream Phase-B/C items.
