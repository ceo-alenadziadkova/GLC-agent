# Phase 0 Gap Analysis — FACT-CHECKER & DECISION LAYER

| Field | Value |
|---|---|
| **Date** | 2026-04-12 |
| **Scope** | Preparatory audit before Phase 1 implementation |
| **Purpose** | Internal sprint planning artifact: maps existing code to planned deliverables |

---

## What Already Exists

### 1. `server/src/services/fact-checker.ts` — Rule-Based Domain Checker

**Scope**: Security, SEO, Tech, UX only (Marketing + Automation are qualitative, not checked).

**Returns**: `{ result: DomainResult, corrections: FactCorrection[], confidence: number }`

**Reusable for CONTROL_OBJECT v1**:
- `corrections` array → direct input for `counts.statuses.likely_hallucination` (action='override') and `errors.fixable` (action='flag')
- `confidence` (0–1 float) → maps to `confidence.factual` (multiply ×100 for 0–100 range)
- Domain switch logic → foundation for phase_profiles
- `calculateConfidence()` penalty model → preserve as-is for factual confidence dimension

**Not reusable** (must add):
- Claim extraction (FACT/HYPOTHESIS/OPINION taxonomy)
- CONFIRMED_BRIEF / UNVERIFIED / RISKY_PROMISE statuses
- Assumptions tracking
- Trace (agent, section, truth_source per claim)

---

### 2. `server/src/services/consistency-checker.ts` — Post-Wing Quality Gates

**Returns**: `QualityGateReport { passed, flags[], checked_at }`

**Five rules**: score_severity_mismatch, low_confidence_majority, excessive_data_gaps, failed_domain, low_confidence_critical.

**Reusable for CONTROL_OBJECT v1**:
- `QualityFlag.rule` → maps to `error_type` in Rule Engine (e.g. `score_severity_mismatch` → `strategic_inconsistency`)
- `QualityFlag.severity='warning'` → can feed `errors.structural`
- `excessive_data_gaps` flag → maps to `errors.data_gaps`
- `passed` field → can inform `decision_hint` (failed gates → refine)
- Persists to `pipeline_events` with `event_type='quality_gate'` → same channel for CONTROL_OBJECT

**Not reusable** (must add):
- Cross-domain consistency checks (currently per-domain only)
- Strategic inconsistency detection (needs cross-phase context)

---

### 3. `server/src/types/audit.ts` — Core Type Definitions

**Directly usable in CONTROL_OBJECT context**:
- `DomainResult.unknown_items` → `errors.data_gaps` direct source
- `DomainResult.confidence_distribution` → `counts.statuses` input (already computed post fact-check)
- `AuditIssue.confidence` → per-finding confidence feed for `confidence.factual`
- `AuditIssue.data_source` → `truth_source` mapping (auto_detected=internal, from_brief=user_brief, inferred=assumption)
- `PipelineEvent.data` (JSONB) → where CONTROL_OBJECT v1 will live (`event_type='control_object'`)

**Must add**:
- `ControlObjectV1` type in this file (or new `server/src/schemas/control-object.ts`)
- `DecisionHint` type: `'accept' | 'accept_with_warnings' | 'refine'`

---

### 4. `server/src/agents/base.ts` — BaseAgent Pipeline

**Integration point for Phase 1** (lines ~226–243 in `run()`):
```
CURRENT:  factChecker.verify(result, domainKey, collectedData)
          → emit 'fact_check' event
          → attachConfidenceDistribution(verification.result)
          → return DomainResult

TARGET:   factChecker.verify(result, domainKey, collectedData)
          → buildControlObjectV1(verification, domainKey, auditId)  ← NEW
          → emit 'control_object' event                               ← NEW (side effect)
          → store as this.lastControlObject                           ← NEW (for pipeline)
          → attachConfidenceDistribution(verification.result)
          → return DomainResult                                       ← UNCHANGED
```

**Key constraint**: `agent.run()` return type **must stay** `Promise<DomainResult>` for Phase 1 (non-breaking). Control object emitted as side effect.

---

### 5. `server/src/services/pipeline.ts` — Pipeline Orchestrator

**Integration points** (lines ~140–162 in `startPhase()` and `startPhaseIsolated()`):

