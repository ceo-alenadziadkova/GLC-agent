# Diagnostic Adaptive Intake — implementation contract

This page is the **engineering contract** for the ADR Diagnostic Adaptive Intake pilot. Normative product intent stays in [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-SYSTEM.md](./adrs/ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-SYSTEM.md). API field names and examples are summarized in [API.md](./API.md) (`GET /api/audits/:id/brief/schema`, `PUT /api/audits/:id/brief`, pipeline start, discover convert).

**Repository sync (gaps, sprints, G1–G13, F1/F2, measurable KPIs):** [ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md](./adrs/ADR-DIAGNOSTIC-ADAPTIVE-INTAKE-ROADMAP-AUDIT.md) is the **only** normative matrix for what is shipped vs open; out-of-tree roadmaps should defer to it. **Case patterns artifact:** `packages/intake-core/src/artifacts/intake-case-patterns.v1.json` (Sprint B in that doc). **F1** next-question: [ADR-INTAKE-NEXT-QUESTION-V1.md](./adrs/ADR-INTAKE-NEXT-QUESTION-V1.md).

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
- Pipeline execution authority remains at API boundaries (brief recompute observability, discover convert boundary mode, pipeline start/next hard gate).
- Intake readiness and downstream CONTROL_OBJECT/review-gate governance remain separate layers.

### Phase-0 gap baseline (Phase-1 must ship alignment)

- Sequencing tuple and artifact contract are implemented (`sequencingVersion` included with compat fallback paths).
- Canonical readiness fields are implemented (`flowReadinessStatus`, `auditReadinessStatus`).
- Minimal pilot critical registry (6 keys) is implemented with traceable evaluator output.
- Boundary enforcement exists at brief recompute (observability), discover convert, and pipeline start/next.
- Remaining intentional limits for Phase-1: session-level remediation reopen suppression and full caveat governance remain deferred.

### Already implemented

- Source-of-truth layering is fixed: question-bank canon + policy/layout artifacts + server-side `buildIntakePlan` runtime authority.
- Pilot sequencing artifact and version tuple (`sequencingVersion`) are active in resolver + write-validation compatibility paths.
- Six pilot critical signals are evaluated end-to-end with structured trace and surfaced in brief/schema API payloads.
- Readiness boundary enforcement is active at `pipeline/start` and `discover/convert` (feature-flag gated), while `PUT brief` always recomputes readiness for observability.
- Intake vs review-gate vs CONTROL_OBJECT boundaries stay split: intake emits execution-context readiness; pipeline governance remains in phase decision layers.

### Not implemented yet (intentional Phase-1/Phase-B/C deferrals)

- Full caveat taxonomy/ownership and broad `ready_with_caveats` class expansion (Phase-1 keeps a limited class set).
- Package-aware readiness by Starter/Pro/Complete execution scope (Phase-B/C direction only).
- Full bridge-question lifecycle governance and expanded vertical pack rollout controls.
- Product KPI gate automation (completion/funnel lift) in CI; KPI remains Product analytics responsibility.

## Canonical enums and fields

- **Flow readiness:** `flow_ready` | `blocked` (`FlowReadinessStatus`).
- **Audit readiness:** `audit_ready` | `blocked` | `ready_with_caveats` (`AuditReadinessStatus`). **Current rollout slice:** `ready_with_caveats` is emitted only for limited baseline caveat classes (currently `full_scope_required_gaps`) under explicit policy.
- **Trace:** `IntakeReadinessTraceEntry[]` with `code`, `semanticCause`, optional `questionId`, `signalKey`, `detail`.
- **Intake version tuple:** `questionBankVersion`, `policyVersion`, `layoutVersion`, `resolverVersion`, `sequencingVersion`.
- **Signal confidence (pilot critical signals only):** `high` | `medium` | `low` | `unknown` per signal key — **orthogonal** to `derived.confidence_overall` on the brief schema (UX / resolver aggregate).
- **Default unknown rule:** when no per-signal override exists, `unknown` may satisfy `flow_ready`, cannot independently satisfy `audit_ready`, and cannot raise signal confidence above `low`.

