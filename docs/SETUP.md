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
2. In the SQL Editor, run `server/migrations/001_initial_schema.sql`
3. Note your project URL and anon key (Project Settings → API)
4. Note your service role key (same page — keep secret)

The migration creates all 6 tables with RLS policies. See [DATABASE.md](./DATABASE.md).

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

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Vite proxies `/api/*` requests to the backend automatically (configured in `vite.config.ts`)

---

## 5. Verify Setup

1. Open http://localhost:5173
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

```
/                    ← Frontend (React + Vite)
├── src/
│   └── app/
│       ├── pages/   ← 7 page components
│       ├── hooks/   ← useAuth, useAudit, usePipeline, useAudits
│       ├── data/    ← auditTypes.ts, apiService.ts
│       ├── lib/     ← supabase.ts client
│       └── components/
├── docs/            ← All documentation
server/              ← Backend (Express + TypeScript)
├── src/
│   ├── agents/      ← 8 domain agents + BaseAgent
│   ├── collectors/  ← Data collectors (no AI)
│   ├── services/    ← Pipeline, context builder, fact-checker
│   ├── routes/      ← Express route handlers
│   ├── middleware/  ← Auth, rate-limit
│   └── config/      ← Industry weights
└── migrations/      ← SQL migration files
```
