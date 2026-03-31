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
2. In SQL Editor → run **all** SQL migrations in order (`001` … `007`); see [DATABASE.md](./DATABASE.md#overview)
3. Authentication → Settings:
   - Set **Site URL** to your production frontend URL
   - Add **Redirect URLs**: `https://your-app.vercel.app/**`
4. Authentication → Providers:
   - Enable **Email** (magic link is enabled by default)
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
   ```
   PORT=3001
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   NODE_ENV=production
   ```
5. Build command: `npm run build`
6. Start command: `npm start` (runs compiled `dist/index.js`)
7. Railway provides a public URL like `https://glc-api.up.railway.app`

**Healthcheck:** Railway pings `/` — ensure Express responds with `200`.

---

## Vercel (Frontend)

1. Create account at [vercel.com](https://vercel.com)
2. New Project → Import GitHub repo
3. Vercel auto-detects Vite — no changes needed to build settings
4. Set environment variables in Vercel dashboard (Settings → Environment Variables):
   ```
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

- [ ] Run `server/migrations/001_initial_schema.sql` in Supabase SQL editor
- [ ] RLS policies active (check in Supabase → Table Editor → each table)
- [ ] Supabase Site URL + Redirect URLs updated to production domain
- [ ] Google OAuth configured in Supabase (if using)
- [ ] All env vars set in Railway and Vercel
- [ ] `ALLOWED_ORIGINS` in Railway matches Vercel domain
- [ ] Backend `/` healthcheck returns 200
- [ ] Test: magic link email delivery (check Supabase Auth logs)
- [ ] Test: create audit end-to-end in production

---

## Monitoring

- **Railway** → built-in logs + metrics (CPU/memory). Set up email alerts for error spikes.
- **Supabase** → database logs, auth logs, Realtime connection counts.
- **Vercel** → deployment logs, function logs (if any).
- **Anthropic** → usage dashboard for token tracking and cost.