## Six pilot critical signals

Registry: `packages/intake-core/src/artifacts/intake-critical-signals-pilot-1.0.0.json` — keys `industry`, `website_presence`, `primary_problem`, `operations_bottleneck`, `audit_focus` (each maps to bank ids + `normalizerRef`). Recommended-only banks such as `d_closing_flow` are not execution-blocking pilot critical signals.

## Unknown handling

- Answers with `source: 'unknown'` count as answered for SLA-style checks but **fail** pilot critical-signal execution readiness when `unknownBlocksAuditReady` is true in the artifact (current default).
- Unknown-sourced cells are reflected in `signalConfidence` as `**low`** when they block, or `**medium**` when answered with explicit client/consultant evidence.

## Precedence (one line)

**Canon → policy (eligibility ceiling) → sequencing pilot (deterministic order) → layout projection → remediation (max 2, eligible-only) → readiness envelope.**

## Discovery conversion boundary (two enforcement levels)

The same evaluator (`evaluateIntakeReadinessEnvelope`) runs at convert and at pipeline start/next; the difference is `**criticalSignalsMode`**:

- **Convert** (`POST /api/discover/:token/convert`): always evaluate the envelope for **observability and trace**. Use `**sla_only`** so conversion is **not** blocked by the pilot six-signal registry (avoids blocking right after discovery when many cells are `unknown` or incomplete). SLA-style blocking for the mapped brief patch still applies inside the envelope when relevant.
- **Pipeline start** (`POST /api/audits/:id/pipeline/start`): use `**full`** so the pilot critical-signal registry participates in `**audit_ready**` / `blocked` under `**FEATURE_DIAGNOSTIC_INTAKE_PILOT**`.
- **Pipeline next** (`POST /api/audits/:id/pipeline/next`): apply the same readiness preflight policy as start (symmetry for execution boundary crossings, including resume-cancelled delegation path).

Stricter blocking at convert (e.g. `full_at_convert`) would be a separate product change and is **not** Phase-1.

## Three enforcement points

1. `**POST /api/audits/:id/pipeline/start`** — full readiness (`criticalSignalsMode: 'full'`), gated by `**FEATURE_DIAGNOSTIC_INTAKE_PILOT**` (default off): when disabled, readiness does not block start.
2. `**POST /api/discover/:token/convert**` — same feature flag; when enabled, envelope runs with `**criticalSignalsMode: 'sla_only'**` (see *Discovery conversion boundary* above); when disabled, readiness does not block convert.
3. `**PUT /api/audits/:id/brief` (save)** — always recomputes `evaluateIntakeReadinessEnvelope` for **observability** (structured log); **does not** reject the write when audit readiness is `blocked` (UX may continue saving drafts; execution remains blocked at pipeline start/next).

## Caveat classes (phase-limited, max 3)

- `full_scope_required_gaps` — express baseline gate is satisfied, but full-scope required set still has gaps.
- `unknown_source_signal_evidence` — reserved for future policy activation.
- `surface_limited_context` — reserved for future policy activation.

## Phase-1 scope

Pilot diagnostics are **not package-aware** beyond existing SLA / execution-plan modes; vertical packs and governance metrics stay out of Phase-1.

## Acceptance checklist (engineering)


