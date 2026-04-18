# ADR-AUTO-LOOP-RULE-ENGINE
## Auto-Loop Rerun, Dynamic Adjustment Service, Agent Performance & CONTROL_OBJECT v2.0

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Phase** | Phase 5 |
| **Authors** | Engineering |
| **Implements** | Sprint Implementation Plan — Phase 5 |
| **Supersedes** | N/A (extends all prior Phase ADRs) |

---

## Context

Phases 1–4 delivered the full governance stack: CONTROL_OBJECT v1.8 with confidence, feasibility, assumptions, safe-mode guardrails, and a Rule Engine config. However, `decision_hint='refine'` was advisory only — it emitted an event and escalated to a human consultant. Two gaps remained:

1. **No automated recovery path.** A `refine` on a well-understood error (e.g. `risky_promise_language`) could be auto-corrected by appending a targeted instruction to the agent's prompt and rerunning. Manual escalation was a blunt instrument.

2. **No performance feedback loop.** CONTROL_OBJECT captured per-run quality signals but they were not aggregated across runs. Without aggregate scores, there was no way to identify systematically poor-performing agents or correlate governance decisions with human QA ratings.

Phase 5 introduces:
- **DynamicAdjustmentService** — translates CO error types into agent-specific instruction patches via Rule Engine.
- **Auto-loop** — targeted single-agent rerun with MAX_ITERATIONS=2 and a cost guardrail, behind `AUTO_LOOP_ENABLED` feature flag.
- **AgentPerformanceService** — per-run score computation + async aggregate upsert.
- **CONTROL_OBJECT v2.0** — adds `cost_control` and `agent_performance` (feature-complete spec).

---

## Decision

### 1. DynamicAdjustmentService

**File**: `server/src/services/dynamic-adjustment.ts`

Maps `CONTROL_OBJECT.errors.fixable + structural` → per-agent instruction patches via `RULE_ENGINE_MAPPING`.

**Design**:
- Deterministic: same errors always produce same patches
- Additive: patches are appended to base instructions, never replacing them
- Priority-sorted: safety-critical instructions (priority 8–10) appear before style fixes (priority 5–7)
- Conservative: `data_gaps` errors are excluded — informational only, no instruction change helps a missing data source

Returns `AdjustmentMap<agentNumber, string>` consumed by the auto-loop in pipeline.ts.

**Unmatched errors** are logged but do not block execution. This is expected for domain-specific error codes added in Phase 4+ that don't yet have Rule Engine entries.

---

### 2. Auto-Loop — Targeted Rerun

**File**: `server/src/services/pipeline.ts` — `attemptAutoLoop()` method

**Guard conditions** (all must pass before rerun):
1. `SYSTEM_DEFAULTS.autoLoop.enabled = true` (`AUTO_LOOP_ENABLED=true` env var)
2. `NODE_ENV` is in `autoLoop.allowedModes` (default: `sandbox,internal`)
3. DynamicAdjustmentService produces ≥ 1 instruction patch
4. Phase is a domain phase (not recon/strategy)

**Iteration protocol**:
```
for iteration in 1..MAX_ITERATIONS:
  cost_check: if (projected_cost > guardrail AND gain_so_far < min_gain) → break
  rerun agent with instruction patches
  run DecisionLayer on new output
  record evaluation_dataset for rerun
  emit control_object event
  if new_decision != 'refine' → saveDomainResult, emit log, return true (accepted)
  if confidence_gain < MIN_CONFIDENCE_GAIN → break (insufficient improvement)

emit refine_recommended (auto-loop exhausted, manual review needed)
return true (we handled the refine path)
```

**Why two-iteration limit**: Diminishing returns. If a corrective instruction didn't resolve the issue in two passes, the problem is likely structural (data gap, model limitation) — not solvable by prompt adjustment alone. Unlimited reruns would inflate cost and latency without meaningful quality gain.

