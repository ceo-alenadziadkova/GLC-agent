# ADR-FEASIBILITY-RULE-ENGINE
## Feasibility Layer, Confidence Weights & Feasibility-Gated Decision Layer

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Phase** | Phase 3 |
| **Authors** | Engineering |
| **Implements** | Sprint Implementation Plan — Phase 3 |
| **Supersedes** | N/A (extends ADR-DECISION-LAYER-GATES.md) |

---

## Context

Phase 2 established CONTROL_OBJECT v1.5 with truth sources and assumption risk. However, two weaknesses remained in the governance model:

1. **Confidence was phase-agnostic.** A 75/100 overall confidence meant the same thing for Security (where facts are critical) and Marketing (where hypotheses are expected). The simple average introduced systematic over-confidence for qualitative domains and under-confidence for quantitative ones.

2. **Realisability was invisible.** An agent could produce a technically accurate, internally consistent output recommending "rebuild your core architecture in 2 weeks with a 1-person team" — and the governance layer would accept it. There was no mechanism to flag delivery risk before the output reached the consultant.

Phase 3 introduces:
- **Feasibility Layer**: deterministic rule templates that score how executable the recommendations are, given client brief constraints.
- **Confidence Weights**: per-domain weighting of the four confidence dimensions (factual, strategic, consistency, feasibility).
- **Feasibility Guardrail in Decision Layer**: for delivery-risk domains, critically low feasibility overrides confidence and forces `refine`.

---

## Decision

### 1. Feasibility Layer — Rule-Based Templates

**File**: `server/src/services/feasibility-layer.ts`

**Design principle**: Deterministic, explainable, zero AI calls. Rules fire when recommendation text patterns + brief constraints trigger known risk combinations.

**Score formula**: Starts at 1.0. Each risk reduces the score:
- `high` severity → −0.25
- `medium` severity → −0.15
- `low` severity → −0.07
- Floor: 0.10

**Why rule-based, not LLM scoring**: Feasibility scoring must be fast, reproducible, and auditable. LLM scoring of feasibility introduces latency, non-determinism, and violates the "one Claude call per phase" constraint. Rule templates can be improved incrementally as edge cases are encountered in production.

**Domain coverage**:

| Domain | Key risk templates |
|---|---|
| `tech_infrastructure` | Arch overhaul + small team; high issue count + low maturity; no dev team + many recs |
| `security_compliance` | Compliance recs + no audit policy; many critical issues + small team; critical score + many recs |
| `seo_digital` | Technical SEO + no dev team; no analytics platform |
| `ux_conversion` | A/B testing + no analytics; design overhaul + small team |
| `marketing_utp` | Multi-channel + no CRM; paid acquisition + low budget |
| `automation_processes` | Integration sprawl; advanced recs + low tech maturity; custom code + no dev team |

**Universal check**: High-effort output (3+ critical issues, 5+ recommendations) against a low budget (<$1,000/mo) triggers a medium-risk `universal_high_effort_low_budget` penalty.

---

### 2. Confidence Weights — Per-Domain Formula

**File**: `server/src/config/phase-confidence-weights.ts`

Phase 3 replaces the v1.5 simple average (`(factual + strategic + consistency) / 3`) with a four-dimension weighted formula:

```
overall = factual×Wf + strategic×Ws + consistency×Wc + feasibility×Wfeas
```

Weights by domain:

| Domain | factual | strategic | consistency | feasibility |
|---|---|---|---|---|
| `tech_infrastructure` | 0.50 | 0.15 | 0.25 | 0.10 |
| `security_compliance` | 0.50 | 0.10 | 0.30 | 0.10 |
| `seo_digital` | 0.35 | 0.35 | 0.20 | 0.10 |
| `ux_conversion` | 0.30 | 0.40 | 0.20 | 0.10 |
| `marketing_utp` | 0.25 | 0.45 | 0.20 | 0.10 |
| `automation_processes` | 0.30 | 0.15 | 0.25 | 0.30 |

**Rationale for Automation feasibility weight (0.30)**: Automation recommendations have the highest execution risk. An automation strategy that cannot be built has zero value. Feasibility is elevated to co-primary alongside factual accuracy.

**Rationale for Marketing strategic weight (0.45)**: Marketing outputs are primarily strategic bets — market sizing, positioning, channel bets. Factual grounding matters but is secondary to the quality of strategic reasoning.

**Stored in CONTROL_OBJECT**: `confidence_weights` field (v1.7+) preserves the exact weights used for each run, allowing downstream services to reproduce or audit the overall score.

---

### 3. Feasibility Guardrail in Decision Layer

**File**: `server/src/services/decision-layer.ts`

For **delivery-risk domains** (`tech_infrastructure`, `automation_processes`), if `feasibility.score ≤ 0.5`, the Decision Layer short-circuits to `refine` before evaluating confidence gates.

