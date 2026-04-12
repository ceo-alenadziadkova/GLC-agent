# ADR-DOMAIN-BENCHMARKS
## Phase 10 — Domain-Specific Benchmarks for Cross-Industry Agent Performance Comparison

| Field | Value |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-04-12 |
| **Phase** | Phase 10 (Roadmap) |
| **Authors** | Engineering |
| **Implements** | Sprint 6 — Domain benchmarks |
| **Supersedes** | N/A |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. Status changes to **Accepted** when Sprint 6 begins.

---

## Context

By Phase 9, the system accumulates structured per-run quality data in:
- `evaluation_dataset` — full CONTROL_OBJECT + human feedback + final decision per run
- `agent_performance_aggregate` — rolling average quality metrics per agent per phase

This data is rich enough to answer questions like:
- "What is the typical confidence score for Security audits in fintech companies?"
- "Which phase consistently underperforms relative to other phases?"
- "Does the new instruction variant for Marketing (selected by bandits) actually improve quality vs. the default?"

Today, none of these questions can be answered from within the system. There is no aggregation layer, no cross-industry comparison, and no benchmarking surface exposed to consultants. Consultants have no reference point for whether a `confidence.overall = 72` in a Security audit is good or bad relative to the industry.

---

## Decision

### 1. domain_benchmark_snapshot Table

Cross-industry performance benchmarks are computed as a nightly batch job and stored as a time-series snapshot table.

```sql
CREATE TABLE domain_benchmark_snapshot (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  computed_at    timestamptz NOT NULL,
  phase_id       text NOT NULL,
  industry       text NOT NULL,      -- from audit.industry_tag (or 'all' for cross-industry)
  period         text NOT NULL,      -- 'last_30d' | 'last_90d' | 'all_time'
  sample_count   integer NOT NULL,
  p25            numeric NOT NULL,   -- 25th percentile confidence.overall
  p50            numeric NOT NULL,   -- median
  p75            numeric NOT NULL,
  p90            numeric NOT NULL,
  avg_score      numeric NOT NULL,
  hallucination_rate_p50  numeric,
  risky_promise_rate_p50  numeric,
  unverified_rate_p50     numeric,
  top_error_types         text[],    -- 3 most common error_type codes for this phase+industry
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_benchmarks_phase_industry ON domain_benchmark_snapshot(phase_id, industry, period);
CREATE INDEX idx_benchmarks_computed_at ON domain_benchmark_snapshot(computed_at DESC);
```

`industry` is populated from an `industry_tag` field on the `audits` table (to be added as a nullable column in Sprint 6 migration). Audits without an industry tag contribute to the `'all'` bucket only.

---

### 2. Nightly Batch Job

**File:** `server/src/jobs/benchmark-snapshot.ts` (new)

The job runs nightly (default: 02:00 local time, configurable via `BENCHMARK_JOB_CRON`) and computes fresh snapshots for all `phase_id × industry` combinations with ≥ `MIN_SAMPLE_COUNT` (default: 20) runs in the period.

```typescript
async function computeBenchmarks(period: '30d' | '90d' | 'all_time') {
  const rows = await db
    .from('evaluation_dataset')
    .select('phase_id, audit_industry, control_object')
    .eq('final_accepted', true)  // only accepted runs
    .gte('created_at', periodStart(period));

  const grouped = groupBy(rows, r => `${r.phase_id}::${r.audit_industry ?? 'all'}`);

  for (const [key, group] of Object.entries(grouped)) {
    if (group.length < MIN_SAMPLE_COUNT) continue;
    const scores = group.map(r => r.control_object.confidence.overall);
    await upsertSnapshot({ phase_id, industry, period, ...computePercentiles(scores), sample_count: group.length });
  }
}
```

The job is idempotent — rerunning produces the same snapshot for the same data. Old snapshots are retained for trend analysis (not deleted on recompute).

---

### 3. /api/benchmarks Endpoint

New read-only endpoint (protected, consultant role):

```
GET /api/benchmarks?phase_id=security_compliance&industry=fintech&period=last_90d
```