**Why single-agent rerun**: Error types in CONTROL_OBJECT are attributed to specific agent numbers via the Rule Engine `applies_to_agents` field. Rerunning the entire pipeline for a single agent's error wastes tokens and risks introducing new errors in phases that were already accepted.

**Cost guardrail logic**: `projected_total_usd > costGuardrailThresholdUsd AND confidence_gain < minConfidenceGain` → skip. This is an AND condition, not OR — we allow expensive reruns if they're actually improving the output significantly.

**Instruction injection**: Patches are set on `agent.autoLoopAdjustments` (a duck-typed property). In Phase 5, `BaseAgent.buildInstructions()` should check for this property and append patches to the system prompt. This is left as a follow-up — in the first Phase 5 launch, `autoLoopAdjustments` will be set but agents that don't check for it will run unchanged (safe fallback: rerun without patches = minimal cost, no harm).

---

### 3. Agent Performance

**File**: `server/src/services/agent-performance.ts`

**Score formula**:
```
agent_score = max(0, 1 − (
  0.40 × hallucination_rate +
  0.25 × inconsistency_rate +
  0.20 × risky_promise_rate +
  0.15 × unverified_rate
))
```

Rates are fractions of `total_facts` per CONTROL_OBJECT run. Inconsistency rate uses `structural_errors.length / total_claims`.

**Persistence**: `recordAgentPerformance()` upserts into `agent_performance_aggregate` using incremental rolling average — `new_avg = (old_avg × count + new_value) / (count + 1)`. No full-table scan; O(1) update.

**Reliability threshold**: `score_reliable = false` for single-run snapshots embedded in CONTROL_OBJECT. Only the aggregate table, after ≥ MIN_EVALUATION_COUNT (10) runs, provides a reliable signal. The `score_reliable` field in `co.agent_performance` is always `false` at write time — it becomes meaningful only when compared against the aggregate.

**Not real-time**: Performance recording is a fire-and-forget async call (`void recordPerformanceAsync()`). Latency-sensitive pipeline flow is never blocked by aggregate upsert failures.

---

### 4. CONTROL_OBJECT v2.0 — Final Schema

**File**: `server/src/schemas/control-object.ts`

Two new top-level fields:

| Field | Type | Description |
|---|---|---|
| `cost_control` | `ControlObjectCostControl \| null` | Token cost tracking + guardrail state |
| `agent_performance` | `ControlObjectAgentPerformance \| null` | Per-run performance snapshot |

**`cost_control`** is populated by the pipeline during auto-loop (not by FactChecker). Null for primary runs; populated on rerun iterations.

**`agent_performance`** is populated by FactChecker at the end of `buildControlObject()` via `computePerformanceMetrics()`. Single-run snapshot — not aggregated.

**Backward compatibility**: Both fields default to `null`. No existing consumers break.

---

### 5. Feature Flag Design

`AUTO_LOOP_ENABLED=false` is the default in all environments. Auto-loop is enabled per environment:

```
AUTO_LOOP_ENABLED=true
GLC_DEPLOYMENT_PROFILE=sandbox            # must match a token in AUTO_LOOP_ALLOWED_MODES (not NODE_ENV)
AUTO_LOOP_ALLOWED_MODES=sandbox,internal   # never production until 2+ weeks monitoring
```

**Why ENV not DB flag**: Auto-loop affects API cost and latency at the infrastructure level — it's an ops concern, not a per-audit consultant preference. ENV vars align with the layer-boundary policy (ops overrides in ENV, product defaults in config).

**Rollout sequence**:
1. Deploy Phase 5 with `AUTO_LOOP_ENABLED=false` (default) — observe performance recording
2. Enable on `sandbox` after 1 week of monitoring evaluation_datasets
3. Enable on `internal` after 2 weeks — run against real but non-client audits
4. Enable on `production` only after manual QA confirms confidence gains are real

---

## CONTROL_OBJECT Changes: v1.8 → v2.0

