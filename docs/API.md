# REST API

## Base URL

- **Development:** `http://localhost:3001`
- **Production:** Railway deployment URL (set as `VITE_API_URL` in frontend env)

All endpoints except `/api/auth/*`, `/api/snapshot/*`, and the **public** pre-brief routes `GET /api/intake/:token` and `POST /api/intake/:token/respond` require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The frontend's `apiService.ts` adds this automatically.

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

Start a free snapshot run. Public endpoint (no JWT).

**Fair use:** at most **3** starts per IP per rolling **24 hours** (abuse control). Only `POST` counts toward the limit; `GET` polling and `GET /quota` do not.

**Response `429`:** `RATE_LIMITED` — body includes `error` (plain-language for visitors, e.g. "free website checks" from "this connection"; avoids internal jargon like "snapshot"), `code`, `limit`, `remaining`, `period: "day"`, `retry_after_hours`. Successful responses include `RateLimit-Limit` / `RateLimit-Remaining` headers (exposed to browsers via CORS) so the client can show how many free starts are left.

### `GET /api/snapshot/:token`

Poll current status or retrieve completed preview payload.

- Token is UUID-based and must meet minimum length checks.
- Token TTL is enforced by backend (`SNAPSHOT_TOKEN_TTL_HOURS`, default `72`).
- Expired tokens return `410 Snapshot token expired` and are invalidated in storage.

Completed JSON may include optional `competitor_mini`: a small set of **objective** comparisons (HTTPS, viewport meta, hreflang count, JSON-LD) against one external URL inferred from the recon crawl. Omitted when no suitable competitor URL is found or the competitor fetch fails.

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

The `questions` list includes question-bank fields **`f2`**, **`a7`**, and **`f8`** (focus areas, business moment, deadline) immediately after identity and before the legacy core (`primary_goal`, etc.); see [QUESTION_BANK.md](./QUESTION_BANK.md).

Each question object includes optional **`section`** (UI heading: `Business`, `Goals`, `UX & Conversion`, …) aligned with the consultant brief — the public `/intake/:token` page groups the form and review by these sections. Same shape on **`GET /api/intake/prefill/:token`**.

**Response `410`:** link expired.

### `POST /api/intake/:token/respond`

**Auth:** none. **Body:** `{ "responses": { ... } }` — same shape as intake brief answers (validated with `BriefResponsesSchema`).

Submit validation requires **identity** plus the legacy express-style core (`primary_goal`, `target_audience`, `primary_cta`, `has_google_analytics`, `handles_payments`, `biggest_pain`); **`f2` / `a7` / `f8` are optional** but, when present, merge into `intake_brief` like other `pre_brief` keys.

Overwrites stored responses and updates `submitted_at`. Allowed until `expires_at` (no single-submit lock). If the token was created with `audit_id`, merges pre-brief question keys into `intake_brief` with source `client`.

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
