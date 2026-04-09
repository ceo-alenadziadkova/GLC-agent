# REST API

## Base URL

- **Development:** `http://localhost:3001`
- **Production:** Railway deployment URL (set as `VITE_API_URL` in frontend env)

All endpoints except `/api/auth/*`, `/api/snapshot/*`, **`POST /api/marketing/brief`**, and the **public** pre-brief routes `GET /api/intake/:token` and `POST /api/intake/:token/respond` require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The frontend's `apiService.ts` adds this automatically.

`POST /api/intake` (create link) requires a **consultant** JWT.

All authenticated `/api/*` responses are returned with:

```http
Cache-Control: private, no-store
```

This prevents storing user-specific audit data in shared caches.

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

**Optional env:** `PLATFORM_ADMIN_USER_IDS` — comma-separated consultant `profiles.id` values allowed to **PATCH** this setting. If unset or empty, any consultant may change it.

### `GET /api/platform/self-serve-owner`

**Auth:** consultant JWT.

**Response `200`:**

```json
{
  "stored_owner_user_id": "uuid | null",
  "effective_owner_user_id": "uuid | null",
  "effective_ready": true,
  "env_fallback_active": false,
  "consultants": [{ "id": "uuid", "full_name": "Jane", "email": "jane@example.com" }],
  "can_manage": true
}
```

- `effective_ready` — `POST /api/audits` as a client would succeed (stored consultant valid, or valid env fallback).
- `env_fallback_active` — effective owner comes from `SELF_SERVE_AUDIT_OWNER_USER_ID` because nothing is stored in `platform_settings` yet.

### `PATCH /api/platform/self-serve-owner`

**Auth:** consultant JWT and `can_manage` (see `PLATFORM_ADMIN_USER_IDS` above).

**Body:** `{ "owner_user_id": "<uuid>" | null }` — `null` clears the stored consultant (env fallback may still apply).

**Response `200`:** `{ "ok": true, "stored_owner_user_id", "effective_ready", "effective_owner_user_id", "env_fallback_active" }`

**Errors:** `400` invalid consultant, `403` not a platform admin when the allowlist is configured.

---

## Audits

### Access matrix (audits)

Use this matrix for new endpoints to keep access rules consistent. **Consultant** = user with consultant role (pipeline mutations are guarded in code). **Client** = linked `client_id` where applicable.

| Endpoint pattern | Consultant (owner) | Client (`client_id`) | Notes |
|------------------|--------------------|----------------------|--------|
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

**Roles:** **Consultant** — `user_id` is the authenticated consultant, `client_id` null. **Client (self-serve)** — allowed when a valid owner consultant is configured: **`platform_settings.self_serve_audit_owner_user_id`** (see `GET /api/platform/self-serve-owner`), else optional fallback **`SELF_SERVE_AUDIT_OWNER_USER_ID`** env. The new row uses that consultant as `user_id` (billing/ownership) and `client_id` = authenticated client profile id. **`503`** with `code: "SELF_SERVE_OWNER_UNAVAILABLE"` when neither is valid.

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

Does not replace `GET .../brief` for saving or full `BRIEF_QUESTIONS` copy; use for tooling, previews, or clients that want plan-shaped metadata without bundling the whole bank.

---

### `GET /api/audits/:id/brief` / `PUT /api/audits/:id/brief`

**Auth:** consultant (owner) or client linked to the audit.

**GET `200`:** `{ brief, questions, validation, gates, product_mode, … }` — `brief` includes `responses`, `collection_mode`, `collected_by`, optional **`intake_versions`** (`{ questionBankVersion, policyVersion, layoutVersion, resolverVersion }`), optional **`intake_version_migration`** (see below). Validation and `gates` are computed for the caller’s surface (consultant vs client), using stored `intake_versions` when it is a **supported** frozen or current tuple; otherwise the server falls back to the **current** engine tuple for validation (legacy rows).

**PUT body:** `{ "responses": { … } }`, optional **`collection_mode`**, optional **`intake_versions`**.

- **`intake_versions` omitted** — the server reuses the stored tuple, or the **current** tuple for a new row. If the stored tuple is **unsupported**, the write is accepted and the row is repaired to the current tuple; **`intake_version_migration`** records `{ from, to, at, reason: 'unsupported_stored_repaired' }`.
- **`intake_versions` present** — must include all four keys. Unsupported tuple → **`400`** `UNSUPPORTED_INTAKE_VERSION`. Supported tuple that does not match stored (and is not an allowed upgrade to current) → **`409`** `INTAKE_VERSION_CONFLICT`. Sending the **current** tuple when stored was an older supported tuple → upgrade; migration **`reason: 'client_upgrade'`** is persisted once.

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