```
if (feasibility_gated_domain AND feasibility.score ≤ 0.5):
  → refine (forced, logged as decision_layer.refine_feasibility)
else:
  → normal confidence-gate evaluation (accept / accept_with_warnings / refine)
```

**Why only two domains**: Security and SEO also have execution risk, but their recommendations are more incremental — a security finding with low feasibility can still be partially actioned. Infra and Automation recommendations typically require sequential execution; a single infeasible recommendation blocks the entire programme.

**Why 0.50 threshold**: With our penalty model, a score ≤ 0.5 means the output has accumulated at least two `high`-severity risks or a combination equivalent (~3.5 risk units). This represents a pattern where multiple constraints conflict with multiple recommendations — a genuine delivery blocker, not a minor caveat.

**Feasibility score stored as `confidence.feasibility`** (0–100 integer, `score × 100`) alongside the full `feasibility` object. This allows historical trend analysis and threshold A/B testing in Phase 5+.

---

## CONTROL_OBJECT Changes: v1.5 → v1.7

| Field | v1.5 | v1.7 |
|---|---|---|
| `confidence.feasibility` | — | `number \| null` — `feasibility.score × 100` |
| `confidence_weights` | — | `ControlObjectConfidenceWeights \| null` — weights used for this phase |
| `feasibility` | — | `{ score, risk_codes[], notes[] } \| null` |
| `confidence.overall` | Simple average of 3 dimensions | Weighted sum of 4 dimensions |
| `versions.system_version` | `'v1.5'` | `'v1.7'` |
| `versions.fact_checker_version` | `'v1.5'` | `'v1.7'` |
| `versions.decision_layer_version` | `'v1.0'` | `'v1.7'` |

`null` defaults ensure v1.5 consumers remain compatible. No breaking changes.

---

## Brief Snapshot Extraction

**In BaseAgent**: `extractBriefSnapshot(context)` maps `AgentContext.brief_responses` keys to the typed `BriefSnapshot` fields used by FeasibilityLayer. Absent brief fields default to `undefined`; FeasibilityLayer handles missing values gracefully (rules do not fire without evidence).

**Key mappings**:
- `team_size` ← `brief_responses.team_size` or `company_size`
- `has_dedicated_dev_team` ← `has_dedicated_dev_team` or `dedicated_dev_team` (bool/yes/no)
- `has_audit_policy` ← `has_audit_policy` or `compliance_policy`
- `has_analytics` ← `has_analytics` or `uses_analytics`
- `has_crm` ← `has_crm` or `uses_crm`
- `monthly_budget_usd` ← `monthly_budget_usd`, `monthly_budget`, or `marketing_budget`
- `integration_count` ← `integration_count` or `tool_count`
- `tech_maturity` ← `tech_maturity`

---

## Consequences

**Positive**:
- Confidence scores are now semantically meaningful per domain — a 75 in Security is harder to achieve than a 75 in Marketing, as intended.
- Delivery-blocking recommendations (arch overhaul with 1-person team) are caught before the consultant sees them, not surfaced as warnings after accept.
- `confidence_weights` in CONTROL_OBJECT enables future A/B testing of weight tuning.
- Feasibility rules are easy to extend — add a new `risks.push({})` call, no schema change.

**Negative / Risks**:
- Feasibility rules depend on brief data quality. If a client doesn't fill in `team_size` or `has_analytics`, relevant rules won't fire — false high feasibility scores are possible for thin briefs.
- The 0.50 guardrail threshold is a starting point, not a calibrated value. It may need adjustment after observing real audit runs in Phase 5+ evaluation data.
- `extractBriefSnapshot` uses string key lookups — if question-bank key names change, the mapping silently fails (returns `undefined`, rules don't fire). A test or ADR update must accompany any key rename.

---

## Deferred

| Feature | Phase |
|---|---|
| Feasibility threshold A/B testing | Phase 5 (evaluation dataset history required) |
| Cross-phase feasibility accumulation (Infra feasibility → Automation risk) | Phase 5+ |
| Feasibility scoring from structured recs (not regex) | Phase 4+ refactor |
| Weighted source conflict resolution | Phase 5 (Truth Registry v2) |

---

## References

- `server/src/services/feasibility-layer.ts` — FeasibilityLayer + BriefSnapshot
- `server/src/config/phase-confidence-weights.ts` — ConfidenceWeights per domain
- `server/src/services/decision-layer.ts` — feasibility guardrail + DECISION_LAYER_THRESHOLDS
- `server/src/schemas/control-object.ts` — CONTROL_OBJECT v1.7
- `server/src/services/fact-checker.ts` — `buildControlObject()` feasibility integration
- `server/src/agents/base.ts` — `extractBriefSnapshot()`
- `docs/adrs/ADR-DECISION-LAYER-GATES.md` — three-state routing (extended by this ADR)
- `docs/adrs/ADR-TRUTH-REGISTRY-ASSUMPTIONS.md` — Phase 2 (Truth Registry, Phase Profiles)
