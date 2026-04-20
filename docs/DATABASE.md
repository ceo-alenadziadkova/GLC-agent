# Database Schema

## Overview

PostgreSQL on **Supabase**. Persisted **per-entity** state and policies that must vary by row (and sit under **RLS**) belong here — not in server env vars; see [ARCHITECTURE.md — Configuration layering](./ARCHITECTURE.md#configuration-layering-config-vs-database-vs-services-vs-ui) §2.

Apply migrations **in numeric order** so foreign keys, RLS, and triggers exist before later tables reference them:

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
12. `012_profiles_trigger_auth_admin.sql` — RLS + grants so `handle_new_user` can insert into `profiles` (fixes OAuth `Database error saving new user` on Supabase hosted)
13. `013_discovery_sessions.sql` — discovery-session persistence (see migration file)
14. `014_notifications.sql` — `notifications` table for in-app notification center
15. `015_audit_request_guards.sql` — DB guard constraints/indexes for `audit_requests` consistency under concurrent writes
16. `016_intake_recon_conflicts_discovery.sql` — recon conflict handling / discovery-related intake (see migration file)
17. `017_client_brief_help.sql` — `brief_help_requested_at`, `brief_help_client_message` on `audits` (optional client “help with brief” signal)
18. `018_platform_settings.sql` — singleton `platform_settings` (`self_serve_audit_owner_user_id` for client self-serve owner)
19. `019_discovery_maturity_5_contact_company.sql` — discovery maturity / contact-company fields (see migration file)
20. `020_snapshot_domain_cache.sql` — `snapshot_domain_cache` (host-keyed JSON payload + `expires_at` for deterministic free snapshot reuse)
21. `021_snapshot_domain_cooldown.sql` — `snapshot_domain_cooldown` (optional cross-instance fresh-fetch cooldown for public snapshot; opt-in via `SNAPSHOT_SHARED_ABUSE_STORE`)
22. `022_snapshot_fresh_lease.sql` — `snapshot_fresh_lease` + RPC `snapshot_try_acquire_fresh_lease` / `snapshot_release_fresh_lease` (optional cross-instance **concurrent fresh** cap; same opt-in flag)
23. `023_profiles_guest_role.sql` — `profiles.role` adds `guest` for anonymous snapshot sessions; `handle_new_user` updates (see [AUTH.md](./AUTH.md))
24. `024_audit_domains_prompt_version_len.sql` — widens `audit_domains.prompt_version` to **`VARCHAR(64)`** so deterministic free snapshot engine labels are not truncated (was `VARCHAR(20)` from migration 009)
25. `025_marketing_brief_submissions.sql` — marketing brief submissions (see migration file)
26. `026_snapshot_guest_sessions.sql` — **`snapshot_guest_sessions`** public snapshot funnel (guest cookie, `snapshot_token`, optional UTM/referrer/`ip_hash`, claim timestamps; 90-day `expires_at`)
27. `027_intake_versions.sql` — optional **`intake_brief.intake_versions`** (`jsonb`) version tuple for bank/policy/layout/resolver parity (ADR unified intake)
28. `028_intake_version_migration.sql` — optional **`intake_brief.intake_version_migration`** (`jsonb`) — last recorded upgrade/repair of the version tuple (`from`, `to`, `at`, `reason`)
29. `029_intake_analytics_events.sql` — **`intake_analytics_events`** — anonymous / authenticated intake funnel events (`surface`, `event_type`, `client_session_id`, optional `discovery_session_token`, `audit_id`, `question_id`, `step_index`, `intake_versions`, `client_ts`)
30. `030_intake_analytics_audit_id.sql` — **`audit_id`** on `intake_analytics_events` (FK to `audits`, nullable)
31. `031_intake_analytics_dashboard_views.sql` — read-only **views** for Metabase / SQL charts (see [Intake analytics dashboards](#intake-analytics-dashboards) below)
32. `032_discovery_consultant_claim_and_maturity_guard.sql` — discovery consultant claim / maturity guard (see migration file)
33. `033_discovery_contact_edit_key.sql` — discovery contact edit key (see migration file)
34. `034_discovery_convert_atomic_rpc.sql` — discovery convert RPC (see migration file)
35. `035_intake_trace_tool_analytics.sql` — **`intake_analytics_events.payload`** (`jsonb`), **`user_id`** (FK `auth.users`, nullable) for consultant tool telemetry
36. `036_intake_question_wording_drafts.sql` — **`intake_question_wording_drafts`** — per-user draft wording by `question_id` (RLS: own rows only)
37. `037_intake_wording_publish_rollback.sql` — **`published_text`** / **`published_at`** on **`intake_question_wording_drafts`**; **`intake_wording_publication_log`** (append-only publish/rollback audit; RLS: **`SELECT`** own rows)
38. `038_fix_rls_snapshot.sql` — tightens **`audits`** client SELECT RLS (no cross-tenant `free_snapshot` read)
39. `039_pipeline_runs_and_rls_hardening.sql` — **`phase_runs`**, **`job_runs`**; deny-RLS on operational tables (`intake_tokens`, snapshot cache, **`intake_analytics_events`**, …)
40. `040_intake_brief_responses_format_v2_only.sql` — intake brief **`responses_format`** constraint
41. `041_discovery_convert_rpc_execute_grant.sql` — **`GRANT EXECUTE`** on **`discovery_convert_session_atomic`** for **`service_role`**
42. `042_discovery_convert_fix_ambiguous_audit_id.sql` — PL/pgSQL qualify **`discovery_convert_session_atomic`** updates (ambiguous **`audit_id`**)
43. `043_db_hardening_rls_views_functions.sql` — **`security_invoker`** on intake analytics views; fixed **`search_path`** on key functions; RLS **`(select auth.uid())`** pattern; explicit deny policies; FK indexes
44. `044_rls_merge_permissive_select.sql` — merges duplicate permissive **`SELECT`** RLS on **`audits`**, **`audit_domains`**, **`audit_strategy`**, **`pipeline_events`**, **`review_points`**; splits consultant **`INSERT`/`UPDATE`/`DELETE`** into separate policies (lint **`0006_multiple_permissive_policies`**)
45. `045_query_performance_indexes.sql` — **`pipeline_events(created_at DESC)`**, **`discovery_sessions(consultant_id, created_at DESC)`** (partial), **`audit_requests(created_at DESC)`**; **`notifications`** already indexed in **`014`**
46. `046_marketing_brief_preferred_audit_depth.sql` — **`marketing_brief_submissions.preferred_audit_depth`** (`express` \| `full`, nullable when unsure or no site)
47. `047_audits_no_public_website_flag.sql` — **`audits.no_public_website`** (`boolean`, default false); backfill for dev sentinel URL; **`discovery_convert_session_atomic`** adds **`p_no_public_website`** (7-arg RPC + `GRANT`)
48. `048_consultant_email_allowlist.sql` — **`consultant_email_allowlist`** (normalized email PK) for consultant role bootstrap; RLS deny for `anon`/`authenticated` (server uses service role)
49. `049_profiles_platform_admin.sql` — **`profiles.is_platform_admin`** (`boolean`, default false) for platform settings ACL (see [API.md](./API.md#platform-consultant))
50. `050_platform_settings_legacy_admin_ids.sql` — **`platform_settings.legacy_platform_admin_user_ids`** (`uuid[]`) for ACL fallback
51. `051_evaluation_datasets_and_execution_mode.sql` — evaluation datasets + **`audits.execution_mode`**
52. `052_agent_performance_aggregate.sql` — **`agent_performance_aggregate`** (consultant dashboard aggregates)
53. `053_bandit_arm_performance_and_governance_risk.sql` — bandit / governance risk tables (see ADR)
54. `054_audit_claim_graph.sql` — **`audit_claim_graph`** cross-phase claims
55. `055_audit_remediations.sql` — **`audit_remediations`**
56. `056_domain_benchmark_snapshot.sql` — **`domain_benchmark_snapshot`**
57. `057_platform_runtime_retention_and_intake_ttl.sql` — platform runtime / intake TTL settings
58. `058_evaluation_datasets_agent_variant_id.sql` — evaluation datasets **`agent_variant_id`**
59. `059_audits_status_add_cancelled.sql` — **`audits.status`** adds **`cancelled`**
60. `060_audits_execution_plan.sql` — **`audits.execution_plan`** (`jsonb`)
61. `061_public_brief_sessions.sql` — **`public_brief_sessions`** (public `/brief` resumable session rows; RLS deny-all for `anon`/`authenticated`; API uses **service role**)
62. `062_intake_trace_wording_action_batch_rpc.sql` — intake trace wording batch RPC (see migration file)
63. `063_platform_llm_token_pool_and_totals_rpc.sql` — **`platform_settings.llm_token_pool_cap`**; RPC **`audit_token_totals_for_user`**, **`audit_token_totals_global`** (service role) for token usage summary API
64. `064_evaluation_datasets_expires_at_trigger_guard.sql` — fixes **`set_evaluation_datasets_expires_at`** when **`platform_settings` id=1** is missing (avoids NULL **`expires_at`** on insert)
65. `065_audits_status_add_strategy.sql` — **`audits.status`** CHECK adds **`strategy`** (phase 7 lock status; aligns DB with `pipelineStatusForPhase(7)`)
66. `066_audit_strategy_v2_execution_packs.sql` — **`audit_strategy.schema_version`**; **`audit_strategy_execution_packs`** (Strategy Lab on-demand execution plans)
67. `067_audit_strategy_strategy_lab_context.sql` — **`audit_strategy.strategy_lab_context`** (consultant constraint overrides)
68. `067_legal_consent_events.sql` — **`legal_consent_events`** append-only consent log
69. `068_legal_consent_source_audit_create.sql` — expands **`legal_consent_events.source`** enum (e.g. **`audit_create`**)
70. `069_glc_orchestration_pack.sql` — **`audit_strategy.glc_orchestration_pack`**, **`orchestration_pack_version`**; **`audit_roadmap_manifest_snapshots`** (roadmap manifest + GLC orchestration pack persistence)
71. `070_glc_orchestration_last_revision_diff.sql` — **`audit_strategy.glc_orchestration_last_revision_diff`** (JSON diff from previous pack to current when version ≥ 2)

**Tables (core list):** `audits`, `audit_recon`, `audit_domains`, `audit_strategy`, `pipeline_events`, `collected_data`, `review_points`, `profiles`, `consultant_email_allowlist`, `audit_requests`, `intake_brief`, `api_idempotency_keys`, `intake_tokens`, `notifications`, `platform_settings`, `snapshot_domain_cache`, `snapshot_domain_cooldown`, `snapshot_fresh_lease`, `snapshot_guest_sessions`, `discovery_sessions`, `marketing_brief_submissions`, **`public_brief_sessions`**, `intake_analytics_events`, `intake_question_wording_drafts`, `intake_wording_publication_log`, `phase_runs`, `job_runs`.

Row Level Security is enabled on these tables; exact policies differ by table (consultant vs client access). **Canonical SQL:** the migration files — this doc summarises shapes.

Realtime: enabled on `pipeline_events` and `audits` (see [FRONTEND.md](./FRONTEND.md) / [ARCHITECTURE.md](./ARCHITECTURE.md)).

### Supabase Database Advisor and migrations `043`–`045`

Use the project **Database** (or **Advisors**) UI in Supabase to run **security** and **performance** lints — see [Database Advisors](https://supabase.com/docs/guides/database/database-advisors). Typical follow-ups:

- **`043_db_hardening_rls_views_functions.sql`** — intake analytics views use **`security_invoker = true`**; hot RPC/trigger functions use a fixed **`search_path`**; RLS policies use **`(select auth.uid())`** where appropriate (initplan-friendly); explicit **deny-all** policies on backend-only tables (`api_idempotency_keys`, `discovery_sessions`, `marketing_brief_submissions`, **`public_brief_sessions`**, `platform_settings`, `snapshot_fresh_lease`, …); extra **FK-covering** indexes.
- **`044_rls_merge_permissive_select.sql`** — on `audits`, `audit_domains`, `audit_strategy`, `pipeline_events`, `review_points`: one **`*_select_scoped`** policy for reads (consultant or linked client) and separate **`*_*_consultant`** policies for writes instead of overlapping permissive **`SELECT`** rules.
- **`045_query_performance_indexes.sql`** — **`pipeline_events(created_at DESC)`**, **`discovery_sessions(consultant_id, created_at DESC)`** (partial; replaces the older partial index from **`032`**), **`audit_requests(created_at DESC)`**. Listing notifications by user already uses **`notifications_user_created_idx`** from **`014`** (`user_id`, `created_at DESC`).

**INFO** lints such as **unused indexes** often reflect low traffic or fresh stats — do not mass-drop indexes on that alone (see advisor docs for [lint 0005](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)).

---

## Tables

### `audits`

Master record for each audit run.

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES auth.users(id) -- NULL allowed only for product_mode = 'free_snapshot' (see migration 004)
client_id uuid REFERENCES profiles(id) -- optional; client portal (migration 005)
company_url text NOT NULL -- normal HTTPS URL, or canonical "no site" sentinel (see below)
company_name text
industry text
product_mode text NOT NULL DEFAULT 'full' -- 'free_snapshot' | 'express' | 'full' (migration 004)
snapshot_token uuid -- public polling for free snapshot (migration 004)
status text DEFAULT 'created'
current_phase int DEFAULT 0
overall_score numeric(3,1)
token_budget int DEFAULT 200000
tokens_used int DEFAULT 0
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
brief_help_requested_at timestamptz -- optional; client self-serve help ping (migration 017)
brief_help_client_message text -- optional short note from client (migration 017)
```

**`status` values:** While phases run: `recon`, `auto`, `analytic`, `strategy` (phase 7 lock); idle / review gates: `review`; not started: `created`; terminal: `completed`, `failed`, `cancelled`

**`company_url` — no public website:** When the client has no public site, the API stores the stable sentinel **`NO_PUBLIC_WEBSITE_URL`** from **`@glc/intake-core`** (`https://glc-audit.placeholder/no-public-website`). Collectors and snapshot code detect it via **`isNoPublicWebsiteUrl`** and skip outbound HTTP crawls. Do not hand-edit to an arbitrary placeholder without updating the shared package and all consumers. See [DEPLOYMENT.md — Immutable product constants](./DEPLOYMENT.md#immutable-product-constants).

---

### `audit_recon`

Recon phase output: company profile extracted from the crawled site.

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id uuid REFERENCES audits(id) ON DELETE CASCADE
status text DEFAULT 'pending'
company_name text
industry text
location text
languages jsonb DEFAULT '[]'
tech_stack jsonb DEFAULT '{}'
social_profiles jsonb DEFAULT '{}'
contact_info jsonb DEFAULT '{}'
pages_crawled jsonb DEFAULT '[]'
brief text
interview_answers text
created_at timestamptz DEFAULT now()
```

---

### `audit_domains`

One row per domain per audit. Stores the full Claude output for each domain.

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id uuid REFERENCES audits(id) ON DELETE CASCADE
domain_key text NOT NULL
phase_number int NOT NULL
status text DEFAULT 'pending'
score int CHECK (score BETWEEN 1 AND 5)
label text
version int DEFAULT 1
summary text
strengths jsonb DEFAULT '[]' -- string[]
weaknesses jsonb DEFAULT '[]' -- string[]
issues jsonb DEFAULT '[]' -- [{severity, title, description, impact}]
quick_wins jsonb DEFAULT '[]' -- [{id, title, description, effort, timeframe}]
recommendations jsonb DEFAULT '[]' -- [{title, description, priority, cost, time, impact}]
raw_data jsonb DEFAULT '{}'
created_at timestamptz DEFAULT now()

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
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id uuid REFERENCES audits(id) ON DELETE CASCADE
status text DEFAULT 'pending'
executive_summary text
overall_score numeric(3,1)
quick_wins jsonb DEFAULT '[]' -- StrategyInitiative[]
medium_term jsonb DEFAULT '[]' -- StrategyInitiative[]
strategic jsonb DEFAULT '[]' -- StrategyInitiative[]
scorecard jsonb DEFAULT '[]' -- [{domain, score, label}]
created_at timestamptz DEFAULT now()
```

**`StrategyInitiative` shape:**
```json
{ "id": "uuid", "title": "...", "description": "...", "impact": "high|medium|low", "effort": "low|medium|high" }
```

---

### `pipeline_events`

Immutable event log. Frontend subscribes via Supabase Realtime to receive live updates.

```sql
id bigserial PRIMARY KEY
audit_id uuid REFERENCES audits(id) ON DELETE CASCADE
phase int NOT NULL
event_type text NOT NULL
message text
data jsonb DEFAULT '{}'
created_at timestamptz DEFAULT now()
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
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id uuid REFERENCES audits(id) ON DELETE CASCADE
collector_key text NOT NULL
phase int NOT NULL
data jsonb NOT NULL
created_at timestamptz DEFAULT now()

UNIQUE(audit_id, collector_key)
```

**`collector_key` values:** `crawler` | `recon` | `security_headers` | `seo_meta` | `performance` | `accessibility`

---

### `review_points`

Tracks review gate approvals and consultant/interview notes.

```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
audit_id uuid REFERENCES audits(id) ON DELETE CASCADE
after_phase int NOT NULL
status text DEFAULT 'pending' -- pending | approved
consultant_notes text
interview_notes text
approved_at timestamptz
quality_gate_passed boolean -- added by migration 009
```

---

### `profiles`

User roles and display metadata. **`role`:** `consultant` | `client` | `guest` (migrations **`005`**, **`023`** — `guest` for snapshot / anonymous flows until promoted). **`is_platform_admin`** (`boolean`, migration **`049`**) — when any consultant has **`true`**, only flagged users (plus UUIDs in **`platform_settings.legacy_platform_admin_user_ids`**) may manage **`platform_settings`** and **`consultant_email_allowlist`** via **`/api/platform/*`**; otherwise any consultant may manage (open mode). Legacy **`PLATFORM_ADMIN_USER_IDS`** env is deprecated and ignored.

---

### `legal_consent_events`

Append-only log of **Terms of Service** acceptance, **Privacy Policy** acknowledgment, optional consents (**`marketing`**, **`product_analytics`**, **`case_study_use`**, **`evaluation_internal`**), and **`dpa_acceptance`** (typically when a **consultant** starts client work — at **audit creation** or via **Settings**). Each row stores **`consent_key`**, **`accepted`**, a snapshot of published document versions (**`document_bundle_version`**, optional **`tos_version`**, **`privacy_version`**, **`dpa_version`**), **`source`** (`signup` | `settings` | `api` | `import` | **`audit_create`**), and **`created_at`**. No `UPDATE` / `DELETE` — effective state is derived as the latest row per `(user_id, consent_key)` by `created_at`.

**RLS:** authenticated users may **`SELECT`** rows where **`user_id = auth.uid()`**; inserts are performed by the API with the **service role** (same pattern as **`intake_wording_publication_log`**).

Migrations: **`067_legal_consent_events.sql`**, **`068_legal_consent_source_audit_create.sql`** (adds **`audit_create`** to **`source`**).

---

### `audit_requests`

Client-submitted audit requests before an `audits` row is attached. Status workflow: `draft` → `submitted` → `under_review` → `approved` | `rejected` → `running` → `delivered` (see migration `005`).

DB guards (migration `015_audit_request_guards.sql`):

- Partial unique index on `audit_id` (`WHERE audit_id IS NOT NULL`) ensures one audit is linked to at most one request.
- Check constraint enforces that `approved` / `running` / `delivered` rows always have `audit_id IS NOT NULL`.

---

### `intake_brief`

Structured questionnaire responses per audit. One row per audit (unique `audit_id`).

Core fields:

- `responses` (`jsonb`) — payload with structured cells `{ value, source }` only (`responses_format` = 2). Keys are **question-bank v1** ids (**`a11`**, **`f1`**, **`a10`**, …) plus side-channel keys such as **`…__other`** and **`intake_industry_specify`** where applicable.
- `intake_versions` (`jsonb`, nullable) — `{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }` saved on each brief write; `NULL` on legacy rows (server validates with the current engine).
- `intake_version_migration` (`jsonb`, nullable) — last migration metadata when the stored tuple was repaired or upgraded (see `validateIntakeVersionsForBriefWrite` / ADR).
- `status` (`draft` | `submitted`) and SLA counters (`answered_required`, `answered_recommended`, `answered_optional`).
- Progressive intake metadata: `layer_completed`, `collected_by`, `collection_mode`, `data_quality_score`, `recon_prefills`, `post_audit_questions`.
- Server-derived gamification/readiness state:
 - `progress_pct` (`0..100`),
 - `readiness_badge` (`low|medium|high`),
 - `next_best_action` (`complete_required|add_recommended|confirm_prefill|none`).

Contract rule: readiness/progress fields are derived on the backend on each save/update and treated as canonical API data (frontend renders only).

Migrations: `006_intake_brief.sql`, `010_intake_progress_gamification.sql`, `027_intake_versions.sql`, `028_intake_version_migration.sql`.

---

### `intake_question_wording_drafts`

Per-authenticated-user draft wording strings keyed by **`question_id`** (bank id). Does not change branch conditions or policy; UI copy overlay only. Optional **`published_text`** / **`published_at`** store the last explicit publish snapshot (migration **`037`**). Uniqueness **`(user_id, question_id)`**. RLS: users may read/write/delete own rows. Written via **`PUT /api/intake-trace-tool/wording-drafts`**; publish/rollback via **`POST`** routes on the same API prefix.

Migration: `036_intake_question_wording_drafts.sql`, `037_intake_wording_publish_rollback.sql`.

---

### `intake_wording_publication_log`

Append-only audit of **`publish`** / **`rollback`** actions from the consultant wording tool. Fields: **`user_id`**, **`action`**, **`question_ids`** (`text[]`), **`created_at`**. RLS: **`SELECT`** own rows. Rows are inserted by the API (service role). Read-back for consultants: **`GET /api/intake-trace-tool/wording-publication-log`**.

Migration: `037_intake_wording_publish_rollback.sql`.

---

### `phase_runs` and `job_runs`

Durable queue / lease state for pipeline and job workers (`queued`, `running`, `completed`, `failed`, `dead_letter`), with optional lease and heartbeat columns for observability. Written by the backend (`pipeline`, `pipeline-jobs.ts`). **RLS:** deny-all for **`anon` / `authenticated`** (migration **`039`**); only **service role** (or bypass roles) should access.

Migration: `039_pipeline_runs_and_rls_hardening.sql`.

---

### `api_idempotency_keys`

Stores request fingerprints and prior responses for idempotent replay on critical write endpoints.

Key fields: `user_id`, `route`, `idempotency_key`, `request_hash`, `response_status`, `response_body`, `expires_at`.

Uniqueness: `(user_id, route, idempotency_key)` via unique index.

Migration: `008_reliability_idempotency.sql`. **RLS:** deny-all for client API roles (migration **`043`**); API uses **service role**.

---

### `intake_tokens`

Pre-brief magic links: consultant creates a row; the client opens a public URL and POSTs answers until `expires_at`. Optional `audit_id` merges responses into `intake_brief` on submit.

**`responses` (`jsonb`):** same structured shape as **`intake_brief.responses`** — keys are **question-bank v1** ids (**`a11`**, **`a12`**, **`a2`**, **`a5`**, **`f1`**, **`a10`**, …) with values **`{ value, source }`** (`responses_format` **2**), plus **`…__other`** / **`intake_industry_specify`** as needed.

Access is via **service role** in the API; **RLS** denies direct **`anon` / `authenticated`** access (migration **`039`**). The `token` value is unguessable (40 hex chars).

Migration: `011_intake_tokens.sql`.

---

### `notifications`

In-app notifications shown in the frontend notification center.

Core fields:

- `user_id` — target recipient.
- `audit_id` — optional linked audit for deep links.
- `kind` — `pipeline` | `review` | `intake`.
- `title`, `message`, `payload` — display text + structured metadata.
- `is_read`, `read_at`, `created_at` — read state and ordering.

Payload conventions in current app flows:

- `payload.route` — deep-link target used by the shell router.
- `payload.request_id` — request-related notifications (`audit_requests` lifecycle).
- `payload.artifact` — artifact readiness (`strategy`, `report`, `report_pdf`, `action_plan_csv`).
- `payload.failure_type` — failure/retry semantics (`phase_failed`, `retry_started`, etc.).

Note: request/artifact/failure are modeled through payload metadata while `kind` stays in the base taxonomy above.

Indexes:

- `(user_id, is_read, created_at desc)` for unread and list queries.
- `(user_id, created_at desc)` for paginated history.
- `(audit_id, created_at desc)` partial index for audit-linked lookups.

RLS:

- Authenticated users can `SELECT` and `UPDATE` only rows where `auth.uid() = user_id`.

Migration: `014_notifications.sql`.

---

### `platform_settings`

Singleton row (`id = 1`) for cross-tenant platform options maintained via the API (service role).

- `self_serve_audit_owner_user_id` — optional `profiles.id` (role `consultant`) used as `audits.user_id` when a **client** creates an audit from the portal. If null, the API resolves an owner via legacy admin UUIDs or (open mode) earliest consultant; **`SELF_SERVE_AUDIT_OWNER_USER_ID`** env is deprecated and ignored (see [DEPLOYMENT.md](./DEPLOYMENT.md)).
- `llm_token_pool_cap` — optional non-negative cap on aggregate pipeline usage (`SUM(audits.tokens_used)`). When set, platform administrators see remaining pool in **Settings** via `GET /api/audits/token-usage-summary` (migration **`063`**).
- `updated_at`, `updated_by` — audit metadata.

**RLS** enabled with an explicit **deny-all** policy for **`anon` / `authenticated`** (migration **`043`**); server writes through the **service role**.

Migration: `018_platform_settings.sql`.

---

### `snapshot_domain_cache`

Migration: `020_snapshot_domain_cache.sql`. One row per **registrable host** (no `www.`); JSON **`payload`** is the deterministic snapshot artifact reused for repeat free checks; **`expires_at`** gates reads.

**PII / retention:** The server **does not** store raw scraped emails or phone numbers in this payload (arrays are emptied before upsert). The **free snapshot** pipeline also **clears `contact_info` on `audit_recon`** when persisting from this path so DB rows do not retain scraped contact vectors from the public scanner.

**Operator purge:** Delete a cache row with **`POST /api/snapshot/operator/purge-cache`** (when `SNAPSHOT_OPERATOR_TOKEN` is set) or SQL: `DELETE FROM snapshot_domain_cache WHERE host = 'example.com';`

---

### `snapshot_domain_cooldown`

Migration: `021_snapshot_domain_cooldown.sql`. One row per **registrable host** — **`last_fresh_scan_at`** records when a fresh scan last completed and wrote **`snapshot_domain_cache`**.

Used only when **`SNAPSHOT_SHARED_ABUSE_STORE=1`** (see [DEPLOYMENT.md](./DEPLOYMENT.md)); without it, cooldown stays **in-process** only. Backend reads/writes via **service role**. **RLS:** deny-all for client roles (migration **`039`**).

---

### `snapshot_fresh_lease`

Migration: `022_snapshot_fresh_lease.sql`. Short-lived rows (**`expires_at`**) counting active **fresh** snapshot workers cluster-wide. Acquire and release are **`SECURITY DEFINER`** RPCs (`snapshot_try_acquire_fresh_lease`, `snapshot_release_fresh_lease`) using a transaction advisory lock so counts stay consistent under concurrency. Expired rows are deleted on each successful acquire. **RLS:** explicit deny-all for client API roles (migration **`043`**).

Tune TTL with **`SNAPSHOT_FRESH_LEASE_TTL_SECONDS`** (default derived from **`SNAPSHOT_FETCH_BUDGET_MS`**; must exceed worst-case fresh scan wall time). Same **`SNAPSHOT_SHARED_ABUSE_STORE`** gate as cooldown.

---

## Intake analytics dashboards

Table **`intake_analytics_events`** is written by the API (`POST /api/discover/analytics-events`, `POST /api/audits/:id/brief/analytics-events`, `POST /api/intake-trace-tool/analytics-events`). Consultant tool rows use **`surface` = `internal_intake_trace`**, optional **`payload`**, optional **`user_id`**. Use the **service role** or a dedicated read-only DB user in Metabase / Supabase SQL editor; do not expose row-level client reads without a separate policy design.

Migrations **`031_intake_analytics_dashboard_views.sql`** (initial definitions) and **`043_db_hardening_rls_views_functions.sql`** (**`security_invoker = true`** on views so they respect RLS of the querying role) define the views (windows are relative to `now()` at query time):

| View | Purpose |
|------|---------|
| **`intake_analytics_daily_surface`** | Per UTC day: `surface`, `event_type`, counts, distinct `client_session_id` (last 180d of raw rows). |
| **`intake_analytics_question_funnel_30d`** | Per `surface` + `question_id`: `shown` / `answered` / `skipped` / `wizard_completed` / `results_viewed`. |
| **`intake_analytics_version_mix_30d`** | Breakdown by `policy_version`, `resolver_version`, `question_bank_version`, `surface`. |
| **`intake_analytics_audit_attributed_30d`** | Events joined to **`audits`** (product mode + per-audit counts). |

**Ad-hoc examples**

```sql
-- Public Discovery: completion vs results views (7d)
SELECT date_trunc('day', created_at) AS day,
 COUNT(*) FILTER (WHERE event_type = 'wizard_completed') AS completed,
 COUNT(*) FILTER (WHERE event_type = 'results_viewed') AS saw_results
FROM intake_analytics_events
WHERE surface = 'public_discovery'
 AND created_at >= now() - interval '7 days'
GROUP BY 1
ORDER BY 1;

-- Drop-off: shown but no answered in same session (approximate — same client_session_id)
WITH sess AS (
 SELECT client_session_id,
 MAX(created_at) FILTER (WHERE event_type = 'question_shown') AS last_shown,
 MAX(created_at) FILTER (WHERE event_type = 'question_answered') AS last_answered
 FROM intake_analytics_events
 WHERE surface = 'public_discovery'
 AND created_at >= now() - interval '14 days'
 GROUP BY 1
)
SELECT COUNT(*) FILTER (WHERE last_shown IS NOT NULL AND last_answered IS NULL) AS sessions_no_answer
FROM sess;
```

Decision context: [ADR-INTAKE-UNIFIED-QUESTION-BANK.md](adrs/ADR-INTAKE-UNIFIED-QUESTION-BANK.md) (Phase G).

---

## Row Level Security

RLS is enabled on all application tables. Policies evolved across migrations: consultants, linked clients (`client_id`), and free-snapshot rows each have specific rules. **Do not copy legacy “single policy” snippets from older docs** — use the migration files as source of truth.

After migration **`044`**, core audit-linked tables use a consistent split where applicable: **`*_select_scoped`** (read if you own the audit as **`user_id`** or are the linked **`client_id`**) and **`*_*_consultant`** policies for **insert/update/delete** on child rows tied to audits you own as consultant. Names and exact `FOR` clauses live in **`044_rls_merge_permissive_select.sql`**.

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

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `server/src/services/pipeline.ts`
