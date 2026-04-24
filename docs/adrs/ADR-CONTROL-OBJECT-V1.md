# ADR: CONTROL_OBJECT v1 as Phase Governance Contract

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Scope** | `server/src/schemas/control-object.ts`, `server/src/services/fact-checker.ts`, `server/src/agents/base.ts` |
| **Supersedes** | — |
| **Superseded by** | [`ADR-CONTROL-OBJECT-V2-FULL.md`](./ADR-CONTROL-OBJECT-V2-FULL.md) (v1.0 **schema** superseded; this file remains the immutable v1.0 **decision** record) |
| **Decision owners** | Tech Lead + Backend (AI Pipeline) |

**Implementation note:** runtime schema and services follow **CONTROL_OBJECT v2** per the linked ADR. Read this document for the original v1.0 context and migration rationale.

### ADR lifecycle

This document follows the standard ADR convention: **the decision record is immutable**. Editorial fixes (typos, links) are acceptable; **changing the architectural decision** requires publishing a **new ADR** that **supersedes** this one.

---

## Context

The GLC AI pipeline runs 6 domain phases + Recon + Strategy. Each phase involves a single Claude call, rule-based fact-checking, and downstream analysis for consultants. Prior to this decision:

- `FactChecker.verify()` returned corrections and a 0–1 confidence score, but these were not persisted as a structured governance artifact.
- `ConsistencyChecker` ran post-wing quality gates and stored results in `pipeline_events`, but only after both parallel wings finished — not per-phase.
- The `decision_hint` (accept / accept_with_warnings / refine) did not exist; decisions were implicit in the pipeline orchestrator.
- There was no formal traceability: which agent produced which claim, what evidence backed it, or what source (BRIEF vs. collected vs. inferred) it came from.

As the system scales toward multi-agent orchestration and client-facing confidence signals, we need:

1. A **machine-readable governance contract** that is emitted per phase and consumed by the Decision Layer.
2. **Source traceability** for findings (was this confirmed by the client brief, by collected data, or inferred?).
3. A **deterministic, versionable decision hint** so the consultant UI and future auto-loop can make routing decisions without parsing text.
4. A shared interface between the Fact-Checker and Decision Layer that does not require text parsing.

---

## Decision

We introduce **CONTROL_OBJECT v1** — a lightweight, advisory governance contract populated after each domain phase (not Recon or Strategy) by `FactChecker.buildControlObject()` and consumed by `DecisionLayer.decide()`.

### v1 Scope

CONTROL_OBJECT v1 includes:

| Block | Contents |
|-------|----------|
| `versions` | system_version, fact_checker_version, decision_layer_version |
| `context` | audit_id, phase_id, execution_mode |
| `confidence` | overall (0–100), factual, strategic, consistency |
| `counts` | total_claims, fact, strategic_hypothesis, opinion, assumption + statuses |
| `errors` | fixable[], structural[], data_gaps[] as free-form strings |
| `assumptions` | id, statement, source (light: no risk/related_claim_ids) |
| `trace.claim_sources` | claim_id, agent, section, truth_source per AuditIssue |
| `decision_hint` | 'accept' \| 'accept_with_warnings' \| 'refine' |
| `human_attention_required` | required flag + reason codes |

### Deferred to Later Phases

| Feature | Phase |
|---------|-------|
| `assumptions.risk` + `related_claim_ids` | Phase 2 |
| `truth_profile_id` + Truth Registry config | Phase 2 |
| `confidence.feasibility` + feasibility object | Phase 3 |
| `confidence_weights` per phase | Phase 3 |
| `context.execution_mode` guardrails (safe mode) | Phase 4 |
| `trace.causal_chain` graph | Phase 5 |
| `cost_control` object | Phase 5 |
| `agent_performance` object | Phase 5 |

### Storage

CONTROL_OBJECT v1 is persisted to `pipeline_events` with `event_type = 'control_object'`. This is **advisory-only** in v1: downstream services (dashboard, reporting) MUST NOT hard-depend on this structure until v3+ formalises the contract.

### Truth Policy (v1)

