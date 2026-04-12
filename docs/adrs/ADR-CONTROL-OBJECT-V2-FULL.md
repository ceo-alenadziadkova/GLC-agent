# ADR-CONTROL-OBJECT-V2-FULL
## CONTROL_OBJECT v2 Complete Schema — Assumptions, Feasibility, Evaluation Link, Causal Chain

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Scope** | All GLC audit phases — formal schema freeze for v2 |
| **Authors** | Engineering |
| **Implements** | Sprint 1 — ADR Authoring + Schema Freeze |
| **Supersedes** | ADR-CONTROL-OBJECT-V1.md (v1.0), ADR-AUTO-LOOP-RULE-ENGINE.md (v2.0 partial) |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. It establishes CONTROL_OBJECT v2 as the **formal contract** between FACT-CHECKER and Decision Layer across all GLC phases. From v2 onward, any service that reads CONTROL_OBJECT fields is a downstream consumer and must be included in breaking-change reviews. Annotate such code with `// CO-CONSUMER: update when CO schema changes`.

---

## Context

CONTROL_OBJECT evolved incrementally across Phases 1–5:

| Version | Phase | What was added |
|---|---|---|
| v1.0 | Phase 1 | Core: versions, context, confidence, counts, errors, trace, decision_hint |
| v1.5 | Phase 2 | truth_profile_id, assumption risk, truth_source per claim |
| v1.7 | Phase 3 | feasibility scoring, per-domain confidence weights |
| v1.8 | Phase 4 | formalized error enums, safety mode guardrails, requirements_met |
| v2.0 | Phase 5 | cost_control, agent_performance (feature-complete per original spec) |

Each version was advisory-only: downstream consumers were explicitly warned not to depend on the internal structure. With Phase 5 shipped and the full six-domain scope confirmed, it is time to:

1. Publish a single authoritative schema that consolidates all incremental additions.
2. Formally freeze the contract so downstream consumers can register.
3. Document v2.1 additions (risk_profile, evaluation_link, confidence.feasibility as a first-class field) needed to support Phase 6–10 roadmap features.
4. Pre-declare v2.2 additions (causal_chain) that will be activated in Phase 8.

---

## Decision

### 1. Complete v2 Schema

The canonical shape is defined in `server/src/schemas/control-object.ts`. The description below is the human-readable authoritative specification.

#### `versions` (required)

```typescript
versions: {
  system_version: string;           // e.g. 'v2.1'
  fact_checker_version: string;     // e.g. 'v1.1'
  rule_engine_version: string;
  decision_layer_version: string;
  phase_director_version?: string;  // optional, set when PHASE_DIRECTOR versioning is active
}
```

All three required fields must be set. `phase_director_version` is optional until Phase Directors are formally versioned.

---

#### `context` (required)

```typescript
context: {
  audit_id: string;
  client_id?: string;
  phase_id: string;                 // e.g. 'tech_infrastructure', 'security_compliance'
  pipeline_template_id?: string;
  execution_mode: 'normal' | 'safe';
  risk_profile?: string;            // v2.1: 'low' | 'medium' | 'high' | 'enterprise'
  truth_profile_id?: string;        // v2.1: pointer to Truth Registry config
  selected_variant_id?: string;     // v2.2 (Phase 6): bandit-selected agent variant
  benchmark_reference_id?: string;  // v2.3 (Phase 10): nightly benchmark snapshot ref
}
```

`phase_id` uses the canonical domain key values from `src/app/data/auditTypes.ts` (`DOMAIN_KEYS`).

`risk_profile` enables the Decision Layer to apply stricter thresholds for enterprise or compliance-heavy contexts. Currently informational; Phase 9 auto-remediation will gate on it.

---

#### `confidence` (required)

```typescript
confidence: {
  overall: number;          // 0–100, weighted aggregate
  factual: number;          // 0–100
  strategic: number;        // 0–100
  consistency: number;      // 0–100
  feasibility?: number;     // v2.1: 0–100, rule-based delivery confidence
}
```

`confidence.overall` is computed as a weighted sum of the four dimensions using `confidence_weights`. Plain average is no longer acceptable after Phase 3 introduced per-domain weights.

`confidence.feasibility` is populated by FeasibilityLayer (already exists as `feasibility.score` in v2.0 — this field promotes it to the confidence aggregate in v2.1).

