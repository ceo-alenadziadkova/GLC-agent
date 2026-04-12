# ADR: Decision Layer as Confidence-Based Phase Gate

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Scope** | `server/src/services/decision-layer.ts`, `server/src/services/pipeline.ts` |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Tech Lead + Backend (AI Pipeline) |

### ADR lifecycle

This document is immutable. Changing the decision requires a new ADR that supersedes this one.

---

## Context

Prior to this decision, the pipeline had two quality signals per domain phase:

1. `FactChecker.verify()` — per-phase, returned corrections and a 0–1 confidence score
2. `ConsistencyChecker.run()` — post-wing, quality flags for consultant review gates

Neither produced a **deterministic routing decision** (accept / refine / restart). Consultants could see quality flags at review gates, but:

- The pipeline always proceeded regardless of fact-checker confidence.
- There was no machine-readable signal to distinguish "fine to proceed" from "needs review".
- Future auto-loop (dynamic rerun of weak agents) had no decision contract to hook into.

We need a dedicated **Decision Layer** that:
- Reads CONTROL_OBJECT v1 (not text).
- Applies deterministic threshold rules to produce `DecisionHint`.
- Is completely separate from the Fact-Checker (separation of concerns: validate vs. route).
- Can be extended to support auto-loop without changing the upstream contract.

---

## Decision

We introduce `DecisionLayer` as a standalone service (`server/src/services/decision-layer.ts`) that maps CONTROL_OBJECT v1 → `DecisionResult { hint, reasoning, active_error_types }`.

### Three-State Decision

| Hint | Meaning | Phase 1 action |
|------|---------|----------------|
| `accept` | High confidence, low hallucination rate | Continue pipeline normally |
| `accept_with_warnings` | Medium confidence, only fixable errors | Continue + surface warnings to consultant |
| `refine` | Low confidence or structural errors | Emit `refine_recommended` event; escalate to human in Phase 1 |

### Thresholds (v1)

```
ACCEPT:
  overall_confidence  ≥ 85
  hallucination_fraction (likely_hallucination + risky_promise) / fact_count  ≤ 5%

ACCEPT_WITH_WARNINGS:
  overall_confidence  ≥ 70
  structural_errors.length  = 0
  likely_hallucination_count  ≤ 3

REFINE:
  everything else
```

Thresholds are defined in `DECISION_LAYER_THRESHOLDS` config object for future A/B testing without code changes.

### Phase 1 Behaviour: Advisory Only

In Phase 1, `decision_hint = 'refine'` does **not** block pipeline execution or trigger automatic rerun.

It emits a `pipeline_event` with `event_type = 'refine_recommended'` including:
- `decision_hint`
- `reasoning` (human-readable)
- `active_error_types` (for future Rule Engine use in Phase 5)
- `control_object` (full CONTROL_OBJECT v1 after `decision_hint` is set, for consultant UI)

The consultant UI can surface this to the reviewer before approving a gate. Auto-loop is activated in **Phase 5** via `AUTO_LOOP_ENABLED` feature flag (default: `false`).

### Failure Safety

Decision Layer errors are non-fatal. Any exception inside `DecisionLayer.decide()` is caught in both `startPhase()` and `startPhaseIsolated()` with a `logger.warn` and pipeline execution continues normally. This guarantees that a Decision Layer bug never breaks a client audit.

---

## Data Flow

```
agent.run()
  └── lastControlObject: ControlObjectV1

PipelineOrchestrator
  ├── result = agent.run()
  ├── co = agent.lastControlObject           (null if recon/strategy)
  ├── if co !== null:
  │     decision = decisionLayer.decide(co)
  │     if decision.hint === 'refine':
  │       emitEvent('refine_recommended', ...)
  └── agent.saveDomainResult(result)         (always proceeds)
```

---

## Confidence Calculation (v1)

Three dimensions feed into `confidence.overall`:

| Dimension | Source | Formula |
|-----------|--------|---------|
| `factual` | `FactChecker.calculateConfidence()` | Existing penalty model (×100) |
| `strategic` | Risky promise + unverified ratio | `100 - (risky_ratio×30) - (unverified_ratio×20)` |
| `consistency` | Structural errors + hallucination count | `100 - (structural_errors×15) - (hallucinations×20)` |
| `overall` | Simple average | `(factual + strategic + consistency) / 3` |

Phase 3 replaces the simple average with **per-phase weighted formula** (`CONFIDENCE_WEIGHTS_BY_PHASE`). For example, `automation_processes` weights `feasibility` highest; `security_compliance` weights `factual` highest.

---

## Versioning

Decision Layer logic is versioned via `CONTROL_OBJECT_VERSIONS.decision_layer_version` (currently `v1.0`).

When thresholds or routing logic change, bump `decision_layer_version` so CONTROL_OBJECT consumers can detect the change and results can be compared across releases.

---

## Consequences

**Positive**:
- Clean separation: `FactChecker` validates; `DecisionLayer` routes.
- Non-breaking: pipeline always completes; `refine_recommended` is advisory.
- Extensible: Phase 5 auto-loop plugs in by checking `decision_hint` and acting on it.
- Observable: every decision is logged via `logger.info/warn` with full context.

**Negative / Risks**:
- Phase 1 `refine` hint has no auto-remediation. Consultants must act manually.
- Confidence thresholds (85 / 70) are heuristic; may need tuning after real-world data accumulates.

**Mitigations**:
- `DECISION_LAYER_THRESHOLDS` config makes tuning a config change, not code change.
- Phase 2 evaluation_datasets will provide empirical data to validate/adjust thresholds.
- Phase 5 auto-loop feature-flagged (`AUTO_LOOP_ENABLED=false` by default, `allowed_modes: ['sandbox', 'internal']`).

---

## Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| Extend ConsistencyChecker with routing logic | Consistency checker runs post-wing; Decision Layer needed per-phase and earlier. |
| Merge Decision Layer into FactChecker | Violates single responsibility; FactChecker is already complex enough. |
| Text-based decision (parse fact_check event messages) | Fragile; breaks on copy changes. Machine-readable CONTROL_OBJECT is the correct interface. |
| Block pipeline on `refine` (v1) | Too disruptive without auto-remediation; would break client audits until Phase 5 is ready. |

---

## Implementation

**Phase 1 — delivered**:
- `server/src/services/decision-layer.ts` — `DecisionLayer` class with `DECISION_LAYER_THRESHOLDS`
- `server/src/services/pipeline.ts` — wired into both `startPhase()` and `startPhaseIsolated()`
- `server/src/config/pipeline-orchestrator-copy.v1.json` — `refineRecommendedMessage` added

**Phase 3** — extend with `feasibility` dimension and per-phase weighted confidence formula.

**Phase 5** — activate auto-loop via `AUTO_LOOP_ENABLED` feature flag and Rule Engine.