| #   | Assertion                                                                                                                          | Covered by                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Healthcare pilot emits semantic trace for unanswered critical signals                                                              | `packages/intake-core/src/tests/intake-diagnostic-readiness.test.ts`                   |
| 2   | `sla_only` skips pilot registry with explicit trace                                                                                | same                                                                                   |
| 3   | Repeated envelope evaluation is deterministic for fixed inputs                                                                     | same                                                                                   |
| 4   | Sequencing pilot reorders `nextRecommended` for pilot industries                                                                   | same                                                                                   |
| 5   | `signalConfidence` / `critical_signals` exposed on plan + brief schema without replacing `confidence_overall`                      | `build-brief-schema-snapshot` + plan assembly tests                                    |
| 6   | Remediation queue length ≤ 2, idempotent, only **eligible** bank ids                                                               | `evaluate-remediation-pilot` tests                                                     |
| 7   | Unknown-sourced critical signal blocks audit readiness when artifact flag true                                                     | `intake-diagnostic-readiness` + critical-signals evaluator                             |
| 8   | `FEATURE_DIAGNOSTIC_INTAKE_PILOT=false` skips blocking on pipeline start                                                           | `server/src/services/pipeline-routes/__tests__/pipeline-route.use-cases.test.ts`       |
| 9   | PUT brief logs readiness trace codes without failing on `blocked`                                                                  | `brief-write` (manual / integration via logger)                                        |
| 10  | Pilot industry snapshots: nextRecommended + trace stable for Healthcare fixtures and multi-surface snapshots                       | `intake-diagnostic-readiness`, `intake-surface-no-regression.snapshot`                 |
| 11  | Express `slaProductMode` does not block `audit_ready` on full-only SLA gaps (baseline package-agnostic rule)                       | `intake-diagnostic-readiness`                                                          |
| 12  | Sequencing artifact `dependencyRules` emit deterministic `sequencing_dep_`* trace codes                                            | `intake-diagnostic-readiness`                                                          |
| 13  | Pipeline start forwards `slaProductMode` from `intakeBriefGateModeFromExecutionPlan` into the envelope                             | `pipeline-route.use-cases`                                                             |
| 14  | Pipeline preflight passes `criticalSignalsMode: 'full'`; discover convert uses `sla_only` in code (contract §Discovery conversion) | `intake-readiness-preflight` test + `discover-convert.service` / `discover-route.test` |


**Resume note:** `POST …/pipeline/resume-from-cancelled` delegates to `pipeline/next`; readiness enforcement remains centralized through `next` preflight (no duplicated start-only logic).

## Phase-1 engineering closure (checklist vs automated tests)

Product **pilot KPI** (completion regression, readiness-qualified lift) stays with Product/analytics — not asserted in CI.

Engineering re-verification for this rollout slice:

- **Single command (recommended):** `pnpm run test:intake-diagnostic-contracts` at repo root (intake-core guardrails + Post-KPI stub tests + server boundaries).
- **Minimal slice:** `pnpm vitest run packages/intake-core/src/tests/intake-diagnostic-readiness.test.ts`
- `pnpm vitest run packages/intake-core/src/tests/evaluate-remediation-pilot.test.ts`
- `(cd server && pnpm vitest run src/services/pipeline-routes/__tests__/pipeline-route.use-cases.test.ts src/services/pipeline-routes/use-cases/__tests__/intake-readiness-preflight-modes.test.ts src/tests/build-brief-schema-snapshot.test.ts src/tests/intake-frozen-artifacts.test.ts)`

## Pragmatic rollout checklist (phases 0-9)

This checklist is the single execution tracker for rollout phases (no separate checklist file required).

### Phase 0 - baseline + gap inventory

- Freeze baseline artifacts, tuple, and enforcement points.
- Record gap baseline against Phase-1 must ship.
- Record Phase-1 DoD assertions and invariants.

### Phase 1 - contracts/schemas

- Canonical readiness fields and enums are locked.
- `sequencingVersion` tuple compatibility path is locked.
- Minimal sequencing/critical-signal schema baseline is locked.

### Phase 2 - deterministic sequencing core

- Precedence invariant is enforced (`branch/policy -> sequencing -> layout -> UI`).
- Pilot transitions are bounded; no probabilistic routing/ML.

### Phase 3 - critical signals + readiness