---

#### `confidence_weights` (optional, per-phase)

```typescript
confidence_weights?: {
  factual: number;      // 0–1, must sum to 1.0 with others
  strategic: number;
  consistency: number;
  feasibility: number;
}
```

Defaults to `{ factual: 0.40, strategic: 0.20, consistency: 0.25, feasibility: 0.15 }` if not set. Per-domain values are defined in `server/src/config/phase-profiles.ts`.

---

#### `counts` (required)

```typescript
counts: {
  total_claims: number;
  fact: number;
  strategic_hypothesis: number;
  opinion: number;
  assumption: number;       // v2.1: explicit ASSUMPTION type count
  statuses: {
    confirmed_brief: number;
    confirmed_external: number;
    unverified: number;
    likely_hallucination: number;
    risky_promise: number;
    dependent_on_brief_assumption: number;
    strategic_inconsistency: number;
  };
}
```

`counts.assumption` was tracked as a claim type from v1.5 but not exposed as a top-level count. v2.1 promotes it for observability.

**Kernel status taxonomy (documentation bridge):** The Fact-Checker kernel describes universal claim statuses such as `CONFIRMED_EXTERNAL`, `DEPENDENT_ON_BRIEF_ASSUMPTION`, and `STRATEGIC_INCONSISTENCY`. In the shipped TypeScript contract, observability for these is expressed as follows:

| Kernel concept | Where it appears in CONTROL_OBJECT |
|---|---|
| `CONFIRMED_BRIEF` | `counts.statuses.confirmed_brief` |
| `CONFIRMED_EXTERNAL` | `counts.statuses.confirmed_external` (claims whose `truth_sources[]` includes `external_api` or `document_feed`) |
| `UNVERIFIED` | `counts.statuses.unverified` |
| `LIKELY_HALLUCINATION` | `counts.statuses.likely_hallucination` |
| `RISKY_PROMISE` | `counts.statuses.risky_promise` |
| `DEPENDENT_ON_BRIEF_ASSUMPTION` | `counts.statuses.dependent_on_brief_assumption` (heuristic: issues with `data_source === 'from_brief'` and `confidence === 'low'`) |
| `STRATEGIC_INCONSISTENCY` | `counts.statuses.strategic_inconsistency` (heuristic: structural `error_type` codes whose names match conflict / mismatch / inconsistency) |
| Other kernel labels (`STRATEGIC_HYPOTHESIS`, opinion-level nuance, rule-engine-only codes) | `errors.*`, `assumptions[]`, and `human_attention_required` as appropriate — not duplicated as scalar status buckets |

---

#### `errors` (required)

```typescript
errors: {
  fixable: string[];     // error_type codes, e.g. ['tone_overpromise', 'ambiguous_wording']
  structural: string[];  // e.g. ['positioning_conflict', 'infra_stack_mismatch']
  data_gaps: string[];   // e.g. ['missing_pricing_benchmarks', 'compliance_framework_unspecified']
}
```

`error_type` codes are defined in `server/src/config/rule-engine.ts` (Phase 4+). Domain-specific codes are registered in each PhaseProfile (see ADR-PHASE-PROFILES.md).

---

#### `assumptions` (optional but recommended)

```typescript
assumptions?: Array<{
  id: string;                          // e.g. 'A1', 'A12'
  statement: string;
  source: 'inferred_from_brief' | 'inferred_from_pattern' | 'manual_input' | 'external_data';
  risk: 'low' | 'medium' | 'high';
  related_claim_ids?: number[];        // claim IDs in CLAIMS ANALYSIS that rely on this assumption
}>;
```

All non-trivial STRATEGIC_HYPOTHESIS claims that cannot be verified should have a backing assumption entry. This creates an explicit audit trail of what the model "assumed" rather than "knew".

---

#### `feasibility` (optional)

```typescript
feasibility?: {
  score: number;        // 0.0–1.0 rule-based delivery confidence
  risk_codes: string[]; // e.g. ['high_effort_low_budget', 'missing_resources']
  notes: string[];
}
```

Populated by `server/src/services/feasibility-layer.ts`. Not populated for phases where feasibility gating is not configured (e.g. Recon, Strategy).

---

#### `trace` (required)

