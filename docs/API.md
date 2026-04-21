# REST API

## Base URL

- **Development:** `http://localhost:3001`
- **Production:** Railway deployment URL (set as `VITE_API_URL` in frontend env)

Most `/api/*` endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header (the frontend `apiService.ts` adds this automatically for authenticated calls).

Authentication exceptions (no JWT):

- Public routes: `/api/snapshot` (start/poll/quota), **`GET /api/public/brand`**, **`POST /api/marketing/brief`**, `GET /api/intake/:token`, `POST /api/intake/:token/respond`, public discovery routes.
- Token-protected operator routes: `/api/snapshot/operator/*` (requires `SNAPSHOT_OPERATOR_TOKEN`, not JWT).
- Secret-header route: `POST /api/benchmarks/recompute` (cron/system secret header, not JWT).

`POST /api/intake` (create link) requires a **consultant** JWT.

All authenticated `/api/*` responses are returned with:

```http
Cache-Control: private, no-store
```

This prevents storing user-specific audit data in shared caches.

---

## Public brand config (white-label)

### `GET /api/public/brand`

**Auth:** none.

Returns non-secret marketing defaults (`brand_name`, `support_email`, `public_site_url`, `no_public_website_display_en`, structured `footer` strings). Source: `public_brand_defaults.v1` (package **`@glc/dev-brand-defaults`**, edit for white-label); `public_site_url` comes from **`GLC_PUBLIC_SITE_URL`**. The SPA uses bundled `@glc/dev-brand-defaults` until the request succeeds. JSON **`support_email`:** explicit **`null`** hides public contact in the SPA; omitted or empty string falls back to **`GLC_DEV_SUPPORT_EMAIL`** in server config (`public-brand-config.ts`). Field **`no_public_website_display_en`** is the English label for audits without a public URL (stable i18n key: **`glc.audit.noPublicWebsite`** in `@glc/intake-core`).

---

## Authentication

There is no dedicated `/api/auth/session` endpoint in the current router map.
Auth session lifecycle is handled by Supabase on the client; server-side auth context is validated via JWT on protected routes (for example `GET /api/profile`).

---

## Profile

### `GET /api/profile`

Returns current authenticated user profile metadata.

**Auth:** valid JWT.

**Response `200`:**

```json
{
 "id": "uuid",
 "role": "consultant",
 "email": "user@example.com",
 "full_name": "Jane Doe",
 "can_manage_platform_settings": true
}
```

- `can_manage_platform_settings` — **`true`** only when **`role`** is **`consultant`** and the caller passes **`canManagePlatformSettings`** (`server/src/lib/platform-admin.ts`: open mode vs `profiles.is_platform_admin` / legacy UUID list). **`false`** for **`client`** / **`guest`**.

### `PATCH /api/profile`

Updates editable profile fields for the current user.

**Auth:** valid JWT.

**Request body:**

```json
{
 "full_name": "Jane Doe"
}
```

Notes:

- `full_name` is optional and nullable.
- Empty/whitespace value is normalized to `null`.
- Max length: 200 characters.

### `GET /api/profile/legal-consents`

Returns published legal document version identifiers plus **effective** consent state (latest append-only row per `consent_key`).

**Auth:** valid JWT.

**Response `200`:** `{ "published": { "bundle", "terms_of_service", "privacy_policy", "data_processing_agreement", "legal_notice", "cookies_policy" }, "effective": [ { "consent_key", "accepted", "created_at", "document_bundle_version", "tos_version", "privacy_version", "dpa_version", "source" } ] }`

### `POST /api/profile/legal-consents`

Appends one or more consent / acknowledgment events (no duplicate `consent_key` in a single request).

**Auth:** valid JWT.

**Request body:**

```json
{
  "source": "settings",
  "events": [{ "consent_key": "marketing", "accepted": true }]
}
```

**`source`:** `signup` | `settings` | `api` | `import` | **`audit_create`** (consultant DPA at audit creation).

**Response `201`:** same shape as `GET /api/profile/legal-consents`.

---

## Public brand

### `GET /api/public/legal-documents`

**Auth:** none.

Returns published document **version strings** and SPA **paths** for Terms, Privacy, DPA, Cookies Policy, and the LSSI **legal notice** (Aviso Legal) (for signup links, footer, and CMP wiring).

**Response shape (illustrative):** `bundle`, `terms_of_service`, `privacy_policy`, `data_processing_agreement`, `legal_notice`, and `cookies_policy` — each document entry is `{ version, path }` except `bundle`, which is a single string.

---

## Frontend log ingest

Structured log events from the browser (`logger`). Failures are non-fatal for UX.

Dev behavior: in local frontend dev (`import.meta.env.DEV`), logger events stay console-only and are not sent to `/api/log` or `/api/log/snapshot`. Console verbosity can be tuned with `VITE_DEV_CONSOLE_LOG_LEVEL` (`debug|info|warn|error`, default `warn`).

### `POST /api/log`

**Auth:** JWT for **registered** users only (`profiles.role` is `client` or `consultant` after `attachProfile`). **403** for anonymous sessions or `guest` role — those use **`POST /api/log/snapshot`** instead.

**Rate limit:** 180 events / minute / user (`logIngestLimiter`).

**Response:** `204` No Content.

**Body** (JSON): `level` (`debug`|`info`|`warn`|`error`), `source` (default `frontend`), `message`, optional `context` object, optional `timestamp` (ISO).

**Ops Telegram:** when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured, `source: "spa_ui_incident"` (full-screen error report from authenticated users) also sends a formatted HTML message to the ops chat. Repeated sends for the same user and `context.ref` are suppressed for `SYSTEM_DEFAULTS.alerts.spaUiIncidentTelegramCooldownMs` (per API instance).

### `POST /api/log/snapshot`

**Auth:** JWT where the user is **anonymous** (`is_anonymous`) or **`profiles.role`** is **`guest`** (free snapshot / pre-registration). **403** for full `client` / `consultant` — use **`POST /api/log`**.

**Rate limit:** 40 events / minute / user by default (`snapshotLogIngestLimiter`); override with env **`SNAPSHOT_LOG_INGEST_MAX_PER_MIN`** if needed.

Same body as `POST /api/log`. **Response:** `204`.

---

## Platform (consultant)

Assigns which consultant owns **client self-serve** audits (`audits.user_id` when `POST /api/audits` is called with a client JWT). UI: **Settings → Client portal — audit owner** (consultant / admin shell).

**Access control:** migration **`049_profiles_platform_admin.sql`** adds **`profiles.is_platform_admin`**. When at least one consultant has **`is_platform_admin = true`**, only those consultants (and any ids listed in **`platform_settings.legacy_platform_admin_user_ids`**) may manage platform settings. **Open mode:** when no profile has the flag and the legacy UUID array is empty, any consultant may manage. **`PLATFORM_ADMIN_USER_IDS`** env is deprecated and ignored at runtime.

### `GET /api/platform/self-serve-owner`

**Auth:** consultant JWT.

**Response `200`:**

```json
{
 "stored_owner_user_id": "uuid | null",
 "effective_owner_user_id": "uuid | null",
 "effective_ready": true,
 "env_fallback_active": false,
 "implicit_fallback_active": false,
 "consultants": [{ "id": "uuid", "full_name": "Jane", "email": "jane@example.com" }],
 "can_manage": true
}
```

- `effective_ready` — `POST /api/audits` as a client would succeed (stored consultant valid, or valid implicit fallback).
- `env_fallback_active` — deprecated, always **`false`** (kept for API compatibility). **`SELF_SERVE_AUDIT_OWNER_USER_ID`** is no longer read.
- `implicit_fallback_active` — **`true`** when an owner is resolved without a persisted **`platform_settings.self_serve_audit_owner_user_id`** (legacy admin list or earliest consultant in open mode). Operators should **`PATCH`** a stored owner for an explicit assignment (the SPA Settings screen surfaces this state).

### `PATCH /api/platform/self-serve-owner`

**Auth:** consultant JWT and `can_manage` (see access control above).

**Body:** `{ "owner_user_id": "<uuid>" | null }` — `null` clears the stored consultant (implicit fallback may still apply).

**Response `200`:** `{ "ok": true, "stored_owner_user_id", "effective_ready", "effective_owner_user_id", "env_fallback_active", "implicit_fallback_active" }`

**Errors:** `400` invalid consultant, `403` not a platform admin when the allowlist is configured.

### `GET /api/platform/consultant-allowlist`

**Auth:** consultant JWT. **Access:** same as `PATCH /api/platform/self-serve-owner` — platform admins only when restrictions apply (see access control above).

**Response `200`:** `{ "emails": ["admin@example.com", ...] }` — lowercase, sorted.

### `POST /api/platform/consultant-allowlist`

**Body:** `{ "email": "new.consultant@example.com" }`

**Response `201`:** `{ "ok": true, "email": "<normalized>" }`

**Errors:** `400` invalid email, `403` not platform admin, `409` email already present, `500` persistence failure.

### `DELETE /api/platform/consultant-allowlist?email=<url-encoded-email>`

**Response `200`:** `{ "ok": true, "removed": true | false, "email": "<normalized>" }` (`removed` is false if the row did not exist).

**Errors:** `400` missing/invalid email, `403` not platform admin.

**Note:** Consultant promotion on first login uses table **`consultant_email_allowlist`** only (this API or SQL). The **`CONSULTANT_EMAILS`** env is no longer read by the server.

### `POST /api/platform/benchmarks/recompute`

**Auth:** consultant JWT and platform admin (`can_manage` — same rules as `PATCH /api/platform/self-serve-owner`).

Recomputes and inserts rows into **`domain_benchmark_snapshot`** from **`evaluation_datasets`** (all configured rolling periods). Does **not** require **`FEATURE_BENCHMARKS`** (use this to seed data before enabling the flag).

**Response `200`:** `{ "ok": true, "inserted": <number> }` — `inserted` is the count of successful snapshot row inserts.

**Errors:** `403` not platform admin when restricted, `500` on unexpected failure.

### `GET /api/platform/runtime-policies`

**Auth:** consultant JWT and `can_manage` (same rules as `PATCH /api/platform/self-serve-owner`).

Returns effective runtime values (DB override when set, otherwise app-config fallback):

```json
{
 "intake_token_ttl_days": 7,
 "evaluation_retention_default_days": 90,
 "evaluation_retention_extended_days": 365,
 "evaluation_retention_internal_only_days": 365
}
```

### `PATCH /api/platform/runtime-policies`

**Auth:** consultant JWT and `can_manage` (same rules as `PATCH /api/platform/self-serve-owner`).

**Body:** any subset of:

```json
{
 "intake_token_ttl_days": 7,
 "evaluation_retention_default_days": 90,
 "evaluation_retention_extended_days": 365,
 "evaluation_retention_internal_only_days": 365
}
```