**Response `200`:**

```json
{ "started": true, "phase": 0 }
```

---

### `POST /api/audits/:id/pipeline/next`

Run the next pending phase or parallel block. Used after a review approval to continue the pipeline. **Clients** linked via `client_id` may call this when the pipeline is waiting to advance in a state the API allows (consultants still own review submissions and retry).
Uses compare-and-set claim on the audit row to prevent duplicate concurrent starts.

**Response `200`:**

```json
{ "started": true, "phase": 1 }
```

---

### `POST /api/audits/:id/pipeline/retry`

Retry a failed phase. **Consultant-only.** Request body must include the `phase` number to retry. Behaviour and limits depend on `product_mode` (phases above the mode’s max are rejected).
Uses compare-and-set claim on the audit row to prevent duplicate concurrent retries.

**Response `200`:** e.g. `{ "status": "retrying", "phase": <number> }`

---

### `GET /api/audits/:id/pipeline/status`

Current pipeline state.

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
- Same key + different payload returns `409`.
- Keys are scoped by `user_id + route` and stored for 24 hours.

---

## Notifications

In-app notification center endpoints (authenticated users only). Notifications are scoped by `user_id`; users can only read/update their own rows.

Base kind taxonomy: `pipeline` | `review` | `intake`.

Additional semantics are carried in `payload` (for example `request_id`, `artifact`, `failure_type`, `route`) so the client can render tailored icons and deep-link to the relevant screen.

### `GET /api/notifications`

List notifications in reverse chronological order.

**Query params:**

- `limit` (default `30`, max `100`)
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

Public endpoint (no JWT). Returns how many free website checks are **still available** from this IP in the current rolling window (same counter as `POST /api/snapshot`; this request does **not** consume a check).

**Response `200`:** `{ "limit", "remaining", "period": "day", "reset_at": "<ISO timestamp> | null" }`

### `POST /api/snapshot`

Start a free snapshot run. **Auth:** none (public). The server sets or refreshes an **httpOnly** cookie **`glc_snapshot_guest`** and upserts **`snapshot_guest_sessions`** (funnel analytics; 90-day row retention). The audit is created with platform **self-serve owner** `user_id` and **`client_id = null`** until the user calls **`POST /api/snapshot/claim`** after sign-in.

**CORS:** the SPA must use **`credentials: 'include'`** on this request (and on poll **`GET /api/snapshot/:token`** if you rely on the same cookie). Production cookies use **`SameSite=None; Secure`**.

**Optional body fields** (all strings, ignored if invalid): **`utm_source`**, **`utm_medium`**, **`utm_campaign`** — stored on the guest session row for attribution.

### `POST /api/snapshot/claim`

**Auth:** `Authorization: Bearer <access_token>` (`requireAuth`).

**Body:** `{ "snapshot_token": "<uuid>" }`

**`200`:** `{ "ok": true, "audit_id": "<uuid>", "already_claimed": boolean }` — sets **`audits.client_id`** to the current user when it was `null`; idempotent if already linked to the same user.

**`400`:** missing/invalid `snapshot_token`.

**`401`:** missing/invalid JWT.

**`404`:** snapshot not found (neutral).

**`409`** `SNAPSHOT_CLAIM_CONFLICT`: snapshot already linked to another user (neutral copy).

**`410`:** token TTL expired (same window as public poll).

**Implementation:** deterministic scanner — **no LLM**. Tiered HTTP fetch (homepage plus up to a few same-origin URLs), cheerio-based **facts**, YAML-driven **site profile** (classification) and **audit rules** (expanded YAML catalog; some rules may be **skipped** per `skipForSiteTypes` / `onlyForSiteTypes` using classifier `siteType`), overall score **0–100** with four category scores. **Wall clock:** `SNAPSHOT_FETCH_BUDGET_MS` defaults to **10000** (10s; ADR target band ~8–12s). **robots.txt:** fetches `/robots.txt` (cached per origin, `SNAPSHOT_ROBOTS_CACHE_MS`, default 20 minutes). Honors `Disallow` for the snapshot user-agent (`*` and `GLC-SnapshotScanner`): if `/` is disallowed, **no HTML is fetched** (same outcome as unreachable home for the pipeline). Extra same-origin URLs are skipped when disallowed. **Crawl-delay** is applied best-effort between extra fetches within the overall fetch budget. **Playwright tier-3 (default on when needed):** if the static homepage matches client-shell heuristics, the server attempts to re-fetch it with headless Chromium. Set `SNAPSHOT_PLAYWRIGHT=0` or `false` to skip (static HTML only). Requires `playwright` + `npx playwright install chromium` on the host; failures are logged and the scan continues with HTTP HTML. Env: `SNAPSHOT_PLAYWRIGHT_BUDGET_MS` (default 14000, cap within remaining `SNAPSHOT_FETCH_BUDGET_MS`). Results for the same **registrable host** may be served from `snapshot_domain_cache` (TTL `SNAPSHOT_DOMAIN_CACHE_TTL_HOURS`, default 48); **cached JSON omits raw email/phone vectors** (PII minimization). Rule catalogs: `server/config/snapshot/classification-rules.v1.yaml`, `server/config/snapshot/audit-rules.v1.yaml`.

