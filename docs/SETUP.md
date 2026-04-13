# Local Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- A Supabase project (free tier is fine)
- An Anthropic API key

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd glc-agent

pnpm install
```

---

## 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Apply the database schema:** follow [DATABASE.md — Overview](./DATABASE.md#overview) (run every file in `server/migrations/` in numeric order). That section is the single source of truth for migration order and table notes.
3. Note your project URL and anon key (Project Settings → API).
4. Note your service role key (same page — keep secret).

Production-only dashboard steps (Auth URLs, providers, region): [DEPLOYMENT.md — Supabase Setup](./DEPLOYMENT.md#supabase-setup).

---

## 3. Environment Variables

### Frontend — `.env` (project root)

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional — Intake trace UI: set to 0/false/off to use legacy flat tabs (default: on / unset)
# Intake trace IA v2: src/app/config/app-feature-flags.ts (intakeTraceIaV2Enabled)
```

### Backend — `server/.env`

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...

# Recommended for local parity with production distributed runtime
# RATE_LIMIT_REDIS_URL=redis://localhost:6379
# STRICT_RATE_LIMIT_REDIS=false
# PIPELINE_QUEUE_REDIS_URL=redis://localhost:6379

# Pipeline, Claude HTTP, rate limits, snapshot timing, audit deep-scan (Lighthouse/axe): SYSTEM_DEFAULTS in server/src/config/system-defaults.ts — not env.
```

> The frontend uses the anon key (safe to expose). The backend uses the service role key (bypasses RLS for server-side operations — never expose to client).

**Deep audit (full pipeline):** enable Lighthouse and/or axe+Playwright in **`SYSTEM_DEFAULTS.auditDeepScan`** (`deepScanEnabled`, `lighthouseEnabled`, `axePlaywrightEnabled`) and redeploy. Lighthouse uses [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher), which reads **`CHROME_PATH`** if set; otherwise it searches for Chrome/Chromium on the system.

**Local env checklist (backend):**

- Required to start API: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (+ `ANTHROPIC_API_KEY` for live pipeline phases).
- Required for local distributed behavior parity: `RATE_LIMIT_REDIS_URL` (and optionally `PIPELINE_QUEUE_REDIS_URL`).
- Optional: tune numeric guardrails in `server/src/config/system-defaults.ts` to mirror production.

**Docker / production image:** the server `Dockerfile` installs Debian `chromium` and sets `CHROME_PATH=/usr/bin/chromium` so Lighthouse works when deep audit is enabled in config. Local dev without Docker: install Chrome/Chromium or set `CHROME_PATH` to your binary (Playwright’s downloaded Chromium lives under `~/.cache/ms-playwright/` — e.g. `chromium-*/chrome-linux/chrome` on Linux).

See [docs/ARCHITECTURE.md](./ARCHITECTURE.md#open-source-collector-libraries) for library references, Unlighthouse (future), and Context7 IDs.

**Important:** Deep audit flags affect only the **full audit pipeline** (consultant flow: create audit → start pipeline → phases 1 and 4 run `PerformanceCollector` / `AccessibilityCollector`). It does **not** run during the **public free snapshot** (`POST /api/snapshot/`, logs like `snapshot.run_complete`, `Free snapshot started`). The snapshot scanner uses its own tiered fetch and optional Playwright for the homepage; that is unrelated to Lighthouse/axe in collectors.

**Target direction:** full audit → **multi-URL** Lighthouse (Unlighthouse-class); free snapshot → **no default Lighthouse**, optional single-URL only with explicit opt-in — see [ARCHITECTURE.md](./ARCHITECTURE.md#target-architecture-lighthouse-and-unlighthouse).

**How to confirm deep audit ran:** restart the API after changing env (`AUDIT_DEEP_SCAN` is read at process start). Trigger a **full** audit and let the pipeline reach tech (phase 1) and UX (phase 4). In logs, look for `collector.performance.lighthouse_start` / `lighthouse_finished` and `collector.accessibility.axe_start` / `axe_finished`. In Supabase `collected_data`: `collector_key` = `performance` → `data.lighthouse`; `collector_key` = `accessibility` → `data.axe_playwright`. If those keys are missing, either you only ran a free snapshot, env was not loaded, the server was not restarted, or the phase has not finished yet.

---

## 4. Run Locally

```bash
# Terminal 1 — backend
cd server && pnpm run dev