Priority-based conflict resolution: `internal_metrics` > `user_brief` > `external_search`.

- `AuditIssue.data_source = 'auto_detected'` → `truth_source = 'internal_metrics'`
- `AuditIssue.data_source = 'from_brief'` → `truth_source = 'user_brief'`
- `AuditIssue.data_source = 'inferred'` → `truth_source = 'external_search'` (closest proxy)

No complex weighted trust levels until Phase 2 introduces Truth Registry.

---

## Data Flow

```
BaseAgent.run()
  ├── factChecker.verify()          → FactCheckResult (unchanged)
  ├── factChecker.buildControlObject()  → ControlObjectV1    ← NEW
  ├── base.lastControlObject = co       ← NEW (side effect)
  └── return DomainResult               ← UNCHANGED

PipelineOrchestrator.startPhase() / startPhaseIsolated()
  ├── agent.run()                   → DomainResult
  ├── agent.lastControlObject       → ControlObjectV1        ← NEW
  ├── decisionLayer.decide(co)      → sets co.decision_hint  ← NEW
  ├── emit('control_object', co)    ← pipeline_events (after Decision Layer)
  ├── if refine: emit('refine_recommended', ...)             ← NEW
  └── agent.saveDomainResult(result)                        ← UNCHANGED
```

---

## Claim Extraction (v1 Light)

In v1, claim extraction is a simple structural mapping:

| DomainResult field | Claim type | Count |
|---|---|---|
| `issues[]` | FACT (verifiable findings) | `counts.fact` |
| `recommendations[]` | STRATEGIC_HYPOTHESIS | `counts.strategic_hypothesis` |
| `strengths[]` + `weaknesses[]` | OPINION | `counts.opinion` |
| `unknown_items[]` | → `errors.data_gaps` | — |

Status assignment:
- `corrections[].action = 'override'` → `likely_hallucination`
- `corrections[].action = 'flag'` → `unverified`
- `issue.data_source = 'from_brief'` → `confirmed_brief`
- Risky absolute language in recommendations → `risky_promise`

---

## Consequences

**Positive**:
- Governance artifact per phase: machine-readable, versioned, traceable.
- Confidence signal available for consultant UI (without text parsing).
- Foundation for Decision Layer auto-loop (Phase 5) without changing existing interfaces.
- Source traceability: consultants can see "this finding came from client brief vs. auto-detected".
- Non-breaking: `agent.run()` return type unchanged, existing `FactChecker.verify()` unchanged.

**Negative / Risks**:
- CONTROL_OBJECT is derived from rule-based checks, not deep semantic analysis. v1 confidence scores are approximate proxies, not ground truth.
- `pipeline_events` table may grow due to new `control_object` event per phase. Monitor storage.
- Downstream services may start depending on `pipeline_events.data.control_object` shape before v3+, creating informal coupling. Must be documented and managed.

**Mitigations**:
- Advisory-only status is explicit in code comments and this ADR.
- Future version bump (`v1.5`, `v2.0`) will be communicated via `CONTROL_OBJECT_VERSIONS.system_version`.
- Phase 5 will formalise the contract with a documented migration path.

---

## Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| Extend `QualityGateReport` to include confidence/trace | Consistency checker runs post-wing, not per-phase. Different lifecycle. |
| Add CONTROL_OBJECT fields to `audit_domains` table | Schema migration needed; advisory-only v1 doesn't warrant a DB column. |
| Return CONTROL_OBJECT from `agent.run()` | Breaking change to return type signature; all callers would need updating. |
| Parse free-text fact_check events | Fragile; defeats the purpose of a machine-readable contract. |

---

## Implementation

**Phase 1 — delivered**:
- `server/src/schemas/control-object.ts` — ControlObjectV1 interface + factory
- `server/src/services/fact-checker.ts` — added `buildControlObject()` method (no `decision_hint`; Decision Layer is sole owner)
- `server/src/agents/base.ts` — `lastControlObject` property + build call after verify()
- `server/src/services/pipeline.ts` — reads `lastControlObject`, runs Decision Layer, emits `control_object` and optional `refine_recommended`

**Future phases** — see main Implementation Plan.