**Fair use:** at most **3** successful starts per IP per rolling **24 hours** (abuse control). Only **`POST`** responses that the limiter treats as successful (typically **2xx**) increment the counter (`skipFailedRequests`), so validation **`400`** and **`429 DOMAIN_FRESH_COOLDOWN`** do not consume a daily slot. `GET` polling and `GET /quota` do not count.

**Per-domain fresh cooldown:** If there is **no** valid row in `snapshot_domain_cache` for the registrable host but that host **just** completed a fresh scan (in this process **or**, when **`SNAPSHOT_SHARED_ABUSE_STORE=1`**, any instance via **`snapshot_domain_cooldown`**), `POST` returns **`429`** with `code: "DOMAIN_FRESH_COOLDOWN"`, `retry_after_seconds`, and a plain-language `error`. Cached hits still return **`202`** (same host may be checked again from cache without waiting). Tune with `SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MS` (default **600000** ms = 10 minutes; set **0** to disable).

**Concurrent fresh scans:** At most **`SNAPSHOT_MAX_CONCURRENT`** parallel **fresh** fetches (cache miss path; default **4**). With **`SNAPSHOT_SHARED_ABUSE_STORE=1`** and migration **`022_snapshot_fresh_lease.sql`**, the cap applies **cluster-wide** via TTL leases in **`snapshot_fresh_lease`**. Otherwise it is **per process** only. If the limit is reached, the audit is marked **failed** and the worker logs **`snapshot.pipeline_capacity`**; the client still received **`202`** — poll until `status: "failed"`. Tune lease length with **`SNAPSHOT_FRESH_LEASE_TTL_SECONDS`** (must exceed worst-case scan duration).

**Response `429` (daily IP cap):** `RATE_LIMITED` — body includes `error`, `code`, `limit`, `remaining`, `period: "day"`, `retry_after_hours`. Successful **`202`** responses include `RateLimit-Limit` / `RateLimit-Remaining` headers (exposed to browsers via CORS).

### `GET /api/snapshot/:token`

Poll current status or retrieve completed preview payload.

- Token is UUID-based and must meet minimum length checks.
- Token TTL is enforced by backend (`SNAPSHOT_TOKEN_TTL_HOURS`, default `72`).
- Expired tokens return `410 Snapshot token expired` and are invalidated in storage.

When completed, the JSON may include **`snapshot_access_blocked`** (boolean) and **`snapshot_access_robots_blocked`** (boolean, meaningful only when the former is true). The API sets these when the scan could not usefully read public HTML (e.g. `robots.txt` blocks the homepage or fetch produced no pages); clients should treat this as a limited / blocked outcome rather than a full scored check. These fields are omitted when access is normal.

**Access flags (HTTP vs logged-in portal):** On completed responses, the server may **recompute** those booleans with `computePublicSnapshotAccessFlags` (`server/src/snapshot/snapshot-access-state.ts`) so legacy rows and merge edge cases match the same rules as fresh persists (uses `snapshot_deterministic`, merged `scan_coverage`, `ux_summary`, `scan_basis_code`, `overall_score`). The SPA portal mirror built from audit state (`freeSnapshotPreviewFromAuditState`) only forwards **`snapshot_access_*` stored in `raw_data`**. For blocked callouts and copy, portal code **must** use **`getSnapshotAccessBlockedState`** (`src/app/lib/snapshot-diagnostics.ts`), which applies the equivalent fallback heuristics — do not rely on persisted flags alone in the portal.

