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

Values that are **secrets, connectivity, or deploy wiring** — not product defaults: **`SUPABASE_URL`**, **`SUPABASE_SERVICE_KEY`**, **`ANTHROPIC_API_KEY`**, **`NODE_ENV`**, **`PORT`** (when the host injects it), **`SNAPSHOT_GUEST_IP_SALT`** (required in production), **`RATE_LIMIT_REDIS_URL`**, **`FRONTEND_URL`** / **`ALLOWED_ORIGINS`**, **`GLC_PUBLIC_SITE_URL`** (required in production), Telegram / operator tokens where used. **Public marketing copy** (`brand_name`, footer text, optional `support_email`, sentinel URL) lives in **`packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json`** (package **`@glc/dev-brand-defaults`**), not in env. The no-public-website value (**`NO_PUBLIC_WEBSITE_URL`**) is re-exported from **`@glc/intake-core`** from that JSON (`no_public_website_sentinel`), not an env var. See [`server/.env.example`](../server/.env.example) for the authoritative commented list.

### Deprecated / ops-only

- **`PLATFORM_ADMIN_USER_IDS`** — **bootstrap / disaster-recovery only.** Prefer **`profiles.is_platform_admin`** or **`platform_settings.legacy_platform_admin_user_ids`** (migrations 049–050). When this env is set, the server logs **`platform_admin.env_bootstrap_active`** at startup; remove the variable once admins are stored in the database (see [Railway](#railway-backend) platform admin note).
- **`CONSULTANT_EMAILS`** — **removed.** Consultant promotion on first login uses **`consultant_email_allowlist`** only (SQL or **`/api/platform/consultant-allowlist`**). Delete this env from any legacy deploy configs.
- **Product numerics** (rate limits, snapshot timings, pipeline/Claude, alerts, etc.) are **static TypeScript** in **`SYSTEM_DEFAULTS`** and focused modules — not Railway env. Remaining backend env is mostly **secrets, URLs, Redis, Sentry/Telegram, operator tokens**.

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
   **Do not set `PORT` manually** unless you know what you are doing: Railway injects **`PORT`**; the app must listen on that value (`server/src/index.ts`). In **Public networking**, **Target port** must match that same `PORT` (often not `3001`). If the deploy healthcheck passes but `https://…up.railway.app/api/health` returns **502**, fix the domain’s target port or remove a conflicting custom `PORT` variable. **`LISTEN_HOST`** (optional) defaults to **`0.0.0.0`** for containers; set **`127.0.0.1`** only for local hardening when you intentionally avoid exposing the API on all interfaces.

   **Client self-serve (portal):** after migration `018_platform_settings.sql`, persist the default audit owner in **`platform_settings`** via **Settings → Client portal — audit owner** (`PATCH /api/platform/self-serve-owner`). **`SELF_SERVE_AUDIT_OWNER_USER_ID`** is **bootstrap / disaster-recovery only**: it applies when the DB row is empty so the API can resolve an owner before anyone saves in the UI. Once a consultant clicks **Save assignment**, normal operation should **not** depend on that env var (the Settings screen shows a callout while the env fallback is still active). **Platform admin ACL:** migration **`049_profiles_platform_admin.sql`** adds **`profiles.is_platform_admin`**. When at least one consultant has this flag **`true`**, only those users (plus any legacy **`PLATFORM_ADMIN_USER_IDS`** entries) may manage platform settings; when no row has the flag and **`PLATFORM_ADMIN_USER_IDS`** is unset, any consultant may manage (open mode). Set the first admins with SQL: `UPDATE profiles SET is_platform_admin = true WHERE id = '<consultant uuid>';`

6. **Build / start (dashboard):** with **root `railway.json` + `server/Dockerfile`**, the image builds inside Docker (`pnpm run build` in `server/`) and starts with **`node dist/index.js`** (working directory `server/` in the image). Clear conflicting custom build/start overrides in the UI if needed.
7. Railway provides a public URL like `https://glc-api.up.railway.app`

**Healthcheck:** use **`/api/health`** (see root `railway.json`). There is no `GET /` handler on the API; pinging `/` returns 404.

### Free snapshot — Playwright

Headless Chromium **runs by default** when the static homepage looks like an empty client shell (thin text + many scripts, or known SPA root mounts). Set **`SNAPSHOT_PLAYWRIGHT=0`** (or `false`) to disable and use only HTTP HTML.

- **Env:** optional `SNAPSHOT_PLAYWRIGHT_BUDGET_MS` (default `14000`, capped by remaining `SNAPSHOT_FETCH_BUDGET_MS`). **`SNAPSHOT_FETCH_BUDGET_MS`** defaults to **`10000`** (10s wall clock for the tiered fetch). Optional **`SNAPSHOT_OPERATOR_TOKEN`** enables **`GET /api/snapshot/operator/metrics`** and **`POST /api/snapshot/operator/purge-cache`** (see [API.md](./API.md#snapshot-operator-optional)); keep the token long and rotate like any secret.
- **Build (Docker / Railway):** `server/Dockerfile` installs Chromium via **`playwright install --with-deps chromium`**. For non-Docker hosts (e.g. local dev), run `pnpm playwright:install` in `server/` once. The `playwright` package is in `server/package.json`. Outbound Mozilla-style snapshot UAs embed a **Chrome major token** from **`server/src/config/playwright-user-agent.ts`** (`PLAYWRIGHT_CHROME_MAJOR_FOR_UA`); it is a **site-compatibility hint**, not necessarily the bundled Chromium revision — review it when upgrading the **`playwright`** dependency. Sanity test: `pnpm -C server exec vitest run src/config/playwright-user-agent.test.ts`.
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
| Crawler/snapshot/playwright user-agents + public site URL | `server/src/config/bot-identity.ts` (`GLC_PUBLIC_SITE_URL`, **required in production**); GLC product token `GLC-*/x.y` from **`SYSTEM_DEFAULTS.outboundBot.uaProductVersion`** |
| HTTP listen bind address | `LISTEN_HOST` env (default `0.0.0.0`) in `server/src/index.ts` |
| Full-audit crawler limits (max pages, per-page timeout, total crawl budget) | `SYSTEM_DEFAULTS.crawler` via `server/src/config/crawler-limits.ts` |
| Collector HTTP timeouts and header truncation (security / performance / SEO / sitemap) | `SYSTEM_DEFAULTS.collectorsHttp` via `server/src/config/collector-http.ts` |
| Tech stack HTML fingerprint inline-script bound | `SYSTEM_DEFAULTS.techWappalyzer` (`maxInlineScriptChars`) in `server/src/lib/tech-wappalyzer-detect.ts` |
| Discovery session token hex length, contact-edit key pattern, maturity bounds | `server/src/config/discover-contract.ts` (see migrations 013, 032, 033) |
| SSRF-safe public fetch (redirect cap, retries, backoff) | `server/src/config/public-http-fetch.ts` |
| Sitemap discovery bounds (fetch count, bytes, URL cap, fallback paths) | `server/src/config/sitemap-discovery-limits.ts` |
| Idempotency key TTL | `SYSTEM_DEFAULTS.idempotency` in `server/src/config/system-defaults.ts` |
| Snapshot tiered-fetch wall clock default | `SYSTEM_DEFAULTS.snapshotFetchBudgetMs` via `server/src/config/snapshot-fetch-budget.ts` |
| Snapshot route defaults (token budget, TTL, guest funnel retention, guest header caps, UX summary length, competitor mini timeout) | `SYSTEM_DEFAULTS.snapshotPublic` via `server/src/config/snapshot-public.ts` |
| Snapshot HTTP/Playwright/axe timing caps | `SYSTEM_DEFAULTS.snapshotTiming` via `server/src/config/snapshot-timing.ts` |
| Rate-limit numeric defaults | `SYSTEM_DEFAULTS.rateLimits` via `server/src/config/rate-limits.ts` |
| Express JSON body size | `SYSTEM_DEFAULTS.express.jsonBodyLimit` via `server/src/config/http-server.ts` |
| Claude model id, token reserve, max_tokens, budget warning | `SYSTEM_DEFAULTS.pipelineModel` via `server/src/config/model.ts` |
| Claude per-model USD/MTok pricing for cost estimates | `server/src/config/model-pricing.ts`; `getModelPricing` re-exported from `model.ts` |
| Intake absolute URLs | `server/src/config/frontend-url.ts` (`FRONTEND_URL`) |
| Production startup assertions | `server/src/config/runtime-assert.ts` |
| Snapshot audit partial-score multiplier | `SYSTEM_DEFAULTS.snapshotAudit.partialScoreFactor` via `server/src/config/snapshot-partial-score.ts` |
| Redis key prefix for Claude circuit breaker + distributed rate limits (optional) | `REDIS_KEY_PREFIX` — `server/src/config/claude-client.ts`, `server/src/middleware/rate-limit.ts` (`${prefix}glc:…` / `${prefix}cb:…`) |
| Local dev API/SPA ports and default CORS dev origins | `packages/glc-dev-brand-defaults` (`GLC_DEV_*`); consumed by Vite proxy, Playwright, `cors-origins`, `frontend-url`, `api-base-url` |
| Marketing brief → recommended SPA route | `packages/intake-core` (`marketing-brief-routing.ts`); re-exported from `server/src/config/marketing-brief-routing.ts` (logic: unsure / no-site / preferred depth; **no env**) |
| Snapshot tiered HTTP fetch (Accept-Language, path hints, robots fallback paths) | `server/src/config/snapshot-fetch-heuristics.ts` |
| Audit list pagination (`GET /api/audits`) | `SYSTEM_DEFAULTS.auditsList` via `server/src/config/audits-list-limits.ts` |
| Pipeline phase index bounds (full-mode max; retry validation) | `server/src/config/pipeline-phases.ts` (`PIPELINE_MIN_PHASE`, `PIPELINE_MAX_PHASE_INDEX`) |
| Stable JSON error `code` values (subset; grows over time) | `server/src/config/api-error-codes.ts` (`API_ERROR_CODES`, types, `apiErrorJson`, dynamic message helpers) |
| Default English API `error` strings for coded responses | `server/src/config/api-user-messages.en.json` + `api-user-messages.en.ts` (re-exported from `api-error-codes.ts` as `*_MESSAGE`) |
| HTTP body truncation limits (marketing brief, logs, audit requests, intake analytics ids) | `server/src/config/request-field-limits.ts` (`REQUEST_FIELD_LIMITS`) |
| Collector user-visible copy (security headers, accessibility heuristics) | `server/src/config/collector-copy-security.en.ts`, `server/src/config/collector-copy-accessibility.en.ts` |
| URL validation hint example (`{example}` in `AUDITS_COMPANY_URL_INVALID`) | `server/src/config/api-user-messages.en.json` (`COMPANY_URL_VALIDATION_EXAMPLE`) |
| SPA → API relative paths | `src/app/config/api-paths.ts` (`API_PATHS`, builder helpers) |
| Express `app.use` API mounts (kept in sync with SPA paths) | `server/src/config/api-route-mounts.ts` (`API_ROUTE_MOUNT_ENTRIES`, `mountApiRouters`); contract: `server/src/tests/api-paths-mount-contract.test.ts` (Vitest) |
| Discover wizard timing (scroll delay, save timeout) | `src/app/config/discover-page-defaults.ts` |
| Login operator hints (e.g. Supabase manual linking) | `src/app/config/login-copy.en.ts` |
| Copy layering (zones, single source, PR checklist) | [ARCHITECTURE.md — §6](./ARCHITECTURE.md#6-user-visible-copy-layering-single-source-per-zone) |
| Intake UX toggles and next-recommended cap (no env overrides) | `packages/intake-core/src/config/intake-ui-config.ts` (`INTAKE_UI_CONFIG`); `intake-flags.ts` re-exports booleans/cap — change CONFIG and redeploy, or add a future DB/feature-flag layer for runtime toggles |
| Platform admin UUID list (migration off `PLATFORM_ADMIN_USER_IDS`) | `platform_settings.legacy_platform_admin_user_ids` (migration `050_platform_settings_legacy_admin_ids.sql`) — when non-empty, replaces env for ACL + self-serve owner fallback; prefer `profiles.is_platform_admin` for individuals |

### White-label and dev defaults: environment matrix

| Layer | Variables / package | Purpose |
| --- | --- | --- |
| **Dev template (fork)** | `packages/glc-dev-brand-defaults` (`GLC_DEV_*` from `dev-infra.ts`; brand/sentinel from `public-brand-defaults.v1.json` via `brand-from-json.ts`) | Local API/SPA ports and origins, extra dev CORS origins; **`no_public_website_sentinel`** in JSON → **`GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL`** → **`NO_PUBLIC_WEBSITE_URL`** (**`@glc/intake-core`**). Production must set **`FRONTEND_URL`**, **`GLC_PUBLIC_SITE_URL`**, **`VITE_*`** for deploy wiring |
| **Server — public JSON** | `packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json` + **`GLC_PUBLIC_SITE_URL`** (required in production) | `GET /api/public/brand` for marketing shell |
| **Vite / browser** | `VITE_API_URL` (required prod), `VITE_SUPABASE_*` | API base URL, Supabase client |
| **Notifications (optional)** | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_API_BASE` (default `https://api.telegram.org`) | Telegram outbound; override base only behind a corporate proxy |

**Copy and brand:** public contact for marketing surfaces comes from **`packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json`** field **`support_email`** (served by **`GET /api/public/brand`** via **`public-brand-config.ts`**). JSON **`null`** hides the footer mail link; omitted or empty string falls back to **`GLC_DEV_SUPPORT_EMAIL`** (same JSON). See [ARCHITECTURE.md — §6 User-visible copy layering](./ARCHITECTURE.md#6-user-visible-copy-layering-single-source-per-zone).

See also § **White-label and cross-stack parity** in [`server/.env.example`](../server/.env.example).

Library-style modules (`page-anomaly` rules, `site-html-signals` / `TECH_PATTERNS`, `wappalyzer-imported-rules`) are intentionally not driven by env beyond existing threshold tunables.

Collector/crawler HTTP limits, snapshot public route defaults (token budget, TTL, guest funnel, header/UX caps, competitor timeout), audits list pagination, Claude cost table for token-tracker, PDF palette/locale, snapshot partial-score factor, collector `collected_data` cache TTL, and snapshot guest cookie name/age are **not** environment variables — change `SYSTEM_DEFAULTS` or the listed module and redeploy.

### Product sentinel: no-public-website URL

- **Source of truth:** JSON field **`no_public_website_sentinel`** in **`packages/glc-dev-brand-defaults/src/public-brand-defaults.v1.json`**, exposed as **`GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL`** from **`@glc/dev-brand-defaults`**, then as **`NO_PUBLIC_WEBSITE_URL`** from **`packages/intake-core/src/no-public-website.ts`**, re-exported by the server (`server/src/config/no-public-website.ts`) and SPA (`src/app/data/no-public-website.ts`). API and browser bundles share the same compiled constant — **no env vars**.
- **White-label / fork:** edit that JSON field (or replace the package defaults) and redeploy server + SPA together. When persisted as **`audits.company_url`**, collectors and snapshot logic treat it as “no public site” and **must not** crawl it.
- **Changing the sentinel** is **breaking** for stored rows: plan a **data migration** for existing `audits.company_url` values.

### Server and SPA variables that must match (when set)

| Server (Railway) | Frontend (Vercel) | Notes |
| --- | --- | --- |
| **`@glc/intake-core` version** (lockfile / deploy) | Same workspace version in the SPA build | Marketing brief routing and **`NO_PUBLIC_WEBSITE_URL`** live in the package — **aligned releases** avoid preview vs API drift. |

There is **no** required Vite env mirror for the no-public sentinel beyond shipping the same **`@glc/intake-core`** / **`@glc/dev-brand-defaults`** as the API.

**Release checklist:** after changing the sentinel in code, smoke-test audit create + snapshot skip for the placeholder URL and run any data migration.

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

Client analytics batching, TanStack Query defaults, and HTTP client timeouts are **static TypeScript** under `src/app/config/` (see `client-analytics-batching.ts`, `query-client-defaults.ts`, `http-client-defaults.ts`, `app-feature-flags.ts`) — not `VITE_*` env vars.

### Backend (Railway)

| Variable | Value |
|---|---|
| `PORT` | Injected by Railway (do not hardcode `3001` unless it matches **Public networking → Target port**) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (secret) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_BASE_URL` | Optional Anthropic-compatible API base URL (corporate proxy / gateway); omit for SDK default |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Canonical SPA origin (no trailing slash), e.g. `https://your-app.vercel.app` — **required when `NODE_ENV=production`** (process exits at startup if missing). Used for absolute intake links and merged into CORS allowlist. |
| `GLC_PUBLIC_SITE_URL` | **Required when `NODE_ENV=production`.** HTTPS origin (no trailing slash) embedded in crawler/snapshot user-agents. In development, defaults to `https://glctech.es` if unset. |
| `NO_PUBLIC_WEBSITE_URL` | **Required when `NODE_ENV=production`.** Sentinel for no-public-website audits; must match **`VITE_NO_PUBLIC_WEBSITE_URL`** on the SPA when that Vite var is set. |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (comma-separated; merged with `FRONTEND_URL`) |
| `RATE_LIMIT_REDIS_URL` | Redis URL for shared rate-limit counters (required for multi-instance consistency) |
| `STRICT_RATE_LIMIT_REDIS` | `true` to fail startup when Redis for rate limits is missing |
| `PIPELINE_QUEUE_REDIS_URL` | Optional dedicated Redis URL for BullMQ (falls back to `RATE_LIMIT_REDIS_URL`) |
| `REDIS_KEY_PREFIX` | Optional prefix for Claude circuit-breaker Redis key when sharing Redis |
| `SENTRY_DSN` | Sentry DSN for backend error/trace capture |
| `SENTRY_TRACES_SAMPLE_RATE` | Trace sampling ratio, e.g. `0.2` |
| `SENTRY_TRACE_LINK_TEMPLATE` | Optional deep link template with `{trace_id}` placeholder |
| `TRACE_LINK_TEMPLATE` | Optional custom trace viewer link template with `{trace_id}` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for reliability alerts |
| `TELEGRAM_CHAT_ID` | Telegram channel or chat ID for alerts |
| `TELEGRAM_API_BASE` | Optional Bot API base (proxy); default official endpoint |
| `SELF_SERVE_AUDIT_OWNER_USER_ID` | Optional bootstrap: consultant `profiles.id` used only while **`platform_settings.self_serve_audit_owner_user_id`** is null; prefer **Save assignment** in Settings so production does not rely on this env |
| `PLATFORM_ADMIN_USER_IDS` | Optional legacy comma-separated consultant `profiles.id` values; used only when **`platform_settings.legacy_platform_admin_user_ids`** is empty — prefer DB column (migration `050_platform_settings_legacy_admin_ids.sql`) or **`profiles.is_platform_admin`** (migration `049_profiles_platform_admin.sql`) |
| `SNAPSHOT_OPERATOR_TOKEN` | Optional operator-only snapshot actions (see `server/src/routes/snapshot.ts`) |

**Not env (change in code / release):** rate-limit numerics and windows, public-route hourly caps, Express JSON body limit, Claude model id and `max_tokens` / token reserve / budget warning, Claude HTTP retries and timeouts, BullMQ queue retention and backoff, worker concurrency and lease TTL, pipeline stall and parallel-failure thresholds, snapshot fetch/Playwright/axe timing, snapshot abuse and domain-cache TTL, page-anomaly thresholds, audit deep-scan (Lighthouse/axe) enablement and budgets, reliability alert thresholds and intervals — all live in **`server/src/config/system-defaults.ts`** and re-exported modules (`rate-limits.ts`, `snapshot-timing.ts`, `alerts-config.ts`, `model.ts`, …). Marketing brief routing stays in **`@glc/intake-core`**.

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
  - `SENTRY_DSN`, Telegram alert vars, and trace-link templates

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
