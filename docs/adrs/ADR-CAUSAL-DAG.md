# ADR-CAUSAL-DAG
## Phase 8 — Cross-Phase Dependency Analysis: Causal Chain to Full DAG with Upstream Invalidation

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-04-12 |
| **Phase** | Phase 8 (Roadmap) |
| **Authors** | Engineering |
| **Implements** | Sprint 4 — Causal DAG |
| **Supersedes** | N/A |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Status changes to **Accepted** when Sprint 4 begins. `causal_chain` in CONTROL_OBJECT has been pre-declared as optional since v2.1 (ADR-CONTROL-OBJECT-V2-FULL.md) in preparation for this change.

---

## Context

Current traceability (Phase 5, ADR-AUTO-LOOP-RULE-ENGINE.md) links errors back to the agent and section that produced them via `trace.claim_sources` and `trace.error_sources`. This enables single-phase root-cause analysis: "Agent 5, Section 'Content Strategy' produced claim #12 which is LIKELY_HALLUCINATION."

What it cannot do:
1. **Cross-phase dependency tracking.** If a Security phase claim ("GDPR compliance is satisfied") is used as a premise by the Automation phase recommendation ("auto-process can handle PII"), and the Security claim is later invalidated, there is no mechanism to flag the Automation recommendation as potentially invalid.
2. **Upstream invalidation.** When a `restart` decision occurs in phase N, the pipeline reruns from that phase forward. But if downstream phases (N+1, N+2) were already accepted, they may now contain claims that depend on invalidated upstream output. There is no structured way to identify which of those claims are affected.

This is the **causal chain gap** explicitly deferred in ADR-SAFETY-MODE-EXECUTION.md (Phase 4) and re-deferred in ADR-AUTO-LOOP-RULE-ENGINE.md (Phase 5).

---

## Decision

### 1. Causal Chain in CONTROL_OBJECT

`trace.causal_chain[]` becomes **required** in CONTROL_OBJECT v2.2 (previously pre-declared as optional `[]`).

```typescript
trace: {
  claim_sources: [...],  // unchanged
  error_sources: [...],  // unchanged
  causal_chain: Array<{   // v2.2: now required
    claim_id: number;
    depends_on: number[]; // IDs of claims this claim relies on as premises
    origin: string;       // phase_id where the depended-on claim was produced
  }>;
}
```

**Construction:** FactCheckerService builds `causal_chain` entries for high-risk claims that reference output from prior phases. A claim in Phase 5 (Marketing) that uses "audience size = 500K SMBs" from Phase 0 (Recon) gets `depends_on: [recon_claim_id]` and `origin: 'recon'`.

**Scope for Phase 8:** Only explicit cross-phase dependencies are tracked. Intra-phase dependencies (claim A in Phase 3 depends on claim B also in Phase 3) are deferred to Phase 8 v2.

---

### 2. audit_claim_graph Table

Cross-phase dependencies accumulate across the full pipeline run and are stored persistently for audit-level analysis.

**New Supabase table: `audit_claim_graph`**

```sql
CREATE TABLE audit_claim_graph (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id      uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  claim_id      integer NOT NULL,
  phase_id      text NOT NULL,
  depends_on    integer[] NOT NULL DEFAULT '{}',
  origin_phase  text,
  status        text NOT NULL,  -- most recent status for this claim
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_claim_graph_audit_id ON audit_claim_graph(audit_id);
CREATE INDEX idx_audit_claim_graph_depends_on ON audit_claim_graph USING GIN(depends_on);
```

The GIN index on `depends_on` enables efficient lookup: "which claims depend on claim_id X?"

---

### 3. Upstream Invalidation in Decision Layer

When the Decision Layer receives a `restart` or hard `refine` decision for phase N, it consults `audit_claim_graph` to identify downstream claims that transitively depend on claims from phase N.

