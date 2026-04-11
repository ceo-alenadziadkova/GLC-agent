# Deployment

## Infrastructure Overview

| Service | Provider | Purpose |
|---|---|---|
| Frontend | Vercel | React SPA static hosting |
| Backend API | Railway | Node.js Express server |
| Database + Auth + Realtime | Supabase Cloud | PostgreSQL, Auth, Realtime |
| AI | Anthropic API | Claude API calls from backend |

---

## Environment layers: infrastructure vs ops overrides

Canonical policy: [ARCHITECTURE.md — Strict layer boundaries](./ARCHITECTURE.md#strict-layer-boundaries-operational-policy). **`server/.env.example`** is the working allowlist comment template; extend it whenever you add a new server env read. **Deprecated vars** (e.g. superseded by DB tables) are called out in the file and below.

### Infrastructure (typical allowlist)

Values that are **secrets, connectivity, or deploy wiring** — not product defaults: **`SUPABASE_URL`**, **`SUPABASE_SERVICE_KEY`**, **`ANTHROPIC_API_KEY`**, **`NODE_ENV`**, **`PORT`** (when the host injects it), **`SNAPSHOT_GUEST_IP_SALT`** (required in production), **`RATE_LIMIT_REDIS_URL`**, **`FRONTEND_URL`** / **`ALLOWED_ORIGINS`**, **`GLC_PUBLIC_SITE_URL`** (required in production), white-label **`PUBLIC_BRAND_NAME`**, **`PUBLIC_SUPPORT_EMAIL`**, **`PUBLIC_BRAND_LEGAL_LINE`**, **`NO_PUBLIC_WEBSITE_URL`**, Telegram / operator tokens where used. See [`server/.env.example`](../server/.env.example) for the authoritative commented list.

### Deprecated / ops-only

- **`CONSULTANT_EMAILS`** — deprecated; use **`consultant_email_allowlist`** and platform admin routes (see [DATABASE.md](./DATABASE.md), `server/.env.example`).
- **Optional tuning variables** (crawler, collectors, snapshot timings, **`AUDITS_LIST_*`**, **`ALERT_WINDOW_MINUTES`**, **`INDUSTRY_WEIGHTS_JSON`**, etc.) — **ops overrides** for defaults defined in **`server/src/config/`** and often merged from **`SYSTEM_DEFAULTS`**. Treat them as deployment knobs, not the owning source of product numbers.

**Rule:** new product limits and thresholds get a **code default in config** first; env only **overrides** when operators need to tune without a release.

---

## Supabase Setup

1. Create project at [supabase.com](https://supabase.com) — choose **EU (Frankfurt)** region for GDPR compliance
2. In SQL Editor → run **all** SQL migrations in numeric order through the latest file in `server/migrations/`; see [DATABASE.md](./DATABASE.md#overview)
3. Authentication → Settings:
   - Set **Site URL** to your production frontend URL (exact URL; wildcards are invalid here)
   - Add **Redirect URLs**: exact dev/prod origins and `/login` URLs as needed — see [AUTH.md](./AUTH.md#supabase-auth-configuration) (some dashboards reject `*` wildcards)
4. Authentication → Providers:
   - Enable **Email** and **email + password** sign-in; disable passwordless / magic-link email if you want the dashboard to match app-only password + Google flows
   - Enable **Google** → enter Client ID + Client Secret from Google Cloud Console
5. Optional: **Authentication → Email Templates** — paste branded bodies from repo **`email-templates/supabase/`**; see [AUTH.md](./AUTH.md#email-templates-supabase) and [`email-templates/README.md`](../email-templates/README.md).
6. Note down from Project Settings → API:
   - `SUPABASE_URL` (format: `https://xxxx.supabase.co`)
   - `anon public` key → frontend `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` key → backend `SUPABASE_SERVICE_KEY` (keep secret, never expose)

---

## Railway (Backend)

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. **Monorepo + Docker:** set the service **Root Directory to the repository root** (not `server/`). Use **`railway.json`** at the repo root (`builder: DOCKERFILE`, `dockerfilePath: server/Dockerfile`). The Dockerfile expects build context **`.`** and runs `pnpm install --filter glc-audit-server...` from the workspace lockfile. If Root Directory stays **`server/`** alone, the Docker build cannot see `pnpm-workspace.yaml` / root `pnpm-lock.yaml` and will fail.
4. **Railpack / Nixpacks:** if you deploy **without** Docker from **repo root**, Nixpacks may treat the project as a **Vite SPA** and start the wrong stack. Prefer the **Dockerfile** flow above. The image runs **`playwright install --with-deps chromium`** after `tsc` for **free snapshot** (see § Free snapshot — Playwright). Builds are slower than a minimal API-only image.
5. Set environment variables in Railway dashboard:

   ```env
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   NODE_ENV=production
   SNAPSHOT_GUEST_IP_SALT=<long-random-secret>
   GLC_PUBLIC_SITE_URL=https://your-marketing-site.example
   ```
   **Do not set `PORT` manually** unless you know what you are doing: Railway injects **`PORT`**; the app must listen on that value (`server/src/index.ts`). In **Public networking**, **Target port** must match that same `PORT` (often not `3001`). If the deploy healthcheck passes but `https://…up.railway.app/api/health` returns **502**, fix the domain’s target port or remove a conflicting custom `PORT` variable.

   **Client self-serve (portal):** after migration `018_platform_settings.sql`, a **lead administrator** (consultant) sets the default audit owner under **Settings → Client portal — audit owner** (`PATCH /api/platform/self-serve-owner`). Optionally keep **`SELF_SERVE_AUDIT_OWNER_USER_ID`** as a bootstrap / backup consultant UUID when the database value is empty. **`PLATFORM_ADMIN_USER_IDS`** (comma-separated consultant `profiles.id`) restricts who may PATCH platform settings; if omitted, any consultant may change the assignment.

6. **Build / start (dashboard):** with **root `railway.json` + `server/Dockerfile`**, the image builds inside Docker (`pnpm run build` in `server/`) and starts with **`node dist/index.js`** (working directory `server/` in the image). Clear conflicting custom build/start overrides in the UI if needed.
7. Railway provides a public URL like `https://glc-api.up.railway.app`

**Healthcheck:** use **`/api/health`** (see root `railway.json`). There is no `GET /` handler on the API; pinging `/` returns 404.

### Free snapshot — Playwright

Headless Chromium **runs by default** when the static homepage looks like an empty client shell (thin text + many scripts, or known SPA root mounts). Set **`SNAPSHOT_PLAYWRIGHT=0`** (or `false`) to disable and use only HTTP HTML.

- **Env:** optional `SNAPSHOT_PLAYWRIGHT_BUDGET_MS` (default `14000`, capped by remaining `SNAPSHOT_FETCH_BUDGET_MS`). **`SNAPSHOT_FETCH_BUDGET_MS`** defaults to **`10000`** (10s wall clock for the tiered fetch). Optional **`SNAPSHOT_OPERATOR_TOKEN`** enables **`GET /api/snapshot/operator/metrics`** and **`POST /api/snapshot/operator/purge-cache`** (see [API.md](./API.md#snapshot-operator-optional)); keep the token long and rotate like any secret.
- **Build (Docker / Railway):** `server/Dockerfile` installs Chromium via **`playwright install --with-deps chromium`**. For non-Docker hosts (e.g. local dev), run `pnpm playwright:install` in `server/` once. The `playwright` package is in `server/package.json`.
- If Chromium is missing or launch fails, the scanner logs a warning and continues with the original HTTP HTML.

**Abuse controls (public snapshot):** optional env — `SNAPSHOT_DOMAIN_FRESH_COOLDOWN_MS` (default `600000`, `0` = off), `SNAPSHOT_MAX_CONCURRENT` (default `4`), `SNAPSHOT_COMPARE_MAX_PER_HOUR` (default `15`). **`SNAPSHOT_GUEST_IP_SALT`** — **required in production** (non-empty secret mixed into **`ip_hash`** for **`snapshot_guest_sessions`**; the API exits at startup if missing when `NODE_ENV=production`). **`SNAPSHOT_ROBOTS_CACHE_MS`** — TTL for in-memory `robots.txt` parse per origin (default `1200000`, i.e. 20 minutes). **`SNAPSHOT_SHARED_ABUSE_STORE`** — set to `1` / `true` / `yes` after applying migrations **`021_snapshot_domain_cooldown.sql`** and **`022_snapshot_fresh_lease.sql`** so (1) per-domain fresh cooldown and (2) **max concurrent fresh scans** are coordinated **across Railway instances** via Supabase; if unset, both stay per-process only. **`SNAPSHOT_FRESH_LEASE_TTL_SECONDS`** — optional; defaults to **max(300, 5 × fetch budget seconds)** so leases survive long Playwright runs; raise if scans can exceed that wall time.

**Hosted dashboards (logs):** Ship **JSON** logs (`LOG_FORMAT=json`, `LOG_SERVICE` set per env) to your provider’s log drain (Railway log integrations → **Grafana Loki**, **Datadog**, **Axiom**, etc.). Primary snapshot signal: **`message: "snapshot.run_complete"`** with **`domain_fp`** (SHA-256 prefix of registrable host, not the URL). Secondary: **`snapshot.pipeline_capacity`** (capacity shed), **`snapshot.shared_lease_*`** (RPC / migration issues). Build panels on **rates** of `outcome`, `cache_hit`, `playwright_used`, `home_fetch_failure`; alert on sustained **`snapshot.pipeline_capacity`** or missing `snapshot.run_complete` after `POST /api/snapshot` spikes. Operator in-process counters + shared lease headcount: **`GET /api/snapshot/operator/metrics`** (Bearer **`SNAPSHOT_OPERATOR_TOKEN`**); poll with a cron or uptime check, or point a **JSON API** datasource at that URL if your dashboard product supports auth headers.

Full redaction rules: [SECURITY.md — Snapshot observability & log redaction](./SECURITY.md#snapshot-observability--log-redaction-runbook).

See [API.md — Public Snapshot](./API.md#public-snapshot).

### Configuration centralization (avoid drift)

**Conceptual model:** where a new setting should live (env vs Postgres vs orchestration vs SPA) is described in [ARCHITECTURE.md — Configuration layering](./ARCHITECTURE.md#configuration-layering-config-vs-database-vs-services-vs-ui). **Env vs config defaults:** [Environment layers: infrastructure vs ops overrides](#environment-layers-infrastructure-vs-ops-overrides).

Shared constants and env-driven defaults introduced to reduce duplicated literals:

| Concern | Location |
| --- | --- |
| No-public-website sentinel URL + `isNoPublicWebsiteUrl` / display helper | `packages/intake-core` (`no-public-website.ts`); server/app re-export from `@glc/intake-core` |
| Discovery → brief patch (`a5` canon, legacy `c_nosite_1` labels) | `packages/intake-core/src/discovery-brief-mapping.ts` |
| Crawler/snapshot/playwright user-agents + public site URL | `server/src/config/bot-identity.ts` (`GLC_PUBLIC_SITE_URL`, **required in production**) |
| Full-audit crawler limits (max pages, per-page timeout, total crawl budget) | `server/src/config/crawler-limits.ts` (`CRAWLER_MAX_PAGES`, `CRAWLER_PAGE_TIMEOUT_MS`, `CRAWLER_TOTAL_BUDGET_MS`; max pages clamped **1–100**) |
| Collector HTTP timeouts and header truncation (security / performance / SEO / sitemap) | `server/src/config/collector-http.ts` (`COLLECTOR_*`, `SITEMAP_FETCH_TIMEOUT_MS`) |
| Snapshot tiered-fetch wall clock default | `server/src/config/snapshot-fetch-budget.ts` (`SNAPSHOT_FETCH_BUDGET_MS`) |
| Snapshot route defaults (token budget, TTL, guest funnel retention, guest header caps, UX summary length, competitor mini timeout) | `server/src/config/snapshot-public.ts` |
| Snapshot HTTP/Playwright/axe timing caps | `server/src/config/snapshot-timing.ts` (`SNAPSHOT_*` env prefix) |
| Rate-limit numeric defaults | `server/src/config/rate-limits.ts` (`RATE_LIMIT_*`, snapshot public quota) |
| Express JSON body size | `server/src/config/http-server.ts` (`JSON_BODY_LIMIT`) |
| Claude token reserve / max_tokens / warning threshold | `server/src/config/model.ts` (`PIPELINE_*` env vars) |
| Claude per-model USD/MTok pricing for cost estimates (defaults + JSON merge) | `server/src/config/model-pricing.ts` (`ANTHROPIC_PRICING_JSON` optional); `getModelPricing` re-exported from `model.ts` |
| Intake absolute URLs | `server/src/config/frontend-url.ts` (`FRONTEND_URL`) |
| Production startup assertions | `server/src/config/runtime-assert.ts` |
| Snapshot audit partial-score multiplier | `server/src/config/snapshot-partial-score.ts` (`SNAPSHOT_PARTIAL_SCORE_FACTOR`) |
| Claude circuit-breaker Redis key prefix (optional) | `server/src/agents/base.ts` (`REDIS_KEY_PREFIX`) |
| Local dev API/SPA ports and default CORS dev origins | `packages/glc-dev-brand-defaults` (`GLC_DEV_*`); consumed by Vite proxy, Playwright, `cors-origins`, `frontend-url`, `api-base-url` |
| Marketing brief → recommended SPA route | `packages/intake-core` (`marketing-brief-routing.ts`); re-exported from `server/src/config/marketing-brief-routing.ts` (logic: unsure / no-site / preferred depth; **no env**) |
| Snapshot tiered HTTP fetch (Accept-Language, path hints, robots fallback paths) | `server/src/config/snapshot-fetch-heuristics.ts` |
| Audit list pagination (`GET /api/audits`) | `server/src/config/audits-list-limits.ts` (`AUDITS_LIST_DEFAULT_LIMIT`, `AUDITS_LIST_MAX_LIMIT`) |
| Pipeline phase index bounds (full-mode max; retry validation) | `server/src/config/pipeline-phases.ts` (`PIPELINE_MIN_PHASE`, `PIPELINE_MAX_PHASE_INDEX`) |
| Stable JSON error `code` values (subset; grows over time) | `server/src/config/api-error-codes.ts` |
| HTTP body truncation limits (marketing brief, logs, audit requests, intake analytics ids) | `server/src/config/request-field-limits.ts` (`REQUEST_FIELD_LIMITS`) |
| Collector user-visible copy (security headers, accessibility heuristics) | `server/src/config/collector-copy-security.en.ts`, `server/src/config/collector-copy-accessibility.en.ts` |
| URL validation hint example (shared with error message text) | `server/src/config/api-validation-copy.ts` (`COMPANY_URL_VALIDATION_EXAMPLE`) |
| SPA → API relative paths | `src/app/config/api-paths.ts` (`API_PATHS`, `apiIntakeTracePublicationLog`) |
| Discover wizard timing (scroll delay, save timeout) | `src/app/config/discover-page-defaults.ts` |
| Login operator hints (e.g. Supabase manual linking) | `src/app/config/login-copy.en.ts` |
| Copy layering (zones, single source, PR checklist) | [ARCHITECTURE.md — §6](./ARCHITECTURE.md#6-user-visible-copy-layering-single-source-per-zone) |
| Intake UX flag defaults (next-recommended cap, toggles when env unset) | `packages/intake-core/src/config/intake-ui-config.ts` (`INTAKE_UI_CONFIG`); optional `INTAKE_*` / `VITE_INTAKE_*` overrides in `intake-flags.ts` |

### White-label and dev defaults: environment matrix

| Layer | Variables / package | Purpose |
| --- | --- | --- |
| **Dev template (fork)** | `packages/glc-dev-brand-defaults` (`GLC_DEV_*`) | Local API/SPA ports and origins, extra dev CORS origins, default placeholder sentinel URL, English marketing footer template, default support email for non-prod — **not** the live brand surface; production must override with the env vars in the rows below (`FRONTEND_URL`, `GLC_PUBLIC_SITE_URL`, `VITE_*`, `PUBLIC_*`, `NO_PUBLIC_WEBSITE_URL`) |
| **Server — public JSON** | `PUBLIC_BRAND_NAME`, `PUBLIC_SUPPORT_EMAIL`, `PUBLIC_BRAND_LEGAL_LINE`, `GLC_PUBLIC_SITE_URL` (required in production) | `GET /api/public/brand` for marketing shell |
| **Server — sentinel parity** | `NO_PUBLIC_WEBSITE_URL` | Canonical `audits.company_url` when the client has no public site; must match the SPA build |
| **Vite / browser** | `VITE_API_URL` (required prod), `VITE_SUPPORT_EMAIL` (required prod), `VITE_NO_PUBLIC_WEBSITE_URL` | API base URL, public contact in UI/errors, same sentinel as server |
| **Notifications (optional)** | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_API_BASE` (default `https://api.telegram.org`) | Telegram outbound; override base only behind a corporate proxy |

**Copy and brand:** which strings belong in intake JSON vs server vs SPA, and how **`PUBLIC_SUPPORT_EMAIL`** relates to **`VITE_SUPPORT_EMAIL`**, is documented in [ARCHITECTURE.md — §6 User-visible copy layering](./ARCHITECTURE.md#6-user-visible-copy-layering-single-source-per-zone).

See also § **White-label and cross-stack parity** in [`server/.env.example`](../server/.env.example).

Library-style modules (`page-anomaly` rules, `site-html-signals` / `TECH_PATTERNS`, `wappalyzer-imported-rules`) are intentionally not driven by env beyond existing threshold tunables.

#### Optional tuning env (collector, crawler, snapshot GET, pricing)

All optional unless you need to change defaults. See `server/.env.example` for commented templates.

| Variable | Default (when unset) | Purpose |
| --- | --- | --- |
| `COLLECTOR_FETCH_TIMEOUT_MS` | `10000` | Security + performance collector HTTP probes |
| `COLLECTOR_HEADER_PREVIEW_MAX` | `200` | Max length stored for CSP / Permissions-Policy samples in security collector |
| `COLLECTOR_SEO_FETCH_TIMEOUT_MS` | `15000` | SEO `robots.txt` fetch |
| `COLLECTOR_SEO_ROBOTS_CONTENT_MAX` | `2000` | Max chars of `robots.txt` body stored in audit payload |
| `SITEMAP_FETCH_TIMEOUT_MS` | `25000` | Per-request timeout for sitemap XML/text fetches |
| `CRAWLER_MAX_PAGES` | `20` (clamped **1–100**) | Phase 0 crawl page cap |
| `CRAWLER_PAGE_TIMEOUT_MS` | `15000` | Per-page abort in crawler |
| `CRAWLER_TOTAL_BUDGET_MS` | `90000` | Wall-clock budget for entire crawl loop |
| `SNAPSHOT_GUEST_HEADER_MAX_LEN` | `2000` | Truncate User-Agent / Referer on `snapshot_guest_sessions` |
| `SNAPSHOT_UX_SUMMARY_MAX_CHARS` | `280` | Legacy UX summary derived from `scan_basis` on snapshot GET |
| `SNAPSHOT_COMPETITOR_TIMEOUT_MS` | `3000` | Budget for optional competitor mini on snapshot GET (`compare=1`) |
| `ANTHROPIC_PRICING_JSON` | — | JSON object: model id → `{ "input": number, "output": number }` (USD per 1M tokens); merged over built-in defaults for `token-tracker` cost estimates |
| `ALERT_WINDOW_MINUTES` | `15` | Rolling window (minutes) for Telegram alert metrics; clamped **1–1440** |
| `SNAPSHOT_FETCH_ACCEPT_LANGUAGE` | long default (multi-locale) | `Accept-Language` for snapshot HTML GETs (`fetch-tiered`) |
| `SNAPSHOT_HEAD_ACCEPT_LANGUAGE` | `en,es;q=0.9` | `Accept-Language` for snapshot HEAD probe when robots block GET |
| `SNAPSHOT_PATH_HINT_REGEX_JSON` | — | JSON array of regex **sources** (case-insensitive) for ranking extra pages; invalid → built-in defaults |
| `SNAPSHOT_ROBOTS_FALLBACK_PATHS_JSON` | — | JSON array of path strings (`/…`) tried when homepage is robots-disallowed; invalid → built-in defaults |

### Product sentinel: no-public-website URL

- **Default (dev / non-API consumers):** `https://glc-audit.placeholder/no-public-website` from **`@glc/dev-brand-defaults`** via **`packages/intake-core/src/no-public-website.ts`**, re-exported by the server (`server/src/config/no-public-website.ts`) and SPA (`src/app/data/no-public-website.ts`).
- **Production API:** **`NO_PUBLIC_WEBSITE_URL` is required** when **`NODE_ENV=production`** — enforced at startup in **`server/src/config/runtime-assert.ts`** (set explicitly, typically to the same default URL or your white-label sentinel).
- **Override (white-label):** set **`NO_PUBLIC_WEBSITE_URL`** on the server and **`VITE_NO_PUBLIC_WEBSITE_URL`** on the Vite build to the **same** canonical URL so API and UI agree. When persisted as **`audits.company_url`**, collectors and snapshot logic treat it as “no public site” and **must not** crawl it.
- **Changing the sentinel** (default or overridden) is **breaking** for stored rows: plan a **data migration** for existing `audits.company_url` values and release server + SPA together.

### Server and SPA variables that must match (when set)

| Server (Railway) | Frontend (Vercel) | Notes |
| --- | --- | --- |
| **`NO_PUBLIC_WEBSITE_URL`** (required on API in prod) | **`VITE_NO_PUBLIC_WEBSITE_URL`** | Same string when overriding; SPA may omit **`VITE_…`** if the package default is acceptable for the UI. |
| **`@glc/intake-core` version** (lockfile / deploy) | Same workspace version in the SPA build | Marketing brief routing and sentinel logic live in the package — **aligned releases** avoid preview vs API drift. |

There is **no** required Vite mirror for marketing brief routing beyond shipping the same **`@glc/intake-core`** as the API.

**Release checklist:** when overriding the sentinel, set both env vars in the same rollout and smoke-test audit create + snapshot skip for the placeholder URL.

### Consultant list endpoints (hard cap)

- **`GET /api/intake/submissions`** — newest submitted pre-brief links for the current consultant; Supabase query uses **`.limit(100)`** in `server/src/routes/intake.ts` (not env-tunable today).
- **`GET /api/discover/sessions`** — discovery queue for the current consultant; **`.limit(100)`** in `server/src/routes/discover.ts` (same). For larger backfills, extend the API (pagination or a raised cap + env) in a dedicated change.

### Reliability alerts (Telegram)

- Alerts use **`TELEGRAM_BOT_TOKEN`** and **`TELEGRAM_CHAT_ID`** (`server/src/services/notifications.ts`). The Bot API request URL is **`https://api.telegram.org/bot<token>/sendMessage`** (official endpoint). If Telegram ever publishes a new base URL, update the server module; it is not configured via env today.

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
   VITE_SUPPORT_EMAIL=hello@yourdomain.com
   ```
5. Deploy — Vercel builds with `pnpm build` and serves `dist/`
6. Add your custom domain in Vercel → update Supabase Site URL + Redirect URLs

**SPA routing:** Vercel handles React Router automatically (all paths served `index.html`). No `vercel.json` needed for basic SPA routing.

---

## Production Environment Variables

### Frontend (Vercel)

| Variable | Value |
|---|---|
| `VITE_API_URL` | Railway backend URL (**required** for production builds; the SPA throws at runtime if unset when `import.meta.env.PROD`) |
| `VITE_SUPABASE_URL` | Supabase project URL (**required** in production builds together with anon key) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (**required** in production builds) |
| `VITE_SUPPORT_EMAIL` | **Required** in production builds. Public contact in marketing footer and brief error copy (no default in prod). In local dev, set in `.env.local` or rely on dev fallback `contact@glctech.es` in `src/app/lib/support-email.ts`. |
| `VITE_NO_PUBLIC_WEBSITE_URL` | Optional. When set, must match backend **`NO_PUBLIC_WEBSITE_URL`** (same string as `packages/intake-core` sentinel override). |
| `VITE_DISCOVERY_ANALYTICS_FLUSH_MS` | Optional. Debounce before flushing batched Discovery analytics POSTs (clamped 500–60000 ms; default 3200). See `src/app/lib/discovery-analytics-config.ts`. |
| `VITE_DISCOVERY_ANALYTICS_MAX_BATCH` | Optional. Max events per analytics batch (clamped 1–200; default 24). |
| `VITE_QUERY_DEFAULT_RETRY` | Optional. TanStack Query default `retry`: `false` / `0` or integer 0–5 (default `1`). See `src/app/lib/glc-query-client-defaults.ts`. |
| `VITE_QUERY_STALE_TIME_MS` | Optional. Default query `staleTime` in ms (clamped 10s–1h; default 120000). |
| `VITE_QUERY_GC_TIME_MS` | Optional. Default query `gcTime` in ms (clamped 60s–24h; default 900000). |

### Backend (Railway)

| Variable | Value |
|---|---|
| `PORT` | Injected by Railway (do not hardcode `3001` unless it matches **Public networking → Target port**) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (secret) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Canonical SPA origin (no trailing slash), e.g. `https://your-app.vercel.app` — **required when `NODE_ENV=production`** (process exits at startup if missing). Used for absolute intake links and merged into CORS allowlist. |
| `GLC_PUBLIC_SITE_URL` | **Required when `NODE_ENV=production`.** HTTPS origin (no trailing slash) embedded in crawler/snapshot user-agents. In development, defaults to `https://glctech.es` if unset. |
| `NO_PUBLIC_WEBSITE_URL` | **Required when `NODE_ENV=production`.** Sentinel stored as `audits.company_url` when the client has no public site; must match **`VITE_NO_PUBLIC_WEBSITE_URL`** on the SPA build when that Vite var is set. See [Product sentinel](#product-sentinel-no-public-website-url) below. |
| `FREE_SNAPSHOT_TOKEN_BUDGET` | Optional positive integer `token_budget` for new `free_snapshot` audits; default `80000` (full audits use DB default `200000` unless overridden) |
| `SNAPSHOT_TOKEN_TTL_HOURS` | Optional; snapshot token expiry check (default `72`) |
| `SNAPSHOT_GUEST_FUNNEL_RETENTION_DAYS` | Optional; guest funnel row `expires_at` offset (default `90`) |
| `JSON_BODY_LIMIT` | Optional Express `express.json` limit string (default `2mb`) |
| `PIPELINE_MIN_TOKEN_RESERVE` | Optional non-negative int; default `10000` |
| `PIPELINE_BUDGET_WARNING_THRESHOLD` | Optional fraction `(0,1]`; default `0.8` |
| `PIPELINE_MODEL_MAX_TOKENS_DOMAIN` / `..._STRATEGY` / `..._RECON` | Optional positive ints; defaults `4096` / `8192` / `4096` |
| `CLAUDE_MAX_RETRIES` | Optional Claude HTTP retry count (default `3`) |
| `CLAUDE_RETRY_BASE_MS` | Optional exponential backoff base in ms (default `1500`) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `RATE_LIMIT_REDIS_URL` | Redis URL for shared rate-limit counters (required for multi-instance consistency) |
| `STRICT_RATE_LIMIT_REDIS` | `true` to fail startup when Redis for rate limits is missing |
| `RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY` | Optional positive int; default `5` (rolling window below) |
| `RATE_LIMIT_AUDIT_CREATE_WINDOW_HOURS` | Optional positive int; default `24` |
| `RATE_LIMIT_PIPELINE_MAX_PER_HOUR` | Optional positive int; default `30` (per rolling window below) |
| `RATE_LIMIT_PIPELINE_WINDOW_MINUTES` | Optional positive int; default `60` |
| `RATE_LIMIT_GENERAL_MAX_PER_MIN` | Optional positive int; default `100` |
| `RATE_LIMIT_GENERAL_WINDOW_SECONDS` | Optional positive int; default `60` |
| `RATE_LIMIT_SNAPSHOT_PUBLIC_MAX_PER_DAY` | Optional positive int; default `3` (free snapshot POST starts per IP) |
| `RATE_LIMIT_SNAPSHOT_PUBLIC_WINDOW_HOURS` | Optional positive int; default `24` |
| `RATE_LIMIT_LOG_INGEST_MAX_PER_MIN` | Optional positive int; default `180` (authenticated client log ingest) |
| `RATE_LIMIT_LOG_INGEST_WINDOW_SECONDS` | Optional positive int; default `60` |
| `SNAPSHOT_LOG_INGEST_MAX_PER_MIN` | Optional; guest snapshot log ingest cap per minute (default `40`) |
| Snapshot timing (HTTP/Playwright/axe) | Optional `SNAPSHOT_FETCH_*`, `SNAPSHOT_HEAD_*`, `SNAPSHOT_ROBOTS_ABORT_*`, `SNAPSHOT_MAX_EXTRA_PAGES`, `SNAPSHOT_PW_*`, `SNAPSHOT_AXE_*`, etc. — see `server/src/config/snapshot-timing.ts` |
| Snapshot tiered-fetch heuristics | Optional `SNAPSHOT_FETCH_ACCEPT_LANGUAGE`, `SNAPSHOT_HEAD_ACCEPT_LANGUAGE`, `SNAPSHOT_PATH_HINT_REGEX_JSON` (array of regex **sources** for path scoring), `SNAPSHOT_ROBOTS_FALLBACK_PATHS_JSON` (array of path strings starting with `/`) — see `server/src/config/snapshot-fetch-heuristics.ts` |
| Snapshot page-anomaly tuning | Optional `SNAPSHOT_PAGE_ANOMALY_*` positive integers in `server/src/snapshot/page-anomaly-thresholds.ts` (sample size, registrar/login-wall thresholds, weak-parking suppression). |
| Marketing brief routing | Rules in **`@glc/intake-core`** (`marketing-brief-routing.ts`): unsure → snapshot or discovery; no site → discovery; otherwise `preferred_audit_depth` → express vs full audit. Column **`preferred_audit_depth`** on `marketing_brief_submissions` (migration **`046`**). **No env pair** on Vercel — SPA and API share the same package version; ship aligned releases when changing routing. |
| Pipeline reliability alerts window | Optional **`ALERT_WINDOW_MINUTES`** (integer **1–1440**, default **15**) — rolling window for `runAlertChecks` pipeline metrics (`server/src/services/alerts.ts`). |
| `PIPELINE_QUEUE_REDIS_URL` | Optional dedicated Redis URL for BullMQ queue (falls back to `RATE_LIMIT_REDIS_URL`) |
| `PIPELINE_WORKER_CONCURRENCY` | Worker concurrency (default `2`) |
| `PIPELINE_LEASE_TTL_SECONDS` | Queue lease TTL for `job_runs` / `phase_runs` (default `60`) |
| `PIPELINE_HEARTBEAT_MS` | Queue heartbeat interval in ms (default `10000`) |
| `PIPELINE_STALLED_TIMEOUT_MIN` | Mark long-running audits as stalled/failed after N minutes (default `15`) |
| `PARALLEL_FAILURE_THRESHOLD` | Parallel wing failure threshold before block fails (default `2`) |
| `CLAUDE_TIMEOUT_MS` | Per-attempt Claude request timeout in ms (default `90000`) |
| `CLAUDE_CB_THRESHOLD` | Claude circuit-breaker consecutive 5xx threshold (default `3`) |
| `CLAUDE_CB_TTL_SEC` | Claude circuit-breaker Redis TTL in seconds (default `60`) |
| `SENTRY_DSN` | Sentry DSN for backend error/trace capture |
| `SENTRY_TRACES_SAMPLE_RATE` | Trace sampling ratio, e.g. `0.2` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for reliability alerts |
| `TELEGRAM_CHAT_ID` | Telegram channel or chat ID for alerts |
| `ALERT_INTERVAL_MS` | Alert worker interval (default `60000`) |
| `ALERT_FAILURE_RATE_THRESHOLD` | Failure rate threshold for alerting (default `0.2`) |
| `ALERT_LATENCY_P95_MS_THRESHOLD` | p95 phase latency threshold in ms (default `180000`) |
| `ALERT_TOKEN_BURN_15M_THRESHOLD` | Token burn threshold over 15m window (default `300000`) |
| `ALERT_LOCK_TTL_MS` | Distributed alert lock TTL in ms (default `55000`) |
| `SENTRY_TRACE_LINK_TEMPLATE` | Optional deep link template with `{trace_id}` placeholder |
| `TRACE_LINK_TEMPLATE` | Optional custom trace viewer link template with `{trace_id}` |
| `SELF_SERVE_AUDIT_OWNER_USER_ID` | Optional fallback consultant `profiles.id` when `platform_settings.self_serve_audit_owner_user_id` is null |
| `PLATFORM_ADMIN_USER_IDS` | Optional comma-separated consultant `profiles.id` values allowed to PATCH `/api/platform/self-serve-owner`; if unset, any consultant may manage the stored assignment |

### Minimum secure production baseline

- Required:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`, `NODE_ENV=production`
  - `FRONTEND_URL` (required by startup guard when `NODE_ENV=production`)
  - `GLC_PUBLIC_SITE_URL` (required by startup guard and bot identity when `NODE_ENV=production`)
  - `RATE_LIMIT_REDIS_URL` (for shared public abuse controls in multi-instance runtime)
  - `SNAPSHOT_GUEST_IP_SALT` (required by startup guard in production)
- Strongly recommended:
  - `STRICT_RATE_LIMIT_REDIS=true`
  - `PIPELINE_QUEUE_REDIS_URL` (or reuse `RATE_LIMIT_REDIS_URL`)
  - `SENTRY_DSN`, alert variables, and trace-link templates

---

## CORS Configuration

Allowlist is built in `server/src/config/cors-origins.ts` and applied in `server/src/index.ts`:

- **Production:** `ALLOWED_ORIGINS` (comma-separated full origins) **and** `FRONTEND_URL` are merged and deduped. Trailing slashes are normalized. **`FRONTEND_URL` is required** for a healthy production boot (startup assert); if **`ALLOWED_ORIGINS`** is empty but **`FRONTEND_URL`** is set, the SPA origin is still allowed. If both were unset the API would not start in production.
- **Development:** same merge, plus default localhost dev server ports (`5173`, `5174`, `3000`).

Example on Railway:

`ALLOWED_ORIGINS=https://www.glctech.pro,https://glctech.pro`

`FRONTEND_URL` can duplicate one of those or hold the canonical site URL for redirects (`intake` routes); it is always included in the CORS allowlist when set.

---

## Local Dev vs Production

| Concern | Local Dev | Production |
|---|---|---|
| API URL | Vite proxy to `localhost:3001` | `VITE_API_URL` Railway URL |
| Auth redirect | `http://localhost:5173` | `https://your-app.vercel.app` |
| CORS | Localhost ports + optional `ALLOWED_ORIGINS` | `ALLOWED_ORIGINS` + `FRONTEND_URL` |
| HTTPS | HTTP (fine for dev) | HTTPS enforced by Vercel/Railway |

---

## Deploy Checklist

- [ ] Run all SQL migrations in numeric order through the latest file in `server/migrations/` (see [DATABASE.md](./DATABASE.md#overview))
- [ ] RLS policies active (check in Supabase → Table Editor → each table)
- [ ] Supabase Site URL + Redirect URLs updated to production domain
- [ ] Google OAuth configured in Supabase (if using)
- [ ] All env vars set in Railway and Vercel
- [ ] Railway: `FRONTEND_URL` matches the canonical Vercel (or custom) SPA origin
- [ ] `ALLOWED_ORIGINS` in Railway matches every browser origin that calls the API with credentials
- [ ] Backend `/api/health` healthcheck returns 200
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

### SRE runbooks (security + reliability)

1. **Incident triage (P0/P1)**
   - Confirm blast radius using `pipeline_events`, `job_runs`, `phase_runs` and API logs.
   - Identify affected tenant IDs/audit IDs and freeze risky endpoints with temporary stricter rate limits.
2. **Rollback**
   - Roll back application deploy first (Railway/Vercel), then revert only the latest unsafe migration if needed.
   - Never roll back by deleting audit data; use status transitions (`failed`, `phase_stalled`) and replay jobs.
3. **Key rotation**
   - Rotate `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, and `SNAPSHOT_OPERATOR_TOKEN` in provider dashboards.
   - Deploy backend immediately after rotation and verify `/api/health`, queue worker startup, and snapshot endpoints.
4. **Queue recovery**
   - Check Redis connectivity and queue lag.
   - Inspect `job_runs` rows with `status in ('failed','dead_letter')`; requeue targeted jobs only.
5. **Post-incident review**
   - Capture timeline, root cause, and guardrail actions.
   - Add a regression test under `server/src/tests/` for the exact failure mode before closing the incident.