- Six-signal pilot registry is enforced.
- Baseline package-agnostic readiness evaluator is active.
- Unknown default safety rule is enforced.

### Phase 4 - remediation

- Fallback clarification selector is active.
- Surface remediation budgets are bounded.
- Session-level reopen suppression remains deferred by design (YAGNI until KPI gate).

### Phase 5 - enforcement points

- `PUT /api/audits/:id/brief` recompute observability path is active.
- `POST /api/discover/:token/convert` boundary check is active (`sla_only`).
- `POST /api/audits/:id/pipeline/start` hard gate is active (`full` mode under feature flag).
- Discovery/pre-brief completion is not execution authority by itself.

### Phase 6 - UI contract

- One-question focus and explainability hint are the expected interaction model.
- Remediation checkpoint UX is non-generic and guided.
- UI remains server-authored with no local branching invention.

### Phase 7 - quality gates

- Contract/readiness tests: `packages/intake-core/src/tests/intake-diagnostic-readiness.test.ts`.
- Tuple compatibility tests: `packages/intake-core/src/tests/intake-version-tuple.test.ts`.
- Precedence/guardrails tests: `packages/intake-core/src/tests/lint-sequencing-pilot-guardrails.test.ts`.
- Boundary enforcement tests: `server/src/services/pipeline-routes/__tests__/pipeline-route.use-cases.test.ts`, `server/src/tests/discover-route.test.ts`.
- Remediation idempotence tests: `packages/intake-core/src/tests/evaluate-remediation-pilot.test.ts`.
- Surface parity tests: `packages/intake-core/src/tests/intake-surface-no-regression.snapshot.test.ts`.

### Phase 8 - pilot rollout (single vertical)

- Single pilot vertical is fixed for this rollout slice (Healthcare).
- Rollout order is fixed: internal -> limited traffic -> full.
- KPI monitoring targets are fixed: completion non-regression, readiness-qualified context lift, no drop-off increase.

### Phase 9 - Phase-B/C expansion gate

- Phase-B/C starts only after pilot KPI gate.
- Expansion scope stays deferred until gate pass: package-aware readiness, expanded registry metadata, caveat taxonomy, Context Envelope, bridge-question governance.
- When the gate passes, implement only via the ordered backlog in **Post-KPI controlled expansion order** (one item per release train; no skipping).

## Rollout

- Default: pilot flag **off** (`SYSTEM_DEFAULTS.featureFlags.diagnosticIntakePilotEnabled`).
- Ops: `FEATURE_DIAGNOSTIC_INTAKE_PILOT=true` to enable blocking + structured `intake_readiness_blocked` logs on start.
- Post-KPI (optional): `FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE=true` **with** pilot flag enables execution-plan domain slice for in-scope coverage gaps on pipeline preflight (see `docs/DEPLOYMENT.md` — Diagnostic Adaptive Intake pilot). **`INTAKE_EXECUTION_PLAN_READINESS_POLICY`** keeps **Starter/Pro** on `scope_aware` (in-scope gaps can still block) while **Complete** uses `baseline_only` so the trace remains useful but pipeline start/next is not held on exhaustive recommended in-scope gaps across all domains.

**Structured log keys (dashboards / alerts):**

- `brief_write.intake_readiness_recomputed` — PUT brief observability (debug).
- `discover.convert.intake_readiness_blocked` — convert rejected under pilot when envelope blocks.
- `pipeline.intake_readiness_blocked` — start rejected.
- `pipeline.next.intake_readiness_blocked` — next rejected.

### Product/Ops rollout handshake (mandatory before enabling flag)

1. Confirm pilot window (start/end dates) and traffic slice (`internal` -> `limited` -> `full`).
2. Confirm KPI gate owners:
  - completion non-regression,
  - readiness-qualified lift,
  - false blocked trend.
3. Confirm rollback rule: if any KPI gate fails, disable `FEATURE_DIAGNOSTIC_INTAKE_PILOT` and keep scope at current phase.
4. Record one decision row in **KPI decision checkpoint** table per review window (`expand` or `hold`).

