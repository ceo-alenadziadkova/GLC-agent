# Security

## Threat Model

Primary risks for this platform:

1. User A accessing User B's audit data
2. Unauthenticated access to the API
3. Runaway API costs (Claude token abuse)
4. Collecting personal data beyond what's needed (GDPR)
5. Backend credentials leaking via frontend bundle

---

## Row Level Security (RLS)

The core data isolation mechanism. **All application tables** use RLS; policies differ by table (consultant ownership, linked `client_id`, intake brief, audit requests, etc.).

**Canonical source:** migration SQL in `server/migrations/` and the table list in [DATABASE.md](./DATABASE.md).

`auth.uid()` is evaluated server-side by Supabase for queries using the anon key.

Recent hardening:

- **`audits`** client read is scoped by **`audits_select_scoped`** (single **`SELECT`** policy: `user_id` or `client_id` match); it does not grant blanket read for `product_mode = 'free_snapshot'` (behavior from **`038_fix_rls_snapshot.sql`**, policy names consolidated in **`044_rls_merge_permissive_select.sql`**). Other core audit child tables follow the same **`*_select_scoped` / `*_consultant`** split — see **`044_rls_merge_permissive_select.sql`** and [DATABASE.md](./DATABASE.md#row-level-security).
- Migration **`039_pipeline_runs_and_rls_hardening.sql`**: deny-by-default RLS on operational tables (`intake_tokens`, `snapshot_guest_sessions`, `snapshot_domain_cache`, `snapshot_domain_cooldown`, `intake_analytics_events`, `phase_runs`, `job_runs`).
- Migration **`043_db_hardening_rls_views_functions.sql`**: same explicit **deny-all** pattern for `api_idempotency_keys`, `discovery_sessions`, `marketing_brief_submissions`, `platform_settings`, `snapshot_fresh_lease`; **`security_invoker`** on intake analytics views; fixed **`search_path`** on selected functions; RLS **`(select auth.uid())`** pattern for advisor lint **0003**.
- Migration **`045_query_performance_indexes.sql`**: targeted indexes for hot PostgREST-style queries (see **Supabase Database Advisor and migrations `043`–`045`** in [DATABASE.md](./DATABASE.md)).

**Auth:** Supabase **“Prevent use of leaked passwords”** (Have I Been Pwned) is **limited to Pro plans and above** on hosted Supabase; on Free, strengthen **minimum length** / **password requirements** instead ([password security](https://supabase.com/docs/guides/auth/password-security)).

**Backend uses service role key** — bypasses RLS intentionally. The backend enforces ownership at the application layer:

```typescript
// Always filter by userId extracted from JWT
const audit = await supabase
  .from('audits')
  .select('*')
  .eq('id', auditId)
  .eq('user_id', req.userId)  // req.userId set by auth middleware
  .single();
```

### Public snapshot (cookie funnel)

The **free snapshot** flow does **not** require a Supabase session to **start** a run. The API issues an **httpOnly** **`glc_snapshot_guest`** cookie and stores funnel metadata in **`snapshot_guest_sessions`** (hashed IP only; optional **`SNAPSHOT_GUEST_IP_SALT`** in production). After sign-in, the SPA calls **`POST /api/snapshot/claim`** to attach the audit via **`audits.client_id`**.

**Legacy:** If you still enable **Anonymous sign-ins** for other features, those JWTs use the **`authenticated`** role — narrow RLS with **`is_anonymous`** where needed. **`attachProfile`** may set **`profiles.role = 'guest'`** until full sign-in (**`023`**).

**Guest session API surface:** Routes outside the public snapshot UX must chain **`attachProfile`** and **`rejectGuestFromPortal`** (or equivalent) so **`profiles.role = 'guest'`** and anonymous JWTs cannot use portal behaviors. This includes **notifications** and **`POST /api/log`**. Preview telemetry uses **`POST /api/log/snapshot`** (tighter rate limit).

---

## JWT Verification (Backend Auth Middleware)

Every protected Express route runs through `middleware/auth.ts`:

```typescript
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token', code: 'UNAUTHORIZED' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });

  req.userId = user.id;
  next();
}
```

The backend calls `supabase.auth.getUser(token)` which makes a Supabase API call to verify the JWT signature and expiry. This is more secure than local JWT verification because it also catches revoked sessions (e.g., after sign out).

---

## Public snapshot (SSRF + logs)

- **URL validation:** `validatePublicAuditUrl` / `fetchPublicHttpUrl` in `server/src/lib/public-http-url.ts` — **http/https only**, block credentials in URL, block literals and DNS resolutions that map to private/link-local space, **re-validate every redirect hop**, cap redirect depth. Regression coverage: `server/src/tests/public-http-url.test.ts`, `server/src/tests/fetch-public-http-url.test.ts` (including redirect targets with **per-hostname** DNS outcomes).
- **Logs / metrics:** Structured `snapshot.run_complete` and optional **`GET /api/snapshot/operator/metrics`** (see [API.md](./API.md#snapshot-operator-optional)) use **hashed host fingerprints**, not full marketing URLs, where possible. Do **not** paste full snapshot HTML or scraped contact dumps into tickets; use audit IDs and timeframe.
- **DB minimization:** Free snapshot writes **`audit_recon.contact_info`** as empty arrays (same minimization as `snapshot_domain_cache` payload) so operator DB rows do not retain scraped emails/phones from the public scanner path.

## Snapshot observability & log redaction (runbook)

This section is for **operators** and **support**: what may appear in logs, what must never be copied into tickets or third-party dashboards, and how to wire **hosted** dashboards.

### Structured events (allowlist mindset)

| Message | Safe fields (examples) | Never copy / display |
| --- | --- | --- |
| `snapshot.run_complete` | `audit_id`, `domain_fp` (16-char hex prefix of SHA-256 of registrable host), `duration_ms`, `outcome`, `cache_hit`, `scan_basis_code`, numeric scores, `site_type`, confidence bands, `pages_fetched`, `playwright_used`, `home_fetch_failure` (enum), catalog versions | Raw `company_url`, full hostname as marketing URL, any scraped **email / phone / address**, HTML bodies, response bodies |
| `snapshot.pipeline_capacity` | `audit_id`, error message (generic capacity text) | Same as above for any custom `context` added later |
| `snapshot.site_profile` | `audit_id`, `siteType`, `industry`, `band`, `matched` (count) | URL, HTML |

If you add new `logger.*('snapshot.*')` calls, default to **`audit_id` + `domain_fp`** (use the same hashing helper pattern as in `run-snapshot.ts`) instead of logging URLs.

### JSON logs in production

Set **`LOG_FORMAT=json`** on the API so log drains (Grafana Loki, Datadog, Axiom, CloudWatch, etc.) parse each line as one object. Recommended env:

- **`LOG_SERVICE`** — e.g. `glc-api-prod` vs `glc-api-staging` for label separation.
- **`LOG_FORMAT=json`**

**Example Loki / LogQL** (adjust label names to your collector):

```logql
{service="glc-api-prod"} | json | message="snapshot.run_complete"
```

Panel ideas: `sum(count_over_time(...[5m]))` by `outcome`; ratio `cache_hit == true`; rate of `playwright_used == true`; breakdown by `home_fetch_failure`.

**Alerts:** sustained **`snapshot.pipeline_capacity`** (abuse or under-provisioned concurrency); spike in `POST /api/snapshot` **without** matching `snapshot.run_complete` (worker or deploy issue).

### Operator metrics HTTP API

**`GET /api/snapshot/operator/metrics`** (see [API.md](./API.md#snapshot-operator-optional)) complements logs: in-process histograms and, with **`SNAPSHOT_SHARED_ABUSE_STORE`**, current **`snapshot_fresh_leases_active`**. Do **not** expose this URL publicly; protect with **`SNAPSHOT_OPERATOR_TOKEN`** and network policies if possible. Rotate the token on the same schedule as other admin secrets.

### Support ticket template (minimal PII)

When a user reports a bad free snapshot result, ask for:

- **Approximate time (UTC)** and, if they know it, **snapshot token** or **audit_id** (from network tab or email).
- **Expected vs actual** in one sentence.

Do **not** ask them to paste full JSON responses containing **`company_url`** into public channels if avoidable; internal triage may use **`audit_id`** only in SQL.

### Incident review

- Prefer **IDs and fingerprints** over URLs in postmortems.
- If logs accidentally captured a URL during development, **redact** before sharing; grep runbooks for `http://` in `context` before exporting log excerpts.

## Discovery token ownership hardening

Public Discovery sessions are token-addressable (`/api/discover/:token`). Token entropy remains high, but backend ownership controls are required to reduce impact of accidental token disclosure.

Implemented controls:

- `discovery_sessions.consultant_id` stores assignment ownership.
- `POST /api/discover/:token/convert` enforces:
  - **403** when a session is already assigned to another consultant,
  - atomic claim for unassigned sessions before conversion,
  - **409** on claim/link races, with best-effort rollback on late link conflict.
- `GET /api/discover/sessions` is server-scoped to:
  - unassigned sessions (`consultant_id IS NULL`), and
  - sessions owned by the current consultant.

Security intent:

- prevent cross-consultant conversion after ownership has been established,
- minimize hijack window to the pre-claim phase,
- make race/failure modes explicit and non-silent.

## Rate Limiting

Implementation: **`server/src/middleware/rate-limit.ts`** (`express-rate-limit`), with **numeric defaults and env names** centralized in **`server/src/config/rate-limits.ts`**. JSON **`429`** bodies that expose **`retry_after_minutes`** / **`retry_after_hours`** / **`retry_after_seconds`** derive those fields from each limiter’s **`windowMs`** so hints stay aligned if windows change.

| Export (examples) | Role |
| --- | --- |
| `generalLimiter` | Authenticated API traffic — default **100** requests per rolling window per user/IP; window length tunable via **`RATE_LIMIT_GENERAL_*`**. |
| `createAuditLimiter` | New audit creation — default **5** per rolling **24h** per user (`RATE_LIMIT_AUDIT_CREATE_*`). |
| `pipelineLimiter` | Pipeline start/next — default **30** per rolling hour (`RATE_LIMIT_PIPELINE_*`). |
| `snapshotPublicLimiter` / `getSnapshotPublicQuota` | Public free snapshot starts — default **3** per rolling **24h** per IP (`RATE_LIMIT_SNAPSHOT_PUBLIC_*`). |
| Public Discover / intake / marketing split limiters | Per-route hourly caps; env names `PUBLIC_*` (see source). |

Production notes:

- Set **`RATE_LIMIT_REDIS_URL`** for multi-instance deployments (shared counters).
- Set **`STRICT_RATE_LIMIT_REDIS=true`** to fail fast on startup if Redis is missing.
- Snapshot quota (`POST /api/snapshot` + `GET /api/snapshot/quota`) uses the same Redis-backed store when configured.

Full variable list: [DEPLOYMENT.md — Production Environment Variables](./DEPLOYMENT.md#production-environment-variables).

---

## Prompt injection boundary

All prompts in `server/prompts/*.md` explicitly define untrusted-input handling:

- website content, intake answers, consultant notes, and interview notes are treated as untrusted data;
- model must never execute instructions embedded in those inputs;
- untrusted text is used only as evidence for scoring and findings.

---

## Token Budget

A hard per-audit token cap prevents runaway Claude API costs:

```typescript
// Before each phase
const { tokens_used, token_budget } = await getAuditMeta(auditId);
if (tokens_used >= token_budget) {
  await emitEvent(auditId, phase, 'error', { error: 'Token budget exceeded' });
  throw new Error('BUDGET_EXCEEDED');
}
```

Default budget: **200,000 tokens** ≈ $3 per audit.
Budget is configurable per audit via `audits.token_budget`.

---

## CORS

Backend only reflects browser origins that appear in an explicit allowlist (`getCorsAllowedOrigins` in `server/src/config/cors-origins.ts`): **production** merges `ALLOWED_ORIGINS` (comma-separated) with `FRONTEND_URL`; **development** adds default localhost dev ports. `credentials: true` is set; origins are never `*`.

In production **`FRONTEND_URL` is required** (API startup fails if unset when `NODE_ENV=production`). Set **`ALLOWED_ORIGINS`** to every browser origin that must call the API with cookies (often the same as `FRONTEND_URL` plus any extra marketing hostnames):

`ALLOWED_ORIGINS=https://www.example.com,https://example.com` and `FRONTEND_URL=https://www.example.com` (example)

---

## Credentials Separation

| Credential | Where | Why |
| --- | --- | --- |
| `VITE_SUPABASE_ANON_KEY` | Frontend bundle | Public — RLS enforces access control |
| `SUPABASE_SERVICE_KEY` | Backend only (Railway env) | Bypasses RLS — never exposed to client |
| `ANTHROPIC_API_KEY` | Backend only (Railway env) | Direct cost liability — never exposed |
| `VITE_SUPABASE_URL` | Frontend bundle | Safe — just the project URL |
| `VITE_API_URL` | Frontend bundle | Safe — just the backend URL |

`.gitignore` entries:

```bash
.env
.env.local
.env*.local
*.env
server/.env
```

---

## GDPR Basics

- **Data minimisation:** Only publicly available website data is collected. No personal data about website visitors is stored.
- **EU region:** target setup is Supabase in Frankfurt for EU data residency. **Needs Review:** verify the actual region in your current Supabase project settings.
- **Retention:** Future: auto-delete audits older than 12 months (cron job / pg_cron).
- **Right to erasure:** `DELETE /api/audits/:id` wipes audit + all related data (CASCADE in schema).
- **Privacy notice:** Shown on NewAudit form: "We collect only publicly available data from the submitted URL."

---

## Security Headers (Frontend)

Vercel adds security headers automatically. For additional headers, add `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## What We Don't Do (Non-Goals)

- **No WAF** — not warranted for current scale
- **No E2E encryption** — data at rest is protected by Supabase/Railway infrastructure encryption
- **No pen testing** — MVP; add before handling enterprise clients
- **No audit logging** — `pipeline_events` provides an operational log but not a security audit trail
