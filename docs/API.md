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

## Audits

### Access matrix (audits)

Use this matrix for new endpoints to keep access rules consistent. **Consultant** = user with consultant role (pipeline mutations are guarded in code). **Client** = linked `client_id` where applicable.

| Endpoint pattern | Consultant (owner) | Client (`client_id`) | Notes |
|------------------|--------------------|----------------------|--------|
| `GET /api/audits`, `GET /api/audits/:id` | yes | yes | Read when permitted by API/RLS |
| `GET /api/audits/:id/pipeline/status`, `GET /api/audits/:id/quality-gate/:phase` | yes | yes | Progress / quality gate payload |
| `POST /api/audits/:id/pipeline/start`, `POST .../pipeline/next`, `POST .../pipeline/retry` | yes | no | Consultant-only (`server/src/routes/pipeline.ts`) |
| `POST /api/audits/:id/reviews/:phase` | yes | no | Consultant-only |
| `DELETE /api/audits/:id` | yes (owner) | no | Destructive |

### `POST /api/audits`

Create a new audit.

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

List all audits for the authenticated user (summary fields only).

**Response `200`:**

```json
[
  {
    "id": "uuid",
    "company_url": "https://example.com",
    "company_name": "Example Co",
    "industry": "E-commerce",
    "status": "completed",
    "overall_score": 3.8,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
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

## Pipeline

### `POST /api/audits/:id/pipeline/start`

Start Phase 0 (Recon). Audit must be in `created` status.
Supports optimistic race protection via DB compare-and-set. If another request already claimed execution, returns `409`.

**Response `200`:**

```json
{ "started": true, "phase": 0 }
```

---

### `POST /api/audits/:id/pipeline/next`

Run the next pending phase or parallel block. Used after a review approval to continue the pipeline.
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

### `POST /api/snapshot`

Start a free snapshot run. Public endpoint (no JWT).

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
- `metadata` — JSON object, e.g. `{ "company_name": "...", "message": "..." }` for the client-facing page.

**Response `201`:** `{ "token", "url", "expires_at" }` — `url` is built from `FRONTEND_URL` (or localhost) + `/intake/:token`.

### `GET /api/intake/:token`

**Auth:** none. `token` is 40 hex characters.

**Response `200`:** `{ "metadata", "questions" (pre-brief subset), "responses", "submitted_at", "expires_at" }`.

**Response `410`:** link expired.

### `POST /api/intake/:token/respond`

**Auth:** none. **Body:** `{ "responses": { ... } }` — same shape as intake brief answers (validated with `BriefResponsesSchema`).

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
