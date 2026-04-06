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

### Legacy anonymous JWTs (optional provider)

The **free snapshot** UI **does not** call `signInAnonymously()`; users sign in normally first. If you still enable **Anonymous sign-ins** in Supabase for other experiments, those JWTs use the **`authenticated`** role — narrow RLS with **`is_anonymous`** where needed ([access control](https://supabase.com/docs/guides/auth/auth-anonymous#access-control)). **`profiles.role = 'guest'`** (migration `023`) can still apply to old anonymous rows until users complete a full sign-in.

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

## Rate Limiting

`middleware/rate-limit.ts` using `express-rate-limit`:

```typescript
// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 60,                  // 60 requests per minute per IP
});

// Audit creation limit (to prevent cost abuse)
export const auditCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,  // 24 hours
  max: 5,                           // 5 audits per day per user
  keyGenerator: (req) => req.userId ?? req.ip,
});

// Pipeline start limit
export const pipelineLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // 10 pipeline starts per hour
  keyGenerator: (req) => req.userId ?? req.ip,
});
```

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

Backend only accepts requests from known frontend origins:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));
```

In production: `ALLOWED_ORIGINS=https://your-app.vercel.app`

---

## Credentials Separation

| Credential | Where | Why |
|---|---|---|
| `VITE_SUPABASE_ANON_KEY` | Frontend bundle | Public — RLS enforces access control |
| `SUPABASE_SERVICE_KEY` | Backend only (Railway env) | Bypasses RLS — never exposed to client |
| `ANTHROPIC_API_KEY` | Backend only (Railway env) | Direct cost liability — never exposed |
| `VITE_SUPABASE_URL` | Frontend bundle | Safe — just the project URL |
| `VITE_API_URL` | Frontend bundle | Safe — just the backend URL |

`.gitignore` entries:
```
.env
.env.local
.env*.local
*.env
server/.env
```

---

## GDPR Basics

- **Data minimisation:** Only publicly available website data is collected. No personal data about website visitors is stored.
- **EU region:** Supabase project in Frankfurt — all data stored in the EU.
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
