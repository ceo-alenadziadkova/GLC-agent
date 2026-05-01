# ADR-DOMAIN-BENCHMARKS
## Phase 10 — Domain-Specific Benchmarks for Cross-Industry Agent Performance Comparison

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-12 |
| **Phase** | Phase 10 (Roadmap) |
| **Authors** | Engineering |
| **Implements** | Sprint 6 — Domain benchmarks |
| **Supersedes** | N/A |
| **Superseded by** | — |

---

## ADR Lifecycle

This ADR is immutable once accepted. **Accepted** as of Sprint 6 implementation (2026-04).

---

## Context

By Phase 9, the system accumulates structured per-run quality data in:
- **`evaluation_datasets`** — full CONTROL_OBJECT + agent output + cleaned output per domain run; **`decision_applied`** records the Decision Layer hint at write time
- **`agent_performance_aggregate`** — rolling average quality metrics per agent per phase (observability; not the primary benchmark input)

Consultants need a reference frame for whether a `confidence.overall` score in a given domain is typical for their client’s industry cohort.

---

## Decision

### 1. `domain_benchmark_snapshot` table

Cross-industry performance benchmarks are computed on demand (platform admin or cron secret) and stored as a **time-series** snapshot table (each run **inserts** new rows; old rows retained for trends).

**Migration:** `server/migrations/056_domain_benchmark_snapshot.sql`

**RLS:** enabled with **no policies** for JWT roles — only the **service role** (Express server) reads/writes. Direct Supabase client access to this table from the browser is not supported.

**Columns** (summary): `phase_id`, `industry` (normalized `audits.industry` bucket or `all`), `period` (`last_30d` | `last_90d` | `all_time`), `sample_count`, `p25`–`p90`, `avg_score`, optional median rates derived from CONTROL_OBJECT `counts.statuses`, `top_error_types`, `computed_at`.

---

### 2. Data source and filters

- **Table:** `evaluation_datasets` (not a separate `evaluation_dataset` view).
- **Decision filter:** only rows where **`decision_applied`** is **`accept`** or **`accept_with_warnings`** (aligned with `SYSTEM_DEFAULTS.benchmarks.includedDecisionHints`).
- **Industry:** from **`audits.industry`**, normalized (trim, lowercase, whitespace → `_`). Audits with **null/empty** industry contribute **only** to the **`all`** industry bucket; tagged audits contribute to **both** their specific bucket **and** **`all`**.
- **Phase filter:** only **`DOMAIN_KEYS`** domain phases (excludes recon/strategy).

**Job implementation:** `server/src/services/benchmark-snapshot.ts` (`computeAndStoreBenchmarkSnapshots`). **Thin entry re-export:** `server/src/jobs/benchmark-snapshot.ts`.

**Tunables:** `SYSTEM_DEFAULTS.benchmarks` (`minSampleCount`, `computePeriods`, `periodDays`, `evaluationPageSize`, etc.).

---

### 3. HTTP API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/benchmarks` | Consultant JWT; requires **`FEATURE_BENCHMARKS=true`** |
| POST | `/api/benchmarks/recompute` | Header **`x-benchmark-recompute-secret`** = **`BENCHMARK_RECOMPUTE_SECRET`** |
| POST | `/api/platform/benchmarks/recompute` | Consultant JWT + **`canManagePlatformSettings`** |

**GET** query params: optional `phase_id`, `industry`, `period`. Returns the **latest** matching snapshot by `computed_at`. Response shape and error codes are documented in **`docs/API.md`**.

---

### 4. CONTROL_OBJECT extension

`context.benchmark_reference_id?: string` — UUID of the snapshot row used as the peer reference for this run. Populated in **`publishControlObjectGovernance`** (after auto-remediation, before **`evaluation_datasets`** insert) when **`FEATURE_BENCHMARKS=true`**, using **`SYSTEM_DEFAULTS.benchmarks.defaultReferencePeriod`**, preferring the audit’s normalized industry bucket and falling back to **`all`**. Schema: `server/src/schemas/control-object.ts`.

---

### 5. Frontend

- **Strategy Lab** (`src/app/pages/strategy-lab/StrategyLabPage.tsx`): panel listing all six domain phases with latest **p50** and **n** for `last_90d` (industry-specific then `all` fallback). Uses **`api.getLatestSnapshot`** (`src/app/data/api/benchmarks.ts`).
- **AuditWorkspace** percentile badge (optional in original roadmap) — deferred; Strategy Lab covers the Sprint 6 deliverable.

---

### 6. Privacy and data governance

Benchmark computation uses only aggregated numeric fields from stored CONTROL_OBJECT JSON and **`audits.industry`** (category text). Raw agent outputs are not scanned for benchmarks beyond what is already persisted in **`evaluation_datasets`**. **`evaluation_datasets`** rows are subject to existing sanitisation and TTL (`expires_at`).

---

## Consequences

**Positive:** Consultants gain cohort context; engineering can compare phase health across industries; **`top_error_types`** supports rule-engine tuning.

**Negative / risks:** Cold start when **`sample_count` < `minSampleCount`** — no snapshot row for that bucket; UI shows **—**. Recompute cost grows with `evaluation_datasets` size — mitigated by indexed `(phase_id, created_at)` and paginated range scans.

---

## References

- `server/src/services/benchmark-snapshot.ts`
- `server/migrations/056_domain_benchmark_snapshot.sql`
- `server/src/routes/benchmarks.ts`
- `server/src/routes/platform.ts` — `POST /benchmarks/recompute`
- `packages/glc-api-paths/src/index.ts` — `API_PATHS.benchmarks`, `apiBenchmarksQuery`
- `server/src/config/feature-flags.ts` — `isBenchmarksEnabled` / **`FEATURE_BENCHMARKS`**
- `docs/API.md` — Domain benchmarks section
