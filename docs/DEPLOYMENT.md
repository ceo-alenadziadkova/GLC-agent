# Deployment

## Infrastructure Overview

| Service | Provider | Purpose |
|---|---|---|
| Frontend | Vercel | React SPA static hosting |
| Backend API | Railway | Node.js Express server |
| Database + Auth + Realtime | Supabase Cloud | PostgreSQL, Auth, Realtime |
| AI | Anthropic API | Claude API calls from backend |

---

## Supabase Setup

1. Create project at [supabase.com](https://supabase.com) — choose **EU (Frankfurt)** region for GDPR compliance
2. In SQL Editor → run **all** SQL migrations in order (`001` … `018`); see [DATABASE.md](./DATABASE.md#overview)
3. Authentication → Settings:
   - Set **Site URL** to your production frontend URL (exact URL; wildcards are invalid here)
   - Add **Redirect URLs**: exact dev/prod origins and `/login` URLs as needed — see [AUTH.md](./AUTH.md#supabase-auth-configuration) (some dashboards reject `*` wildcards)
4. Authentication → Providers:
   - Enable **Email** and **email + password** sign-in; disable passwordless / magic-link email if you want the dashboard to match app-only password + Google flows
   - Enable **Google** → enter Client ID + Client Secret from Google Cloud Console
5. Note down from Project Settings → API:
   - `SUPABASE_URL` (format: `https://xxxx.supabase.co`)
   - `anon public` key → frontend `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` key → backend `SUPABASE_SERVICE_KEY` (keep secret, never expose)

---

## Railway (Backend)

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Railway auto-detects `server/package.json` — set root directory to `server/`
4. Set environment variables in Railway dashboard:

   ```env
   PORT=3001
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   NODE_ENV=production
   ```
   **Client self-serve (portal):** after migration `018_platform_settings.sql`, a **lead administrator** (consultant) sets the default audit owner under **Settings → Client portal — audit owner** (`PATCH /api/platform/self-serve-owner`). Optionally keep **`SELF_SERVE_AUDIT_OWNER_USER_ID`** as a bootstrap / backup consultant UUID when the database value is empty. **`PLATFORM_ADMIN_USER_IDS`** (comma-separated consultant `profiles.id`) restricts who may PATCH platform settings; if omitted, any consultant may change the assignment.

5. Build command: `npm run build`
6. Start command: `npm start` (runs compiled `dist/index.js`)
7. Railway provides a public URL like `https://glc-api.up.railway.app`

**Healthcheck:** Railway pings `/` — ensure Express responds with `200`.

### Free snapshot — Playwright

Headless Chromium **runs by default** when the static homepage looks like an empty client shell (thin text + many scripts, or known SPA root mounts). Set **`SNAPSHOT_PLAYWRIGHT=0`** (or `false`) to disable and use only HTTP HTML.

- **Env:** optional `SNAPSHOT_PLAYWRIGHT_BUDGET_MS` (default `14000`, capped by remaining `SNAPSHOT_FETCH_BUDGET_MS`). **`SNAPSHOT_FETCH_BUDGET_MS`** defaults to **`10000`** (10s wall clock for the tiered fetch). Optional **`SNAPSHOT_OPERATOR_TOKEN`** enables **`GET /api/snapshot/operator/metrics`** and **`POST /api/snapshot/operator/purge-cache`** (see [API.md](./API.md#snapshot-operator-optional)); keep the token long and rotate like any secret.
- **Build:** install browsers once, e.g. `npx playwright install chromium` in the Railway build step, or use a Playwright-capable base image. The `playwright` package is in `server/package.json`; Chromium is not bundled.
- If Chromium is missing or launch fails, the scanner logs a warning and continues with the original HTTP HTML.

**Abuse controls (public snapshot):** optional env — `SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MS` (default `600000`, `0` = off), `SNAPSHOT_MAX_CONCURRENT` (default `4`), `SNAPSHOT_COMPARE_MAX_PER_HOUR` (default `15`). **`SNAPSHOT_ROBOTS_CACHE_MS`** — TTL for in-memory `robots.txt` parse per origin (default `1200000`, i.e. 20 minutes). **`SNAPSHOT_SHARED_ABUSE_STORE`** — set to `1` / `true` / `yes` after applying migrations **`021_snapshot_domain_cooldown.sql`** and **`022_snapshot_fresh_lease.sql`** so (1) per-domain fresh cooldown and (2) **max concurrent fresh scans** are coordinated **across Railway instances** via Supabase; if unset, both stay per-process only. **`SNAPSHOT_FRESH_LEASE_TTL_SECONDS`** — optional; defaults to **max(300, 5 × fetch budget seconds)** so leases survive long Playwright runs; raise if scans can exceed that wall time.

**Hosted dashboards (logs):** Ship **JSON** logs (`LOG_FORMAT=json`, `LOG_SERVICE` set per env) to your provider’s log drain (Railway log integrations → **Grafana Loki**, **Datadog**, **Axiom**, etc.). Primary snapshot signal: **`message: "snapshot.run_complete"`** with **`domain_fp`** (SHA-256 prefix of registrable host, not the URL). Secondary: **`snapshot.pipeline_capacity`** (capacity shed), **`snapshot.shared_lease_*`** (RPC / migration issues). Build panels on **rates** of `outcome`, `cache_hit`, `playwright_used`, `home_fetch_failure`; alert on sustained **`snapshot.pipeline_capacity`** or missing `snapshot.run_complete` after `POST /api/snapshot` spikes. Operator in-process counters + shared lease headcount: **`GET /api/snapshot/operator/metrics`** (Bearer **`SNAPSHOT_OPERATOR_TOKEN`**); poll with a cron or uptime check, or point a **JSON API** datasource at that URL if your dashboard product supports auth headers.

Full redaction rules: [SECURITY.md — Snapshot observability & log redaction](./SECURITY.md#snapshot-observability--log-redaction-runbook).

See [API.md — Public Snapshot](./API.md#public-snapshot).

---

## Vercel (Frontend)

1. Create account at [vercel.com](https://vercel.com)
2. New Project → Import GitHub repo
3. Vercel auto-detects Vite — no changes needed to build settings
4. Set environment variables in Vercel dashboard (Settings → Environment Variables):

   ```env
   VITE_API_URL=https://glc-api.up.railway.app
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Deploy — Vercel builds with `pnpm build` and serves `dist/`
6. Add your custom domain in Vercel → update Supabase Site URL + Redirect URLs

**SPA routing:** Vercel handles React Router automatically (all paths served `index.html`). No `vercel.json` needed for basic SPA routing.

---

## Production Environment Variables

### Frontend (Vercel)

| Variable | Value |
|---|---|
| `VITE_API_URL` | Railway backend URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Backend (Railway)

| Variable | Value |
|---|---|
| `PORT` | `3001` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (secret) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `SENTRY_DSN` | Sentry DSN for backend error/trace capture |
| `SENTRY_TRACES_SAMPLE_RATE` | Trace sampling ratio, e.g. `0.2` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for reliability alerts |
| `TELEGRAM_CHAT_ID` | Telegram channel or chat ID for alerts |
| `ALERT_INTERVAL_MS` | Alert worker interval (default `60000`) |
| `ALERT_FAILURE_RATE_THRESHOLD` | Failure rate threshold for alerting (default `0.2`) |
| `ALERT_LATENCY_P95_MS_THRESHOLD` | p95 phase latency threshold in ms (default `180000`) |
| `ALERT_TOKEN_BURN_15M_THRESHOLD` | Token burn threshold over 15m window (default `300000`) |
| `SENTRY_TRACE_LINK_TEMPLATE` | Optional deep link template with `{trace_id}` placeholder |
| `TRACE_LINK_TEMPLATE` | Optional custom trace viewer link template with `{trace_id}` |
| `SELF_SERVE_AUDIT_OWNER_USER_ID` | Optional fallback consultant `profiles.id` when `platform_settings.self_serve_audit_owner_user_id` is null |
| `PLATFORM_ADMIN_USER_IDS` | Optional comma-separated consultant `profiles.id` values allowed to PATCH `/api/platform/self-serve-owner`; if unset, any consultant may manage the stored assignment |

---

## CORS Configuration

Backend `server/src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:5173',
  credentials: true,
}));
```

In production: set `ALLOWED_ORIGINS=https://your-app.vercel.app` in Railway.

---

## Local Dev vs Production

| Concern | Local Dev | Production |
|---|---|---|
| API URL | Vite proxy to `localhost:3001` | `VITE_API_URL` Railway URL |
| Auth redirect | `http://localhost:5173` | `https://your-app.vercel.app` |
| CORS | `localhost:5173` allowed | Only Vercel domain |
| HTTPS | HTTP (fine for dev) | HTTPS enforced by Vercel/Railway |

---

## Deploy Checklist

- [ ] Run all SQL migrations in order (`001` … `018`) in Supabase SQL editor
- [ ] RLS policies active (check in Supabase → Table Editor → each table)
- [ ] Supabase Site URL + Redirect URLs updated to production domain
- [ ] Google OAuth configured in Supabase (if using)
- [ ] All env vars set in Railway and Vercel
- [ ] `ALLOWED_ORIGINS` in Railway matches Vercel domain
- [ ] Backend `/` healthcheck returns 200
   - [ ] Test: sign-in and sign-up (email/password and/or Google; check Supabase Auth logs if confirmations fail)
- [ ] Test: create audit end-to-end in production

---

## Monitoring

- **Railway** → built-in logs + metrics (CPU/memory). Set up email alerts for error spikes.
- **Supabase** → database logs, auth logs, Realtime connection counts.
- **Vercel** → deployment logs, function logs (if any).
- **Anthropic** → usage dashboard for token tracking and cost.
- **Sentry** → backend exceptions and distributed traces (`traceparent` propagated from client to API).
- **Telegram alerts** → pipeline failure rate, phase latency p95, and token burn rate.

### Reliability runbook (Sprint 5)

1. Check Telegram alert payload and capture the time window.
2. Find the related `trace_id` in Sentry and backend structured logs.
3. Query `pipeline_events` for `event_type in ('started','completed','error','token_usage')` for the same window.
4. If retries are involved, verify idempotency records in `api_idempotency_keys` to confirm replay vs. new execution.
5. Expired idempotency keys are cleaned up by background worker automatically.