| Field | v1.8 | v2.0 |
|---|---|---|
| `cost_control` | — | `{ estimated_cost_usd, total_rerun_cost_usd, rerun_count, cost_guardrail_triggered } \| null` |
| `agent_performance` | — | `{ agent_number, hallucination_rate, risky_promise_rate, unverified_rate, inconsistency_rate, agent_score, score_reliable } \| null` |
| `versions.system_version` | `'v1.8'` | `'v2.0'` |

v2.0 is **feature-complete** per the original spec. All planned fields are present.

---

## Breaking Changes Warning

> **CONTROL_OBJECT v1–2 has been advisory-only throughout.** Downstream services (dashboard, reporting, feedback tools) should NOT have taken dependencies on the internal structure of `pipeline_events.data` where `event_type = 'control_object'`.
>
> **From v3.0 (Phase 6+)**, CONTROL_OBJECT transitions to a **formal contract**. Any service that reads CONTROL_OBJECT fields must register as a downstream consumer and be included in breaking-change reviews.
>
> Before v3.0: annotate any downstream code that reads CONTROL_OBJECT with `// CO-CONSUMER: update when CO schema changes`.

---

## Consequences

**Positive**:
- `refine` decisions for known, patchable errors now have an automated recovery path — consultants are only escalated when the auto-loop truly cannot resolve the issue.
- Agent performance aggregate enables future: trend monitoring, A/B testing instruction variants, identifying systematically poor-performing agents.
- CONTROL_OBJECT v2.0 is feature-complete — no further schema additions planned until Phase 6+ introduces domain-specific extensions.
- `evaluation_datasets` now contains full rerun history (run_number > 1 rows), enabling Phase 6 learning.

**Negative / Risks**:
- `autoLoopAdjustments` duck-type injection is fragile. If `BaseAgent.buildInstructions()` doesn't check for it, patches are silently dropped. This is acceptable for Phase 5 launch (safe fallback) but must be formalized in a follow-up.
- Incremental rolling average in `agent_performance_aggregate` can drift if evaluation rows are deleted (e.g. by retention expiry). A full recompute job should be added in Phase 6.
- Cost estimate (`0.02 USD per rerun`) is hardcoded. Actual cost varies by model, token count, and pricing. Phase 6 should replace this with a real token-count-based estimate from the Anthropic response.
- Auto-loop doubles the max latency for a refine phase (2 iterations × single phase time). Acceptable for async pipeline; may need timeout tightening in Phase 6.

---

## Deferred to Phase 6+

| Feature | Rationale |
|---|---|
| Formal `BaseAgent.buildInstructions()` patch injection | Needs agent-side work; safe fallback exists |
| Real token-count cost estimation | Requires Anthropic usage response parsing |
| Performance aggregate recompute job | Needed only if retention deletes distort averages |
| Online bandit / ML-driven agent variant selection | Requires ≥100 evaluation runs per agent |
| Cross-phase dependency analysis (causal_chain DAG) | Phase 6+ root-cause tracing |
| CONTROL_OBJECT v3.0 formal contract migration | Phase 6 — freeze schema for downstream consumers |

---

## References

- `server/src/services/dynamic-adjustment.ts` — DynamicAdjustmentService
- `server/src/services/agent-performance.ts` — computePerformanceMetrics, recordAgentPerformance
- `server/src/services/pipeline.ts` — attemptAutoLoop, recordPerformanceAsync
- `server/src/schemas/control-object.ts` — CONTROL_OBJECT v2.0
- `server/src/config/system-defaults.ts` — autoLoop config block
- `server/src/config/rule-engine.ts` — RULE_ENGINE_MAPPING (activated in Phase 5)
- `server/src/services/evaluation-dataset-writer.ts` — rerun row recording
- `server/src/services/decision-layer.ts` — re-evaluated on each rerun output
- `docs/adrs/ADR-SAFETY-MODE-EXECUTION.md` — Phase 4 (Rule Engine inert phase)
- `docs/adrs/ADR-FEASIBILITY-RULE-ENGINE.md` — Phase 3 (confidence weights, feasibility)
