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

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run **all** migrations in order (see [DATABASE.md](./DATABASE.md#overview)):
   - `001_initial_schema.sql` through `015_audit_request_guards.sql`
3. Note your project URL and anon key (Project Settings → API)
4. Note your service role key (same page — keep secret)

Schema summary and table list: [DATABASE.md](./DATABASE.md).

---

## 3. Environment Variables

### Frontend — `.env` (project root)

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend — `server/.env`

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...

# Optional — deeper automated checks (extra CPU/time; needs Chrome for Lighthouse)
# AUDIT_DEEP_SCAN=1
# AUDIT_LIGHTHOUSE=1
# AUDIT_AXE_PLAYWRIGHT=1
# AUDIT_LIGHTHOUSE_BUDGET_MS=55000
# AUDIT_AXE_NAV_TIMEOUT_MS=12000
```

> The frontend uses the anon key (safe to expose). The backend uses the service role key (bypasses RLS for server-side operations — never expose to client).

**Deep audit flags:** `AUDIT_DEEP_SCAN=1` turns on both Lighthouse (performance collector) and axe-core + Playwright (accessibility collector). You can enable them separately with `AUDIT_LIGHTHOUSE=1` or `AUDIT_AXE_PLAYWRIGHT=1`. Lighthouse uses [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher), which reads **`CHROME_PATH`** if set; otherwise it searches for Chrome/Chromium on the system.

**Docker / production image:** the server `Dockerfile` installs Debian `chromium` and sets `CHROME_PATH=/usr/bin/chromium` so Lighthouse works when deep-audit env vars are enabled. Local dev without Docker: install Chrome/Chromium or set `CHROME_PATH` to your binary (Playwright’s downloaded Chromium lives under `~/.cache/ms-playwright/` — e.g. `chromium-*/chrome-linux/chrome` on Linux).

See [docs/ARCHITECTURE.md](./ARCHITECTURE.md#open-source-collector-libraries) for library references, Unlighthouse (future), and Context7 IDs.

**Important:** `AUDIT_DEEP_SCAN` affects only the **full audit pipeline** (consultant flow: create audit → start pipeline → phases 1 and 4 run `PerformanceCollector` / `AccessibilityCollector`). It does **not** run during the **public free snapshot** (`POST /api/snapshot/`, logs like `snapshot.run_complete`, `Free snapshot started`). The snapshot scanner uses its own tiered fetch and optional Playwright for the homepage; that is unrelated to Lighthouse/axe in collectors.

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

---

## 5. Verify Setup

1. Open [http://localhost:5173](http://localhost:5173)
2. You should see the Login page
3. Sign in or create an account (email + password or Google) → redirected to Portfolio
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
│       ├── pages/   ← 7 page components
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

1. Supabase migrations applied (at least through `001`; full product features need `001`–`015`)
2. `server/.env` with valid `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. Frontend running: `pnpm dev` ([http://localhost:5173](http://localhost:5173))

### Run the seed script

```bash
cd server
npx ts-node scripts/seed-demo.ts --email your@email.com
```

Use the email you log in with. If you omit `--email`, the audit is tied to a demo user UUID and may not appear in your portfolio until you re-run with your email.

The script is **idempotent** — it replaces the demo audit cleanly on re-run.

### URLs (fixed audit id)

| Page | Path |
|------|------|
| Portfolio | `/portfolio` |
| Pipeline log | `/pipeline/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Audit workspace | `/audit/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Report | `/reports/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Strategy Lab | `/strategy/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |

### Reset

```bash
cd server && npx ts-node scripts/seed-demo.ts --email your@email.com
```

Or delete the row in Supabase `audits` where `company_url = 'https://www.hospitalsonespases.es'` (related rows cascade).