Response:
```json
{
  "phase_id": "security_compliance",
  "industry": "fintech",
  "period": "last_90d",
  "sample_count": 47,
  "percentiles": { "p25": 61, "p50": 74, "p75": 83, "p90": 91 },
  "avg_score": 73.4,
  "top_error_types": ["compliance_unverified", "security_overclaim", "audit_trail_missing"],
  "computed_at": "2026-04-12T02:03:41Z"
}
```

`phase_id`, `industry`, and `period` are all optional — omitting returns cross-phase, cross-industry, all-time benchmarks.

---

### 4. CONTROL_OBJECT Extension

```typescript
context.benchmark_reference_id?: string;
// Set to the snapshot ID used as the reference point for this audit's confidence score.
// Populated at pipeline completion when a matching benchmark snapshot exists.
// Enables the frontend to show: "Your Security score (72) is at the 48th percentile
//  for fintech companies in the last 90 days."
```

---

### 5. Frontend: Benchmark Comparison in AuditWorkspace / StrategyLab

When `context.benchmark_reference_id` is set, the domain score card in AuditWorkspace displays a percentile indicator alongside the raw confidence score:

```
Security & Compliance
Score: 72 / 100
▼ 48th percentile for fintech (last 90 days, n=47)
```

This gives consultants immediate context without requiring them to navigate to a separate analytics view.

**StrategyLab** gets a dedicated benchmark panel showing all 6 phases side-by-side against industry peers.

---

### 6. Privacy and Data Governance

Benchmark computation uses only:
- `confidence.overall` per phase (not raw agent outputs or client data)
- `industry_tag` (aggregated category, not client identity)
- `final_accepted` flag (only accepted audits contribute)

No client-identifiable information enters the benchmark aggregates. The `evaluation_dataset` table is the only data source; it is already sanitized of PII at write time (ADR-TRUTH-REGISTRY-ASSUMPTIONS.md, Phase 2).

---

## Consequences

**Positive:**
- Consultants gain a reference frame for audit scores — absolute numbers become meaningful relative to industry
- Cross-phase comparison surfaces systematically weak phases for engineering prioritisation
- Bandit variant selection (Phase 6) gains a long-term quality signal: "does the 'conservative' variant score better than 'default' across industries?"
- `top_error_types` per phase+industry directly informs Rule Engine tuning

**Negative / Risks:**
- Cold-start problem: benchmarks are meaningless with < 20 samples per bucket. Low-volume industries will show `null` percentiles. Mitigation: `MIN_SAMPLE_COUNT` gate; UI shows "insufficient data" rather than misleading percentiles.
- Nightly compute could be slow if `evaluation_dataset` grows large. Mitigation: index on `phase_id + created_at`; compute only changed buckets using `MAX(updated_at)` watermark.
- `industry_tag` field requires consultants to tag audits. If tagging is inconsistent, the `'all'` bucket dominates and per-industry benchmarks are thin. Mitigation: suggest industry tag at audit creation (`/audit/new` form); make it selectable from a fixed taxonomy.

---

## Deferred

| Feature | Rationale |
|---|---|
| Real-time benchmark updates | Nightly is sufficient; real-time adds unnecessary complexity |
| Benchmark-driven automated prompt tuning | Requires ML infrastructure beyond Phase 10 scope |
| Cross-client company-size segmentation | Requires additional audit metadata; post-10 roadmap |

---

## References

- `server/src/jobs/benchmark-snapshot.ts` — nightly batch job (Sprint 6, new)
- Supabase migration: `domain_benchmark_snapshot` table, `audits.industry_tag` column (Sprint 6)
- `server/src/routes/benchmarks.ts` — `/api/benchmarks` endpoint (Sprint 6, new)
- `src/app/components/AuditWorkspace` — percentile indicator (Sprint 6, frontend)
- `src/app/pages/StrategyLab` — benchmark panel (Sprint 6, frontend)
- `server/src/schemas/control-object.ts` — context.benchmark_reference_id addition
- `docs/adrs/ADR-ML-BANDITS.md` — Phase 6 (agent_performance_aggregate source)
- `docs/adrs/ADR-CONTROL-OBJECT-V2-FULL.md` — context.benchmark_reference_id pre-declaration
