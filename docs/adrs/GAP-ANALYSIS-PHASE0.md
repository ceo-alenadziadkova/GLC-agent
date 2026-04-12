# Phase 0 Gap Analysis — FACT-CHECKER & DECISION LAYER (as-of snapshot)

| Field | Value |
|---|---|
| **Date** | 2026-04-12 (updated) |
| **Scope** | Reconciliation of roadmap Phases 0–3 with the **current** codebase |
| **Purpose** | Sprint planning: what is implemented, what remains, where the spec diverges |

This document **supersedes** the pre-implementation narrative in the earlier revision of the same file. For architecture decisions, see the ADRs linked below.

---

## Implementation status (roadmap phases 1–3)

| Roadmap | Status | Primary code / docs |
|---------|--------|---------------------|
| Phase 1 — CONTROL_OBJECT + Decision Layer | **Done** | [`server/src/schemas/control-object.ts`](../../server/src/schemas/control-object.ts), [`server/src/services/decision-layer.ts`](../../server/src/services/decision-layer.ts), [`server/src/services/fact-checker.ts`](../../server/src/services/fact-checker.ts) (`buildControlObject`), [`server/src/services/pipeline.ts`](../../server/src/services/pipeline.ts), [`ADR-CONTROL-OBJECT-V1.md`](./ADR-CONTROL-OBJECT-V1.md), [`ADR-DECISION-LAYER-GATES.md`](./ADR-DECISION-LAYER-GATES.md) |
| Phase 2 — Truth Registry, assumptions v1.5, evaluation storage | **Mostly done** | [`server/src/config/truth-registry.ts`](../../server/src/config/truth-registry.ts); assumptions + trace in `FactChecker.buildControlObject`; `evaluation_datasets` table + insert path: migration `051_evaluation_datasets_and_execution_mode.sql`, [`server/src/services/evaluation-dataset-writer.ts`](../../server/src/services/evaluation-dataset-writer.ts) |
| Phase 3 — Feasibility + weighted confidence | **Done** | [`server/src/services/feasibility-layer.ts`](../../server/src/services/feasibility-layer.ts), [`server/src/config/phase-confidence-weights.ts`](../../server/src/config/phase-confidence-weights.ts), Decision Layer feasibility guardrail in [`server/src/services/decision-layer.ts`](../../server/src/services/decision-layer.ts), [`ADR-FEASIBILITY-RULE-ENGINE.md`](./ADR-FEASIBILITY-RULE-ENGINE.md) |

---

## What exists today (concise)

### FactChecker

- **Domain-specific `verify()`** still targets Security, SEO, Tech, UX; Marketing and Automation rely on general checks only.
- **`buildControlObject()`** (same module as `verify`, not a separate `fact-checker-v1.ts`) produces CONTROL_OBJECT **v1.7** shape: counts, errors, assumptions (risk + `related_claim_ids`), trace with `truth_source`, feasibility, weighted `confidence.overall`, `confidence_weights`.
- **Claim model** is structural, not NLP: each `AuditIssue` ≈ one FACT claim; recommendations ≈ strategic hypotheses; strengths/weaknesses ≈ opinion counts.

### Decision Layer + pipeline

- After each domain phase, orchestrator runs `decisionLayer.decide(controlObject)`, sets `decision_hint`, emits `pipeline_events` with `event_type = 'control_object'` (full JSON under `data.control_object`).
- If `refine`: also emits `refine_recommended` with reasoning and nested `control_object`. **Does not** block the pipeline (advisory MVP).
- **Post-wing** quality remains **`quality_gate`** from `ConsistencyChecker` — separate from CONTROL_OBJECT (do not merge event types).

### Truth Registry

- Single module: `TRUTH_REGISTRY`, `PHASE_PROFILES`, `mapDataSourceToTruthSource`, `getPhaseProfile` (no separate `phase-profiles.ts` file).

### Execution mode (Phase 4 prep)

- Column `audits.execution_mode` (`'normal' | 'safe'`, default `'normal'`). `BaseAgent` loads it when building CONTROL_OBJECT so `context.execution_mode` reflects the audit row.

### Evaluation datasets

- Rows inserted after governance publish when `EVALUATION_DATASETS_INSERT` is not `false` (see `SYSTEM_DEFAULTS.evaluationDatasets` in [`server/src/config/system-defaults.ts`](../../server/src/config/system-defaults.ts)).
- Payloads are **sanitised** (URL / sensitive-key redaction) before insert; `pii_sanitized` set accordingly.

---

## Spec / doc deltas to remember

1. **Early Phase 1 spec** suggested storing CONTROL_OBJECT under `quality_gate`; **implemented** dedicated `control_object` (+ `refine_recommended`) events — see [`docs/PIPELINE.md`](../PIPELINE.md).
2. **Phase 3 pseudocode** used accept thresholds **80 / 65** on weighted overall; **implemented** thresholds remain **85 / 70** while `confidence.overall` is already phase-weighted (documented in ADR + PIPELINE).
3. **Phase 4+** (safety-mode config, rule engine, auto-loop) is **not** in scope of this gap file — track separately.

---

## Remaining / stretch work (not closed by Phases 1–3)

- **Phase 4**: `safety-mode.ts`, rule-engine mapping, stricter guardrails when `execution_mode = 'safe'`.
- **Phase 5**: auto-loop, dynamic prompt patches, `agent_performance_aggregate`, cost guardrails.
- **Product UI**: optional expansion of consultant views to show full trace / assumptions (today: summary + refine reasoning on Pipeline Monitor / review modal).
- **Jobs**: scheduled deletion of expired `evaluation_datasets` rows (TTL column exists; job can be ops/cron).

---

## Effort pointers (for future sprints)

| Item | Notes |
|------|--------|
| Phase 4 safety | Config + hook after `buildControlObject` / before Decision Layer |
| Phase 5 auto-loop | Feature flag + targeted rerun; reuse `active_error_types` |
| Evaluation TTL job | `DELETE FROM evaluation_datasets WHERE expires_at < now()` |

---

## Related ADRs

- [ADR-CONTROL-OBJECT-V1](./ADR-CONTROL-OBJECT-V1.md)
- [ADR-DECISION-LAYER-GATES](./ADR-DECISION-LAYER-GATES.md)
- [ADR-TRUTH-REGISTRY-ASSUMPTIONS](./ADR-TRUTH-REGISTRY-ASSUMPTIONS.md)
- [ADR-FEASIBILITY-RULE-ENGINE](./ADR-FEASIBILITY-RULE-ENGINE.md)