```typescript
trace: {
  claim_sources: Array<{
    claim_id: number;
    agent: number;               // domain agent number (1–12 for CMO; 1–6 for GLC domains)
    section: string;
    subsection?: string;
    /** Winning tier after priority-based merge (lowest `TRUTH_REGISTRY` priority number wins). */
    truth_source: string;        // 'internal_metrics' | 'user_brief' | 'external_search' | 'external_api' | 'document_feed'
    /** v2.1+: all contributing tiers for this claim (deduped, strongest-first). See `normalizeTruthSourcesList` in truth-registry.ts */
    truth_sources: string[];
  }>;
  error_sources: Array<{
    error_type: string;
    claim_id: number;
    agent: number;
  }>;
  causal_chain?: Array<{         // v2.2 (Phase 8): activated by ADR-CAUSAL-DAG.md
    claim_id: number;
    depends_on: number[];        // claim_ids this claim depends on
    origin: string;              // originating phase_id
  }>;
}
```

`causal_chain` is declared as optional in v2.1 and initialized to `[]`. It becomes required in v2.2 when Phase 8 activates DAG construction. Pre-declaring it now allows downstream consumers to start handling it without a breaking schema change.

---

#### `cost_control` (optional, populated on reruns)

```typescript
cost_control?: {
  estimated_cost_usd: number;
  total_rerun_cost_usd: number;
  rerun_count: number;
  cost_guardrail_triggered: boolean;
} | null;
```

Null on primary runs. Populated by `pipeline.ts` `attemptAutoLoop()` on each rerun iteration.

---

#### `agent_performance` (optional)

```typescript
agent_performance?: {
  agent_number: number;
  hallucination_rate: number;
  risky_promise_rate: number;
  unverified_rate: number;
  inconsistency_rate: number;
  agent_score: number;       // 0–1, formula in ADR-AUTO-LOOP-RULE-ENGINE.md
  score_reliable: boolean;   // always false at write time; meaningful only in aggregate
} | null;
```

Populated by `FactCheckerService.buildControlObject()` via `computePerformanceMetrics()`.

---

#### `evaluation_link` (optional)

```typescript
evaluation_link?: {
  evaluation_id: string;   // UUID of the evaluation_dataset row for this run
  dataset_version: string; // schema version of the evaluation_dataset table
};
```

v2.1 addition. Links the CONTROL_OBJECT to the corresponding `evaluation_dataset` row, enabling cross-run quality analysis without joining on audit_id + phase_id + run_number.

---

#### `decision_hint` (required)

```typescript
decision_hint: 'accept' | 'accept_with_warnings' | 'refine';
```

`accept_with_warnings` is the v2.1 formalisation of the edge case where `confidence ≥ 70` but non-critical structural flags remain. The Decision Layer routes this to FINAL OUTPUT with warning annotations rather than forcing a refine cycle.

Note: `restart` is a **Decision Layer action**, not a `decision_hint` value. The FACT-CHECKER sets `decision_hint` to `refine` for any case where a restart might be warranted; the Decision Layer decides whether to restart or attempt targeted rerun based on error class composition.

---

#### `human_attention_required` (required)

```typescript
human_attention_required: {
  required: boolean;
  reasons: string[];   // e.g. ['critical_data_gaps', 'high_risk_assumptions', 'external_source_unavailable']
  requirements_met?: boolean; // Phase 4 safety mode check
  notes?: string[];
}
```

`external_source_unavailable` (v2.1) is added when a high-risk claim could not be verified because an external API connector was unavailable (see ADR-MULTIMODAL-TRUTH.md).

---

### 2. Version Progression Table

| Version | Status | Key additions |
|---|---|---|
| v1.0 | Superseded | Core contract (context, confidence, counts, errors, trace, decision_hint) |
| v1.5 | Superseded | truth_profile_id, assumption risk levels, truth_source per claim |
| v1.7 | Superseded | feasibility.score, confidence_weights |
| v1.8 | Superseded | error enums, safety mode, requirements_met |
| v2.0 | Superseded (merged) | cost_control, agent_performance |
| **v2.1** | **Current** | risk_profile, evaluation_link, confidence.feasibility, counts.assumption, accept_with_warnings, external_source_unavailable |
| v2.2 | Planned (Phase 8) | causal_chain required, context.selected_variant_id |
| v2.3 | Planned (Phase 10) | context.benchmark_reference_id |

