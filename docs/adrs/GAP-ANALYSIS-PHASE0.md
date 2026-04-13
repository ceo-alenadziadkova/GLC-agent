# Phase 0 Gap Analysis — FACT-CHECKER & DECISION LAYER (as-of snapshot)

| Field | Value |
|---|---|
| **Date** | 2026-04-13 (updated) |
| **Scope** | Reconciliation of roadmap Phases 0–5 plus Sprint 0–2 closure items with the **current** codebase |
| **Purpose** | Sprint planning: what is implemented, what remains, where the spec diverges |

This document **supersedes** the pre-implementation narrative in older revisions. For architecture decisions, see the ADRs linked below.

---

## Implementation status (roadmap phases 1–5)

| Roadmap | Status | Primary code / docs |
|---------|--------|---------------------|
| Phase 1 — CONTROL_OBJECT + Decision Layer | **Done** | [`server/src/schemas/control-object.ts`](../../server/src/schemas/control-object.ts), [`server/src/services/decision-layer.ts`](../../server/src/services/decision-layer.ts), [`server/src/services/fact-checker.ts`](../../server/src/services/fact-checker.ts) (`buildControlObject`), [`server/src/services/pipeline.ts`](../../server/src/services/pipeline.ts), [`ADR-CONTROL-OBJECT-V1.md`](./ADR-CONTROL-OBJECT-V1.md), [`ADR-DECISION-LAYER-GATES.md`](./ADR-DECISION-LAYER-GATES.md) |
| Phase 2 — Truth Registry, assumptions v1.5, evaluation storage | **Done** | [`server/src/config/truth-registry.ts`](../../server/src/config/truth-registry.ts); assumptions + trace in `FactChecker.buildControlObject`; [`server/migrations/051_evaluation_datasets_and_execution_mode.sql`](../../server/migrations/051_evaluation_datasets_and_execution_mode.sql), [`server/src/services/evaluation-dataset-writer.ts`](../../server/src/services/evaluation-dataset-writer.ts) |
| Phase 3 — Feasibility + weighted confidence | **Done** | [`server/src/services/feasibility-layer.ts`](../../server/src/services/feasibility-layer.ts), [`server/src/config/phase-confidence-weights.ts`](../../server/src/config/phase-confidence-weights.ts), Decision Layer feasibility guardrail in [`server/src/services/decision-layer.ts`](../../server/src/services/decision-layer.ts), [`ADR-FEASIBILITY-RULE-ENGINE.md`](./ADR-FEASIBILITY-RULE-ENGINE.md) |
| Phase 4 — Safety mode, rule-engine config | **Done** | [`server/src/config/safety-mode.ts`](../../server/src/config/safety-mode.ts) (`applyExecutionMode` from `buildControlObject`), [`server/src/config/rule-engine.ts`](../../server/src/config/rule-engine.ts), `audits.execution_mode`, [`server/src/lib/audit-execution-mode.ts`](../../server/src/lib/audit-execution-mode.ts), [`ADR-SAFETY-MODE-EXECUTION.md`](./ADR-SAFETY-MODE-EXECUTION.md) |
| Phase 5 — Auto-loop, dynamic adjustments, agent performance | **Done (code)** | [`server/src/services/dynamic-adjustment.ts`](../../server/src/services/dynamic-adjustment.ts), [`SYSTEM_DEFAULTS.autoLoop`](../../server/src/config/system-defaults.ts), `attemptAutoLoop` in [`server/src/services/pipeline.ts`](../../server/src/services/pipeline.ts), [`server/src/services/agent-performance.ts`](../../server/src/services/agent-performance.ts), [`ADR-AUTO-LOOP-RULE-ENGINE.md`](./ADR-AUTO-LOOP-RULE-ENGINE.md) |

**Infra note:** `agent_performance_aggregate` DDL ships in migration [`052_agent_performance_aggregate.sql`](../../server/migrations/052_agent_performance_aggregate.sql). Until that migration is applied, `recordAgentPerformance` logs `upsert_failed`.

