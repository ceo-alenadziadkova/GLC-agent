# AI Pipeline

## Phase Map

```
Phase 0 Recon ──┐
 │ Review Gate 1 (after recon)
Phase 1 Tech Infrastructure ─┤
Phase 2 Security & Compliance│ Auto Wing (phases 1–4 in parallel)
Phase 3 SEO & Digital │
Phase 4 UX & Conversion ──┤
 │ Review Gate 2 (after auto wing)
Phase 5 Marketing & UTP ──┤ Analytic wing (5–6 in parallel)
Phase 6 Automation & Processes│ then Phase 7 Strategy (sequential; no gate between 6 and 7)
Phase 7 Strategy Synthesis ──┘
 │ Review Gate 3 (after strategy; full mode only)
```

---

## Execution plan semantics

Runtime sequencing is derived from `audits.execution_plan` (normalized by `execution_plan`), not only from `product_mode`.

- Executable phases are resolved via `executionPlanToPhases(...)`.
- Review gates are resolved via `reviewPhasesForExecutionPlan(...)`.
- Strategy phase (`7`) runs only when `include_strategy` is enabled in the normalized plan.

Default plan profiles:

- `coverage_package=starter` -> light baseline, limited selected domains, strategy disabled.
- `coverage_package=pro` -> standard-depth selected coverage, strategy optional via `include_strategy`.
- `coverage_package=complete` -> full domain coverage, strategy enabled by default.
- `free_snapshot` -> deterministic scanner path (no LLM phase loop).

Compatibility mapping (runtime internals):

- Legacy `product_mode=full` defaults to `coverage_package=complete`.
- Legacy `product_mode=express` defaults to `coverage_package=pro`.

---

## Intake Enrichment Order

Intake sequencing is progressive:

1. Step 1A: URL entry + initial brief answers.
2. Step 1B: Recon runs and enriches intake with prefill candidates.
3. Client/consultant confirms or updates prefill before deeper domain phases.

Contract note: "brief before anything else" means before domain analysis phases (1–7), not necessarily before recon itself.

---

## Per-Phase Execution Model

Every phase runs the same 5-step sequence:

```
COLLECT (no AI) → ASSEMBLE CONTEXT → CALL CLAUDE (1 call) → FACT-CHECK → SAVE + EMIT
```

### Step 1: Collect
Programmatic data gathering — no API calls to Claude. Collectors use `cheerio` + `fetch` to extract structured data from the target site. Results cached in `collected_data` table. If a phase is retried, collectors are skipped and cached data is reused.

### Step 2: Assemble Context
`ContextBuilder` compiles a briefing for Claude:
- Raw collector output for this phase
- Recon profile (company, industry, tech stack)
- Results of all previously completed domains
- Review notes from any approved review gates
- Industry benchmarks for the domain
- Domain-specific analysis instructions
- Expected JSON output schema

### Step 3: Call Claude
Single `claude-sonnet-4-20250514` call using `tool_use` with a strict JSON schema. Claude **analyses and scores** — it does not collect data. Token usage is logged to `pipeline_events` (type: `token_usage`).

### Step 4: Fact-Check
`FactChecker` validates Claude's output against raw metrics:
- If Claude scores SEO 4/5 but sitemap is missing → flag + request score adjustment
- If Claude says "no SSL" but collector found valid cert → override to accurate value
- Corrections are logged in `pipeline_events` (type: `fact_check`)

For **domain phases** (not Recon or Strategy), `FactChecker` also builds **CONTROL_OBJECT** (schema evolves v1.0 through **v2.0**; see subsection below and [ADR-CONTROL-OBJECT-V1](./adrs/ADR-CONTROL-OBJECT-V1.md)).

### Step 4b: Decision Layer (advisory, Phase 1 MVP)

After the agent run, `PipelineOrchestrator` applies `DecisionLayer.decide(controlObject)` and writes the authoritative `decision_hint` onto the same object (`accept` / `accept_with_warnings` / `refine`). Events:

| `pipeline_events.event_type` | Purpose |
|------------------------------|---------|
| `control_object` | Full CONTROL_OBJECT JSON under `data.control_object` (includes final `decision_hint`). |
| `refine_recommended` | Emitted when `decision_hint === 'refine'` after optional **auto-loop** (see below): `reasoning`, `active_error_types`, and `control_object` for consultant visibility. Does **not** block saving the phase result (advisory). |

