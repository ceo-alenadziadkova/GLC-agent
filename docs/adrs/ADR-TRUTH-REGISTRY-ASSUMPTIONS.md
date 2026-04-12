# ADR-TRUTH-REGISTRY-ASSUMPTIONS
## Truth Registry, Phase Profiles & Assumptions Layer

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Phase** | Phase 2 |
| **Authors** | Engineering |
| **Implements** | Sprint Implementation Plan — Phase 2 |
| **Supersedes** | N/A |

---

## Context

After Phase 1 established the CONTROL_OBJECT v1 MVP, two gaps remained:

1. **Source opacity** — claims in CONTROL_OBJECT's trace had `truth_source` values but no formal registry defined which sources were authoritative for which domains, or how conflicts between sources should be resolved.

2. **Assumption flatness** — v1 assumptions carried only `id`, `statement`, and `source`. There was no indication of _how risky_ an assumption was, or which downstream claims depended on it. Consultants reviewing a refine decision could not quickly identify the most dangerous inferences.

Additionally, Phase 2 introduces **evaluation dataset logging** to collect per-phase run snapshots. These will feed Phase 5's agent performance aggregation and, eventually, Phase 6+ ML-driven optimisation.

---

## Decision

### 1. Truth Registry — Priority-Based Source Resolution

**File**: `server/src/config/truth-registry.ts`

We maintain a single `TRUTH_REGISTRY` with three sources and a fixed priority order:

| Priority | Source | Description |
|---|---|---|
| 1 (highest) | `internal_metrics` | Collected product data: crawl results, analytics, logs |
| 2 | `user_brief` | Client-provided BRIEF: goals, constraints, team info |
| 3 (lowest) | `external_search` | Public data: industry reports, search results, benchmarks |

Conflict resolution strategy: **`priority_based`**. When two sources disagree on the same fact, the source with the lower priority number wins.

**Rationale for priority-based (not weighted):** Priority covers 90% of real conflicts and is deterministic. A score weighting system (e.g. 60/30/10%) would require calibration data we don't have yet. We can migrate to weighted resolution in v2.0 when evaluation_dataset history is large enough.

The registry is intentionally **not hardcoded per-claim** — it's a system-wide policy. Individual overrides can be introduced in Phase 3+ if specific domains require different source hierarchies.

---

### 2. Phase Profiles — Per-Domain Claim Scrutiny

**File**: `server/src/config/truth-registry.ts` (exported `PHASE_PROFILES`)

Each of the 6 audit domains has a `PhaseProfile` specifying:

- **`high_risk_fact_types`**: claim patterns that require elevated evidence scrutiny (e.g. `sla_claim`, `compliance_status`, `market_size_claim`). Any claim matching one of these types that lacks an authoritative source elevates the assumption risk of any related inference.

- **`authoritative_sources`**: which Truth Registry sources are considered ground truth for this domain. Claims not backed by any of these are classified as `UNVERIFIED` in CONTROL_OBJECT counts.

- **`error_types`**: domain-specific error codes surfaced in `errors.structural`. These replace the generic `score_evidence_mismatch` label with precise, actionable identifiers (e.g. `security_overclaim`, `infra_unrealistic_timeline`).

- **`default_assumption_risk`**: baseline risk level for inferences in this domain. Security and Infrastructure default to `'medium'`; UX defaults to `'low'` (UX hypotheses are expected; being wrong is lower stakes).

**Rationale**: Domain-agnostic error codes were too coarse for consultants. "Score mismatch" on a security phase means something different from the same message on a marketing phase. Phase profiles give the Decision Layer and human reviewers precise vocabulary.

---

### 3. Assumptions Layer (v1.5) — Risk + Dependency Tracking

CONTROL_OBJECT v1.5 extends assumptions with two new fields:

```typescript
interface ControlObjectAssumption {
  id: string;
  statement: string;
  source: 'inferred_from_brief' | 'inferred_from_pattern' | 'manual_input';
  // v1.5 additions:
  risk: 'low' | 'medium' | 'high';
  related_claim_ids: number[];
}
```

**Risk assignment logic** (in `FactChecker.buildControlObject()`):

1. Start from the phase profile's `default_assumption_risk`.
2. If the source issue has `severity === 'critical'` → override to `'high'`.
3. If the source issue has `severity === 'high'` → promote one level (low→medium, medium stays medium if profile default is medium or high).
4. Otherwise use profile default.

**`related_claim_ids`**: In v1.5 each assumption links to the claim_id of the issue that generated it. Future phases will expand this to graph-style cross-claim dependency tracking for auto-loop root cause analysis.

**Escalation to human attention**: `human_attention_required.required = true` when:
- `high`-risk assumptions ≥ 2, **or**
- `medium`-risk assumptions ≥ 5

This is more precise than v1's blanket "any 3 assumptions" threshold, which was too noisy.

---

### 4. Evaluation Dataset — Per-Phase Run Logging