---

## PRD vs implementation (single reference)

Use this when comparing an older product spec to the repo.

| Topic | Early PRD / checklist | Implemented behavior |
|-------|----------------------|----------------------|
| **Pipeline event for governance JSON** | Some drafts used `quality_gate` for CONTROL_OBJECT | Dedicated `control_object` plus `refine_recommended` when `decision_hint === 'refine'`. `quality_gate` remains **only** [`ConsistencyChecker`](../../server/src/services/consistency-checker.ts) (post-wing). |
| **Decision thresholds** | Pseudocode 80 / 65 on weighted overall | **`85` / `70`** on `confidence.overall` (already phase-weighted, includes feasibility dimension). See [`ADR-DECISION-LAYER-GATES`](./ADR-DECISION-LAYER-GATES.md). |
| **`trace.causal_chain`** | Planned for cross-phase root cause | **Implemented** when `FEATURE_CAUSAL_DAG=true`: `FactChecker` builds `causal_chain`, persists edges to `audit_claim_graph` (migration `054`), pipeline calls `invalidateDownstreamDependents` on structural errors. When the flag is off, `causal_chain` stays `[]`. Shallow linking remains `assumptions.related_claim_ids`. |
| **Claim extraction** | NLP-style “20+ high-risk claims” | **Structural model:** one `AuditIssue` ≈ one FACT claim; recommendations ≈ strategic hypotheses; strengths/weaknesses ≈ opinion counts. Counts scale with model output size, not a separate extractor. |
| **FactChecker module split** | `fact-checker-v1.ts` | Single [`fact-checker.ts`](../../server/src/services/fact-checker.ts): `verify()` + `buildControlObject()`. |
| **Phase 5 auto-loop** | “MVP: manual only” | **Implemented behind flag:** `AUTO_LOOP_ENABLED=true` and `AUTO_LOOP_ALLOWED_MODES` (see `SYSTEM_DEFAULTS.autoLoop`). Default off. |
| **Standalone FACT-CHECKER-V2 spec doc** | `docs/FACT-CHECKER-V2.md` | **Consolidated** into [`docs/PIPELINE.md`](../PIPELINE.md) and [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (flat `docs/` file quota). |

---

## What exists today (concise)

### FactChecker

- **Domain-specific `verify()`** still targets Security, SEO, Tech, UX; Marketing and Automation rely on general checks only.
- **`buildControlObject()`** produces **CONTROL_OBJECT v2.1+** (see `CONTROL_OBJECT_VERSIONS` in [`control-object.ts`](../../server/src/schemas/control-object.ts)): counts, errors, assumptions (risk + `related_claim_ids`), trace with `truth_source` and `causal_chain` (populated when `FEATURE_CAUSAL_DAG=true`, else `[]`), multi-modal `truth_sources[]` / connector tiers (see [`connector-runner.ts`](../../server/src/services/connector-runner.ts)), feasibility, weighted `confidence.overall`, `confidence_weights` from extended phase profile, safety mutators, `agent_performance`, nullable `cost_control` (filled during auto-loop reruns), `context.risk_profile`, `context.selected_variant_id` (when pipeline supplies them), nullable `evaluation_link` (set after `evaluation_datasets` insert in [`publishControlObjectGovernance`](../../server/src/services/pipeline.ts)), optional `context.benchmark_reference_id` when domain benchmarks are enabled (Sprint 6 / [`ADR-DOMAIN-BENCHMARKS`](./ADR-DOMAIN-BENCHMARKS.md)).
- **Claim model** is structural, not NLP (see table above).

### Decision Layer + pipeline

- After each domain phase, orchestrator runs `decisionLayer.decide(controlObject)`, sets `decision_hint`, emits `pipeline_events` with `event_type = 'control_object'`.
- If `refine`: may run **auto-loop** (feature-flagged); otherwise emits `refine_recommended` with reasoning and nested `control_object`. **Does not** block phase completion (advisory).
- **Post-wing** quality remains **`quality_gate`** from `ConsistencyChecker` — separate from CONTROL_OBJECT.

### Truth Registry + phase profiles

- Base profiles: [`truth-registry.ts`](../../server/src/config/truth-registry.ts) — `TRUTH_REGISTRY`, `PHASE_PROFILES`, `mapDataSourceToTruthSource`, `getPhaseProfile`.
- Extended profiles (adds `confidence_weights`): [`phase-profiles.ts`](../../server/src/config/phase-profiles.ts) — `getExtendedPhaseProfile`, `EXTENDED_PHASE_PROFILES`. Consumed from `FactChecker.buildControlObject()` for one assembled profile per domain phase.

### Bandits (Sprint 2 / Phase 6)

- [`bandit.ts`](../../server/src/services/bandit.ts): `BanditService`, ε-greedy, readiness gates, `FEATURE_BANDITS`. Arm stats persist to `bandit_arm_performance` (migration `053`). Pipeline sets `BaseAgent.selectedVariantId`, records arms after each domain phase when bandits are enabled and `agent_performance` exists, and emits `context.selected_variant_id` on CONTROL_OBJECT.

### Execution mode

- Column `audits.execution_mode` (`'normal' | 'safe'`). Consumed when building CONTROL_OBJECT; safe path applies [`applyExecutionMode`](../../server/src/config/safety-mode.ts).

### Evaluation datasets

- Rows inserted **before** `control_object` pipeline event (inside `publishControlObjectGovernance`) when `EVALUATION_DATASETS_INSERT` is not `false`. Successful insert sets `CONTROL_OBJECT.evaluation_link` (`evaluation_id`, `dataset_version`) on the object that is emitted. Payloads sanitised before insert/update; `pii_sanitized` set accordingly. Auto-loop reruns still call the writer separately for each rerun row.

### Agent performance aggregate

- Backend upserts rolling averages via [`recordAgentPerformance`](../../server/src/services/agent-performance.ts) after each `control_object` publish when metrics exist. Requires DB table from migration `052`.

### Multi-modal truth (Sprint 3 / Phase 7)

- Truth Registry tiers `external_api` and `document_feed` in [`truth-registry.ts`](../../server/src/config/truth-registry.ts); [`connector-runner.ts`](../../server/src/services/connector-runner.ts) + [`external-connectors.ts`](../../server/src/config/external-connectors.ts); FactChecker merges connector results into `trace.claim_sources[].truth_source` / `truth_sources[]`. See [`ADR-MULTIMODAL-TRUTH`](./ADR-MULTIMODAL-TRUTH.md).

### Causal DAG (Sprint 4 / Phase 8)

- Table `audit_claim_graph` (migration `054`), [`audit-claim-graph.ts`](../../server/src/services/audit-claim-graph.ts), `FEATURE_CAUSAL_DAG`, invalidation from [`pipeline.ts`](../../server/src/services/pipeline.ts). See [`ADR-CAUSAL-DAG`](./ADR-CAUSAL-DAG.md).

### Auto-remediation (Sprint 5 / Phase 9)

- [`remediation.ts`](../../server/src/services/remediation.ts), `audit_remediations` (migration `055`), `FEATURE_AUTO_REMEDIATION`, phase profile `auto_remediation_scope`. See [`ADR-AUTO-REMEDIATION`](./ADR-AUTO-REMEDIATION.md).

---

## Remaining / stretch work

- **Ops:** scheduled `DELETE FROM evaluation_datasets WHERE expires_at < now()` (TTL column exists; no first-party cron in this repo).
- **Product UI:** optional expansion to show full `trace` / `assumptions` in consultant surfaces (today: summaries + refine reasoning via `refine_recommended` / review modal props).
- **FactChecker:** domain-specific `verify()` rules for **marketing_utp** and **automation_processes** (still `default` branch).
- **Governance risk profile:** optional column `audits.governance_risk_profile` (migration `053`); when null, [`fetchAuditGovernanceRiskProfile`](../../server/src/lib/audit-governance-risk-profile.ts) falls back to `product_mode`. Populates `CONTROL_OBJECT.context.risk_profile`.

---

## Effort pointers (for future sprints)

| Item | Notes |
|------|--------|
| Evaluation TTL job | Cron or Supabase scheduled function: delete expired rows; optional cold archive |
| Marketing / Automation fact rules | Extend `switch (domainKey)` in `FactChecker.verify()` |
| Consultant dashboards | Read `control_object` / `evaluation_datasets` with existing RLS patterns |
| Domain benchmarks job | Nightly or `POST` recompute (secret or platform admin); table `domain_benchmark_snapshot` — see [`ADR-DOMAIN-BENCHMARKS`](./ADR-DOMAIN-BENCHMARKS.md) |

---

## Related ADRs

- [ADR-CONTROL-OBJECT-V1](./ADR-CONTROL-OBJECT-V1.md)
- [ADR-CONTROL-OBJECT-V2-FULL](./ADR-CONTROL-OBJECT-V2-FULL.md)
- [ADR-DECISION-LAYER-GATES](./ADR-DECISION-LAYER-GATES.md)
- [ADR-TRUTH-REGISTRY-ASSUMPTIONS](./ADR-TRUTH-REGISTRY-ASSUMPTIONS.md)
- [ADR-FACT-CHECKER-UNIFIED-KERNEL](./ADR-FACT-CHECKER-UNIFIED-KERNEL.md)
- [ADR-PHASE-PROFILES](./ADR-PHASE-PROFILES.md)
- [ADR-ML-BANDITS](./ADR-ML-BANDITS.md)
- [ADR-FEASIBILITY-RULE-ENGINE](./ADR-FEASIBILITY-RULE-ENGINE.md)
- [ADR-SAFETY-MODE-EXECUTION](./ADR-SAFETY-MODE-EXECUTION.md)
- [ADR-AUTO-LOOP-RULE-ENGINE](./ADR-AUTO-LOOP-RULE-ENGINE.md)
- [ADR-MULTIMODAL-TRUTH](./ADR-MULTIMODAL-TRUTH.md)
- [ADR-CAUSAL-DAG](./ADR-CAUSAL-DAG.md)
- [ADR-AUTO-REMEDIATION](./ADR-AUTO-REMEDIATION.md)
- [ADR-DOMAIN-BENCHMARKS](./ADR-DOMAIN-BENCHMARKS.md)
- [ADR-DOMAIN-FINAL-READINESS-SUMMARY](./ADR-DOMAIN-FINAL-READINESS-SUMMARY.md)
- [ADR-DOMAIN-TECH-INFRASTRUCTURE-FINAL-READY](./ADR-DOMAIN-TECH-INFRASTRUCTURE-FINAL-READY.md)
- [ADR-DOMAIN-SECURITY-COMPLIANCE-FINAL-READY](./ADR-DOMAIN-SECURITY-COMPLIANCE-FINAL-READY.md)
- [ADR-DOMAIN-SEO-DIGITAL-FINAL-READY](./ADR-DOMAIN-SEO-DIGITAL-FINAL-READY.md)
- [ADR-DOMAIN-UX-CONVERSION-FINAL-READY](./ADR-DOMAIN-UX-CONVERSION-FINAL-READY.md)
- [ADR-DOMAIN-MARKETING-UTP-FINAL-READY](./ADR-DOMAIN-MARKETING-UTP-FINAL-READY.md)
- [ADR-DOMAIN-AUTOMATION-PROCESSES-FINAL-READY](./ADR-DOMAIN-AUTOMATION-PROCESSES-FINAL-READY.md)
- [ADR-DOMAIN-STRATEGY-FINAL-READY](./ADR-DOMAIN-STRATEGY-FINAL-READY.md)