**Post-wing quality gates** remain separate: `ConsistencyChecker` still emits `quality_gate` with `QualityGateReport` (score/consistency checks across completed domains). Do not confuse `quality_gate` with CONTROL_OBJECT.

**Threshold note**: `DecisionLayer` uses **85 / 70** on `confidence.overall` for accept / accept-with-warnings. That overall score is **phase-weighted** (including feasibility). Some older specs assumed **80 / 65** after weighting; the implemented constants are intentionally stricter — see [ADR-DECISION-LAYER-GATES](./adrs/ADR-DECISION-LAYER-GATES.md).

**Failure safety note**: if `DecisionLayer.decide(...)` throws, pipeline execution remains non-fatal and the orchestrator applies a **configured safe fallback** from `SYSTEM_DEFAULTS.decisionLayer.onErrorFallback` (currently `accept_with_warnings`). The emitted `control_object` event includes fallback metadata (`decision_fallback_applied`, `decision_fallback_reason_code`, `decision_fallback_error`) so downstream consumers can distinguish fallback decisions from normal routing.

**Auto-loop (Phase 5, off by default):** When `AUTO_LOOP_ENABLED=true` and `GLC_DEPLOYMENT_PROFILE` (see `getAutoLoopExecutionProfile()` in `feature-flags.ts`) is listed in `AUTO_LOOP_ALLOWED_MODES`, a `refine` decision may trigger a targeted rerun of the same phase agent with instruction patches from `rule-engine.ts` (via `dynamic-adjustment.ts`). Caps: `SYSTEM_DEFAULTS.autoLoop` (`maxIterations`, `minConfidenceGain`, `costGuardrailThresholdUsd`). See [ADR-AUTO-LOOP-RULE-ENGINE](./adrs/ADR-AUTO-LOOP-RULE-ENGINE.md).

### CONTROL_OBJECT contract (v1.0 through v2.0)

Canonical TypeScript: `control_object` (`ControlObjectV1` name is historical; the struct carries v2 fields).

| Area | Contents |
|------|-----------|
| **versions** | `system_version`, `fact_checker_version`, `decision_layer_version` (string tags for auditability). |
| **context** | `audit_id`, `phase_id`, `execution_mode` (`normal` \| `safe` from `audits.execution_mode`), `truth_profile_id` (phase profile key). |
| **confidence** | `overall`, `factual`, `strategic`, `consistency`, `feasibility` (0–100; feasibility from FeasibilityLayer). |
| **confidence_weights** | Per-phase weights used to compute `overall` (null for phases without weighting). |
| **counts** | Claim buckets (`fact`, `strategic_hypothesis`, `opinion`, `assumption`, `total_claims`) and `statuses` (`confirmed_brief`, `unverified`, `likely_hallucination`, `risky_promise`). |
| **errors** | `fixable`, `structural`, `data_gaps` (string codes; enums extended over time in the schema file). |
| **assumptions** | `id`, `statement`, `source`, `risk`, `related_claim_ids`. |
| **trace** | `claim_sources[]` with `claim_id`, `agent` (phase number), `section`, `truth_source`. **`causal_chain[]`** — cross-phase edges from optional `issues[].premise_refs` when `FEATURE_CAUSAL_DAG=true` (see `docs/adrs/ADR-CAUSAL-DAG.md`, table `audit_claim_graph`). |
| **feasibility** | Embedded `score`, `risk_codes`, `notes` from FeasibilityLayer. |
| **cost_control** | Nullable until auto-loop: estimated USD, rerun total, `rerun_count`, `cost_guardrail_triggered`. |
| **agent_performance** | Nullable per-run rates and composite `agent_score`; rolling aggregates persist to **`agent_performance_aggregate`** (migration `052_agent_performance_aggregate.sql`). |
| **decision_hint** | `accept` \| `accept_with_warnings` \| `refine` — set by Decision Layer in the orchestrator. |
| **human_attention_required** | `required`, `reasons` (machine codes), `requirements_met` (safe-mode evaluation). |

PRD vs code deltas (event types, thresholds, claim model): [GAP-ANALYSIS-PHASE0](./adrs/GAP-ANALYSIS-PHASE0.md) (section *PRD vs implementation*).