- Accepts positive integers.
- `null` clears a DB override and reverts that field to fallback behavior.
- Omitted fields are not changed.

**Response `200`:**

```json
{
 "ok": true,
 "intake_token_ttl_days": 7,
 "evaluation_retention_default_days": 90,
 "evaluation_retention_extended_days": 365,
 "evaluation_retention_internal_only_days": 365
}
```

**Errors:** `400` invalid payload, `403` not platform admin when restricted, `500` persistence failure.

### `POST /api/platform/audits/:id/pipeline/resume-cancelled`

**Auth:** consultant JWT and platform admin (`can_manage` — same rules as `PATCH /api/platform/self-serve-owner`).

Clears a user **`stop`**: compare-and-set updates **`audits.status`** from **`cancelled`** to **`review`**, then **best-effort** runs the same advance as **`POST /api/audits/:id/pipeline/next`** on behalf of the **audit owner** (`audits.user_id`) — queues or in-process **`schedulePipelineExecution`** when allowed. Inserts **`pipeline_events.event_type = resumed_from_cancelled`**. If **`next`** is not allowed (e.g. pending review gate), the audit stays at **`review`** and the owner must **`.../pipeline/next`** or complete the gate first.

**Errors:** `400` with `PIPELINE_RESUME_NOT_CANCELLED` when status is not **`cancelled`**, `PIPELINE_TOKEN_BUDGET_EXCEEDED` when over budget, `403` when not a platform admin, `404` invalid audit id, `409` with `PIPELINE_RESUME_CLAIM_CONFLICT` on stale **`updated_at`**.

**Response `200`:** `{ "status": "review" | "running", "current_phase": <number>, "resumed": true, "execution_scheduled": <boolean> }` — **`execution_scheduled`** is **`true`** when work was scheduled; **`current_phase`** is the **running** phase when execution was scheduled, otherwise the phase at resume idle.

---

## Domain benchmarks

Aggregated peer distributions for **`control_object.confidence.overall`** per domain phase. Source table: **`evaluation_datasets`** joined to **`audits.industry`**. Only rows with **`decision_applied`** in `accept` / `accept_with_warnings` are included. Tunables: **`SYSTEM_DEFAULTS.benchmarks`** in `system_defaults`. See **`docs/adrs/ADR-DOMAIN-BENCHMARKS.md`**.

### `GET /api/benchmarks`

**Auth:** consultant JWT.

**Feature flag:** **`FEATURE_BENCHMARKS=true`**. When disabled, **`503`** with code **`BENCHMARKS_FEATURE_DISABLED`**.

**Query (all optional):** `phase_id`, `industry`, `period` (`last_30d` | `last_90d` | `all_time`). Omitting all three returns the globally latest snapshot row (by `computed_at`).

**Response `200`:** latest matching row:

```json
{
 "id": "uuid",
 "phase_id": "security_compliance",
 "industry": "fintech",
 "period": "last_90d",
 "sample_count": 47,
 "percentiles": { "p25": 61, "p50": 74, "p75": 83, "p90": 91 },
 "avg_score": 73.4,
 "hallucination_rate_p50": 0.1,
 "risky_promise_rate_p50": 0.05,
 "unverified_rate_p50": 0.2,
 "top_error_types": ["compliance_unverified", "security_overclaim"],
 "computed_at": "2026-04-12T02:03:41.000Z"
}
```

**Errors:** `400` invalid `period`, **`404`** `BENCHMARK_SNAPSHOT_NOT_FOUND` when no row matches.

### `POST /api/benchmarks/recompute`

**Auth:** none — send header **`x-benchmark-recompute-secret`** equal to **`BENCHMARK_RECOMPUTE_SECRET`**. If the env var is unset, **`503`** `BENCHMARK_RECOMPUTE_NOT_CONFIGURED`. Invalid secret: **`401`** `BENCHMARK_RECOMPUTE_UNAUTHORIZED`.

**Rate limit:** per IP, hourly cap from **`SYSTEM_DEFAULTS.rateLimits.benchmarkRecomputeMaxPerHour`** (`benchmarkRecomputeLimiter`).

**Response `200`:** `{ "ok": true, "inserted": <number> }`.

Intended for **Railway / GitHub Actions cron** (no user session). Same aggregation logic as **`POST /api/platform/benchmarks/recompute`**.

---

## Audits

### Access matrix (audits)

Use this matrix for new endpoints to keep access rules consistent. **Consultant** = user with consultant role (pipeline mutations are guarded in code). **Client** = linked `client_id` where applicable.

| Endpoint pattern | Consultant (owner) | Client (`client_id`) | Notes |
| ---------------- | ------------------ | -------------------- | ----- |
| `GET /api/audits`, `GET /api/audits/:id` | yes | yes | Read when permitted by API/RLS; `strategy` initiatives are normalized to **v2** (decision/evidence/execution_paths) when possible |
| `PATCH /api/audits/:id/strategy/lab-context` | yes | yes | Persist Strategy Lab constraint overrides (`company_stage`, `budget_band`, `team_scale`); merged over intake brief for initiative post-processing and `GET` read model |
| `POST /api/audits/:id/strategy/execution-pack`, `GET /api/audits/:id/strategy/execution-packs` | yes | yes | On-demand execution plan (extra Claude call); gated by `FEATURE_STRATEGY_EXECUTION_PACK` |
| `POST /api/audits/:id/roadmap/manifest-preview`, `POST/GET /api/audits/:id/roadmap/manifest-snapshots`, `POST/GET /api/audits/:id/orchestration/pack` | yes | yes | Roadmap manifest **preview** (no persist) + snapshots (immutable rows) + deterministic GLC orchestration pack read/write (Strategy Lab UI behind `APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled`; **preview**, **manifest-snapshots**, and **orchestration/pack** return **403** `ORCHESTRATION_PACK_API_DISABLED` when **`FEATURE_ORCHESTRATION_PACK_API`** is off; **GET pack** is a thin read of `audit_strategy` after access check) |
| `GET /api/audits/token-usage-summary` | yes | no | Consultant-only token aggregates + list slice |
| `GET /api/audits/:id/brief`, `PUT /api/audits/:id/brief` | yes | yes | Intake brief + `gates`; **GET** includes `product_mode` (runtime compatibility field) |
| `GET /api/audits/:id/pipeline/status`, `GET /api/audits/:id/quality-gate/:phase` | yes | yes | Progress / quality gate payload |
| `POST /api/audits/:id/pipeline/start`, `POST .../pipeline/next`, `POST .../pipeline/stop` | yes | yes | Client may start/continue/stop only when `audits.client_id` matches. Start still requires brief gates (`status === 'created'`). **`retry`** remains consultant-only. |
| `POST /api/audits/:id/pipeline/retry` | yes | no | Consultant-only: owner or platform operator (see retry section) |
| `POST /api/platform/audits/:id/pipeline/resume-cancelled` | platform admin only | no | Clears **`cancelled`**, then best-effort owner **`pipeline/next`** (see Platform section) |
| `POST /api/audits/:id/reviews/:phase` | yes | no | Consultant-only |
| `POST /api/audits/:id/brief/help-request` | no | yes | Client-only: optional brief help ping (`brief_help_*` on `audits` + consultant notification). Only while `status === 'created'`. |
| `DELETE /api/audits/:id` | yes (owner) | no | Destructive |

### `POST /api/audits`

Create a new audit.

**Roles:** **Consultant** — `user_id` is the authenticated consultant, `client_id` null. **Client (self-serve)** — allowed when a valid owner consultant is resolved (stored **`platform_settings.self_serve_audit_owner_user_id`**, legacy admin list, or earliest consultant in open mode — see `GET /api/platform/self-serve-owner`). The new row uses that consultant as `user_id` (billing/ownership) and `client_id` = authenticated client profile id. **`503`** with `code: "SELF_SERVE_OWNER_UNAVAILABLE"` when resolution fails.

**Consultant DPA:** **`403`** with **`AUDITS_DPA_REQUIRED`** when the caller is a **consultant** and the latest effective **`dpa_acceptance`** is not **accepted** (clients are not subject to this check on **`POST /api/audits`**). The SPA records acceptance on the new-audit confirm step or via **`POST /api/profile/legal-consents`** with **`source`: `audit_create`**. **`POST /api/audit-requests/:id/approve`** applies the same rule before creating the audit.

**Request body:**

```json
{
 "company_url": "https://example.com",
 "company_name": "Example Co", // optional
 "industry": "E-commerce", // optional
 "execution_plan": {
 "selected_domains": ["tech_infrastructure", "security_compliance"],
 "depth": "standard",
 "source": "user_selected",
 "coverage_package": "pro",
 "include_strategy": true
 }
}
```

`execution_plan` is optional. If omitted on new rows, backend defaults to `coverage_package: "complete"` with all domains. Legacy rows may still derive fallback coverage from `product_mode`.

**Response `201`:**

```json
{
 "id": "uuid",
 "status": "created"
}
```

---

### `GET /api/audits`

List audits visible to the caller (summary fields only): consultants see rows they own (`user_id`); clients see rows where they are `client_id`.

**Response `200`:**

```json
{
 "data": [
 {
 "id": "uuid",
 "company_url": "https://example.com",
 "company_name": "Example Co",
 "industry": "E-commerce",
 "product_mode": "full",
 "status": "completed",
 "current_phase": 7,
 "overall_score": 3.8,
 "tokens_used": 120000,
 "token_budget": 200000,
 "created_at": "2024-01-01T00:00:00Z",
 "updated_at": "2024-01-02T00:00:00Z"
 }
 ],
 "total": 1,
 "limit": 50,
 "offset": 0
}
```

---

### `GET /api/audits/token-usage-summary`

**Consultant only.** Paginated audits visible to the caller (same access as `GET /api/audits`) with per-row token usage, plus aggregates. Query: `limit`, `offset` (same caps as list).

**Response `200`:** `audits[]` includes `tokens_used`, `token_budget`, `tokens_remaining` (non-negative). `scopes.accessible` sums usage and remaining headroom across **all** visible audits (not only the current page). `scopes.platform` is present only when the caller may manage platform settings **and** `platform_settings.llm_token_pool_cap` is set: then it includes `pool_cap`, `global_tokens_used` (sum of `audits.tokens_used` system-wide), and `pool_tokens_remaining` (`pool_cap - global_tokens_used`).

---

### `GET /api/audits/:id`

Full audit state: audit meta + all domain results + strategy.

**Response `200`:**

