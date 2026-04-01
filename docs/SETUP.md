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

# Frontend dependencies
pnpm install

# Backend dependencies
cd server && npm install && cd ..
```

---

## 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run **all** migrations in order (see [DATABASE.md](./DATABASE.md#overview)):
   - `001_initial_schema.sql` through `012_profiles_trigger_auth_admin.sql`
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
```

> The frontend uses the anon key (safe to expose). The backend uses the service role key (bypasses RLS for server-side operations — never expose to client).

---

## 4. Run Locally

```bash
# Terminal 1 — backend
cd server && npm run dev

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
3. Enter your email → magic link sent → click link → redirected to Portfolio
4. Click "New Audit" → enter a URL → submit → redirected to PipelineMonitor
5. PipelineMonitor should show Phase 0 starting (Recon crawl)

If Phase 0 fails: check `server/.env` has valid Anthropic + Supabase keys, and Supabase tables exist.

---

## TypeScript

```bash
# Check frontend types
pnpm tsc --noEmit

# Check backend types
cd server && npx tsc --noEmit
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
├── docs/            ← All documentation (index: MASTER_DOCUMENTATION.md)
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

1. Supabase migrations applied (at least through `001`; full product features need `001`–`012`)
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
