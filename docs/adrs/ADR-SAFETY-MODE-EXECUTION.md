# ADR-SAFETY-MODE-EXECUTION
## Safety Mode Guardrails, Rule Engine Config & Formalized Error Enums

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Phase** | Phase 4 |
| **Authors** | Engineering |
| **Implements** | Sprint Implementation Plan — Phase 4 |
| **Supersedes** | N/A (extends ADR-DECISION-LAYER-GATES.md, ADR-FEASIBILITY-RULE-ENGINE.md) |

---

## Context

Phase 4 addresses two gaps that emerged from the Phase 1–3 governance layer:

1. **No execution-mode differentiation.** `execution_mode` existed as a schema field but had no runtime effect. Compliance-sensitive audits (`safe` mode) needed stricter caps — a 3-risky-promise output that passes `accept_with_warnings` in normal mode should escalate to human review in safe mode.

2. **Error codes were free-form strings.** Phase 1–3 surface errors like `risky_promise_language` and `score_evidence_mismatch` as plain strings. By Phase 4 there is enough real-world data to enumerate the canonical set, enabling typed contracts and reliable Phase 5 rule engine matching.

Additionally, Phase 4 introduces the **Rule Engine config** as a preparation artifact. It is inert in Phase 4 — no runtime service reads it yet — but defines the full mapping of error codes → agent instruction patches, so Phase 5's `DynamicAdjustmentService` can activate it with a single import.

---

## Decision

### 1. Safety Mode Guardrails

**File**: `server/src/config/safety-mode.ts`

`applyExecutionMode(co: ControlObjectV1)` is called at the end of `FactChecker.buildControlObject()`. It is a **pure mutation** of the control object — no return value, no side effects outside the CO.

**Guardrails applied when `execution_mode = 'safe'`**:

