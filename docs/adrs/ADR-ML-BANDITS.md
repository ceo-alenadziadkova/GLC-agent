# ADR-ML-BANDITS
## Phase 6 — ML-Driven Bandit Agent-Variant Selection

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-04-12 |
| **Phase** | Phase 6 (Roadmap) |
| **Authors** | Engineering |
| **Implements** | Sprint 2 — ML Bandits |
| **Supersedes** | N/A |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Status will change to **Accepted** when Sprint 2 implementation begins. The design described here is authoritative; deviations require a new ADR.

---

## Context

Phase 5 introduced `agent_performance_aggregate` — a rolling-average table of per-agent quality metrics (hallucination rate, risky promise rate, inconsistency rate, unverified rate, agent_score) across all runs. This data exists but is not yet used to influence pipeline behaviour.

Meanwhile, `BaseAgent` has no mechanism for choosing between instruction variants. For any given domain phase, only one instruction set is used regardless of its empirical track record.

Two gaps remain from the Phase 5 "Deferred" table (ADR-AUTO-LOOP-RULE-ENGINE.md):
1. **No online variant selection.** There is no system for A/B testing or iteratively selecting better-performing agent instruction variants.
2. **Performance aggregate is only retrospective.** It is stored but not acted on. The data needs a consumer that closes the feedback loop.

---

## Decision

### 1. BanditService

**File:** `server/src/services/bandit.ts` (new)

A `BanditService` selects from registered agent variants for a given phase using an ε-greedy algorithm over the `agent_performance_aggregate` table.

**Input:**
- `phase_id: string` — the domain phase being run
- `registered_variants: AgentVariant[]` — variants available for this phase

**Output:**
- `selected_variant_id: string` — the variant to use
- Falls back to `'default'` when readiness gate fails

**Algorithm — ε-greedy:**
```
ε = 0.15   // explore 15% of the time
if random() < ε:
  return random variant from registered_variants  // exploration
else:
  return variant with highest aggregate agent_score for this phase_id  // exploitation
```

Thompson Sampling may replace ε-greedy in a future phase once Beta distribution priors can be estimated from evaluation data. ε-greedy is chosen for Phase 6 because it requires no distributional assumptions and is interpretable.

---

### 2. Readiness Gate

The BanditService does **not** activate until all three readiness conditions are met. If any condition fails, the service returns the `'default'` variant and logs a `BANDIT_GATE_MISS` reason.

| Condition | Value | Rationale |
|---|---|---|
| `score_reliable` per agent | `MIN_EVALUATION_COUNT ≥ 10` runs recorded | Single-run scores are noisy |
| `MIN_PHASES_WITH_DATA` | ≥ 3 distinct `phase_id`s have ≥ 10 runs each | Prevents one outlier client from skewing the policy |
| `MAX_VARIANTS_PER_PHASE` | ≤ 3 | ε-greedy converges poorly over large action spaces at early data volumes; expand after Phase 10 benchmarks |

```typescript
function isReady(phase_id: string, variants: AgentVariant[], aggregates: AgentAggregate[]): boolean {
  const phasesWithData = countPhasesWithMinRuns(aggregates, MIN_EVALUATION_COUNT);
  if (phasesWithData < MIN_PHASES_WITH_DATA) return false;
  if (variants.length > MAX_VARIANTS_PER_PHASE) return false;
  const phaseAggregate = aggregates.find(a => a.phase_id === phase_id);
  if (!phaseAggregate || phaseAggregate.run_count < MIN_EVALUATION_COUNT) return false;
  return true;
}
```

---

### 3. Scope Boundary

**Bandits affect only agent/prompt variant selection.** They do not touch:

- Decision Layer routing (`accept` / `refine` / `restart` logic is unchanged)
- CONTROL_OBJECT structure or decision_hint values
- Rule Engine instruction patches (those are error-driven, not performance-driven)
- Fact-Checker logic or phase profiles

The only CONTROL_OBJECT change is:
```typescript
context.selected_variant_id?: string;  // set when bandit activates; omitted when fallback
```

This field is informational — it enables downstream analysis of "which variant produced this output" without influencing the pipeline flow.

---

### 4. Agent Variant Registration

Variants are registered in `server/src/config/agent-variants.ts` (new file, Sprint 2).

```typescript
interface AgentVariant {
  variant_id: string;         // e.g. 'default', 'conservative', 'structured_output'
  phase_id: string;           // which domain phase this variant applies to
  instruction_delta: string;  // instruction text that replaces or appends to base instructions
  delta_type: 'append' | 'replace';
}
```

Only variants explicitly registered in this config are eligible for bandit selection. Unregistered variants are never selected.

---

### 5. Feature Flag

```
FEATURE_BANDITS=false   // default in all environments
```

When `false`, `BanditService.selectVariant()` always returns `'default'` and logs `BANDIT_DISABLED`. No aggregate reads or writes occur.

Enable per environment after readiness gate criteria are met in that environment's data:
1. Deploy Phase 6 with `FEATURE_BANDITS=false` — confirm aggregate table is accumulating data
2. Enable on `sandbox` once MIN_PHASES_WITH_DATA ≥ 3 in sandbox evaluation_dataset
3. Enable on `production` only after ≥ 2 weeks of sandbox monitoring showing quality improvement

---

## CONTROL_OBJECT Changes: v2.1 → v2.2

| Field | v2.1 | v2.2 |
|---|---|---|
| `context.selected_variant_id` | — | `string? \| undefined` |
| `versions.system_version` | `'v2.1'` | `'v2.2'` |

---

## Consequences

**Positive:**
- Closes the feedback loop: evaluation data now drives selection, not just observation
- Gradual, safe rollout: feature flag + readiness gate prevent premature activation
- Interpretable algorithm (ε-greedy): easy to debug, audit, and explain to stakeholders
- No impact on existing pipeline logic: pure addition, not modification

**Negative / Risks:**
- Agent performance aggregate can drift if evaluation rows are deleted (retention expiry). Phase 6 should include a periodic full-recompute job for `agent_performance_aggregate`.
- ε-greedy with ε=0.15 still explores 15% of the time — some audits will use a non-optimal variant intentionally. This is a feature (exploration), not a bug, but consultants may notice quality variance if they receive back-to-back audits on the same phase.
- Variant registration in config is manual. There is no automated discovery of what variants exist. A misconfigured `variant_id` will silently fall back to `'default'`.

---

## Deferred

| Feature | Rationale |
|---|---|
| Thompson Sampling | Requires Beta prior estimation; viable after 50+ runs per variant per phase |
| Contextual bandits (audit-profile-aware selection) | Requires feature engineering on audit metadata |
| Automatic variant discovery | Nice-to-have; manual registration is safe and explicit |
| Action space > 3 variants | Expand after Phase 10 benchmarks provide sufficient data |

---

## References

- `server/src/services/bandit.ts` — BanditService (Sprint 2, new)
- `server/src/config/agent-variants.ts` — variant registry (Sprint 2, new)
- `server/src/services/agent-performance.ts` — aggregate data source
- `server/src/services/pipeline.ts` — injection site (calls BanditService before agent instantiation)
- `server/src/schemas/control-object.ts` — context.selected_variant_id addition
- `docs/adrs/ADR-AUTO-LOOP-RULE-ENGINE.md` — Phase 5 (deferred bandit item)
- `docs/adrs/ADR-DOMAIN-BENCHMARKS.md` — Phase 10 (provides data to expand action space)