### Step 4c: Evaluation dataset (Phase 2, optional row)

For domain phases, after governance events, the server may insert one sanitised row into **`evaluation_datasets`** (DDL: `server/migrations/051_evaluation_datasets_and_execution_mode.sql`). Disable with env `EVALUATION_DATASETS_INSERT=false` if the table is not migrated. See [ADR-TRUTH-REGISTRY-ASSUMPTIONS](./adrs/ADR-TRUTH-REGISTRY-ASSUMPTIONS.md) §4.

### Step 5: Save + Emit
- Writes result to `audit_domains` (or `audit_recon` / `audit_strategy`)
- Updates `audits.status` and `audits.tokens_used`
- Emits events to `pipeline_events` which Supabase Realtime pushes to the frontend

---

## Review Gates

Review gates pause the pipeline and let the consultant enrich the context before the next block of phases.

| Gate | After Phase | Before / notes |
|---|---|---|
| Gate 1 | Phase 0 (Recon) | Auto wing (phases 1–4) |
| Gate 2 | Phase 4 (last of auto wing) | Analytic wing (phases 5–6) then Strategy (phase 7) |
| Gate 3 | Phase 7 (Strategy) | Report / delivery (no further automated phases) |

With default plans, review phases are `[0, 4, 7]` for `full` and `[0, 4]` for `express`. Effective gates always come from `reviewPhasesForExecutionPlan(...)` for the specific audit row. `free_snapshot` uses no review gates.

Approve with `POST /api/audits/:id/reviews/:phase` where `phase` matches the completed block (`0`, `4`, or `7`). See [API.md](./API.md).

When a gate is reached:
1. Backend emits `review_needed` event to `pipeline_events`
2. Frontend `PipelineMonitor` shows the `ReviewPointModal`
3. Consultant optionally adds:
 - **Consultant notes** — observations not visible on the website (e.g. "recently migrated to Shopify")
 - **Interview notes** — client's answers to generated questions
4. Approval → `POST /api/audits/:id/reviews/:phase` → notes stored in `review_points` table
5. Backend includes notes in context for all subsequent phases
6. Pipeline resumes with next phase

---

## Retry & Recovery

- **Phase-level retry**: A failed phase can be re-run without re-running previous phases
- Cached `collected_data` is reused on retry — only the Claude call is repeated
- **Exponential retry with jitter**: up to 3 retries on Claude API errors (429, 500, timeout), based on `SYSTEM_DEFAULTS.claudeHttp` (`retryBaseMs=1500`, doubling per attempt, plus jitter).
- If all retries fail, phase status → `failed`, audit status → `failed`, error logged in `pipeline_events`
- Frontend shows "Retry Phase" button for failed phases

---

## Token Tracking

Every Claude call logs token usage via `TokenTracker`:

```typescript
// Written to pipeline_events (event_type: 'token_usage')
{
 input_tokens: 4200,
 output_tokens: 850,
 model: 'claude-sonnet-4-20250514',
 cost_usd: 0.018
}
```

- `audits.tokens_used` is updated after each phase
- Before each phase: `if (tokens_used + estimated_phase_tokens > token_budget) → abort`
- Default budget: **200,000 tokens** per audit (~$3 at current rates)
- Budget is configurable per audit via `audits.token_budget`
- Frontend shows running token total in PipelineMonitor

---

## Orchestrator (`services/pipeline.ts`)

The orchestrator manages the full lifecycle:

```typescript
class PipelineOrchestrator {
 async startPhase(auditId: string, phase: number): Promise<void>
 async runBlock(auditId: string, phases: readonly number[]): Promise<void>
 async runFreeSnapshot(auditId: string): Promise<void>
}
```

Phase sequencing logic (effective plan):
1. Determine next phase from `audit_domains` statuses
2. Check for pending review gate — if yes, emit `review_needed` and stop
3. Check token budget
4. Instantiate correct agent for the phase
5. Run agent (collect → assemble → call → verify)
6. Update `audits.status` based on completed phases
7. If all phases complete → compute weighted overall score → set `audits.status = 'completed'`

Reliability controls:

