# REST API

## Base URL

- **Development:** `http://localhost:3001`
- **Production:** Railway deployment URL (set as `VITE_API_URL` in frontend env)

All endpoints except `/api/auth/*`, `/api/snapshot/*`, **`GET /api/public/brand`**, **`POST /api/marketing/brief`**, and the **public** pre-brief routes `GET /api/intake/:token` and `POST /api/intake/:token/respond` require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The frontend's `apiService.ts` adds this automatically.

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

Returns non-secret marketing defaults (`brand_name`, `support_email`, `public_site_url`, `no_public_website_display_en`, structured `footer` strings). Source: `packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json` (package **`@glc/dev-brand-defaults`**, edit for white-label); `public_site_url` comes from **`GLC_PUBLIC_SITE_URL`**. The SPA uses bundled `@glc/dev-brand-defaults` until the request succeeds. JSON **`support_email`:** explicit **`null`** hides public contact in the SPA; omitted or empty string falls back to **`GLC_DEV_SUPPORT_EMAIL`** in server config (`public-brand-config.ts`). Field **`no_public_website_display_en`** is the English label for audits without a public URL (stable i18n key: **`glc.audit.noPublicWebsite`** in `@glc/intake-core`).

---

## Authentication

### `POST /api/auth/session`

Exchange Supabase session → confirm server-side user context. Optional; primarily for testing.

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
  "full_name": "Jane Doe"
}
```

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

---

## Frontend log ingest

Structured log events from the browser (`src/app/lib/logger.ts`). Failures are non-fatal for UX.

Dev behavior: in local frontend dev (`import.meta.env.DEV`), logger events stay console-only and are not sent to `/api/log` or `/api/log/snapshot`. Console verbosity can be tuned with `VITE_DEV_CONSOLE_LOG_LEVEL` (`debug|info|warn|error`, default `warn`).

### `POST /api/log`

**Auth:** JWT for **registered** users only (`profiles.role` is `client` or `consultant` after `attachProfile`). **403** for anonymous sessions or `guest` role — those use **`POST /api/log/snapshot`** instead.

**Rate limit:** 180 events / minute / user (`logIngestLimiter`).

**Response:** `204` No Content.

**Body** (JSON): `level` (`debug`|`info`|`warn`|`error`), `source` (default `frontend`), `message`, optional `context` object, optional `timestamp` (ISO).

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

---

## Domain benchmarks

Aggregated peer distributions for **`control_object.confidence.overall`** per domain phase. Source table: **`evaluation_datasets`** joined to **`audits.industry`**. Only rows with **`decision_applied`** in `accept` / `accept_with_warnings` are included. Tunables: **`SYSTEM_DEFAULTS.benchmarks`** in `server/src/config/system-defaults.ts`. See **`docs/adrs/ADR-DOMAIN-BENCHMARKS.md`**.

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
| `GET /api/audits`, `GET /api/audits/:id` | yes | yes | Read when permitted by API/RLS |
| `GET /api/audits/:id/brief`, `PUT /api/audits/:id/brief` | yes | yes | Intake brief + `gates`; **GET** includes `product_mode` (from audit) for express vs full required-field UX |
| `GET /api/audits/:id/pipeline/status`, `GET /api/audits/:id/quality-gate/:phase` | yes | yes | Progress / quality gate payload |
| `POST /api/audits/:id/pipeline/start`, `POST .../pipeline/next` | yes | yes | Client may start/continue only when `audits.client_id` matches and brief gates pass (`status === 'created'` for start). **`retry`** remains consultant-only. |
| `POST /api/audits/:id/pipeline/retry` | yes | no | Consultant-only |
| `POST /api/audits/:id/reviews/:phase` | yes | no | Consultant-only |
| `POST /api/audits/:id/brief/help-request` | no | yes | Client-only: optional brief help ping (`brief_help_*` on `audits` + consultant notification). Only while `status === 'created'`. |
| `DELETE /api/audits/:id` | yes (owner) | no | Destructive |

### `POST /api/audits`

Create a new audit.

**Roles:** **Consultant** — `user_id` is the authenticated consultant, `client_id` null. **Client (self-serve)** — allowed when a valid owner consultant is resolved (stored **`platform_settings.self_serve_audit_owner_user_id`**, legacy admin list, or earliest consultant in open mode — see `GET /api/platform/self-serve-owner`). The new row uses that consultant as `user_id` (billing/ownership) and `client_id` = authenticated client profile id. **`503`** with `code: "SELF_SERVE_OWNER_UNAVAILABLE"` when resolution fails.

**Request body:**

```json
{
  "company_url": "https://example.com",
  "company_name": "Example Co", // optional
  "industry": "E-commerce" // optional
}
```

**Response `201`:**

```json
{
  "id": "uuid",
  "status": "created",
  "company_url": "https://example.com",
  "created_at": "2024-01-01T00:00:00Z"
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
    "quick_wins": [{ "id": "uuid", "title": "...", "impact": "high", "effort": "low" }],
    "medium_term": [...],
    "strategic": [...]
  }
}
```

---

### `DELETE /api/audits/:id`

Delete audit and all related data (CASCADE). Irreversible.

**Response `204`**

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
- **`derived`** — `{ ai_readiness_score, confidence_overall, website_gate }` (same heuristics as `IntakePlan` derived layer)

Use for tooling, previews, or clients that want a compact **IntakePlan** view. **`GET .../brief` already returns the same plan-driven `questions` shape** (`getBriefQuestionsByIds(plan.visible)` after `buildIntakePlan`); neither endpoint returns every row of the **classic brief catalog** (export **`BRIEF_QUESTIONS`** in `@glc/intake-core`, built from **`modes.classic_brief.main`** in `intake-policy.v1.json`) — only **plan.visible** ids get question rows for the current responses / surface.

---

### `GET /api/audits/:id/brief` / `PUT /api/audits/:id/brief`

**Auth:** consultant (owner) or client linked to the audit.

**GET `200`:** `{ brief, questions, validation, gates, product_mode, … }` — `brief` includes `responses`, `collection_mode`, `collected_by`, optional **`intake_versions`** (`{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }`), optional **`intake_version_migration`** (see below). **`questions`** is **`getBriefQuestionsByIds(plan.visible)` only** — each id is resolved against the **classic brief catalog** (same **`BRIEF_QUESTIONS`** export from `@glc/intake-core`, derived from policy **`modes.classic_brief.main`**). Only ids in **`plan.visible`** appear; **identity** bank stubs from **`identityFieldIds`** show up in **`questions`** only if they are also in **`plan.visible`**. Answer cells live in **`brief.responses`** under **bank ids** (and side keys such as **`…__other`**, **`intake_industry_specify`**). Same `buildIntakePlan` inputs as `GET .../brief/schema` (product mode, collection mode, caller surface, versions). Validation and `gates` are computed for the caller’s surface (consultant vs client), using stored `intake_versions` when it is a **supported** frozen or current tuple; otherwise the server falls back to the **current** engine tuple for validation (legacy rows).

**PUT body:** `{ "responses": { … } }`, optional **`collection_mode`**, optional **`intake_versions`**.

- **`intake_versions` omitted** — the server reuses the stored tuple, or the **current** tuple for a new row. If the stored tuple is **unsupported**, the write is accepted and the row is repaired to the current tuple; **`intake_version_migration`** records `{ from, to, at, reason: 'unsupported_stored_repaired' }`.
- **`intake_versions` present** — must include all four keys. Unsupported tuple → **`400`** `UNSUPPORTED_INTAKE_VERSION`. Supported tuple that does not match stored (and is not an allowed upgrade to current) → **`409`** `INTAKE_VERSION_CONFLICT`. Sending the **current** tuple when stored was an older supported tuple → upgrade; migration **`reason: 'client_upgrade'`** is persisted once.

**Operational semantics (not bugs):** Brief rows with **`intake_versions` null** pre-date the version matrix; **GET** validation and plan assembly use the **current** resolver and artifact bundle (same idea as “unsupported stored” fallback on GET). **PUT** rules above still apply; the **server** is authoritative on what tuple and answers are stored — a client cannot force an unsupported artifact tuple (**400**), and a supported tuple still goes through normal **response validation** (the tuple is not a bypass). **Public** Discover and pre-brief routes use split rate limiters; they use **Redis** when **`RATE_LIMIT_REDIS_URL`** is set, otherwise **in-memory per process** (limits do not aggregate across horizontally scaled instances — see [ARCHITECTURE.md](./ARCHITECTURE.md#public-routes-abuse-control-and-scaling)). **Releases:** ship SPA and API together when changing `@glc/intake-core` resolver behaviour where possible; tuple validation reduces silent artifact skew between client and server but not every cross-deployment UX edge case.

Migration column: deploy **`028_intake_version_migration.sql`** — `intake_brief.intake_version_migration` (`jsonb`, nullable).

---

### `POST /api/audits/:id/upgrade-from-snapshot`

**Auth:** registered **client** JWT (not guest). Promotes a **completed** `product_mode: free_snapshot` audit to **express** or **full**, resets domain rows, and either seeds the intake brief from quick-scan recon / `snapshot_deterministic` (`use_scraped_context: true`) or clears recon placeholders (`use_scraped_context: false`).

**Body:** `{ "target_mode": "express" | "full", "use_scraped_context": boolean }`

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

Start Phase 0 (Recon). Audit must be in `created` status; intake brief gates must allow start for the audit’s `product_mode` (express vs full). **Consultant** callers must own the row (`user_id`). **Client** callers must match `client_id` on the audit.
Supports optimistic race protection via DB compare-and-set. If another request already claimed execution, returns `409`.
Execution is queue-backed when Redis is configured: route enqueues a pipeline job and returns immediately; worker processes perform phase execution. If queue backend is unavailable, runtime falls back to in-process execution.

Optional JSON body: `{ "disable_auto_remediate": true }` skips Phase 9 auto-remediation for pipeline work triggered by this request (including BullMQ worker runs). When omitted, remediation follows `FEATURE_AUTO_REMEDIATION` in `server/src/config/feature-flags.ts`.

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

**Response `200`:**

```json
{ "status": "running", "phase": 1 }
```

---

### `POST /api/audits/:id/pipeline/retry`

Retry a failed phase. **Consultant-only.** Request body must include the `phase` number to retry. Behaviour and limits depend on `product_mode` (phases above the mode’s max are rejected).
Uses compare-and-set claim on the audit row to prevent duplicate concurrent retries.
Queue-backed execution/fallback behavior is the same as `pipeline/start`.
Optional field `disable_auto_remediate: true` in the same JSON body — same semantics as `pipeline/start`.

**Response `200`:** e.g. `{ "status": "retrying", "phase": <number> }`

---

### `GET /api/audits/:id/pipeline/status`

Current pipeline state. Recent **`pipeline_events`** rows are capped at **`SYSTEM_DEFAULTS.routeQueries.pipelineStatusEventsLimit`** (default **50**; see `PIPELINE_STATUS_EVENTS_LIMIT` in `server/src/config/route-query-limits.ts`).

Orchestrator-emitted `error` rows may include **`data.error_code`** for stable downstream handling. Source of truth: **`PIPELINE_EVENT_ERROR_CODES`** in `server/src/config/pipeline-event-error-codes.ts` (e.g. parallel block total failure, free snapshot capacity, free snapshot generic failure).

**Response `200`:**

```json
{
  "audit_status": "auto",
  "current_phase": 2,
  "phases": [
    { "phase": 0, "domain": "recon", "status": "completed", "score": null },
    {
      "phase": 1,
      "domain": "tech_infrastructure",
      "status": "completed",
      "score": 4
    },
    {
      "phase": 2,
      "domain": "security_compliance",
      "status": "analyzing",
      "score": null
    },
    { "phase": 3, "domain": "seo_digital", "status": "pending", "score": null }
  ],
  "tokens_used": 32000,
  "token_budget": 200000,
  "review_pending": false
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
{ "approved": true, "next_phase": 1 }
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

Telegram format is intentionally structured as a compact block:

- header: `[COLOR|PRIORITY] [CATEGORY] title`
- body lines: `event=...`, `audit=...`, `time=...`, free-text message
- optional route line: `route=/path`

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

#### Query Parameters

| Name      | Values                    | Default                                                 | Description                                                      |
| --------- | ------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `format`  | `markdown`, `json`, `csv` | `markdown`                                              | Output format. CSV = action plan (quick wins + recommendations). |
| `profile` | `full`, `owner`           | `full` for full audits; **express** defaults to `owner` | `owner` trims to express domains and a shorter executive layout. |

**Response `200`**

- `format=markdown` — `Content-Type: text/markdown`
- `format=json` — JSON with `markdown` field
- `format=csv` — `Content-Type: text/csv` with attachment filename `audit-{id}-action-plan.csv`

---

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

**`400`:** missing or non-string **`company_url`**. Rejected URLs (SSRF / policy): JSON body uses stable **`code`** values under the `PUBLIC_URL_*` family (e.g. `PUBLIC_URL_HOST_NOT_ALLOWED`, `PUBLIC_URL_DNS_NON_PUBLIC`) with English **`error`** from [`api-user-messages.en.json`](../server/src/config/api-user-messages.en.json) — same shape as **`POST /api/audits`** and audit-request URL validation.

**`503`:** `{ "error", "code": "SELF_SERVE_OWNER_UNAVAILABLE" }` when the platform **self-serve audit owner** cannot be resolved (same operational requirement as client-created audits — configure `platform_settings.self_serve_audit_owner_user_id` or a valid implicit fallback; see **`GET /api/platform/self-serve-owner`** above).

**Implementation:** deterministic scanner — **no LLM**. Tiered HTTP fetch (homepage plus up to a few same-origin URLs), cheerio-based **facts**, YAML-driven **site profile** (classification) and **audit rules** (expanded YAML catalog; some rules may be **skipped** per `skipForSiteTypes` / `onlyForSiteTypes` using classifier `siteType`), overall score **0–100** with four category scores. Outbound HTTP user-agents for snapshot/crawl paths embed **`GLC_PUBLIC_SITE_URL`** (HTTPS origin, no trailing slash; **required in production**; dev default **`https://glctech.es`** if unset). **Wall clock:** **`SYSTEM_DEFAULTS.snapshotFetchBudgetMs`** (default **10000** ms; see `server/src/config/snapshot-fetch-budget.ts`). **robots.txt:** fetches `/robots.txt` (cached per origin; TTL **`SYSTEM_DEFAULTS.snapshotRobots.cacheMs`**, default 20 minutes). Honors `Disallow` for the snapshot user-agent (`*` and `GLC-SnapshotScanner`): if `/` is disallowed, **no HTML is fetched** (same outcome as unreachable home for the pipeline). Extra same-origin URLs are skipped when disallowed. **Crawl-delay** is applied best-effort between extra fetches within the overall fetch budget. **Playwright tier-3:** when **`SYSTEM_DEFAULTS.snapshotTieredFetch.playwrightEnabled`** is true and the static homepage matches client-shell heuristics, the server attempts to re-fetch it with headless Chromium (budget **`snapshotTieredFetch.playwrightBudgetMs`**, capped by remaining wall clock). Turn off by setting **`playwrightEnabled`** to **false** in **`server/src/config/system-defaults.ts`** and redeploying. Requires `playwright` + `npx playwright install chromium` on the host; failures are logged and the scan continues with HTTP HTML. Results for the same **registrable host** may be served from `snapshot_domain_cache` (TTL **`SYSTEM_DEFAULTS.snapshotDomainCache.ttlHours`**, default 48); **cached JSON omits raw email/phone vectors** (PII minimization). Rule catalogs: `server/config/snapshot/classification-rules.v1.yaml`, `server/config/snapshot/audit-rules.v1.yaml`.

**Fair use:** at most **3** successful starts per IP per rolling **24 hours** (abuse control). Only **`POST`** responses that the limiter treats as successful (typically **2xx**) increment the counter (`skipFailedRequests`), so validation **`400`** and **`429 DOMAIN_FRESH_COOLDOWN`** do not consume a daily slot. `GET` polling and `GET /quota` do not count.

**Per-domain fresh cooldown:** If there is **no** valid row in `snapshot_domain_cache` for the registrable host but that host **just** completed a fresh scan (in this process **or**, when **`SYSTEM_DEFAULTS.snapshotAbuse.useSharedAbuseStore`** is true, any instance via **`snapshot_domain_cooldown`**), `POST` returns **`429`** with `code: "DOMAIN_FRESH_COOLDOWN"`, `retry_after_seconds`, and a plain-language `error`. Cached hits still return **`202`** (same host may be checked again from cache without waiting). Cooldown length is **`SYSTEM_DEFAULTS.snapshotAbuse.domainFreshCooldownMs`** (default **600000** ms = 10 minutes; set **0** in config to disable).

**Concurrent fresh scans:** At most **`SYSTEM_DEFAULTS.snapshotAbuse.maxConcurrent`** parallel **fresh** fetches (cache miss path; default **4**). With **`useSharedAbuseStore`** and migration **`022_snapshot_fresh_lease.sql`**, the cap applies **cluster-wide** via TTL leases in **`snapshot_fresh_lease`**. Otherwise it is **per process** only. If the limit is reached, the audit is marked **failed** and the worker logs **`snapshot.pipeline_capacity`**; the client still received **`202`** — poll until `status: "failed"`. Lease TTL is derived from the snapshot fetch budget (see `server/src/snapshot/abuse-guards.ts`).

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

**Implementation:** deterministic scanner — **no LLM**. Tiered HTTP fetch (homepage plus up to a few same-origin URLs), cheerio-based **facts**, YAML-driven **site profile** (classification) and **audit rules** (expanded YAML catalog; some rules may be **skipped** per `skipForSiteTypes` / `onlyForSiteTypes` using classifier `siteType`), overall score **0–100** with four category scores. Outbound HTTP user-agents for snapshot/crawl paths embed **`GLC_PUBLIC_SITE_URL`** (HTTPS origin, no trailing slash; **required in production**; dev default **`https://glctech.es`** if unset). **Wall clock:** **`SYSTEM_DEFAULTS.snapshotFetchBudgetMs`** (default **10000** ms; see `server/src/config/snapshot-fetch-budget.ts`). **robots.txt:** fetches `/robots.txt` (cached per origin; TTL **`SYSTEM_DEFAULTS.snapshotRobots.cacheMs`**, default 20 minutes). Honors `Disallow` for the snapshot user-agent (`*` and `GLC-SnapshotScanner`): if `/` is disallowed, **no HTML is fetched** (same outcome as unreachable home for the pipeline). Extra same-origin URLs are skipped when disallowed. **Crawl-delay** is applied best-effort between extra fetches within the overall fetch budget. **Playwright tier-3:** when **`SYSTEM_DEFAULTS.snapshotTieredFetch.playwrightEnabled`** is true and the static homepage matches client-shell heuristics, the server attempts to re-fetch it with headless Chromium (budget **`snapshotTieredFetch.playwrightBudgetMs`**, capped by remaining wall clock). Turn off by setting **`playwrightEnabled`** to **false** in **`server/src/config/system-defaults.ts`** and redeploying. Requires `playwright` + `npx playwright install chromium` on the host; failures are logged and the scan continues with HTTP HTML. Results for the same **registrable host** may be served from `snapshot_domain_cache` (TTL **`SYSTEM_DEFAULTS.snapshotDomainCache.ttlHours`**, default 48); **cached JSON omits raw email/phone vectors** (PII minimization). Rule catalogs: `server/config/snapshot/classification-rules.v1.yaml`, `server/config/snapshot/audit-rules.v1.yaml`.

**Fair use:** at most **3** successful starts per IP per rolling **24 hours** (abuse control). Only **`POST`** responses that the limiter treats as successful (typically **2xx**) increment the counter (`skipFailedRequests`), so validation **`400`** and **`429 DOMAIN_FRESH_COOLDOWN`** do not consume a daily slot. `GET` polling and `GET /quota` do not count.

**Per-domain fresh cooldown:** If there is **no** valid row in `snapshot_domain_cache` for the registrable host but that host **just** completed a fresh scan (in this process **or**, when **`SYSTEM_DEFAULTS.snapshotAbuse.useSharedAbuseStore`** is true, any instance via **`snapshot_domain_cooldown`**), `POST` returns **`429`** with `code: "DOMAIN_FRESH_COOLDOWN"`, `retry_after_seconds`, and a plain-language `error`. Cached hits still return **`202`** (same host may be checked again from cache without waiting). Cooldown length is **`SYSTEM_DEFAULTS.snapshotAbuse.domainFreshCooldownMs`** (default **600000** ms = 10 minutes; set **0** in config to disable).

**Concurrent fresh scans:** At most **`SYSTEM_DEFAULTS.snapshotAbuse.maxConcurrent`** parallel **fresh** fetches (cache miss path; default **4**). With **`useSharedAbuseStore`** and migration **`022_snapshot_fresh_lease.sql`**, the cap applies **cluster-wide** via TTL leases in **`snapshot_fresh_lease`**. Otherwise it is **per process** only. If the limit is reached, the audit is marked **failed** and the worker logs **`snapshot.pipeline_capacity`**; the client still received **`202`** — poll until `status: "failed"`. Lease TTL is derived from the snapshot fetch budget (see `server/src/snapshot/abuse-guards.ts`).

**Response `429` (daily IP cap):** `RATE_LIMITED` — body includes `error`, `code`, `limit`, `remaining`, `period: "day"`, `retry_after_hours`. Successful **`202`** responses include `RateLimit-Limit` / `RateLimit-Remaining` headers (exposed to browsers via CORS).

### `GET /api/snapshot/:token`

Poll current status or retrieve completed preview payload.

- **`snapshot_token`** must be a **UUID version 4** (server validates with a strict pattern; other UUID variants are **`400`** **`Invalid snapshot token`**).
- Token TTL is enforced by backend (`SYSTEM_DEFAULTS.snapshotPublic.tokenTtlHours`, default `72`).
- Expired tokens return **`410`** **`Snapshot token expired`**; the server clears **`audits.snapshot_token`** for that row so the link stops working.
- **Race after pipeline completion:** If `audits.status` is already **`completed`** but **`audit_domains.raw_data.snapshot_deterministic`** is not yet persisted with a finite numeric **`overall_score`**, the handler still returns **`{ "status": "running", "snapshot_token" }`**. Clients must keep polling until they receive a full **`completed`** preview body or **`failed`**.

When completed, the JSON may include **`snapshot_access_blocked`** (boolean) and **`snapshot_access_robots_blocked`** (boolean, meaningful only when the former is true). The API sets these when the scan could not usefully read public HTML (e.g. `robots.txt` blocks the homepage or fetch produced no pages); clients should treat this as a limited / blocked outcome rather than a full scored check. These fields are omitted when access is normal.

**Access flags (HTTP vs logged-in portal):** On completed responses, the server may **recompute** those booleans with `computePublicSnapshotAccessFlags` (`server/src/snapshot/snapshot-access-state.ts`) so legacy rows and merge edge cases match the same rules as fresh persists (uses `snapshot_deterministic`, merged `scan_coverage`, `ux_summary`, `scan_basis_code`, `overall_score`). The SPA portal mirror built from audit state (`freeSnapshotPreviewFromAuditState`) only forwards **`snapshot_access_*` stored in `raw_data`**. For blocked callouts and copy, portal code **must** use **`getSnapshotAccessBlockedState`** (`src/app/lib/snapshot-diagnostics.ts`), which applies the equivalent fallback heuristics — do not rely on persisted flags alone in the portal.

**Database:** Deploy migration **`024_audit_domains_prompt_version_len.sql`** before or with any backend release that writes a longer deterministic snapshot label into **`audit_domains.prompt_version`** (column widened from `VARCHAR(20)` to `VARCHAR(64)`). Confirm applied on staging/production (e.g. Supabase Table Editor / `\d audit_domains`) so inserts are not truncated or rejected. The payload also includes **`tech_stack`** (confirmed names by category from HTML/script fingerprinting). Optional **`tech_stack_tentative`** lists *possible* technologies from weak signals only (JSON-LD text, `meta name=generator`, or a `type=module` entry when no framework matched); each item is **`{ name, category, signal }`** with **`signal`** explaining the limitation (quick scan does not inspect minified bundles). Omitted when empty. **`ai_visibility`** (when present) has **`gaps`**: `robots_txt` | `sitemap_html` | `structured_data` | `discovery_files` — heuristics from the sampled HTML plus whether `robots.txt` was retrieved; clients map codes to copy. Omitted on older snapshots. It also includes **`ux_score` / `ux_label` / `ux_summary`** (derived from the same deterministic run) plus optional extended fields when present: **`overall_score`** (0–100; **0** when **`scan_basis_code`** is **`degraded`** and no pages were scored), **`category_scores`**, human-readable **`scan_basis`**, normalized **`scan_basis_code`**: `homepage_only` | `homepage_plus_core_pages` | `homepage_rendered_fallback` | `degraded` | **`cache_hit`** (set when the run was satisfied from **`snapshot_domain_cache`**), plus boolean **`cache_hit`** when applicable, **`scanned_at`** (ISO 8601 when the payload was built on a fresh fetch), **`limitations`** (string array; robots block, fetch failure, or heuristic notes for challenge/WAF/parked/login-wall patterns), **`signals_found`**, **`scan_confidence_band`**, advisory **`site_profile`** with **`classification_confidence_band`**, optional **`scan_coverage`** (includes robots, Playwright, when the homepage failed while allowed by robots: **`home_fetch_failure`**: `network_or_timeout` | `http_error` | `non_html` | `empty_body`, optional flags **`challenge_page_likely`**, **`parked_domain_likely`**, **`login_wall_likely`**, and optional taxonomy strings **`challenge_taxonomy`**, **`parked_taxonomy`**, **`login_wall_taxonomy`** — enumerated in the next block; canonical definitions in `server/src/snapshot/page-anomaly.ts`), **`audit_rules_version`** (audit catalog), **`classification_version`**, **`fetch_strategy_version`**, **`snapshot_engine_version`**. Persisted extras are merged from `audit_domains.raw_data.snapshot_deterministic`. Classification uses path segments from same-origin links on fetched pages (cap **`SYSTEM_DEFAULTS.snapshotLinkSlug`** / **`min(max, hardCap)`**, default **80**), not only URLs that were fully downloaded.

**`scan_coverage` taxonomy slugs** (optional; stable for dashboards; HTML heuristics only):

- **`challenge_taxonomy`**: `cloudflare` | `akamai_bot` | `fastly` | `aws_waf` | `imperva_incapsula` | `sucuri` | `stackpath` | `perimeterx` | `datadome` | `generic_bot_interstitial`
- **`parked_taxonomy`**: `for_sale_or_aftermarket` | `registrar_parking_page` | `minimal_placeholder` | `under_construction_hosting`
- **`login_wall_taxonomy`**: `auth_keyword_copy` | `signin_heading` | `password_field_thin_page` | `oauth_or_sso_form` | `openid_oidc_meta` | `spa_shell_thin_html` (mostly a JS app shell in the initial HTML; substantive copy may load client-side or after login)

### Snapshot operator (optional)

When **`SNAPSHOT_OPERATOR_TOKEN`** is set on the server, two routes accept the token as **`Authorization: Bearer <token>`** or header **`X-Snapshot-Operator-Token`**. If the env var is **unset**, or the request is **missing / wrong** token, both handlers respond **`404`** **`{ "error": "Not found" }`** (no disclosure of whether the route exists).

- **`GET /api/snapshot/operator/metrics`** — counters (runs, cache vs fresh, Playwright use, fetch-failure classes, rule outcome totals, latency **p50** / **p95**) plus, when **`SNAPSHOT_SHARED_ABUSE_STORE`** is enabled: **`shared_abuse_store`**, **`snapshot_max_concurrent`**, **`snapshot_fresh_lease_ttl_seconds`**, **`snapshot_fresh_leases_active`** (DB count of non-expired leases). In-process counters reset on restart; shared lease headcount reflects the cluster.
- **`POST /api/snapshot/operator/purge-cache`** — body **`{ "host": "example.com" }`** (registrable host, optional `https://` prefix). Deletes the row in **`snapshot_domain_cache`** for that host. Does not delete audit history.

Optional **`competitor_mini`** (HTTPS, viewport meta, hreflang count, JSON-LD vs one external URL from homepage links) is returned **only** when the client requests it: `GET /api/snapshot/:token?compare=1` (or `compare=true` / `include_competitor=1`). Default completed responses omit it so no extra third-party fetch runs until the user opts in. Omitted when no suitable link exists or fetches fail.

**Compare rate limit:** Requests **with** one of those query flags are capped at **`SNAPSHOT_COMPARE_MAX_PER_HOUR`** per IP per rolling hour (default **15**). **`429`** body: `code: "COMPARE_RATE_LIMITED"`, `retry_after_minutes`.

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

Lists intake tokens **you created** where the client has already submitted (`submitted_at` is set), newest first. Row cap: **`SYSTEM_DEFAULTS.routeQueries.intakeSubmissionsMaxRows`** (exported as `INTAKE_SUBMISSIONS_LIST_MAX` from `server/src/config/route-query-limits.ts`; default **100**). Used by the admin request queue to show raw pre-brief answers before or after linking to an audit. See [DEPLOYMENT.md — Consultant list endpoints](./DEPLOYMENT.md#consultant-list-endpoints-hard-cap).

**Response `200`:** `{ "submissions": [ { "token", "metadata", "responses", "submitted_at", "expires_at", "audit_id", "intake_url" } ] }` — `intake_url` is the shareable client link (**`FRONTEND_URL`** as above + `/intake/:token`).

### `GET /api/intake/:token`

**Auth:** none. `token` is 40 hex characters.

**Response `200`:** `{ "metadata", "questions" (pre-brief subset), "responses", "submitted_at", "expires_at" }`.

The `questions` list is **`[...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...getBriefQuestionsByIds(plan.visible)]`** (see `buildPreBriefQuestionsForResponses` in `server/src/routes/intake.ts`): **identity** rows are only policy **`identityFieldIds`** as bank stems (**`a5`**, **`a11`**, **`a12`**, **`a2`**); **`intake_industry_specify`** is not a separate row — it is the clarify cell for **`a2`** when **Other** (same as classic **`BriefField`** specify). Then **pre-brief bank** rows from **`getBriefQuestionsByIds(plan.visible)`** where `plan` is `buildIntakePlan` with **`collection_mode: pre_brief`**, **`product_mode: full`**, **`surface: client_form`**, on the stored **`responses`** map (revenue uses canonical bank id **`a10`**). This is **not** “dump every **`BRIEF_QUESTIONS`** row”; **`plan.visible`** follows the same resolver as the rest of intake. See [QUESTION_BANK.md](./QUESTION_BANK.md).
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

- **`POST /api/intake-trace-tool/analytics-events`** — body `{ client_session_id, ia_v2_enabled?, events: [{ event_type, client_ts?, payload? }] }`. Persists rows into **`intake_analytics_events`** with **`surface` = `internal_intake_trace`**, optional **`user_id`**, optional **`payload`** (JSON). Event types are tool-specific (e.g. `intake_trace_tab_opened`, `intake_trace_session_completed`); see `server/src/schemas/intake-trace-tool.ts`.

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

**Response `201`:** `{ "token", "created_at" }`.

`maturity_level` is validated as integer **1..5** and persisted under `discovery_sessions` with DB check constraint `1..5`. Bounds and session-token hex length match [`server/src/config/discover-contract.ts`](../server/src/config/discover-contract.ts) (aligned with migration **`013_discovery_sessions.sql`**).

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

**Pagination:** Newest first; row cap **`SYSTEM_DEFAULTS.routeQueries.discoverSessionsMaxRows`** (`DISCOVER_SESSIONS_LIST_MAX` in `server/src/config/route-query-limits.ts`; default **100**). See [DEPLOYMENT.md — Consultant list endpoints](./DEPLOYMENT.md#consultant-list-endpoints-hard-cap).

### `POST /api/discover/:token/convert`

Converts one discovery session to a full audit.

**Auth:** consultant JWT.

Security/ownership contract:

- If `consultant_id` is already set to another consultant, returns **`403`**.
- If session is unassigned, the route first performs an atomic claim (`consultant_id = current consultant`).
- Claim race returns **`409`** (`Session was claimed or converted by another request`).
- Link race at final `audit_id` write returns **`409`** (`Session conversion conflict. Please retry.`) and triggers best-effort audit rollback.

Success returns **`201`** with `{ "audit_id": "..." }`.

**Seeded brief:** Discovery answers are mapped into `intake_brief.responses` under **bank ids** where applicable. The synthetic cell **`uses_crm`** (not a bank question) is set from CRM inference using **locale-agnostic stored tokens** **`uses_crm:yes`** / **`uses_crm:no`** (see `packages/intake-core/src/discovery-brief-contract.v1.json`). Older rows may still hold **`Yes`** / **`No`**; consumers should normalize via **`normalizeUsesCrmBriefStoredValue`** from **`@glc/intake-core`**.

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
- `preferred_audit_depth` (`"express"` \| `"full"`) — **required** when `unsure_choice` is false **and** `no_website` is false. Chooses **`/express-audit`** vs **`/audit`** by **depth of analysis**, not by speed.

**Response `201`:** `{ "id", "created_at", "recommended_route" }` where `recommended_route` is one of `/snapshot`, `/express-audit`, `/audit`, `/discovery`.

Route rules live in **`@glc/intake-core`** (`marketing-brief-routing.ts`).

Persists to `marketing_brief_submissions` (migrations `025`, optional column `preferred_audit_depth` in `046`) and notifies consultants (`kind: intake`).

---

## Error Responses

**Single source of truth (machine):** Stable `code` values, `apiErrorJson` helpers, and default English copy live in [`server/src/config/api-error-codes.ts`](../server/src/config/api-error-codes.ts) and [`server/src/config/api-user-messages.en.json`](../server/src/config/api-user-messages.en.json) (re-exported via `api-user-messages.en.ts`). Change those files when adding or renaming codes — not ad-hoc strings in routes.

**Human-readable contract:** This section summarizes shape and common codes. **Literal `error` string inventory** (for audits and i18n gap analysis) is in [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md). Refresh matches with `./scripts/api-errors-inventory.sh` (stdout: `rg` over routes) when updating grouped tables.

All errors follow:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

**UI mapping:** prefer handling **`code`** for branching and user-facing copy. Keep **`error`** as a fallback string for logs and legacy clients. When adding new failures, always set a stable **`code`** and add the string to the client map (or future i18n catalog) in the same change. Human-readable text may be localized in the SPA without changing **`code`**.

**Where defaults live:** stable **`code`** values and helpers are defined in [`server/src/config/api-error-codes.ts`](../server/src/config/api-error-codes.ts). Default English **`error`** strings for most coded responses are in [`server/src/config/api-user-messages.en.json`](../server/src/config/api-user-messages.en.json) (wired through `api-user-messages.en.ts` and re-exported from `api-error-codes.ts` as `*_MESSAGE` constants). A few responses use small interpolating functions in `api-error-codes.ts` (role, phase, Zod detail, etc.).

Common codes:

- `AUDIT_NOT_FOUND` — 404
- `UNAUTHORIZED` — 401 (missing or invalid JWT)
- `FORBIDDEN` — 403 (audit belongs to different user)
- `RATE_LIMITED` — 429 (too many audits or pipeline calls)
- `BUDGET_EXCEEDED` — 402 (token budget exhausted)
- `PIPELINE_BUSY` — 409 (pipeline already running)
- `INVALID_STATUS` — 422 (action not valid for current audit status)

See [API_ERRORS_INVENTORY.md](./API_ERRORS_INVENTORY.md) for the full grouped list; after route changes, run `./scripts/api-errors-inventory.sh` from the repo root to refresh it.