After `agent.run()`:
```typescript
// CURRENT (lines 141–146):
const agent = new AgentClass(this.auditId);
const result = await agent.run();
if (domainKey !== 'recon' && domainKey !== 'strategy') {
  await agent.saveDomainResult(result);
}

// TARGET (Phase 1 addition — additive only):
const agent = new AgentClass(this.auditId);
const result = await agent.run();
if (domainKey !== 'recon' && domainKey !== 'strategy') {
  const controlObject = (agent as BaseAgent).lastControlObject;
  if (controlObject) {
    const { hint } = decisionLayer.decide(controlObject);
    if (hint === 'refine') {
      await this.emitEvent(phase, 'refine_recommended', 'Decision Layer: manual review recommended', { control_object: controlObject });
    }
  }
  await agent.saveDomainResult(result);
}
```

---

## What Must Be Built (Phase 1)

### New Files

| File | Size | Purpose |
|------|------|---------|
| `server/src/schemas/control-object.ts` | ~60 LOC | ControlObjectV1 TypeScript interface + factory |
| `server/src/services/decision-layer.ts` | ~80 LOC | Three-state routing (accept/accept_with_warnings/refine) |
| `docs/adrs/ADR-CONTROL-OBJECT-V1.md` | ~200 LOC | Architecture decision record |
| `docs/adrs/ADR-DECISION-LAYER-GATES.md` | ~150 LOC | Architecture decision record |

### Modified Files

| File | Change | Risk |
|------|--------|------|
| `server/src/services/fact-checker.ts` | Add `buildControlObject()` alongside `verify()` | Low — additive only |
| `server/src/agents/base.ts` | Store `lastControlObject` after fact-check, emit event | Low — additive |
| `server/src/services/pipeline.ts` | Read `agent.lastControlObject`, call Decision Layer | Low — advisory |

---

## Non-Breaking Contract for Phase 1

- `agent.run()` → **return type unchanged** (`Promise<DomainResult>`)
- `FactChecker.verify()` → **return type unchanged** (`FactCheckResult`)
- CONTROL_OBJECT stored in `pipeline_events` with `event_type='control_object'` (new event type, no conflict)
- `decision_hint='refine'` → **only logs/emits** in MVP; does NOT block or retry (human escalation)
- No new DB columns needed for Phase 1 (JSON payload in existing `pipeline_events.data`)

---

## Data Flow for Phase 1

```
BaseAgent.run()
  ├── collector.run()          → collectedData
  ├── contextBuilder.build()   → AgentContext
  ├── callClaudeWithRetry()    → DomainResult (raw)
  ├── factChecker.verify()     → { result, corrections, confidence }
  ├── buildControlObjectV1()   → ControlObjectV1               [NEW]
  │     ├── versions from config
  │     ├── context: { audit_id, phase_id, execution_mode }
  │     ├── confidence: { overall, factual, strategic, consistency }
  │     ├── counts from corrections + confidence_distribution
  │     ├── errors: { fixable, structural, data_gaps }
  │     ├── assumptions: [] (light: id, statement, source)
  │     ├── trace.claim_sources from AuditIssue.evidence_refs
  │     ├── decision_hint (computed)
  │     └── human_attention_required (computed)
  ├── this.lastControlObject = controlObject                   [NEW]
  ├── emit('control_object', controlObject)                    [NEW]
  └── return attachConfidenceDistribution(result)              [UNCHANGED]

PipelineOrchestrator.startPhase()
  ├── agent.run()              → DomainResult
  ├── agent.lastControlObject  → ControlObjectV1               [NEW]
  ├── decisionLayer.decide()   → decision_hint                 [NEW]
  ├── if refine: emit('refine_recommended', ...)               [NEW]
  └── agent.saveDomainResult()                                  [UNCHANGED]
```

---

## Effort Estimates (Phase 1)

| Task | Estimate | Priority |
|------|----------|---------|
| `control-object.ts` schema | 2h | P0 |
| Extend `FactChecker` → `buildControlObjectV1()` | 4h | P0 |
| `decision-layer.ts` | 2h | P0 |
| `base.ts` integration | 2h | P0 |
| `pipeline.ts` integration | 2h | P0 |
| `ADR-CONTROL-OBJECT-V1.md` | 2h | P1 |
| `ADR-DECISION-LAYER-GATES.md` | 1h | P1 |
| Unit tests | 4h | P1 |
| **Total** | **~19h** | — |

**Sprint capacity**: 2 engineers × 5 days × 6h = 60h → Phase 1 fits comfortably in Sprint 1.
