# Database Schema

## Overview

PostgreSQL on **Supabase**. Apply migrations **in numeric order** so foreign keys, RLS, and triggers exist before later tables reference them:

1. `001_initial_schema.sql` — core audit tables
2. `002_stability_indexes.sql`
3. `003_atomic_token_increment.sql`
4. `004_product_mode.sql` — `product_mode`, `snapshot_token`, nullable `user_id` rules for free snapshot
5. `005_client_portal.sql` — `profiles`, `audit_requests`, `client_id` on `audits`
6. `006_intake_brief.sql` — `intake_brief`
7. `007_finding_provenance.sql` — extra columns on `audit_domains`
8. `008_reliability_idempotency.sql` — `api_idempotency_keys` for safe replay of critical writes
9. `009_prompt_version_quality_gate.sql` — `prompt_version` in `audit_domains`, `quality_gate_passed` in `review_points`, client-read RLS policies on downstream tables
10. `010_intake_progress_gamification.sql` — progressive intake and readiness fields in `intake_brief`
11. `011_intake_tokens.sql` — `intake_tokens` for shareable pre-brief links (consultant-created; client-submitted responses)

**Tables (12):** `audits`, `audit_recon`, `audit_domains`, `audit_strategy`, `pipeline_events`, `collected_data`, `review_points`, `profiles`, `audit_requests`, `intake_brief`, `api_idempotency_keys`, `intake_tokens`.

Row Level Security is enabled on these tables; exact policies differ by table (consultant vs client access). **Canonical SQL:** the migration files — this doc summarises shapes.

Realtime: enabled on `pipeline_events` and `audits` (see [FRONTEND.md](./FRONTEND.md) / [ARCHITECTURE.md](./ARCHITECTURE.md)).

---

## Tables

### `audits`

Master record for each audit run.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES auth.users(id)  -- NULL allowed only for product_mode = 'free_snapshot' (see migration 004)
client_id       uuid REFERENCES profiles(id)    -- optional; client portal (migration 005)
company_url     text NOT NULL
company_name    text
industry        text
product_mode    text NOT NULL DEFAULT 'full'      -- 'free_snapshot' | 'express' | 'full' (migration 004)
snapshot_token  uuid                             -- public polling for free snapshot (migration 004)
status          text DEFAULT 'created'
current_phase   int DEFAULT 0
overall_score   numeric(3,1)
token_budget    int DEFAULT 200000
tokens_used     int DEFAULT 0
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

**`status` values:** `created` → `recon` → `auto` → `analytic` → `review` → `completed` | `failed`

---

### `audit_recon`

Recon phase output: company profile extracted from the crawled site.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id        uuid REFERENCES audits(id) ON DELETE CASCADE
status          text DEFAULT 'pending'
company_name    text
industry        text
location        text
languages       jsonb DEFAULT '[]'
tech_stack      jsonb DEFAULT '{}'
social_profiles jsonb DEFAULT '{}'
contact_info    jsonb DEFAULT '{}'
pages_crawled   jsonb DEFAULT '[]'
brief           text
interview_answers text
created_at      timestamptz DEFAULT now()
```

---

### `audit_domains`

One row per domain per audit. Stores the full Claude output for each domain.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id        uuid REFERENCES audits(id) ON DELETE CASCADE
domain_key      text NOT NULL
phase_number    int NOT NULL
status          text DEFAULT 'pending'
score           int CHECK (score BETWEEN 1 AND 5)
label           text
version         int DEFAULT 1
summary         text
strengths       jsonb DEFAULT '[]'      -- string[]
weaknesses      jsonb DEFAULT '[]'      -- string[]
issues          jsonb DEFAULT '[]'      -- [{severity, title, description, impact}]
quick_wins      jsonb DEFAULT '[]'      -- [{id, title, description, effort, timeframe}]
recommendations jsonb DEFAULT '[]'      -- [{title, description, priority, cost, time, impact}]
raw_data        jsonb DEFAULT '{}'
created_at      timestamptz DEFAULT now()

UNIQUE(audit_id, domain_key, version)
```

**`domain_key` values:** `tech_infrastructure` | `security_compliance` | `seo_digital` | `ux_conversion` | `marketing_utp` | `automation_processes`

**Migration 007:** adds `confidence_distribution` (jsonb) and `unknown_items` (jsonb) for provenance / gap tracking.
**Migration 009:** adds `prompt_version` (`varchar(20)`) to track prompt contract version per domain row.

**`status` values:** `pending` | `collecting` | `assembling_context` | `analyzing` | `completed` | `failed`

Re-running a phase increments `version` and keeps the old row history.

---

### `audit_strategy`

