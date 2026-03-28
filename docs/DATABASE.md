# Database Schema

## Overview

PostgreSQL on Supabase. 6 tables. Row Level Security on all tables. Realtime enabled on `pipeline_events` and `audits`.

Run `server/migrations/001_initial_schema.sql` in the Supabase SQL editor to create all tables and policies.

---

## Tables

### `audits`

Master record for each audit run.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES auth.users(id) NOT NULL
company_url     text NOT NULL
company_name    text
industry        text
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

UNIQUE(audit_id, domain_key)
```

**`domain_key` values:** `tech_infrastructure` | `security_compliance` | `seo_digital` | `ux_conversion` | `marketing_utp` | `automation_processes`

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
```

---

## Row Level Security

All tables have RLS enabled. The policy pattern on every table:

```sql
-- Users can only see their own rows
CREATE POLICY "user_isolation" ON table_name
  FOR ALL USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid())
  );

-- audits table uses user_id directly
CREATE POLICY "user_isolation" ON audits
  FOR ALL USING (user_id = auth.uid());
```

The backend uses the **service role key** which bypasses RLS. The frontend uses the **anon key** which is subject to RLS.

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