# Terminal 2 — frontend
pnpm dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3001](http://localhost:3001)
- Vite proxies `/api/*` requests to the backend automatically (configured in `vite.config.ts`)

### Local dev port and URL matrix (keep in sync)

Changing one of these without the others is a common cause of CORS errors, failed fetches, or broken absolute links in emails.

| Concern | Default | Where it is defined |
|--------|---------|---------------------|
| Vite dev server port | `5173` | `pnpm dev` (Vite default); Playwright `playwright.config.ts` `baseURL` / `webServer.url` |
| `/api` proxy upstream | `http://localhost:3001` | [`vite.config.ts`](../vite.config.ts) `server.proxy['/api'].target` |
| Express listen port | `3001` (`PORT` env) | [`server/src/index.ts`](../server/src/index.ts); [`server/.env.example`](../server/.env.example) |
| SPA → API base URL | `http://localhost:3001` | Root `.env` `VITE_API_URL`; dev fallback in [`src/app/lib/api-base-url.ts`](../src/app/lib/api-base-url.ts) |
| CORS browser origins (dev) | `5173`, `5174`, `3000` | [`server/src/config/cors-origins.ts`](../server/src/config/cors-origins.ts) `DEFAULT_DEV_ORIGINS` |
| Absolute frontend base (e.g. intake links) | `http://localhost:5173` | `FRONTEND_URL` in `server/.env`; non-production fallback in [`server/src/config/frontend-url.ts`](../server/src/config/frontend-url.ts) |

---

## 5. Verify Setup

1. Open [http://localhost:5173](http://localhost:5173)
2. You should see the public marketing entry page (`RootEntry` / MarketingHome)
3. Open `/login`, sign in or create an account (email + password or Google) → redirected to Portfolio/Dashboard
4. Click "New Audit" → enter a URL → submit → redirected to PipelineMonitor
5. PipelineMonitor should show Phase 0 starting (Recon crawl)

If Phase 0 fails: check `server/.env` has valid Anthropic + Supabase keys, and Supabase tables exist.

---

## Automated tests

From the repo root: `pnpm test` (frontend Vitest), `pnpm --filter glc-audit-server test` (backend). Playwright smoke: `pnpm exec playwright install chromium` then `pnpm run test:e2e`. Coverage matrix: [TESTING.md](../TESTING.md).

---

## TypeScript

```bash
# Backend (CI / strict): from repo root
pnpm run typecheck

# Optional: editor-oriented frontend check (see root tsconfig.json)
pnpm exec tsc --noEmit -p tsconfig.json
```

---

## Project Structure

```text
/                    ← Frontend (React + Vite)
├── src/
│   └── app/
│       ├── pages/   ← Public, protected, and admin pages
│       ├── hooks/   ← useAuth, useAudit, usePipeline, useAudits
│       ├── data/    ← auditTypes.ts, apiService.ts
│       ├── lib/     ← supabase.ts client
│       └── components/
├── docs/            ← All documentation (index: MASTER.md)
server/              ← Backend (Express + TypeScript)
├── src/
│   ├── agents/      ← Domain agents + BaseAgent
│   ├── collectors/  ← Data collectors (no AI)
│   ├── services/    ← Pipeline, context builder, fact-checker
│   ├── routes/      ← Express route handlers
│   ├── middleware/  ← Auth, rate-limit
│   └── config/      ← Industry weights
└── migrations/      ← SQL migration files (run in order)
```

---

## Demo audit (seeded data)

Simulated full audit for **Hospital Universitari Son Espases** — use to explore UI without running the live AI pipeline.

**Warning:** Data is representative for demo purposes, not a full programmatic audit of the hospital site.

### Demo prerequisites

1. Supabase migrations applied (recommended: full ordered set from `server/migrations/`; see [DATABASE.md](./DATABASE.md#overview))
2. `server/.env` with valid `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. Frontend running: `pnpm dev` ([http://localhost:5173](http://localhost:5173))

### Run the seed script

```bash
cd server
pnpm run seed:demo -- --email your@email.com
```

Use the email you log in with. If you omit `--email`, the audit is tied to a demo user UUID and may not appear in your portfolio until you re-run with your email.

The script is **idempotent** — it replaces the demo audit cleanly on re-run.

### URLs (fixed audit id)

| Page | Path |
|------|------|
| Dashboard (legacy alias: `/portfolio`) | `/dashboard` |
| Pipeline log | `/pipeline/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Audit workspace | `/audit/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Report | `/reports/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Strategy Lab | `/strategy/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |

### Reset

```bash
cd server && pnpm run seed:demo -- --email your@email.com
```

Or delete the row in Supabase `audits` where `company_url = 'https://www.hospitalsonespases.es'` (related rows cascade).