```
invalidate(phase_id: string, claim_ids: number[], audit_id: string):
  1. Look up audit_claim_graph WHERE audit_id = ? AND origin_phase = phase_id AND claim_id IN claim_ids
  2. Find all claims WHERE depends_on ∩ invalidated_claim_ids ≠ ∅
  3. Repeat transitively (breadth-first) until no new dependents found
  4. For each affected claim in downstream phases:
     - Mark status = 'invalidated' in audit_claim_graph
     - Add to CONTROL_OBJECT.errors.structural: 'upstream_claim_invalidated'
     - Set human_attention_required.required = true (if downstream phase was already accepted)
```

**Key constraint:** If a downstream phase is already in `status = 'accepted'` in the pipeline, upstream invalidation sets `human_attention_required.required = true` rather than automatically rerunning that phase. Automatic cascade reruns across phases are not safe without human review — the cost and consistency implications are too significant.

---

### 4. DAG Cycle Prevention

A DAG cannot contain cycles. FactCheckerService validates that `depends_on` references only claims from phases that precede the current phase in pipeline order.

Phase order is defined by the pipeline phase map in `server/src/services/pipeline.ts`. Any attempt to add a `depends_on` reference to a claim in the same or later phase is silently ignored and logged as a warning.

---

### 5. Feature Flag

```
FEATURE_CAUSAL_DAG=false   // default
```

When `false`:
- `trace.causal_chain` is set to `[]` (empty, as in v2.1 default)
- `audit_claim_graph` table is not written to
- Upstream invalidation logic in Decision Layer is skipped

This allows Phase 8 to be deployed without activating the feature until QA validates DAG construction accuracy.

---

## CONTROL_OBJECT Changes: v2.2 → v2.3 (Phase 8)

| Field | Change |
|---|---|
| `trace.causal_chain[]` | Was optional `[]`; now required (populated when `FEATURE_CAUSAL_DAG=true`) |
| `errors.structural[]` | Adds `'upstream_claim_invalidated'` error type |
| `versions.system_version` | `'v2.3'` |

---

## Consequences

**Positive:**
- Upstream invalidation makes multi-phase consistency auditable and actionable, not just observable
- Root-cause analysis improves: a quality problem in Automation can now be traced to an incorrect Security claim that downstream agents inherited
- `audit_claim_graph` is a durable, queryable artifact that persists even after pipeline events expire

**Negative / Risks:**
- DAG construction adds per-claim analysis overhead. For a large audit with 120+ claims across 6 phases, this could add 200–500ms per phase. Mitigation: only track cross-phase dependencies (not intra-phase) in Phase 8; profile before activating on production.
- `depends_on` references require FactCheckerService to have access to claim IDs from prior phases. This means CONTROL_OBJECT outputs from earlier phases must be available in memory during later phase checks. Pipeline must be updated to pass prior CO summaries into the context.
- The GIN index on `depends_on` (integer array) requires PostgreSQL ≥ 10. Supabase satisfies this requirement.

---

## Deferred

| Feature | Rationale |
|---|---|
| Intra-phase dependency tracking | Adds significant complexity; cross-phase covers the highest-value use case |
| Automatic cascade rerun across phases | Too risky without human review for accepted phases |
| DAG visualisation in frontend | UX work; valuable but not blocking |

---

## References

- `server/src/services/fact-checker.ts` — builds causal_chain entries
- `server/src/services/decision-layer.ts` — upstream invalidation logic (Sprint 4)
- `server/src/schemas/control-object.ts` — trace.causal_chain becomes required
- Supabase migration: `audit_claim_graph` table (Sprint 4)
- `docs/adrs/ADR-CONTROL-OBJECT-V2-FULL.md` — causal_chain pre-declaration in v2.1
- `docs/adrs/ADR-SAFETY-MODE-EXECUTION.md` — Phase 4 (original causal chain deferral)
- `docs/adrs/ADR-AUTO-LOOP-RULE-ENGINE.md` — Phase 5 (re-deferred)