| Guardrail | Threshold | Reason Code |
|---|---|---|
| Risky promise cap | > 2 | `safe_mode_too_many_risky_promises` |
| Hallucination cap | > 2 (stricter than normal mode's 3) | `safe_mode_too_many_hallucinations` |
| Unverified fraction cap | > 25% of facts | `safe_mode_high_unverified_fraction` |
| Forbidden absolutes scan | Match in fixable errors + assumptions | `safe_mode_forbidden_absolutes_detected` |
| Missing hypothesis labels | risky_promise_language + score_consistency_flag both present | `safe_mode_missing_hypothesis_labels` |

**Why safe mode uses stricter thresholds than normal mode**: Compliance and audit scenarios have real regulatory consequences. A consultant who presents an output with 3+ risky promises in a compliance context takes on reputational and legal risk. The 'safe' mode cap of 2 provides an explicit guardrail; the normal mode cap remains at 3 (Decision Layer) to avoid disrupting routine audits.

**`requirements_met` field**: Added to `ControlObjectHumanAttention` in v1.8. Set to `false` when any safe-mode violation fires, `true` when all checks pass (or mode is 'normal' and no other escalation triggered), `null` for phases where the check was not run (recon/strategy). This allows monitoring dashboards to track safe-mode compliance rates over time.

**Execution mode resolution**: `base.ts` resolves `execution_mode` from `audits.execution_mode` via `fetchAuditExecutionMode()` (cached per agent instance). Returns `'normal'` on missing column or error — safe default.

**No interaction with Decision Layer**: `applyExecutionMode()` only mutates `human_attention_required` and `errors.fixable`. It never changes `decision_hint`. The Decision Layer reads the full CONTROL_OBJECT post-mutation and will route to `refine` if confidence is sufficiently degraded by the extra fixable errors. Safe mode does not bypass the confidence gates.

---

### 2. Rule Engine Config

**File**: `server/src/config/rule-engine.ts`

**Phase 4 status: inert.** No runtime service imports `RULE_ENGINE_MAPPING` in Phase 4.

**Phase 5 activation**: `DynamicAdjustmentService.generateAdjustments()` will call `getRulesForErrorType()` / `getRulesForAgent()` to generate per-agent prompt patches for targeted reruns.

**Coverage** — 20+ rules across:
- Hallucination/fabrication: score mismatches, capacity claims, compliance overclaims, traffic figures
- Risky promise/tone: absolute language, deterministic outcomes, missing hypothesis labels
- Data gaps: monitoring evidence, crawl evidence, conversion figures
- Structural: timeline realism, integration complexity

**Priority field**: Each rule has an optional `priority` (default 0). Higher priority rules are applied first by `DynamicAdjustmentService` when multiple rules match for the same agent. Safety-critical instructions (hallucination, overclaim) have priority 8–10; style fixes (tone) have priority 5–7.

**Agent numbering** aligns with `PHASE_DOMAIN_MAP` (1=tech, 2=security, 3=seo, 4=ux, 5=marketing, 6=automation). This allows targeted single-agent rerun in Phase 5 rather than full pipeline restart.

---

### 3. Formalized Error Enums (CONTROL_OBJECT v1.8)

Phase 1–3 used `string[]` for all error arrays, with comments listing examples. v1.8 introduces typed union types:

- `FixableErrorCode` — 6 canonical codes + open `string` for domain-specific extensions
- `StructuralErrorCode` — 25 canonical codes (1 generic + 4–5 per domain) + open `string`
- `HumanAttentionReasonCode` — 9 codes (4 general + 5 safe-mode) + open `string`

**Why union types with open `string`, not strict enums**: The `string` fallthrough allows domain-specific codes to flow through without breaking TypeScript compilation. As the codebase matures and codes stabilize, the `string` escape hatch can be removed in v2.0. Strict enums now would require exhaustive case handling across all call sites — premature for an advisory-only contract.

---

## CONTROL_OBJECT Changes: v1.7 → v1.8

| Field | v1.7 | v1.8 |
|---|---|---|
| `human_attention_required.requirements_met` | — | `boolean \| null` — safe-mode compliance flag |
| `human_attention_required.reasons` | `string[]` | `HumanAttentionReasonCode[]` (typed union, backward compatible) |
| `errors.fixable` | `string[]` | `FixableErrorCode[]` (typed union, backward compatible) |
| `errors.structural` | `string[]` | `StructuralErrorCode[]` (typed union, backward compatible) |
| `versions.system_version` | `'v1.7'` | `'v1.8'` |

No field removals. No breaking changes.

---

## Consequences

**Positive**:
- Compliance-sensitive audits are now governed differently from routine ones — same pipeline, different gate tightness.
- `requirements_met` gives monitoring dashboards a single boolean to track safe-mode health.
- Error enum types catch typos at compile time and enable autocomplete in Phase 5's rule engine.
- Rule Engine config documents the full correction vocabulary in one place, ready for Phase 5 activation.

**Negative / Risks**:
- Safe mode thresholds (2 risky promises, 25% unverified) are a starting point. If they're too tight, they'll generate false positive escalations for legitimate qualitative domains (Marketing, UX). Tuning will require evaluation dataset history from Phase 5.
- Rule Engine rules rely on regex pattern matching against recommendation text. If agents use synonyms not covered by the patterns, rules won't fire. Coverage must be expanded over time.
- `forbidden_absolutes_pattern` scans only the error/assumption text aggregated inside CONTROL_OBJECT, not the raw agent output text. If absolute language appears in a finding that wasn't flagged as a correction, it won't be caught. Phase 5 can add a full-output scan.

---

## Deferred

| Feature | Phase |
|---|---|
| Full-output absolute language scan (not just CO fields) | Phase 5 |
| `DynamicAdjustmentService` consuming Rule Engine | Phase 5 |
| DB constraint: `pii_sanitized = true` enforced at insert | Phase 5 |
| A/B testing safe-mode thresholds via evaluation dataset | Phase 5+ |
| Strict error enums (remove `string` escape hatch) | v2.0 (Phase 5) |

---

## Note on Causal Chains

Causal chain tracing (`trace.causal_chain`) was considered for Phase 4 but is deferred to Phase 5. The primary use case is auto-loop root cause analysis — identifying which upstream agent or source caused a downstream `refine`. This is only valuable once the auto-loop mechanism (Phase 5) exists to act on it. Phase 4's assumption `related_claim_ids` (v1.5) provides a shallow version; Phase 5 will expand to a full DAG when root-cause analysis is needed for targeted reruns.

---

## References

- `server/src/config/safety-mode.ts` — `SAFETY_MODE_RULES` + `applyExecutionMode()`
- `server/src/config/rule-engine.ts` — `RULE_ENGINE_MAPPING` + helpers (inert in Phase 4)
- `server/src/schemas/control-object.ts` — CONTROL_OBJECT v1.8 (typed error enums, `requirements_met`)
- `server/src/services/fact-checker.ts` — `buildControlObject()` calls `applyExecutionMode()` at end
- `server/src/lib/audit-execution-mode.ts` — `fetchAuditExecutionMode()` DB resolver
- `server/src/agents/base.ts` — `resolveExecutionMode()` caching + `lastRawDomainResult`
- `docs/adrs/ADR-DECISION-LAYER-GATES.md` — three-state routing (Decision Layer remains sole owner of `decision_hint`)
- `docs/adrs/ADR-FEASIBILITY-RULE-ENGINE.md` — Phase 3 (feasibility guardrail)