- Pipeline start/next/retry use compare-and-set claim semantics to avoid duplicate execution from concurrent requests.
- Every pipeline event includes trace correlation fields (`trace_id`, `operation_id`) when available.
- Retry policy for Claude calls is bounded (`MAX_RETRIES=3`) with exponential backoff and jitter for transient provider failures.
- Critical endpoint writes use idempotency keys to guarantee safe client retries.

---

## Weighted Overall Score

Computed after Phase 7 completes:

```typescript
overallScore = domainScores.reduce((sum, { key, score }) => {
 return sum + score * industryWeights[industry][key];
}, 0) / totalWeight;
```

See [AGENTS.md#industry-weights](./AGENTS.md#industry-weights) for weight tables.

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `server/src/services/execution-plan.ts`
- `server/src/schemas/control-object.ts`
- `server/src/config/feature-flags.ts`
- `server/src/config/rule-engine.ts`
- `server/src/services/dynamic-adjustment.ts`

## Orchestrator Status Matrix

Current implementation baseline for GLC Orchestrator runtime:

- `FULL` manifest-first contract (`selected_domains` must match `execution_plan`) and snapshot persistence.
- `FULL` deterministic pack build (graph, lanes, critical path, structural conflict handling) with optional synthesis behind feature flags.
- `FULL` pack versioning and revision diff APIs.
- `PARTIAL` timeline-first migration (legacy initiative buckets still available as fallback/deep-dive paths).
- `PARTIAL` business-scenario test depth (scenario/regeneration coverage is improved but still integration-focused, not full browser E2E).

## Domain vs Plan Gate Matrix

To avoid mixing responsibilities, quality routing is split into two explicit gates:

| Layer | Input object | Outcomes | Scope |
|---|---|---|---|
| Domain quality gate | CONTROL_OBJECT (`FactChecker` + `DecisionLayer`) | `accept` / `accept_with_warnings` / `refine` | Per-domain phase output quality |
| Plan governance gate | Orchestration plan governance (`evaluateOrchestrationPlanGovernance`) | `accept_plan` / `accept_with_warnings` / `refine_plan` + `plan_gate_outcome` (`accept` / `accept_with_warnings` / `refine`) | Cross-domain roadmap graph quality |

Bridge rule:

- Orchestrator input quality is explicit in `pack.input_quality` (`input_gate_status`, coverage ratios, fallback reason).
- Domain phases can still persist advisory refine states, but orchestration governance evaluates plan-level integrity independently.
- Degraded input is never silent: it emits reason codes and telemetry (`input_gate_degraded`, `director_input_coverage_below_floor`).

## Orchestration program (timeline-first)

- **SSOT contract literals:** timeline status + manifest state unions live in `server/src/config/orchestration-client-contract.ts`; the SPA mirrors them with `src/app/config/orchestration-contract-parity.test.ts`.
- **Legacy HTTP:** `/api/audits/:id/orchestrator/*` aliases delegate to canonical `/orchestration/*` / manifest routes (deprecation headers via `orchestrator-legacy-alias.ts`).
- **Normalization:** merged director/strategy nodes pass through `applyOrchestrationActionNodeNormalizationPipeline` before graph build; cross-domain tension rules are declared in `orchestration-domain-conflict-policy.ts`.
- **KPI logs:** timeline responses may emit `route.audit_timeline_served` when `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` is enabled (defaults in `system-defaults/feature-flags-defaults.ts`); metric keys in `orchestration-telemetry-policy.ts`.
- **UX:** consultants open manifest flow from Timeline via `?focus=roadmap` on Strategy Lab (`ORCHESTRATION_LAB_FOCUS_*` in `orchestration-ui-limits.ts`).
- **Happy path (consultant):** ensure `audit_roadmap_manifest_snapshots` has a **latest** row aligned with `execution_plan.selected_domains` → `POST /api/audits/:id/orchestration/pack` with that snapshot id → Strategy Lab / `GET` pack / timeline read model update. Optional: `FEATURE_ORCHESTRATION_PACK_AUTO_AFTER_STRATEGY` runs the same persist path after phase 7 when a latest snapshot exists (failures are logged; pipeline completion is not blocked).
- **Shared persist path:** `orchestration-pack-persist-run.service.ts` centralizes governance + `persistGlcOrchestrationPack` for POST pack, commercial-offer rebuild, and the optional auto-pack hook.