```json
{
 "meta": {
 "id": "uuid",
 "company_url": "...",
 "company_name": "...",
 "industry": "...",
 "status": "completed",
 "overall_score": 3.8,
 "tokens_used": 45000,
 "token_budget": 200000,
 "created_at": "..."
 },
 "recon": { "company_name": "...", "industry": "...", "tech_stack": {}, ... },
 "domains": {
 "tech_infrastructure": {
 "score": 4,
 "label": "Good",
 "summary": "...",
 "strengths": ["..."],
 "weaknesses": ["..."],
 "issues": [{ "severity": "high", "title": "...", "description": "...", "impact": "..." }],
 "quick_wins": [{ "id": "uuid", "title": "...", "effort": "low", "timeframe": "3 days" }],
 "recommendations": [{ "title": "...", "priority": "high", "cost": "€500", "time": "2 weeks", "impact": "..." }]
 },
 "security_compliance": { ... },
 "seo_digital": { ... },
 "ux_conversion": { ... },
 "marketing_utp": { ... },
 "automation_processes": { ... }
 },
 "strategy": {
 "executive_summary": "...",
 "overall_score": 3.8,
 "schema_version": 2,
 "strategy_lab_context": {},
 "effective_constraints": { "company_stage": "growth", "budget_band": "medium", "team_scale": "small" },
 "quick_wins": [{ "id": "MKT-01", "title": "...", "domain": "marketing_utp", "decision": { "why_this": ["..."] }, "evidence": { "sources": [{ "domain_key": "marketing_utp", "issue_id": "..." }] }, "evidence_verified": true, "execution_paths": [{ "type": "fast", "description": "...", "time_estimate": "1w" }], "impact": "high", "effort": "low" }],
 "medium_term": [...],
 "strategic": [...]
 }
}
```

**Strategy initiatives:** New audits persist **`schema_version = 2`** rows with structured fields (scope, execution paths, decision, evidence). Older rows are **coerced** on read for API clients. **`evidence_verified`** is computed server-side against saved domain `issues` when `issue_id` references exist.

**`strategy_lab_context`:** Optional persisted overrides (subset of keys). **`effective_constraints`:** Read-only merge of intake brief + overrides, used for constraint rules when normalizing initiatives.

---

### `PATCH /api/audits/:id/strategy/lab-context`

Updates `audit_strategy.strategy_lab_context` for the audit. At least one field must be present in the JSON body. Send **`null`** for a field to remove that override and fall back to the intake brief for that axis.

**Body (examples):**

```json
{ "company_stage": "scale", "budget_band": "low" }
```

```json
{ "budget_band": null }
```

```json
{ "director_stage2_domains": ["tech_infrastructure", "ux_conversion"] }
```

(`director_stage2_domains` is an optional product signal for stage-2 deep director follow-up; send `null` to clear.)

**Response `200`:** `{ "strategy_lab_context": { "company_stage": "scale", "budget_band": "low" } }` (cleaned; omitted keys are not overrides).

**Errors:** `400 AUDITS_STRATEGY_LAB_CONTEXT_PAYLOAD_INVALID` (including empty body), `404 AUDITS_NOT_FOUND`, `500 AUDITS_STRATEGY_LAB_CONTEXT_FAILED`.

---

### `POST /api/audits/:id/strategy/execution-pack`

Generates a persisted **execution pack** (tasks, architecture, optional prompts) for 1–5 selected initiative ids. **One additional Claude call** per request; token usage is logged under phase **7** like strategy.

**Request `201` body (JSON):**

```json
{
  "initiative_ids": ["MKT-01", "SEO-02"],
  "selected_path_type": "fast"
}
```

**Response `201`:** `{ "id": "uuid", "payload": { "packs": [ { "initiative_id": "...", "tasks": ["..."], "architecture": "..." } ] } }`

**Errors:** `403 STRATEGY_EXECUTION_PACK_DISABLED`, `400 AUDITS_STRATEGY_EXECUTION_PACK_PAYLOAD_INVALID`, `409 AUDITS_STRATEGY_EXECUTION_PACK_NOT_READY` (strategy not completed), `429 AUDITS_STRATEGY_EXECUTION_PACK_FAILED` (token budget), `500` on persistence/LLM failure.

---

### `GET /api/audits/:id/strategy/execution-packs`

Lists recent execution-pack rows for the audit (metadata only: ids, initiative ids, timestamps). Full payload is returned from the **POST** response and stored in `audit_strategy_execution_packs.payload`.

---

### `POST /api/audits/:id/roadmap/manifest-preview`

Computes a **deterministic preview** of what the roadmap manifest implies (lanes in scope vs cut, waiting-list domains, compression/density hints, confidence callouts). Does **not** persist a snapshot. **Body** is the same JSON shape as **`POST .../manifest-snapshots`**. **`selected_domains`** must match **`audits.execution_plan.selected_domains`**.

**Response `200`:** `{ "preview": { "lanes_included": [...], "lanes_cut": [...], "waiting_list_domains": [...], "execution_compression_hint": "...", "lane_density_band": "...", "confidence_callouts": ["..."] } }`

**Errors:** `400 AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID`, `400 AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH`, `403 ORCHESTRATION_PACK_API_DISABLED`, `404 AUDITS_NOT_FOUND`, `500 AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED`.

---

### `POST /api/audits/:id/roadmap/manifest-snapshots`

Persists an immutable **roadmap input manifest** row. **`selected_domains`** must match **`audits.execution_plan.selected_domains`** (same set as the audit’s coverage contract).

**Request body (JSON):**

```json
{
  "schema_version": 2,
  "selected_domains": ["tech_infrastructure", "ux_conversion"],
  "change_scenario": "hybrid",
  "season_preset": "rolling_90d",
  "plan_horizon": {
    "start_date": "2026-01-01",
    "end_date": "2026-06-30"
  }
}
```

- **`schema_version`:** optional on write; defaults to **`2`**. **`1`** remains readable for legacy snapshots.
- **`plan_horizon`:** optional. ISO calendar dates **`YYYY-MM-DD`** with **`end_date` ≥ **`start_date`**. When present, **`GET /api/audits/:id/timeline`** partitions the critical path into near/mid/far using this window and node **`target_window_days`** (see `partitionCriticalPathIntoCalendarSeasonBuckets`); when omitted, the preset-only length split applies.

**Response `201`:** `{ "id": "<uuid>" }` — use as **`manifest_snapshot_id`** when building the orchestration pack.

**Errors:** `400 AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID`, `400 AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH`, `403 ORCHESTRATION_PACK_API_DISABLED` (when **`FEATURE_ORCHESTRATION_PACK_API`** is off), `404 AUDITS_NOT_FOUND`, `500 AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED`.

---

### `GET /api/audits/:id/roadmap/manifest-snapshots`

Lists recent **roadmap manifest** snapshot rows for the audit (newest first). Optional query: **`limit`** (integer, clamped between server defaults from `SYSTEM_DEFAULTS.routeQueries.orchestrationRoadmapManifestSnapshotsList`).

**Response `200`:** `{ "snapshots": [ { "id": "<uuid>", "created_at": "<iso>", "payload": { ...same shape as POST body... } } ] }`

**Errors:** `403 ORCHESTRATION_PACK_API_DISABLED` (when **`FEATURE_ORCHESTRATION_PACK_API`** is off), `404 AUDITS_NOT_FOUND`, `500 AUDITS_ROADMAP_MANIFEST_LIST_FAILED`.

---

### `GET /api/audits/:id/timeline`

Returns the **client timeline read model** (seasonal buckets, lanes, truncated dependencies, top-action windows). **`version.plan_horizon`** echoes the calendar window from the manifest snapshot tied to the pack (or from the latest snapshot when the pack is missing), when **`plan_horizon`** was saved on that manifest.

**Response `200`:** `{ "timeline": { "status": "...", "version": { "roadmap_version", "manifest_snapshot_id", "season_preset", "plan_horizon", ... }, "seasons", "lanes", ... } }` — see `server/src/schemas/orchestrator-timeline.ts`.

**Errors:** `403 ORCHESTRATION_PACK_API_DISABLED` when the pack API flag is off, `404` when the audit is missing or inaccessible.

---

### `POST /api/audits/:id/orchestration/pack`

Builds and saves **`glc_orchestration_pack`** on **`audit_strategy`** from finalized strategy initiatives, optional **Director** bundles under **`audit_domains.raw_data.glc_director_execution`** (baseline/deep `actions[]` per in-scope domain), and the given manifest snapshot (deterministic graph; optional LLM pass is server-flagged separately). Pack graph nodes may include **`source`** (`strategy` \| `director`) and **`analysis_depth`** (`baseline` \| `deep`) for client badges.

`glc_orchestration_pack` now uses **schema version 2** and includes deterministic PHASE 0/1 metadata:
- `phase_diagnostic` (`dominant_constraint`, `constraint_chain`)
- `routing_profile` (`strategy=weighted_domain_balance`, `domain_weights`)
- `graph.edges[].relation` (`direct_blocker` \| `strong` \| `medium` \| `weak`) and `weight`

Historical schema v1 rows are read through a server adapter and normalized to v2 on read.

**Request body (JSON):**

```json
{ "manifest_snapshot_id": "<uuid from manifest-snapshots POST>" }
```

**Response `200`:** `{ "pack": { ... }, "orchestration_pack_version": <number>, "roadmap_version": <number>, "last_revision_diff": <object | null> }`. **`roadmap_version`** mirrors **`orchestration_pack_version`** (ADR naming). **`last_revision_diff`** is **`null`** on the first saved pack (v1); on later versions it is the structured vN→vN+1 diff persisted on **`audit_strategy.glc_orchestration_last_revision_diff`**. Pack persistence uses optimistic version checks on `audit_strategy.orchestration_pack_version` (retry budget from server config). Subsequent **`GET /api/audits/:id`** includes **`strategy.glc_orchestration_pack`**, **`strategy.orchestration_pack_version`**, and **`strategy.glc_orchestration_last_revision_diff`** on the read model when present.

**Errors:** `400 AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID`, `400 AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH`, `403 ORCHESTRATION_PACK_API_DISABLED` (when **`FEATURE_ORCHESTRATION_PACK_API`** is off), `409 AUDITS_ORCHESTRATION_PACK_NOT_READY`, `500 AUDITS_ORCHESTRATION_PACK_FAILED`.

---

### `GET /api/audits/:id/orchestration/pack`

Returns the latest persisted **`glc_orchestration_pack`** and **`orchestration_pack_version`** for the audit (same JSON shape as in **`GET /api/audits/:id`** `strategy` when present). **`pack`** may be **`null`** when no pack has been saved yet.

**Response `200`:** `{ "pack": <object | null>, "orchestration_pack_version": <number>, "roadmap_version": <number>, "last_revision_diff": <object | null> }` — same fields as **`POST .../orchestration/pack`** success body for the latest row.

**Errors:** `403 ORCHESTRATION_PACK_API_DISABLED` (when **`FEATURE_ORCHESTRATION_PACK_API`** is off), `404 AUDITS_NOT_FOUND` (audit missing or no access), `500 AUDITS_FETCH_FAILED` (read failure).