**Database:** Deploy migration **`024_audit_domains_prompt_version_len.sql`** before or with any backend release that writes a longer deterministic snapshot label into **`audit_domains.prompt_version`** (column widened from `VARCHAR(20)` to `VARCHAR(64)`). Confirm applied on staging/production (e.g. Supabase Table Editor / `\d audit_domains`) so inserts are not truncated or rejected. The payload also includes **`tech_stack`** (confirmed names by category from HTML/script fingerprinting). Optional **`tech_stack_tentative`** lists *possible* technologies from weak signals only (JSON-LD text, `meta name=generator`, or a `type=module` entry when no framework matched); each item is **`{ name, category, signal }`** with **`signal`** explaining the limitation (quick scan does not inspect minified bundles). Omitted when empty. **`ai_visibility`** (when present) has **`gaps`**: `robots_txt` | `sitemap_html` | `structured_data` | `discovery_files` — heuristics from the sampled HTML plus whether `robots.txt` was retrieved; clients map codes to copy. Omitted on older snapshots. It also includes **`ux_score` / `ux_label` / `ux_summary`** (derived from the same deterministic run) plus optional extended fields when present: **`overall_score`** (0–100; **0** when **`scan_basis_code`** is **`degraded`** and no pages were scored), **`category_scores`**, human-readable **`scan_basis`**, normalized **`scan_basis_code`**: `homepage_only` | `homepage_plus_core_pages` | `homepage_rendered_fallback` | `degraded` | **`cache_hit`** (last value is forced when the run was satisfied from **`snapshot_domain_cache`**), **`cache_hit`** (boolean), **`scanned_at`** (ISO 8601 when the payload was built on a fresh fetch), **`limitations`** (string array; robots block, fetch failure, or heuristic notes for challenge/WAF/parked/login-wall patterns), **`signals_found`**, **`scan_confidence_band`**, advisory **`site_profile`** with **`classification_confidence_band`**, optional **`scan_coverage`** (includes robots, Playwright, when the homepage failed while allowed by robots: **`home_fetch_failure`**: `network_or_timeout` | `http_error` | `non_html` | `empty_body`, optional flags **`challenge_page_likely`**, **`parked_domain_likely`**, **`login_wall_likely`**, and optional taxonomy strings **`challenge_taxonomy`**, **`parked_taxonomy`**, **`login_wall_taxonomy`** — enumerated in the next block; canonical definitions in `server/src/snapshot/page-anomaly.ts`), **`audit_rules_version`** (audit catalog), **`classification_version`**, **`fetch_strategy_version`**, **`snapshot_engine_version`**. Persisted extras are merged from `audit_domains.raw_data.snapshot_deterministic`. Classification uses path segments from same-origin links on fetched pages (cap `SNAPSHOT_LINK_SLUG_LIMIT`, default 80), not only URLs that were fully downloaded.

**`scan_coverage` taxonomy slugs** (optional; stable for dashboards; HTML heuristics only):

- **`challenge_taxonomy`**: `cloudflare` | `akamai_bot` | `fastly` | `aws_waf` | `imperva_incapsula` | `sucuri` | `stackpath` | `perimeterx` | `datadome` | `generic_bot_interstitial`
- **`parked_taxonomy`**: `for_sale_or_aftermarket` | `registrar_parking_page` | `minimal_placeholder` | `under_construction_hosting`
- **`login_wall_taxonomy`**: `auth_keyword_copy` | `signin_heading` | `password_field_thin_page` | `oauth_or_sso_form` | `openid_oidc_meta` | `spa_shell_thin_html` (mostly a JS app shell in the initial HTML; substantive copy may load client-side or after login)

### Snapshot operator (optional)

When **`SNAPSHOT_OPERATOR_TOKEN`** is set on the server, two routes accept the token as **`Authorization: Bearer <token>`** or header **`X-Snapshot-Operator-Token`**. If the env var is unset, both return **`404`** (no route disclosure).

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
  - `company_name`, `company_website`, `industry` — optional pre-fill for the first three pre-brief questions (client can edit before submit). Website: full URL, or client may enter `none` / `no website` if absent. `industry` must match a canonical app dropdown value (same list as New Audit / client request form) or it is ignored for pre-fill.
  - `message` — header context.
  - `consultant_name` — shown on the success screen (“X has received your answers”).
  - `expected_contact` — timing hint (e.g. `24 hours`, `Friday`, `our Thursday call`); combined with `contact_channel` for the follow-up line. If omitted, the UI defaults to “within 24 hours”.
  - `contact_channel` — e.g. `WhatsApp`, `phone`, `email`.
  - `consultant_email`, `consultant_whatsapp` — optional; shown as “Questions? …” on success.