## Intake analytics (ADR observability)

Batched `**POST /api/audits/:id/brief/analytics-events`** and `**POST /api/discover/analytics-events**` accept the existing funnel event types plus `**sequencing_transition_taken**`, `**signal_confidence_changed**`, `**readiness_blocked**`, `**remediation_asked**`, and `**guard_question_triggered**`, with optional fields (`trace_codes`, `remediation_bank_ids`, `next_recommended`, readiness statuses, `signal_key`, etc.) — see `[server/src/schemas/intake-analytics-events.ts](../server/src/schemas/intake-analytics-events.ts)` (single Zod source of truth).

## Pilot success gate (before broad Phase-B/C rollout)

Do not expand rollout coverage to package-aware readiness across production traffic until:

- **No regression** in intake completion / wizard completion rates vs pre-pilot baseline (product-defined window).
- **Measurable lift** in readiness-qualified context (e.g. share of starts where `auditReadinessStatus === 'audit_ready'` under pilot, or downstream proxy agreed with Product).

Until then, keep Phase-B/C rollout gated and reversible behind feature flags.

## Post-KPI controlled expansion order (Phase 4)

Canonical expansion order remains:

1. execution-plan-aware readiness (Starter/Pro scope-aware; Complete baseline-only for hard block) — **engineering:** pipeline preflight already forwards execution-plan fields into `evaluateIntakeReadinessEnvelope` when `**FEATURE_DIAGNOSTIC_INTAKE_PILOT`** and `**FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE**` are both enabled (default off until KPI `expand`); product turns this on only after the gate,
2. richer critical-signal registry metadata (`sourcesByPriority`, conflict rules),
3. limited `ready_with_caveats` taxonomy expansion (2-3 classes first),
4. Project Context Envelope before ContextBuilder,
5. bridge-question lifecycle governance (owner, KPI, removal policy).

Expansion remains deterministic by default; no probabilistic sequencing in this track.

### Implementation status update (repo state)

- Implemented in code (flag-gated / controlled):
  - step 2: critical-signal metadata-aware evaluation + trace (`critical_signal_metadata_applied`, source-priority miss handling),
  - step 3: limited caveat expansion includes `unknown_source_signal_evidence` on advisory boundaries,
  - step 4: ContextBuilder Project Context Envelope integration behind `FEATURE_PROJECT_CONTEXT_ENVELOPE`,
  - step 5: bridge dependency lifecycle governance metadata in sequencing artifact (`owner`, `kpiMetric`, `state`, `reviewByIsoDate`) + lint guardrails.
- Still rollout-gated: production enablement order and KPI decision policy remain authoritative.

**Engineering spine (pre-wiring, stays behind KPI gate for production behavior):**

- Ordered step ids: `PHASE_BC_EXPANSION_ORDER` in `packages/intake-core/src/core/diagnostic-intake/phase-bc-stubs.ts` — use `isPhaseBcExpansionOrderValid` in release checklists or tooling so trains do not skip steps.
- KPI decision rule: `evaluatePilotKpiGate` in `packages/intake-core/src/core/diagnostic-intake/evaluate-pilot-kpi-gate.ts` (mirrors the checkpoint table; not a substitute for Product sign-off).
- Stubs for later wiring (package-aware readiness envelope slice, context envelope shape): same `phase-bc-stubs` module; tests include `readiness-package-scope.matrix.test.ts`, `phase-bc-context-envelope.test.ts`, `context-envelope-contract.test.ts`, and `phase-bc-expansion-order.test.ts`.

### Phase-B/C execution gate (implementation checklist)

Start each next item only when all checks are true for the previous one:

- KPI decision table status is `expand` for the current review window.
- Artifact/version bump is prepared for the current step (`sequencingVersion` and related artifact versions where applicable).
- Contract tests for the current step are added/updated before enabling the behavior.
- Rollback path is documented (which flag/config returns behavior to previous phase).