---

### `DELETE /api/audits/:id`

Delete audit and all related data (CASCADE). Irreversible.

**Response `200`:**

```json
{ "deleted": true }
```

---

### `POST /api/audits/:id/brief/help-request`

**Auth:** client JWT only. **Body:** `{ "message": "optional short note" }` (trimmed, max 2000 chars).

Records `brief_help_requested_at` / `brief_help_client_message` on the audit and notifies consultants. Allowed only while `audits.status === 'created'` and the caller is the audit’s `client_id`. Does not block `pipeline/start`.

**Response `200`:** `{ "ok": true }`

---

### `GET /api/audits/:id/brief/schema`

**Auth:** same as `GET .../brief` (consultant owner or linked client).

**GET `200`:** Compact **IntakePlan**-shaped payload for the audit’s current `responses` and `collection_mode`, using the same **surface** rule as the main brief GET (consultant vs client; `surface` is `null` when no layout surface applies, e.g. `discovery`). Includes:

- **`intake_versions`** — tuple used to build the plan 
- **`eligible`**, **`visible`**, **`required`**, **`hidden`**, **`deferred`**, **`sla_visible_bank_ids`** 
- **`step_plan`**, **`layout_slots`** — when a layout surface is active 
- **`questions`** — rows `{ id, label, section, priority, answer? }` for each **`visible`** bank id; **`answer`** is the canon contract from `question-bank.v1.json` (`type`, `maxLength`, `options`, etc.). Any `optionsRef` is expanded to inline `options` for clients. 
- **`derived`** — `{ ai_readiness_score, confidence_overall, website_gate, … }` (`confidence_overall` is a **UX / resolver aggregate**, not the ADR `signalConfidence` contract and not phase-level analysis confidence)
- **`readiness`** — `{ flowReadinessStatus, auditReadinessStatus, trace }` canonical ADR Diagnostic Adaptive Intake snapshot (`flow_ready` | `blocked`, `audit_ready` | `blocked` | `ready_with_caveats`). In the current rollout slice, `ready_with_caveats` is emitted for express baseline readiness when full-scope required context is still missing (caveat class `full_scope_required_gaps`); **`trace`** entries include **`semanticCause`** strings for supportability
- **`critical_signals`** — `{ by_key, summary }` pilot **signal confidence** per ADR (orthogonal to **`derived.confidence_overall`**, which remains a UX / resolver aggregate)
- **`remediation_queue`** — ordered bank ids (max **2**) suggested when pilot remediation applies; subset of **`eligible`**

**Readiness enforcement (single server authority):** `evaluateIntakeReadinessEnvelope` in `@glc/intake-core` runs on **`PUT /api/audits/:id/brief`** for structured logging (writes are **not** rejected when audit readiness is `blocked` — UX vs execution; see [INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md](./INTAKE_DIAGNOSTIC_IMPLEMENTATION_CONTRACT.md)). **`POST …/discover/.../convert`** and **`POST /api/audits/:id/pipeline/start`** apply the same envelope **only when** `FEATURE_DIAGNOSTIC_INTAKE_PILOT=true` (default **off** in `SYSTEM_DEFAULTS`). Clients must not re-implement readiness logic locally.

**`GET …/brief` parity:** the same **`readiness`**, **`critical_signals`**, and **`remediation_queue`** fields as on this endpoint are also returned on **`GET /api/audits/:id/brief`** (additive to the existing brief payload) so clients can refresh execution diagnostics without a second request.

Use for tooling, previews, or clients that want a compact **IntakePlan** view. **`GET .../brief` returns the same plan-driven `questions` shape** (`getBriefQuestionsByIds(plan.visible)` after `buildIntakePlan`); neither endpoint returns every row of the **classic brief catalog** (export **`BRIEF_QUESTIONS`** in `@glc/intake-core`, built from **`modes.classic_brief.main`** in `intake-policy.v1.json`) — only **plan.visible** ids get question rows for the current responses / surface.

---

### `GET /api/audits/:id/brief` / `PUT /api/audits/:id/brief`

**Auth:** consultant (owner) or client linked to the audit.

**GET `200`:** `{ brief, questions, validation, gates, product_mode, … }` — `brief` includes `responses`, `collection_mode`, `collected_by`, optional **`intake_versions`** (`{ questionBankVersion, policyVersion, layoutVersion, resolverVersion, sequencingVersion }`), optional **`intake_version_migration`** (see below). **Additive (ADR diagnostic pilot, same shapes as `GET …/brief/schema`):** **`readiness`**, **`critical_signals`**, **`remediation_queue`**, **`next_recommended`** (ordered bank ids after pilot sequencing when applicable). **`questions`** is **`getBriefQuestionsByIds(plan.visible)` only** — each id is resolved against the **classic brief catalog** (same **`BRIEF_QUESTIONS`** export from `@glc/intake-core`, derived from policy **`modes.classic_brief.main`**). Only ids in **`plan.visible`** appear; **identity** bank stubs from **`identityFieldIds`** show up in **`questions`** only if they are also in **`plan.visible`**. Answer cells live in **`brief.responses`** under **bank ids** (and side keys such as **`…__other`**, **`intake_industry_specify`**). Same `buildIntakePlan` inputs as `GET .../brief/schema` (product mode, collection mode, caller surface, versions). Validation and `gates` are computed for the caller’s surface (consultant vs client), using stored `intake_versions` when it is a **supported** frozen or current tuple; otherwise the server falls back to the **current** engine tuple for validation (legacy rows).

**PUT body:** `{ "responses": { … } }`, optional **`collection_mode`**, optional **`intake_versions`**.

- **`intake_versions` omitted** — the server reuses the stored tuple, or the **current** tuple for a new row. If the stored tuple is **unsupported**, the write is accepted and the row is repaired to the current tuple; **`intake_version_migration`** records `{ from, to, at, reason: 'unsupported_stored_repaired' }`.
- **`intake_versions` present** — must include all **five** keys (`sequencingVersion` included), **or** the legacy **four** keys (`questionBankVersion`, `policyVersion`, `layoutVersion`, `resolverVersion`) only — in the four-key case the server treats **`sequencingVersion`** as the current pilot default on parse. Unsupported tuple → **`400`** `UNSUPPORTED_INTAKE_VERSION`. Supported tuple that does not match stored (and is not an allowed upgrade to current) → **`409`** `INTAKE_VERSION_CONFLICT`. Sending the **current** tuple when stored was an older supported tuple → upgrade; migration **`reason: 'client_upgrade'`** is persisted once.

