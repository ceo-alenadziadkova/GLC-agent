# REST API

## Base URL

- **Development:** `http://localhost:3001`
- **Production:** Railway deployment URL (set as `VITE_API_URL` in frontend env)

All endpoints except `/api/auth/*` require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The frontend's `apiService.ts` adds this automatically.

---

## Authentication

### `POST /api/auth/session`
Exchange Supabase session → confirm server-side user context. Optional; primarily for testing.

---

## Audits

### `POST /api/audits`
Create a new audit.

**Request body:**
```json
{
  "company_url": "https://example.com",
  "company_name": "Example Co",      // optional
  "industry": "E-commerce"           // optional
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

**Response `200`:**
```json
{ "started": true, "phase": 0 }
```

---

### `POST /api/audits/:id/pipeline/next`
Run the next pending phase. Used after a review approval to continue the pipeline.

**Response `200`:**
```json
{ "started": true, "phase": 1 }
```

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
    { "phase": 1, "domain": "tech_infrastructure", "status": "completed", "score": 4 },
    { "phase": 2, "domain": "security_compliance", "status": "analyzing", "score": null },
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

**`phase` values:** `0` (after recon), `4` (after auto wing), `7` (after analytic wing)

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

---

## Reports

### `GET /api/audits/:id/report`
Generate a markdown-formatted audit report. Returns raw markdown string.

**Response `200` (`text/markdown`)**

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