Do not parallelize these expansion items in one release train; sequence is mandatory.

### Phase-B/C engineering status (current)

Current state: parts of Phase-B/C are implemented in repository with conservative defaults and feature flags. Production rollout still follows the [KPI decision checkpoint](#kpi-decision-checkpoint-expand-vs-hold) and ordered enablement policy.

## Resolver modularity guardrail (ADR §8)

When extending intake orchestration behavior, keep changes inside existing decomposition seams:

- eligibility: branch/policy constraints,
- signals: critical/inferred/unknown evaluation,
- sequencing: transition choice and traces,
- readiness: envelope and status mapping,
- remediation: bounded queue selection,
- layout: final slot projection,
- assembly: final plan packaging.

If a change crosses seams, extract/shared helper first instead of adding another responsibility to a single module.

## Remediation idempotence (session-level, deferred)

Pilot `**remediation_queue`** is derived from **unanswered** eligible bank ids on the sequencing allow-list (deterministic per evaluation). **Per-signal** “already asked once for low-confidence signal *X*” across a self-serve session is **not** in Phase-1: it would require explicit brief metadata or plan state — add only when a product case is approved (YAGNI).

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
4. For blocked outcomes, confirm top semantic causes are deterministic and map to known pilot signal keys (`industry`, `website_presence`, `primary_problem`, `operations_bottleneck`, `audit_focus`).

## KPI decision checkpoint (expand vs hold)

Record one decision row per review window. Expansion is allowed only when all gates pass. **Until the first real row is added, default decision is `hold` for Phase-B/C code changes** (pilot-only engineering may still ship behind flags).

**Process:** when a pilot window closes, **append** a new row (keep prior rows immutable). Use ISO date ranges in the Window column. If any gate is **fail**, set Decision to `**hold`** and do not enable Phase-B/C trains.


| Window                                                               | Completion regression         | Readiness-qualified lift | False blocked trend | Decision           |
| -------------------------------------------------------------------- | ----------------------------- | ------------------------ | ------------------- | ------------------ |
| 2026-04-20 — repo baseline (pilot flag off in production by default) | N/A — no pilot window started | N/A                      | N/A                 | `hold`             |
| 2026-04-22 — 2026-04-28 (internal)                                   | pending                       | pending                  | pending             | `hold`             |
| 2026-04-29 — 2026-05-05 (limited)                                    | pending                       | pending                  | pending             | `hold`             |


Decision policy:

- `expand` only when all three gates are **pass**.
- `hold` when any gate is **fail**, and iterate only inside the current pilot scope.
- Keep expansion order fixed per this contract; do not skip directly to downstream Phase-B/C items.

## Finalization runbook checkpoints (implementation status)

The following checklist is the implementation baseline for the finalization train. It ties the five rollout todos to concrete artifacts and keeps Product/Ops decisions auditable.

| Todo | Scope | Owner | Evidence artifact |
| --- | --- | --- | --- |
| Pilot KPI gate | Handshake, stage progression, checkpoint decisions | Product + Ops | This KPI table rows per window |
| Post-KPI enable | `FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE`, `FEATURE_PROJECT_CONTEXT_ENVELOPE`, bridge governance active review | Engineering + Ops | `docs/DEPLOYMENT.md` pilot section + structured logs |
| Complete B/C model | Caveat taxonomy metadata + ask-slot contract metadata + bridge lifecycle policy | Engineering | `@glc/intake-core` taxonomy/config + sequencing artifact |
| Vertical scale | Ordered packs (E-commerce -> SaaS/Software -> Retail) | Product + Engineering | ADR section 15 + QUESTION_BANK protocol updates |
| Stable contracts | API parity + observability runbook thresholds | Engineering + Ops | `docs/API.md` + `docs/DEPLOYMENT.md` |