Strategy phase output: cross-domain synthesis.

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id          uuid REFERENCES audits(id) ON DELETE CASCADE
status            text DEFAULT 'pending'
executive_summary text
overall_score     numeric(3,1)
quick_wins        jsonb DEFAULT '[]'   -- StrategyInitiative[]
medium_term       jsonb DEFAULT '[]'   -- StrategyInitiative[]
strategic         jsonb DEFAULT '[]'   -- StrategyInitiative[]
scorecard         jsonb DEFAULT '[]'   -- [{domain, score, label}]
created_at        timestamptz DEFAULT now()
```

**`StrategyInitiative` shape:**
```json
{ "id": "uuid", "title": "...", "description": "...", "impact": "high|medium|low", "effort": "low|medium|high" }
```

---

### `pipeline_events`

Immutable event log. Frontend subscribes via Supabase Realtime to receive live updates.

```sql
id          bigserial PRIMARY KEY
audit_id    uuid REFERENCES audits(id) ON DELETE CASCADE
phase       int NOT NULL
event_type  text NOT NULL
message     text
data        jsonb DEFAULT '{}'
created_at  timestamptz DEFAULT now()
```

**`event_type` values:**

| Type | When emitted | `data` payload |
|---|---|---|
| `collecting` | Collector started | `{ collector: string }` |
| `assembling_context` | Context builder started | `{}` |
| `analyzing` | Claude call started | `{}` |
| `fact_check` | Fact-check corrections applied | `{ corrections: [...] }` |
| `completed` | Phase finished | `{ score: number }` |
| `error` | Phase failed | `{ error: string }` |
| `review_needed` | Review gate reached | `{ after_phase: number }` |
| `token_usage` | After each Claude call | `{ input_tokens, output_tokens, model, cost_usd }` |
| `quality_gate` | Consistency checker result | Quality gate report payload (see `ConsistencyChecker`) |
| `log` | Debug/info | `{ message: string }` |

---

### `collected_data`

Cache of raw collector output. Re-running a failed phase reuses this; only the Claude call is re-executed.

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id      uuid REFERENCES audits(id) ON DELETE CASCADE
collector_key text NOT NULL
phase         int NOT NULL
data          jsonb NOT NULL
created_at    timestamptz DEFAULT now()

UNIQUE(audit_id, collector_key)
```

**`collector_key` values:** `crawler` | `recon` | `security_headers` | `seo_meta` | `performance` | `accessibility`

---

### `review_points`

Tracks review gate approvals and consultant/interview notes.

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id         uuid REFERENCES audits(id) ON DELETE CASCADE
after_phase      int NOT NULL
status           text DEFAULT 'pending'   -- pending | approved
consultant_notes text
interview_notes  text
approved_at      timestamptz
quality_gate_passed boolean                -- added by migration 009
```

---

### `profiles`

User roles and display metadata. **`role`:** `consultant` | `client` (migration `005_client_portal.sql`).

---

### `audit_requests`

Client-submitted audit requests before an `audits` row is attached. Status workflow: `draft` → `submitted` → `under_review` → `approved` | `rejected` → `running` → `delivered` (see migration `005`).

---

### `intake_brief`

Structured questionnaire responses per audit. One row per audit (unique `audit_id`).

Core fields:

- `responses` (`jsonb`) — versioned payload (`responses_format`), supports legacy flat values and structured `{ value, source }`.
- `status` (`draft` | `submitted`) and SLA counters (`answered_required`, `answered_recommended`, `answered_optional`).
- Progressive intake metadata: `layer_completed`, `collected_by`, `collection_mode`, `data_quality_score`, `recon_prefills`, `post_audit_questions`.
- Server-derived gamification/readiness state:
  - `progress_pct` (`0..100`),
  - `readiness_badge` (`low|medium|high`),
  - `next_best_action` (`complete_required|add_recommended|confirm_prefill|none`).

Contract rule: readiness/progress fields are derived on the backend on each save/update and treated as canonical API data (frontend renders only).

Migrations: `006_intake_brief.sql`, `010_intake_progress_gamification.sql`.

---

### `api_idempotency_keys`

Stores request fingerprints and prior responses for idempotent replay on critical write endpoints.

Key fields: `user_id`, `route`, `idempotency_key`, `request_hash`, `response_status`, `response_body`, `expires_at`.

Uniqueness: `(user_id, route, idempotency_key)` via unique index.

Migration: `008_reliability_idempotency.sql`.

---

### `intake_tokens`

Pre-brief magic links: consultant creates a row; the client opens a public URL and POSTs answers until `expires_at`. Optional `audit_id` merges responses into `intake_brief` on submit.

Access is via **service role** in the API (no RLS on this table); the `token` value is unguessable (40 hex chars).

Migration: `011_intake_tokens.sql`.

---

## Row Level Security

RLS is enabled on all application tables. Policies evolved across migrations: consultants, linked clients (`client_id`), and free-snapshot rows each have specific rules. **Do not copy legacy “single policy” snippets from older docs** — use the migration files as source of truth.

Typical pattern:

- **Backend** uses the **service role key** and bypasses RLS; it must still filter by `user_id` / ownership in route handlers.
- **Frontend** uses the **anon key** and is subject to RLS.

Threat model and JWT verification: [SECURITY.md](./SECURITY.md). Auth roles: [AUTH.md](./AUTH.md).

---

## Realtime

Enabled on `pipeline_events` and `audits` tables. Frontend subscribes with:

```typescript
supabase
  .channel(`pipeline:${auditId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'pipeline_events',
    filter: `audit_id=eq.${auditId}`,
  }, callback)
  .subscribe();
```

---

## Token Budget

- `audits.token_budget` defaults to 200,000 tokens per audit.
- After each Claude call the backend writes a `token_usage` event to `pipeline_events` and updates `audits.tokens_used`.
- The pipeline service checks `tokens_used < token_budget` before starting each phase. If exceeded, the phase fails with an error event.

See [PIPELINE.md#token-tracking](./PIPELINE.md#token-tracking).