---

### 3. Downstream Consumer Registration

From v2.0 onward, any code that reads CONTROL_OBJECT fields must be annotated:

```typescript
// CO-CONSUMER: update when CO schema changes
```

Known consumers as of v2.1:

| Consumer | Fields read | Location |
|---|---|---|
| Decision Layer | confidence, errors, counts, decision_hint, human_attention_required, cost_control, agent_performance | `server/src/services/decision-layer.ts` |
| Pipeline auto-loop | decision_hint, cost_control | `server/src/services/pipeline.ts` |
| Dynamic Adjustment | errors.fixable, errors.structural | `server/src/services/dynamic-adjustment.ts` |
| Agent Performance recorder | agent_performance | `server/src/services/agent-performance.ts` |
| Evaluation dataset writer | all fields (serialized) | `server/src/services/evaluation-dataset-writer.ts` |
| Pipeline event emitter | full object (emitted as JSON) | `server/src/services/pipeline.ts` |
| Frontend PipelineMonitor | decision_hint, confidence.overall, human_attention_required | via `pipeline_events` Supabase Realtime |

---

## CONTROL_OBJECT Changes: v2.0 → v2.1

| Field | v2.0 | v2.1 |
|---|---|---|
| `context.risk_profile` | — | `string?` |
| `context.truth_profile_id` | — | `string?` (moved from implicit) |
| `confidence.feasibility` | — (in `feasibility.score`) | `number?` (promoted to confidence aggregate) |
| `confidence_weights` | — | `object?` |
| `counts.assumption` | — | `number` |
| `trace.causal_chain[]` | — | `Array? (always [])` — pre-declared |
| `trace.claim_sources[].truth_source` | `string?` | `string` (extended enum; canonical winner) |
| `trace.claim_sources[].truth_sources[]` | — | `string[]` (v2.1; multi-tier trace) |
| `counts.statuses.confirmed_external` | — | `number` |
| `counts.statuses.dependent_on_brief_assumption` | — | `number` |
| `counts.statuses.strategic_inconsistency` | — | `number` |
| `evaluation_link` | — | `object?` |
| `decision_hint` | `'accept' \| 'refine'` | adds `'accept_with_warnings'` |
| `human_attention_required.reasons[]` | enum | adds `'external_source_unavailable'` |
| `versions.system_version` | `'v2.0'` | `'v2.1'` |

---

## Consequences

**Positive:**
- Single authoritative schema spec — no more per-phase incremental ADRs for schema fields
- Formal contract enables safe downstream consumption (dashboard, reporting, feedback)
- `evaluation_link` closes the observability loop between CONTROL_OBJECT and evaluation dataset
- `accept_with_warnings` eliminates the hack of `refine` for non-blocking issues
- Pre-declared `causal_chain` allows gradual adoption without a future breaking change

**Negative / Risks:**
- v2.1 adds 6 new optional fields; any consumer that serializes the full object to a fixed schema (e.g. a typed DB column) must handle the additions. Mitigation: all new fields are optional with sane defaults.
- `confidence.feasibility` overlap with `feasibility.score` creates a redundancy. The rule is: `feasibility.score` is the raw rule-based number; `confidence.feasibility` is the normalised 0–100 value used in the weighted `confidence.overall` aggregate.

---

## References

- `server/src/schemas/control-object.ts` — TypeScript implementation
- `server/src/services/fact-checker.ts` — populates CONTROL_OBJECT
- `server/src/services/feasibility-layer.ts` — populates feasibility.*
- `server/src/services/decision-layer.ts` — primary consumer
- `server/src/services/pipeline.ts` — auto-loop consumer; event emitter
- `server/src/services/evaluation-dataset-writer.ts` — evaluation_link source
- `docs/adrs/ADR-FACT-CHECKER-UNIFIED-KERNEL.md` — kernel architecture
- `docs/adrs/ADR-PHASE-PROFILES.md` — confidence_weights per domain
- `docs/adrs/ADR-CAUSAL-DAG.md` — Phase 8 (causal_chain activation)
- `docs/adrs/ADR-ML-BANDITS.md` — Phase 6 (context.selected_variant_id)
- `docs/adrs/ADR-DOMAIN-BENCHMARKS.md` — Phase 10 (context.benchmark_reference_id)