**Response `201`:** `{ "token", "url", "expires_at" }` — `url` is built from `FRONTEND_URL` (or localhost) + `/intake/:token`.

### `POST /api/intake/link-audit`

**Auth:** consultant JWT.

**Body:** `{ "token": "<40 hex>", "audit_id": "<uuid>" }` — ties an existing intake token to an audit you own. If the client already submitted answers while `audit_id` was null, those pre-brief fields are merged into `intake_brief` immediately. Use this when the link was created without `audit_id` (e.g. from New Audit before the audit existed), then the audit is created afterward.

**Errors:** `400` invalid body, `403` token owned by another user, `404` token or audit not found, `409` token already linked to a different audit.

### `GET /api/intake/submissions`

**Auth:** consultant JWT.

Lists intake tokens **you created** where the client has already submitted (`submitted_at` is set), newest first (limit 100). Used by the admin request queue to show raw pre-brief answers before or after linking to an audit.

**Response `200`:** `{ "submissions": [ { "token", "metadata", "responses", "submitted_at", "expires_at", "audit_id", "intake_url" } ] }` — `intake_url` is the shareable client link (`FRONTEND_URL` + `/intake/:token`).

### `GET /api/intake/:token`

**Auth:** none. `token` is 40 hex characters.

**Response `200`:** `{ "metadata", "questions" (pre-brief subset), "responses", "submitted_at", "expires_at" }`.

The `questions` list is **identity** (`INTAKE_IDENTITY_BRIEF_QUESTIONS`) plus bank rows whose **`intake_layer === 'pre_brief'`** in `server/src/schemas/intake-brief.ts` — driven by policy participation (`PRE_BRIEF_PARTICIPATION_IDS`: `modes.pre_brief.bankIncluded` + `revenue_model`). That usually includes narrative fields such as **`f2`**, **`a7`**, **`f8`** when they are part of the pre-brief layer; see [QUESTION_BANK.md](./QUESTION_BANK.md).

Each question object includes optional **`section`** (UI heading: `Business`, `Goals`, `UX & Conversion`, …) aligned with the consultant brief — the public `/intake/:token` page groups the form and review by these sections. Same shape on **`GET /api/intake/prefill/:token`**.

**Response `410`:** link expired.

### `POST /api/intake/:token/respond`

**Auth:** none. **Body:** `{ "responses": { ... } }` — same shape as intake brief answers (validated with `BriefResponsesSchema`).

Submit validation requires **identity** plus the **express SLA** bank ids from **`resolveExpressSlaRequiredIds`** (same inputs as full express: visibility / branch / `collection_mode` / current policy). Statically this aligns with **`PRE_BRIEF_REQUIRED_SUBMIT_IDS`** (= express **`requiredAlways` + `requiredIfVisible`** in `intake-policy.v1.json` via `express-policy-ids.ts`). Optional pre-brief-only fields (e.g. **`f2` / `a7` / `f8`** when shown) are not part of that SLA unless they are required by the resolver for the client’s answers.

Overwrites stored responses and updates `submitted_at`. Allowed until `expires_at` (no single-submit lock). If the token was created with `audit_id`, merges pre-brief question keys into `intake_brief` with source `client`.

---

## Marketing brief (public)

### `POST /api/marketing/brief`

**Auth:** none. **Rate limit:** same window as public intake (`intakePublicLimiter`).

**Body (JSON):**

- `name` (string, required)
- `company` (optional)
- `website` (string, required unless `no_website` is true)
- `no_website` (boolean)
- `concern`, `improve` (strings)
- `urgency`, `contact_method` (strings)
- `unsure_choice` (boolean) — when true, server recommends `/snapshot`

**Response `201`:** `{ "id", "created_at", "recommended_route" }` where `recommended_route` is one of `/snapshot`, `/express-audit`, `/audit`, `/discovery`.

Persists to `marketing_brief_submissions` (migration `025_marketing_brief_submissions.sql`) and notifies consultants (`kind: intake`).

---

## Error Responses

All errors follow:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes:

- `AUDIT_NOT_FOUND` — 404
- `UNAUTHORIZED` — 401 (missing or invalid JWT)
- `FORBIDDEN` — 403 (audit belongs to different user)
- `RATE_LIMITED` — 429 (too many audits or pipeline calls)
- `BUDGET_EXCEEDED` — 402 (token budget exhausted)
- `PIPELINE_BUSY` — 409 (pipeline already running)
- `INVALID_STATUS` — 422 (action not valid for current audit status)