**Operational semantics (not bugs):** Brief rows with **`intake_versions` null** pre-date the version matrix; **GET** validation and plan assembly use the **current** resolver and artifact bundle (same idea as “unsupported stored” fallback on GET). **PUT** rules above still apply; the **server** is authoritative on what tuple and answers are stored — a client cannot force an unsupported artifact tuple (**400**), and a supported tuple still goes through normal **response validation** (the tuple is not a bypass). **Public** Discover and pre-brief routes use split rate limiters; they use **Redis** when **`RATE_LIMIT_REDIS_URL`** is set, otherwise **in-memory per process** (limits do not aggregate across horizontally scaled instances — see [ARCHITECTURE.md](./ARCHITECTURE.md#public-routes-abuse-control-and-scaling)). **Releases:** ship SPA and API together when changing `@glc/intake-core` resolver behaviour where possible; tuple validation reduces silent artifact skew between client and server but not every cross-deployment UX edge case.

Migration column: deploy **`028_intake_version_migration.sql`** — `intake_brief.intake_version_migration` (`jsonb`, nullable).

---

### `POST /api/audits/:id/upgrade-from-snapshot`

**Auth:** registered **client** JWT (not guest). Promotes a **completed** `product_mode: free_snapshot` audit to package-based coverage (`starter` / `pro` / `complete`), resets domain rows, and either seeds the intake brief from quick-scan recon / `snapshot_deterministic` (`use_scraped_context: true`) or clears recon placeholders (`use_scraped_context: false`).

**Body:** `{ "coverage_package": "starter" | "pro" | "complete", "use_scraped_context": boolean }`

When `use_scraped_context` is **true** but the snapshot **did not retrieve HTML** (e.g. `robots.txt` blocked the homepage or fetch failed — `scan_basis_code: degraded`, `pages_fetched: 0`), the response still succeeds and **`intake_brief.recon_prefills`** gains **`snapshot_scrape_limited`**, **`snapshot_scrape_robots_blocked`**, and **`snapshot_scrape_note`** so consultants know pre-fill is thin; **`overall_score_hint` is omitted** so a **0** is not treated as a real score.

**Response `200`:** `{ "ok": true }`, or when scrape was limited and context was requested:

```json
{
 "ok": true,
 "snapshot_scrape_limited": true,
 "snapshot_scrape_robots_blocked": true
}
```

(`snapshot_scrape_robots_blocked` may be `false` when the limitation was a non-robots fetch failure.)

---

## Pipeline

### `POST /api/audits/:id/pipeline/start`

Start Phase 0 (Recon). Audit must be in `created` status; intake brief gates must allow start for the audit’s selected coverage package. **Consultant** callers must own the row (`user_id`). **Client** callers must match `client_id` on the audit.
Supports optimistic race protection via DB compare-and-set. If another request already claimed execution, returns `409`.
Execution is queue-backed when Redis is configured: route enqueues a pipeline job and returns immediately; worker processes perform phase execution. If queue backend is unavailable, runtime falls back to in-process execution.

Optional JSON body: `{ "disable_auto_remediate": true }` skips Phase 9 auto-remediation for pipeline work triggered by this request (including BullMQ worker runs). When omitted, remediation follows `FEATURE_AUTO_REMEDIATION` in `feature_flags`.

Phase execution after recon is controlled by `audits.execution_plan.selected_domains` (partial coverage supported). `execution_plan` is canonical for phase routing.

**Response `200`:**

```json
{ "status": "started", "phase": 0, "intakeProgress": { ... } }
```

---

### `POST /api/audits/:id/pipeline/next`

Run the next pending phase or parallel block. Used after a review approval to continue the pipeline. **Clients** linked via `client_id` may call this when the pipeline is waiting to advance in a state the API allows (consultants still own review submissions and retry).
Uses compare-and-set claim on the audit row to prevent duplicate concurrent starts.
Queue-backed execution/fallback behavior is the same as `pipeline/start`.
Optional body `{ "disable_auto_remediate": true }` — same semantics as `pipeline/start`.

For partial audits, `/next` advances to the next selected phase from `execution_plan` (not strictly `current_phase + 1` by domain index).

**Response `200`:**

```json
{ "status": "running", "phase": 1 }
```

---

### `POST /api/audits/:id/pipeline/retry`

Retry a failed phase. **Consultant-only.** Allowed for the audit owner (`audits.user_id`) or for consultants who pass the same **platform operator** check as `GET /api/platform/*` settings routes (`profiles.is_platform_admin`, `platform_settings.legacy_platform_admin_user_ids`, or any consultant when no platform admins are configured — see `server/src/lib/platform-admin.ts`). Request body must include the `phase` number to retry. Behaviour and limits depend on `product_mode` (phases above the mode’s max are rejected).
Uses compare-and-set claim on the audit row to prevent duplicate concurrent retries.
Queue-backed execution/fallback behavior is the same as `pipeline/start`.
Optional field `disable_auto_remediate: true` in the same JSON body — same semantics as `pipeline/start`.

**Response `200`:** e.g. `{ "status": "retrying", "phase": <number> }`

---

### `POST /api/audits/:id/pipeline/stop`

Cancel an in-progress or pending pipeline safely. Allowed for the audit owner consultant (`user_id`) and linked client (`client_id`). 
This endpoint sets `audits.status = "cancelled"` via compare-and-set claim so concurrent requests cannot overwrite the cancel action.

Returns `400` for terminal states (`completed`, `failed`, `cancelled`) and `409` if another request won the optimistic claim race.

**Response `200`:**

```json
{ "status": "cancelled", "stopped": true }
```

---

### `GET /api/audits/:id/pipeline/status`

Current pipeline state. Recent **`pipeline_events`** rows are capped at **`SYSTEM_DEFAULTS.routeQueries.pipelineStatusEventsLimit`** (default **50**; see `PIPELINE_STATUS_EVENTS_LIMIT` in `route_query_limits`).

Orchestrator-emitted `error` rows may include **`data.error_code`** for stable downstream handling. Source of truth: **`PIPELINE_EVENT_ERROR_CODES`** in `pipeline_event_error_codes` (e.g. parallel block total failure, free snapshot capacity, free snapshot generic failure).

**Response `200`:**

```json
{
 "status": "auto",
 "current_phase": 2,
 "tokens_used": 32000,
 "token_budget": 200000,
 "product_mode": "full",
 "events": [],
 "reviews": []
}
```

---

### `POST /api/audits/:id/reviews/:phase`

Submit review approval at a review gate. Optionally includes consultant and interview notes that will be added to the context for subsequent phases.

**`phase` values (full audit):** `0` (after recon), `4` (after auto wing), `7` (after strategy). Express mode uses `0` and `4` only. See [PIPELINE.md](./PIPELINE.md).

**Request body:**

```json
{
 "consultant_notes": "Client mentioned they recently migrated to Shopify.",
 "interview_notes": "CEO says their main challenge is converting mobile visitors."
}
```

**Response `200`:**

```json
{
 "id": "uuid",
 "audit_id": "uuid",
 "after_phase": 4,
 "status": "approved",
 "consultant_notes": "Client mentioned they recently migrated to Shopify.",
 "interview_notes": "CEO says their main challenge is converting mobile visitors.",
 "approved_at": "2026-01-01T10:00:00.000Z"
}
```

If the review was already approved earlier, route returns `{ "status": "already_approved" }`.

---

## Idempotency support

Critical write endpoints accept optional `Idempotency-Key` header:

- `POST /api/audits`
- `POST /api/audit-requests/:id/approve`

Rules:

- Same key + same payload returns stored response (safe replay).
- Same key + different payload returns **`409`** with body `{ "code": "IDEMPOTENCY_PAYLOAD_MISMATCH", "error": "This idempotency key was already used with a different request body." }` (no internal exception text).
- Keys are scoped by `user_id + route` and stored for 24 hours.

---

## Notifications

In-app notification center endpoints (authenticated users only). Notifications are scoped by `user_id`; users can only read/update their own rows.

Base kind taxonomy: `pipeline` | `review` | `intake`.

Additional semantics are carried in `payload` (for example `request_id`, `artifact`, `failure_type`, `route`) so the client can render tailored icons and deep-link to the relevant screen.

### Structured notification event model

Server-side notification producers use a unified envelope that is persisted to in-app notifications and can also fan out to Telegram:

- `category`: `pipeline` | `review` | `intake` | `request` | `snapshot` | `registration` | `help` | `system`
- `event`: stable event code (for example `pipeline_phase_failed`, `audit_request_approved`, `brief_help_requested`)
- `priority`: `critical` | `medium` | `low`
- `audience`: `user` | `audit_participants` | `audit_participants_except` | `consultants`
- `context`: `audit_id`, `route`, actor metadata, and event-specific payload fields

Priority policy:

- `critical` (RED): pipeline failures and system incidents/degradations
- `medium` (YELLOW): review-required events, help requests, action requests/changes
- `low` (GREEN): successful completion, artifact-ready, registration, successful snapshot/intake flow

Telegram uses **HTML** (`parse_mode: HTML`) for readability:

- header: **`GLC Ops`** plus labeled lines (severity, area, summary)
- fields: event code, audit id, time, optional route
- trailing **Details** block with the free-text message body

### `GET /api/notifications`

List notifications in reverse chronological order.

**Query params:**

- `limit` (defaults and max from **`SYSTEM_DEFAULTS.routeQueries.notifications`** — default **30**, max **100**, min **1**)
- `offset` (default `0`)
- `unreadOnly` (`true|false`, default `false`)

**Response `200`:** `{ "data": [...], "total": <number>, "limit": <number>, "offset": <number> }`

### `GET /api/notifications/unread-count`

Returns current unread count for the authenticated user.

**Response `200`:** `{ "unread": <number> }`

### `POST /api/notifications/:id/read`

Marks one notification as read (`is_read=true`, `read_at=<timestamp>`).

**Response `200`:** `{ "ok": true }`

### `POST /api/notifications/read-all`

Marks all unread notifications for the current user as read.

**Response `200`:** `{ "ok": true }`

---

## Reports

### `GET /api/audits/:id/report`

Generate a markdown, JSON, or CSV audit report. Caller must be the audit **owner** (`user_id`) or **client** (`client_id`).

#### Query parameters

- `format`: `json` (default), `markdown`, `csv`, `pdf`.
- `profile`: `full` (default), `owner`, `tech`, `marketing`, `onepager`; invalid value falls back to `full`.

**Response `200`**

- `format=markdown` — `Content-Type: text/markdown`
- `format=json` — JSON with `markdown` field
- `format=csv` — `Content-Type: text/csv` with attachment filename `audit-{id}-action-plan.csv`

---

### Report coverage metadata

`GET /api/audits/:id/report?format=json` now includes:

- `coverage.covered_domains`
- `coverage.not_covered_domains`
- `coverage.coverage_ratio`
- `coverage.coverage_adjusted_score`
- `coverage.comparability_note`

Use this to distinguish partial audits from complete 6-domain runs when presenting scores and avoid false comparability.

## Public Snapshot

### `GET /api/snapshot/quota`

Public endpoint (no JWT). Returns how many free website checks are **still available** from this IP in the current rolling window (same counter as `POST /api/snapshot`; this request does **not** consume a check). With Redis configured, the quota counter is shared across API instances.

**Response `200`:** `{ "limit", "remaining", "period": "day", "reset_at": "<ISO timestamp> | null" }`

### `POST /api/snapshot`

Start a free snapshot run. **Auth:** none (public). The server sets or refreshes an **httpOnly** cookie **`glc_snapshot_guest`** and upserts **`snapshot_guest_sessions`** (funnel analytics; 90-day row retention). The audit is created with platform **self-serve owner** `user_id` and **`client_id = null`** until the user calls **`POST /api/snapshot/claim`** after sign-in.

**CORS:** the SPA must use **`credentials: 'include'`** on this request (and on poll **`GET /api/snapshot/:token`** if you rely on the same cookie). Production cookies use **`SameSite=None; Secure`**.

**Token budget:** the new audit row is inserted with **`token_budget`** from **`SYSTEM_DEFAULTS.snapshotPublic.freeSnapshotTokenBudget`** (default **80000**). **`POST /api/audits`** rows use the database column default (**200000** in the initial schema) unless a future migration or insert overrides it — free snapshots intentionally use a lower ceiling.

**Body:** **`company_url`** (string, required). A scheme is optional; the server prepends **`https://`** when missing, then validates against the same public URL rules as other marketing/audit entry points.

**Optional body fields** (all strings, ignored if invalid): **`utm_source`**, **`utm_medium`**, **`utm_campaign`** — stored on the guest session row for attribution.

**Response `202`:** `{ "snapshot_token": "<uuid v4>", "status": "running" }`.

**`400`:** missing or non-string **`company_url`**. Rejected URLs (SSRF / policy): JSON body uses stable **`code`** values under the `PUBLIC_URL_*` family (e.g. `PUBLIC_URL_HOST_NOT_ALLOWED`, `PUBLIC_URL_DNS_NON_PUBLIC`) with English **`error`** from `api-user-messages.en.json` — same shape as **`POST /api/audits`** and audit-request URL validation.

**`503`:** `{ "error", "code": "SELF_SERVE_OWNER_UNAVAILABLE" }` when the platform **self-serve audit owner** cannot be resolved (same operational requirement as client-created audits — configure `platform_settings.self_serve_audit_owner_user_id` or a valid implicit fallback; see **`GET /api/platform/self-serve-owner`** above).

**Implementation:** deterministic scanner — **no LLM**. Tiered HTTP fetch (homepage plus up to a few same-origin URLs), cheerio-based **facts**, YAML-driven **site profile** (classification) and **audit rules** (expanded YAML catalog; some rules may be **skipped** per `skipForSiteTypes` / `onlyForSiteTypes` using classifier `siteType`), overall score **0–100** with four category scores. Outbound HTTP user-agents for snapshot/crawl paths embed **`GLC_PUBLIC_SITE_URL`** (HTTPS origin, no trailing slash; **required in production**; dev default **`https://glctech.es`** if unset). **Wall clock:** **`SYSTEM_DEFAULTS.snapshotFetchBudgetMs`** (default **10000** ms; see `snapshot_fetch_budget`). **robots.txt:** fetches `/robots.txt` (cached per origin; TTL **`SYSTEM_DEFAULTS.snapshotRobots.cacheMs`**, default 20 minutes). Honors `Disallow` for the snapshot user-agent (`*` and `GLC-SnapshotScanner`): if `/` is disallowed, **no HTML is fetched** (same outcome as unreachable home for the pipeline). Extra same-origin URLs are skipped when disallowed. **Crawl-delay** is applied best-effort between extra fetches within the overall fetch budget. **Playwright tier-3:** when **`SYSTEM_DEFAULTS.snapshotTieredFetch.playwrightEnabled`** is true and the static homepage matches client-shell heuristics, the server attempts to re-fetch it with headless Chromium (budget **`snapshotTieredFetch.playwrightBudgetMs`**, capped by remaining wall clock). Turn off by setting **`playwrightEnabled`** to **false** in **`system_defaults`** and redeploying. Requires `playwright` + `npx playwright install chromium` on the host; failures are logged and the scan continues with HTTP HTML. Results for the same **registrable host** may be served from `snapshot_domain_cache` (TTL **`SYSTEM_DEFAULTS.snapshotDomainCache.ttlHours`**, default 48); **cached JSON omits raw email/phone vectors** (PII minimization). Rule catalogs: `server/config/snapshot/classification-rules.v1.yaml`, `server/config/snapshot/audit-rules.v1.yaml`.

**Fair use:** at most **3** successful starts per IP per rolling **24 hours** (abuse control). Only **`POST`** responses that the limiter treats as successful (typically **2xx**) increment the counter (`skipFailedRequests`), so validation **`400`** and **`429 DOMAIN_FRESH_COOLDOWN`** do not consume a daily slot. `GET` polling and `GET /quota` do not count.

**Per-domain fresh cooldown:** If there is **no** valid row in `snapshot_domain_cache` for the registrable host but that host **just** completed a fresh scan (in this process **or**, when **`SYSTEM_DEFAULTS.snapshotAbuse.useSharedAbuseStore`** is true, any instance via **`snapshot_domain_cooldown`**), `POST` returns **`429`** with `code: "DOMAIN_FRESH_COOLDOWN"`, `retry_after_seconds`, and a plain-language `error`. Cached hits still return **`202`** (same host may be checked again from cache without waiting). Cooldown length is **`SYSTEM_DEFAULTS.snapshotAbuse.domainFreshCooldownMs`** (default **600000** ms = 10 minutes; set **0** in config to disable).

**Concurrent fresh scans:** At most **`SYSTEM_DEFAULTS.snapshotAbuse.maxConcurrent`** parallel **fresh** fetches (cache miss path; default **4**). With **`useSharedAbuseStore`** and migration **`022_snapshot_fresh_lease.sql`**, the cap applies **cluster-wide** via TTL leases in **`snapshot_fresh_lease`**. Otherwise it is **per process** only. If the limit is reached, the audit is marked **failed** and the worker logs **`snapshot.pipeline_capacity`**; the client still received **`202`** — poll until `status: "failed"`. Lease TTL is derived from the snapshot fetch budget (see `abuse_guards`).

**Response `429` (daily IP cap):** `RATE_LIMITED` — body includes `error`, `code`, `limit`, `remaining`, `period: "day"`, `retry_after_hours`. Successful **`202`** responses include `RateLimit-Limit` / `RateLimit-Remaining` headers (exposed to browsers via CORS).

### `POST /api/snapshot/claim`

**Auth:** `Authorization: Bearer <access_token>` (`requireAuth`).

**Body:** `{ "snapshot_token": "<uuid v4>" }` — must match the same **UUID v4** pattern as **`GET /api/snapshot/:token`**.

**`200`:** `{ "ok": true, "audit_id": "<uuid>", "already_claimed": boolean }` — sets **`audits.client_id`** to the current user when it was `null`; idempotent if already linked to the same user.

**`400`:** missing/invalid `snapshot_token`.

**`401`:** missing/invalid JWT.

**`404`:** snapshot not found (neutral).

**`409`** `SNAPSHOT_CLAIM_CONFLICT`: snapshot already linked to another user (neutral copy).

**`410`:** token TTL expired (same window as public poll).

**Implementation:** deterministic scanner — **no LLM**. Tiered HTTP fetch (homepage plus up to a few same-origin URLs), cheerio-based **facts**, YAML-driven **site profile** (classification) and **audit rules** (expanded YAML catalog; some rules may be **skipped** per `skipForSiteTypes` / `onlyForSiteTypes` using classifier `siteType`), overall score **0–100** with four category scores. Outbound HTTP user-agents for snapshot/crawl paths embed **`GLC_PUBLIC_SITE_URL`** (HTTPS origin, no trailing slash; **required in production**; dev default **`https://glctech.es`** if unset). **Wall clock:** **`SYSTEM_DEFAULTS.snapshotFetchBudgetMs`** (default **10000** ms; see `snapshot_fetch_budget`). **robots.txt:** fetches `/robots.txt` (cached per origin; TTL **`SYSTEM_DEFAULTS.snapshotRobots.cacheMs`**, default 20 minutes). Honors `Disallow` for the snapshot user-agent (`*` and `GLC-SnapshotScanner`): if `/` is disallowed, **no HTML is fetched** (same outcome as unreachable home for the pipeline). Extra same-origin URLs are skipped when disallowed. **Crawl-delay** is applied best-effort between extra fetches within the overall fetch budget. **Playwright tier-3:** when **`SYSTEM_DEFAULTS.snapshotTieredFetch.playwrightEnabled`** is true and the static homepage matches client-shell heuristics, the server attempts to re-fetch it with headless Chromium (budget **`snapshotTieredFetch.playwrightBudgetMs`**, capped by remaining wall clock). Turn off by setting **`playwrightEnabled`** to **false** in **`system_defaults`** and redeploying. Requires `playwright` + `npx playwright install chromium` on the host; failures are logged and the scan continues with HTTP HTML. Results for the same **registrable host** may be served from `snapshot_domain_cache` (TTL **`SYSTEM_DEFAULTS.snapshotDomainCache.ttlHours`**, default 48); **cached JSON omits raw email/phone vectors** (PII minimization). Rule catalogs: `server/config/snapshot/classification-rules.v1.yaml`, `server/config/snapshot/audit-rules.v1.yaml`.

**Fair use:** at most **3** successful starts per IP per rolling **24 hours** (abuse control). Only **`POST`** responses that the limiter treats as successful (typically **2xx**) increment the counter (`skipFailedRequests`), so validation **`400`** and **`429 DOMAIN_FRESH_COOLDOWN`** do not consume a daily slot. `GET` polling and `GET /quota` do not count.

**Per-domain fresh cooldown:** If there is **no** valid row in `snapshot_domain_cache` for the registrable host but that host **just** completed a fresh scan (in this process **or**, when **`SYSTEM_DEFAULTS.snapshotAbuse.useSharedAbuseStore`** is true, any instance via **`snapshot_domain_cooldown`**), `POST` returns **`429`** with `code: "DOMAIN_FRESH_COOLDOWN"`, `retry_after_seconds`, and a plain-language `error`. Cached hits still return **`202`** (same host may be checked again from cache without waiting). Cooldown length is **`SYSTEM_DEFAULTS.snapshotAbuse.domainFreshCooldownMs`** (default **600000** ms = 10 minutes; set **0** in config to disable).

**Concurrent fresh scans:** At most **`SYSTEM_DEFAULTS.snapshotAbuse.maxConcurrent`** parallel **fresh** fetches (cache miss path; default **4**). With **`useSharedAbuseStore`** and migration **`022_snapshot_fresh_lease.sql`**, the cap applies **cluster-wide** via TTL leases in **`snapshot_fresh_lease`**. Otherwise it is **per process** only. If the limit is reached, the audit is marked **failed** and the worker logs **`snapshot.pipeline_capacity`**; the client still received **`202`** — poll until `status: "failed"`. Lease TTL is derived from the snapshot fetch budget (see `abuse_guards`).

**Response `429` (daily IP cap):** `RATE_LIMITED` — body includes `error`, `code`, `limit`, `remaining`, `period: "day"`, `retry_after_hours`. Successful **`202`** responses include `RateLimit-Limit` / `RateLimit-Remaining` headers (exposed to browsers via CORS).

### `GET /api/snapshot/:token`

Poll current status or retrieve completed preview payload.

- **`snapshot_token`** must be a **UUID version 4** (server validates with a strict pattern; other UUID variants are **`400`** **`Invalid snapshot token`**).
- Token TTL is enforced by backend (`SYSTEM_DEFAULTS.snapshotPublic.tokenTtlHours`, default `72`).
- Expired tokens return **`410`** **`Snapshot token expired`**; the server clears **`audits.snapshot_token`** for that row so the link stops working.
- **Race after pipeline completion:** If `audits.status` is already **`completed`** but **`audit_domains.raw_data.snapshot_deterministic`** is not yet persisted with a finite numeric **`overall_score`**, the handler still returns **`{ "status": "running", "snapshot_token" }`**. Clients must keep polling until they receive a full **`completed`** preview body or **`failed`**.

When completed, the JSON may include **`snapshot_access_blocked`** (boolean) and **`snapshot_access_robots_blocked`** (boolean, meaningful only when the former is true). The API sets these when the scan could not usefully read public HTML (e.g. `robots.txt` blocks the homepage or fetch produced no pages); clients should treat this as a limited / blocked outcome rather than a full scored check. These fields are omitted when access is normal.

**Access flags (HTTP vs logged-in portal):** On completed responses, the server may **recompute** those booleans with `computePublicSnapshotAccessFlags` (`snapshot_access_state`) so legacy rows and merge edge cases match the same rules as fresh persists (uses `snapshot_deterministic`, merged `scan_coverage`, `ux_summary`, `scan_basis_code`, `overall_score`). The SPA portal mirror built from audit state (`freeSnapshotPreviewFromAuditState`) only forwards **`snapshot_access_*` stored in `raw_data`**. For blocked callouts and copy, portal code **must** use **`getSnapshotAccessBlockedState`** (`snapshot_diagnostics`), which applies the equivalent fallback heuristics — do not rely on persisted flags alone in the portal.

**Database:** Deploy migration **`024_audit_domains_prompt_version_len.sql`** before or with any backend release that writes a longer deterministic snapshot label into **`audit_domains.prompt_version`** (column widened from `VARCHAR(20)` to `VARCHAR(64)`). Confirm applied on staging/production (e.g. Supabase Table Editor / `\d audit_domains`) so inserts are not truncated or rejected. The payload also includes **`tech_stack`** (confirmed names by category from HTML/script fingerprinting). Optional **`tech_stack_tentative`** lists *possible* technologies from weak signals only (JSON-LD text, `meta name=generator`, or a `type=module` entry when no framework matched); each item is **`{ name, category, signal }`** with **`signal`** explaining the limitation (quick scan does not inspect minified bundles). Omitted when empty. **`ai_visibility`** (when present) has **`gaps`**: `robots_txt` | `sitemap_html` | `structured_data` | `discovery_files` — heuristics from the sampled HTML plus whether `robots.txt` was retrieved; clients map codes to copy. Omitted on older snapshots. It also includes **`ux_score` / `ux_label` / `ux_summary`** (derived from the same deterministic run) plus optional extended fields when present: **`overall_score`** (0–100; **0** when **`scan_basis_code`** is **`degraded`** and no pages were scored), **`category_scores`**, human-readable **`scan_basis`**, normalized **`scan_basis_code`**: `homepage_only` | `homepage_plus_core_pages` | `homepage_rendered_fallback` | `degraded` | **`cache_hit`** (set when the run was satisfied from **`snapshot_domain_cache`**), plus boolean **`cache_hit`** when applicable, **`scanned_at`** (ISO 8601 when the payload was built on a fresh fetch), **`limitations`** (string array; robots block, fetch failure, or heuristic notes for challenge/WAF/parked/login-wall patterns), **`signals_found`**, **`scan_confidence_band`**, advisory **`site_profile`** with **`classification_confidence_band`**, optional **`scan_coverage`** (includes robots, Playwright, when the homepage failed while allowed by robots: **`home_fetch_failure`**: `network_or_timeout` | `http_error` | `non_html` | `empty_body`, optional flags **`challenge_page_likely`**, **`parked_domain_likely`**, **`login_wall_likely`**, and optional taxonomy strings **`challenge_taxonomy`**, **`parked_taxonomy`**, **`login_wall_taxonomy`** — enumerated in the next block; canonical definitions in `page_anomaly`), **`audit_rules_version`** (audit catalog), **`classification_version`**, **`fetch_strategy_version`**, **`snapshot_engine_version`**. Persisted extras are merged from `audit_domains.raw_data.snapshot_deterministic`. Classification uses path segments from same-origin links on fetched pages (cap **`SYSTEM_DEFAULTS.snapshotLinkSlug`** / **`min(max, hardCap)`**, default **80**), not only URLs that were fully downloaded.

**`scan_coverage` taxonomy slugs** (optional; stable for dashboards; HTML heuristics only):

- **`challenge_taxonomy`**: `cloudflare` | `akamai_bot` | `fastly` | `aws_waf` | `imperva_incapsula` | `sucuri` | `stackpath` | `perimeterx` | `datadome` | `generic_bot_interstitial`
- **`parked_taxonomy`**: `for_sale_or_aftermarket` | `registrar_parking_page` | `minimal_placeholder` | `under_construction_hosting`
- **`login_wall_taxonomy`**: `auth_keyword_copy` | `signin_heading` | `password_field_thin_page` | `oauth_or_sso_form` | `openid_oidc_meta` | `spa_shell_thin_html` (mostly a JS app shell in the initial HTML; substantive copy may load client-side or after login)

### Snapshot operator (optional)

When **`SNAPSHOT_OPERATOR_TOKEN`** is set on the server, two routes accept the token as **`Authorization: Bearer <token>`** or header **`X-Snapshot-Operator-Token`**. If the env var is **unset**, or the request is **missing / wrong** token, both handlers respond **`404`** **`{ "error": "Not found" }`** (no disclosure of whether the route exists).

- **`GET /api/snapshot/operator/metrics`** — counters (runs, cache vs fresh, Playwright use, fetch-failure classes, rule outcome totals, latency **p50** / **p95**) plus, when **`SNAPSHOT_SHARED_ABUSE_STORE`** is enabled: **`shared_abuse_store`**, **`snapshot_max_concurrent`**, **`snapshot_fresh_lease_ttl_seconds`**, **`snapshot_fresh_leases_active`** (DB count of non-expired leases). In-process counters reset on restart; shared lease headcount reflects the cluster.
- **`POST /api/snapshot/operator/purge-cache`** — body **`{ "host": "example.com" }`** (registrable host, optional `https://` prefix). Deletes the row in **`snapshot_domain_cache`** for that host. Does not delete audit history.

Public snapshot polling no longer exposes user-triggered competitor compare toggles. Completed payloads may still include `competitor_mini` only when explicitly assembled by server-side flows.

### `POST /api/snapshot/compare`

Authenticated explicit comparison for client portal usage.

- **Auth:** `Authorization: Bearer <access_token>` (`requireAuth`).
- **Body:** `{ "self_url": "https://your-site.com", "competitor_url": "https://competitor.com" }`
- **Validation:** both URLs run through the same public URL policy as snapshot/audit entrypoints (`validatePublicAuditUrl`), so rejected targets return granular `PUBLIC_URL_*` error codes.
- **Response `200`:** `{ "competitor_mini": { ... } | null }` where `competitor_mini` carries four verifiable metrics (HTTPS, viewport meta, hreflang count, JSON-LD). `null` means comparison could not be assembled within constraints (e.g., timeout or non-HTML response).
- **`400`:** `SNAPSHOT_COMPARE_SELF_URL_REQUIRED` or `SNAPSHOT_COMPARE_COMPETITOR_URL_REQUIRED` when inputs are missing.
- **`401`:** missing/invalid JWT.
- **`429`:** shared compare limiter (`COMPARE_RATE_LIMITED`) when hourly compare budget is exhausted.
- **`500`:** `SNAPSHOT_COMPARE_FAILED` on unexpected server error.

When `status === "failed"`, the body includes **`code: "SNAPSHOT_FAILED"`** (e.g. unreachable site, capacity shed, or pipeline error). Fine-grained reasons may be added later.

---

## Pre-brief intake (public link)

Migration: `011_intake_tokens.sql`. Table `intake_tokens` — operations via service role in the API.

### `POST /api/intake`

**Auth:** consultant JWT (`requireAuth` + `attachProfile` + `requireRole('consultant')`).

**Body (optional):**

- `audit_id` — UUID; if set, responses from `POST .../respond` merge into that audit’s `intake_brief` (consultant must own the audit).
- `metadata` — JSON object for the client-facing pre-brief page. Common keys:
 - `company_name`, `company_website`, `industry` — optional pre-fill for **identity bank cells** (client can edit before submit): maps to **`a12`**, **`a11`**, **`a2`** respectively (`applyIntakeMetadataPrefill` in the SPA). Website: full URL, or client may enter `none` / `no website` if absent. `industry` must match a canonical industry option (same catalog as **`a2`** / New Audit) or it is ignored for pre-fill. Optional **`industry_specify`** seeds **`intake_industry_specify`** when **`a2`** is **Other**. **`a5`** (website presence) is part of identity in policy but is **not** set from these metadata keys by default.
 - `message` — header context.
 - `consultant_name` — shown on the success screen (“X has received your answers”).
 - `expected_contact` — timing hint (e.g. `24 hours`, `Friday`, `our Thursday call`); combined with `contact_channel` for the follow-up line. If omitted, the UI defaults to “within 24 hours”.
 - `contact_channel` — e.g. `WhatsApp`, `phone`, `email`.
 - `consultant_email`, `consultant_whatsapp` — optional; shown as “Questions? …” on success.

**Response `201`:** `{ "token", "url", "expires_at" }` — `url` is built from **`FRONTEND_URL`** (required when **`NODE_ENV=production`**; otherwise defaults to `http://localhost:5173`) + `/intake/:token`.

### `POST /api/intake/link-audit`

**Auth:** consultant JWT.

**Body:** `{ "token": "<40 hex>", "audit_id": "<uuid>" }` — ties an existing intake token to an audit you own. If the client already submitted answers while `audit_id` was null, those pre-brief fields are merged into `intake_brief` immediately. Use this when the link was created without `audit_id` (e.g. from New Audit before the audit existed), then the audit is created afterward.

**Errors:** `400` invalid body, `403` token owned by another user, `404` token or audit not found, `409` token already linked to a different audit.

### `GET /api/intake/submissions`

**Auth:** consultant JWT.

Lists intake tokens **you created** where the client has already submitted (`submitted_at` is set), newest first. Row cap: **`SYSTEM_DEFAULTS.routeQueries.intakeSubmissionsMaxRows`** (exported as `INTAKE_SUBMISSIONS_LIST_MAX` from `route_query_limits`; default **100**). Used by the admin request queue to show raw pre-brief answers before or after linking to an audit. See [DEPLOYMENT.md — Consultant list endpoints](./DEPLOYMENT.md#consultant-list-endpoints-hard-cap).

**Response `200`:** `{ "submissions": [ { "token", "metadata", "responses", "submitted_at", "expires_at", "audit_id", "intake_url" } ] }` — `intake_url` is the shareable client link (**`FRONTEND_URL`** as above + `/intake/:token`).

### `GET /api/intake/:token`

**Auth:** none. `token` is 40 hex characters.

**Response `200`:** `{ "metadata", "questions" (pre-brief subset), "responses", "submitted_at", "expires_at" }`.

The `questions` list is **`[...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...getBriefQuestionsByIds(plan.visible)]`** (see `buildPreBriefQuestionsForResponses` in `intake`): **identity** rows are only policy **`identityFieldIds`** as bank stems (**`a5`**, **`a11`**, **`a12`**, **`a2`**); **`intake_industry_specify`** is not a separate row — it is the clarify cell for **`a2`** when **Other** (same as classic **`BriefField`** specify). Then **pre-brief bank** rows from **`getBriefQuestionsByIds(plan.visible)`** where `plan` is `buildIntakePlan` with **`collection_mode: pre_brief`**, **`product_mode: full`**, **`surface: client_form`**, on the stored **`responses`** map (revenue uses canonical bank id **`a10`**). This is **not** “dump every **`BRIEF_QUESTIONS`** row”; **`plan.visible`** follows the same resolver as the rest of intake. See [QUESTION_BANK.md](./QUESTION_BANK.md).
For `a10`, clients receive business-friendly preset options (services, product sales, subscriptions, marketplace/commission, lead generation, ads) plus `Other`, and the selected value may include `a10__other` clarification.
For `f1`, clients receive popular business pain presets plus `Other`; when `Other` is selected, `f1__other` may carry the clarification text.
In `express` UX, `f2` still displays all focus areas for transparency, but `Marketing and positioning` and `Process automation and efficiency` are intentionally locked (non-selectable with explanatory copy) because express deep analysis is limited to Tech/Security/SEO/UX.

Each question object includes optional **`section`** (UI heading: `Business`, `Goals`, `UX & Conversion`, …) aligned with the consultant brief — the public `/intake/:token` page groups the form and review by these sections. Same shape on **`GET /api/intake/prefill/:token`**.

**Response `410`:** link expired.

### `POST /api/intake/:token/respond`

**Auth:** none. **Body:** `{ "responses": { ... } }` — same shape as intake brief answers (validated with `BriefResponsesSchema`).

**Example** (illustrative; express SLA ids depend on visibility — e.g. **`c3`** only when the site branch shows analytics):

```json
{
 "responses": {
 "a11": { "value": "https://example.com", "source": "client" },
 "a12": { "value": "Example Hotels SL", "source": "client" },
 "a2": { "value": "Hospitality", "source": "client" },
 "a5": { "value": "Yes, multi-page site", "source": "client" },
 "f1": { "value": "Low direct bookings", "source": "client" },
 "b1": { "value": "Couples 30–55 from EU", "source": "client" },
 "a10": { "value": ["Recurring services (retainers)"], "source": "client" },
 "a6": { "value": "Sometimes", "source": "client" },
 "c5": { "value": "Book", "source": "client" },
 "c3": { "value": "Yes, GA4", "source": "client" }
 }
}
```

If **`a2`** is **`Other`**, include **`intake_industry_specify`**: `{ "value": "Boutique sailing charters", "source": "client" }`. Select / multi-select **`value`** types must match the bank **`answer`** contract for that id.

Submit validation requires every id in **`INTAKE_IDENTITY_FIELD_IDS`** (same order as policy **`identityFieldIds`**, currently **`a5`**, **`a11`**, **`a12`**, **`a2`**), plus **`intake_industry_specify`** when **`a2`** is **Other**, plus express-SLA bank ids **restricted to the pre-brief bank slice** via **`resolvePreBriefSubmitExpressBankIds`** (same visibility/branch/tuple logic as express, intersected with **`PRE_BRIEF_PARTICIPATION_IDS`**). Statically the maximum bank set matches **`PRE_BRIEF_REQUIRED_SUBMIT_IDS`**. Optional pre-brief-only fields (e.g. **`f2` / `a7` / `f8`**) are not part of that SLA unless included in policy **`bankIncluded`** and marked required by the resolver.

Overwrites stored responses and updates `submitted_at`. Allowed until `expires_at` (no single-submit lock). If the token was created with `audit_id`, merges pre-brief question keys into `intake_brief` with source `client`.

### Intake trace tool (consultant diagnostics)

**Prefix:** `/api/intake-trace-tool` — **Auth:** consultant JWT (`requireAuth` + `attachProfile` + `requireRole('consultant')`). Rate limit: general API limiter.

- **`POST /api/intake-trace-tool/analytics-events`** — body `{ client_session_id, ia_v2_enabled?, events: [{ event_type, client_ts?, payload? }] }`. Persists rows into **`intake_analytics_events`** with **`surface` = `internal_intake_trace`**, optional **`user_id`**, optional **`payload`** (JSON). Event types are tool-specific (e.g. `intake_trace_tab_opened`, `intake_trace_session_completed`); see `intake_trace_tool`.

- **`GET /api/intake-trace-tool/wording-drafts`** — **`200`:** `{ ok: true, drafts, published }` for the authenticated user. Maps are keyed by **`question_id`**; **`published`** contains last published snapshot text per id (omitted keys mean no publish yet).

- **`PUT /api/intake-trace-tool/wording-drafts`** — body `{ drafts: { [question_id]: string }, replace_all?: boolean }`. Empty string for a key removes that draft. With **`replace_all: true`**, server-side rows not present in `drafts` (after empty-string removal) are deleted. **`200`:** `{ ok: true, drafts, published }` read-back (published columns are unchanged by PUT except when a row is deleted).

- **`POST /api/intake-trace-tool/wording-drafts/publish`** — body optional `{ question_ids?: string[] }`. Copies **`draft_text`** to **`published_text`** / **`published_at`** for matching rows with non-empty server drafts; if **`question_ids`** is omitted, all such rows for the user are published. **`200`:** `{ ok: true, drafts, published, applied_to: string[] }`. Appends **`intake_wording_publication_log`** rows (**`037`** migration).

- **`POST /api/intake-trace-tool/wording-drafts/rollback`** — body optional `{ question_ids?: string[] }`. Sets **`draft_text`** to **`published_text`** where a published snapshot exists; if **`question_ids`** is omitted, all rows with **`published_text`** are rolled back. **`200`:** `{ ok: true, drafts, published, applied_to: string[] }`.

- **`GET /api/intake-trace-tool/wording-publication-log?limit=`** — optional **`limit`** 1..100 (default **30**). **`200`:** `{ ok: true, entries: [{ id, action: 'publish'|'rollback', question_ids, created_at }] }` newest first, for the authenticated user (backed by **`intake_wording_publication_log`**).

---

## Discovery (public + consultant conversion)

### `POST /api/discover`

Public discovery submit endpoint (no auth).

**Auth:** none. **Body:** `{ "answers": object, "maturity_level": 1..5, "findings": [] }`.

**Response `201`:** `{ "token", "created_at", "contact_edit_key" }`.

`maturity_level` is validated as integer **1..5** and persisted under `discovery_sessions` with DB check constraint `1..5`. Bounds and session-token hex length match `discover_contract` (aligned with migration **`013_discovery_sessions.sql`**).

### `GET /api/discover/ui-fragment`

Public endpoint returning runtime Discovery wizard copy/options derived from the unified intake bank/policy pipeline.

**Auth:** none. **Response `200`:** `{ version, policyVersion, questionBankVersion, intake_versions, questions[] }`.

### `GET /api/discover/:token`

Public load endpoint for a discovery session by token.

**Auth:** none.

### `PATCH /api/discover/:token/contact`

Public endpoint to attach contact details to an existing discovery session.

**Auth:** none.

### `GET /api/discover/sessions`

Consultant queue endpoint.

**Auth:** consultant JWT.

Server-side scoping is enforced: only rows where `consultant_id IS NULL` (unclaimed queue) or `consultant_id = current consultant` are listed.

**Pagination:** Newest first; row cap **`SYSTEM_DEFAULTS.routeQueries.discoverSessionsMaxRows`** (`DISCOVER_SESSIONS_LIST_MAX` in `route_query_limits`; default **100**). See [DEPLOYMENT.md — Consultant list endpoints](./DEPLOYMENT.md#consultant-list-endpoints-hard-cap).

### `POST /api/discover/:token/convert`

Converts one discovery session to a full audit.

**Auth:** consultant JWT.

Security/ownership contract:

- If `consultant_id` is already set to another consultant, returns **`403`**.
- If session is unassigned, the route first performs an atomic claim (`consultant_id = current consultant`).
- Claim race returns **`409`** (`Session was claimed or converted by another request`).
- Link race at final `audit_id` write returns **`409`** (`Session conversion conflict. Please retry.`) and triggers best-effort audit rollback.

Success returns **`201`** with `{ "audit_id": "..." }`.

**Seeded brief:** Discovery answers are mapped into `intake_brief.responses` under **bank ids** where applicable. The synthetic cell **`uses_crm`** (not a bank question) is set from CRM inference using **locale-agnostic stored tokens** **`uses_crm:yes`** / **`uses_crm:no`** (see `discovery_brief_contract.v1`). Older rows may still hold **`Yes`** / **`No`**; consumers should normalize via **`normalizeUsesCrmBriefStoredValue`** from **`@glc/intake-core`**.

---

## Marketing brief (public)

### `POST /api/marketing/brief`

**Auth:** none. **Rate limit:** per-IP hourly cap (`marketingBriefPublicLimiter`); override with `PUBLIC_MARKETING_BRIEF_MAX_PER_HOUR`.

**Body (JSON):**

- `name` (string, required)
- `company` (optional)
- `website` (string, required unless `no_website` is true)
- `no_website` (boolean)
- `concern`, `improve` (strings)
- `contact_method` (string)
- `urgency` (string, optional) — persisted if sent; the public **`/brief`** form does not collect it (empty in DB). Does **not** select the route.
- `unsure_choice` (boolean) — when true: **`/snapshot`** if the lead has a public site, **`/discovery`** if `no_website`.
- `preferred_coverage_package` (`"starter"` \| `"pro"` \| `"complete"`) — preferred canonical field for package routing when `unsure_choice` is false **and** `no_website` is false.
- `preferred_audit_depth` (`"express"` \| `"full"`) — legacy compatibility field (deprecated); server maps it to package routing when canonical field is absent.

**Response `201`:** `{ "id", "created_at", "recommended_route" }` where `recommended_route` is one of `/snapshot`, `/starter`, `/pro`, `/complete`, `/discovery`.

Route rules live in **`@glc/intake-core`** (`marketing-brief-routing.ts`).

Persists to `marketing_brief_submissions` and notifies consultants (`kind: intake`). Legacy `preferred_audit_depth` remains supported for compatibility.

---

## Error Responses

**Single source of truth (machine):** Stable `code` values, `apiErrorJson` helpers, and default English copy live in `api_error_codes` and `api_user_messages.en` (re-exported via `api-user-messages.en.ts`). Change those files when adding or renaming codes — not ad-hoc strings in routes.

**Human-readable contract:** This section summarizes shape and common codes. **Literal `error` string inventory** (for audits and i18n gap analysis) is in [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md). Refresh matches with `./scripts/api-errors-inventory.sh` (stdout: `rg` over routes) when updating grouped tables.

All errors follow:

```json
{
 "error": "Human-readable message",
 "code": "MACHINE_READABLE_CODE"
}
```

**UI mapping:** prefer handling **`code`** for branching and user-facing copy. Keep **`error`** as a fallback string for logs and legacy clients. When adding new failures, always set a stable **`code`** and add the string to the client map (or future i18n catalog) in the same change. Human-readable text may be localized in the SPA without changing **`code`**.

**Where defaults live:** stable **`code`** values and helpers are defined in `api_error_codes`. Default English **`error`** strings for most coded responses are in `api_user_messages.en` (wired through `api-user-messages.en.ts` and re-exported from `api-error-codes.ts` as `*_MESSAGE` constants). A few responses use small interpolating functions in `api-error-codes.ts` (role, phase, Zod detail, etc.).

Common codes:

- `AUDIT_NOT_FOUND` — 404
- `UNAUTHORIZED` — 401 (missing or invalid JWT)
- `FORBIDDEN` — 403 (audit belongs to different user)
- `RATE_LIMITED` — 429 (too many audits or pipeline calls)
- `BUDGET_EXCEEDED` — 402 (token budget exhausted)
- `PIPELINE_BUSY` — 409 (pipeline already running)
- `INVALID_STATUS` — 422 (action not valid for current audit status)

See [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md) for the full grouped list; after route changes, run `./scripts/api-errors-inventory.sh` from the repo root to refresh it.

## Для разработчиков

Ниже перечислены технические пути реализации для инженерной навигации.

- `packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json`
- `src/app/lib/logger.ts`
- `server/src/config/system-defaults.ts`
- `server/src/config/feature-flags.ts`
- `server/src/config/route-query-limits.ts`
- `server/src/config/pipeline-event-error-codes.ts`
- `server/src/config/snapshot-fetch-budget.ts`
- `server/src/snapshot/abuse-guards.ts`
- `server/src/snapshot/snapshot-access-state.ts`
- `src/app/lib/snapshot-diagnostics.ts`
- `server/src/snapshot/page-anomaly.ts`
- `server/src/routes/intake.ts`
- `server/src/schemas/intake-trace-tool.ts`
- `server/src/config/discover-contract.ts`
- `packages/intake-core/src/discovery-brief-contract.v1.json`
- `server/src/config/api-error-codes.ts`
- `server/src/config/api-user-messages.en.json`