**Type file**: `server/src/types/evaluation-dataset.ts`  
**DDL**: `server/migrations/051_evaluation_datasets_and_execution_mode.sql`  
**Writer**: `server/src/services/evaluation-dataset-writer.ts` (best-effort insert; failures are logged only)

After each domain phase, once `DecisionLayer` has set `decision_hint` and `control_object` is emitted, the orchestrator calls `recordEvaluationDatasetIfEnabled()` with sanitised JSON. Inserts are **disabled** when env `EVALUATION_DATASETS_INSERT=false` (default: enabled). This is a synchronous write on the hot path, kept minimal so it does not block success of the phase.

| Column | Purpose |
|---|---|
| `control_object` | Full CONTROL_OBJECT v1.5 snapshot (post Decision Layer) |
| `agent_output` | Raw DomainResult before fact-checker corrections |
| `cleaned_output` | DomainResult after corrections (what was saved to `audit_domains`) |
| `human_feedback` | Consultant's post-gate decision + corrections (populated at review gates) |
| `decision_applied` | `accept` / `accept_with_warnings` / `refine` |
| `retention_policy` | `default` (90 days) / `extended` (1 year) / `internal_only` (1 year) |
| `pii_sanitized` | Set `true` after `sanitizeJsonForEvaluationDataset()` in the writer |

**Retention**:
- Default rows expire after 90 days. An async job (hourly) deletes expired rows.
- Internal/learning samples use `extended` or `internal_only` policy (365 days).
- `expires_at` is a DB-generated column — never set manually.

**PII policy**: The writer applies deterministic redaction (URLs, emails, sensitive key names) before insert and sets `pii_sanitized=true`. A DB constraint enforcing `pii_sanitized` may be added in Phase 4+.

**Advisory-only in Phase 2**: `evaluation_datasets` is purely observational. No service reads from it in Phase 2. Phase 5 will add an async aggregation job to `agent_performance_aggregate`.

---

## CONTROL_OBJECT Changes: v1.0 → v1.5

| Field | v1.0 | v1.5 |
|---|---|---|
| `context.truth_profile_id` | — | `string \| null` — references PHASE_PROFILES key |
| `assumptions[].risk` | — | `'low' \| 'medium' \| 'high'` |
| `assumptions[].related_claim_ids` | — | `number[]` — claim IDs that depend on this assumption |
| `trace.claim_sources[].truth_source` | String (inline) | Resolved via `mapDataSourceToTruthSource()` registry helper |
| `errors.structural` | Generic strings only | Phase-specific error codes from `PHASE_PROFILES.error_types` |
| `versions.system_version` | `'v1.0'` | `'v1.5'` |
| `versions.fact_checker_version` | `'v1.0'` | `'v1.5'` |

All v1.0 consumers remain compatible: new fields are additive and the CONTROL_OBJECT is still advisory-only.

---

## Consequences

**Positive**:
- Consultants reviewing `refine` decisions now see precisely which domain-specific error triggered it (e.g. `security_overclaim` vs generic `score_evidence_mismatch`).
- High-risk assumptions surface to `human_attention_required` only when they're genuinely load-bearing — less noise than v1.
- Evaluation dataset creates the data foundation needed for Phase 5 learning loop.
- Truth source resolution is consistent across all domains via a single registry.

**Negative / Risks**:
- Phase profiles require maintenance as domains evolve. If a new claim type emerges, `error_types` must be updated manually.
- `related_claim_ids` in v1.5 is shallow (single-link). Cross-claim dependency graphs (needed for auto-loop root-cause analysis) are deferred to Phase 5.
- Evaluation dataset inserts are synchronous in Phase 2 (no async queue yet). On high-load audits this may add latency. Phase 5 will move to an async job.

---

## Deferred

| Feature | Phase |
|---|---|
| Weighted source conflict resolution | v2.0 (Phase 5) when dataset history is available |
| Cross-claim dependency graph (`related_claim_ids` as DAG) | Phase 5 (auto-loop root cause) |
| `agent_performance_aggregate` job from evaluation_datasets | Phase 5 |
| External truth source connectors (live API, document feed) | Phase 7 |
| DB constraint enforcing `pii_sanitized = true` | Phase 4 |

---

## References

- `server/src/config/truth-registry.ts` — Truth Registry + Phase Profiles
- `server/src/schemas/control-object.ts` — CONTROL_OBJECT v1.5 schema
- `server/src/services/fact-checker.ts` — `buildControlObject()` implementation
- `server/src/types/evaluation-dataset.ts` — EvaluationDataset type + SQL migration
- `docs/adrs/ADR-CONTROL-OBJECT-V1.md` — v1.0 governance contract
- `docs/adrs/ADR-DECISION-LAYER-GATES.md` — three-state routing
- `docs/adrs/GAP-ANALYSIS-PHASE0.md` — Phase 0 reuse map
