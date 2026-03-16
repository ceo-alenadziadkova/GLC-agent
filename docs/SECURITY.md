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

The core data isolation mechanism. All 6 Supabase tables have RLS enabled.

**Pattern:** Users can only read/write rows that belong to their own audits.

```sql
-- audits: direct user_id match
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON audits
  FOR ALL USING (user_id = auth.uid());

-- related tables: via audit ownership
ALTER TABLE audit_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON audit_domains
  FOR ALL USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = auth.uid())
  );
-- Same pattern for: audit_recon, audit_strategy, pipeline_events,
-- collected_data, review_points
```

`auth.uid()` is the Supabase function that returns the user ID from the current JWT. It's evaluated server-side by Supabase for every query made with the anon key.

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
