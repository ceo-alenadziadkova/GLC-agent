# GLC Audit Platform

AI-powered business audit platform for SMB consulting. Submit a company URL → get a scored, structured audit report across 8 business domains with prioritised recommendations and a transformation roadmap.

## Quick Start

```bash
# 1. Install dependencies
pnpm install
cd server && npm install && cd ..

# 2. Set up environment variables
cp .env.example .env          # fill in Supabase + API URL
cp server/.env.example server/.env  # fill in Supabase service key + Anthropic key

# 3. Run Supabase migrations
# → run server/migrations/001_initial_schema.sql through 007_finding_provenance.sql in order (see docs/DATABASE.md)

# 4. Start dev servers
cd server && npm run dev   # backend on :3001
pnpm dev                   # frontend on :5173
```

See [docs/SETUP.md](./docs/SETUP.md) for full setup guide.

## What It Does

A consultant submits a client's URL. The platform:

1. **Crawls** the website (no AI — programmatic scraping)
2. **Analyses** across 8 domains using Claude AI
3. **Produces** a scored report + strategic roadmap

### 8 Audit Domains

| Phase | Domain | What's Evaluated |
|---|---|---|
| 0 | Recon | Company profile, tech stack, social presence |
| 1 | Tech Infrastructure | Hosting, frameworks, CDN, performance |
| 2 | Security & Compliance | SSL, security headers, CORS, cookies |
| 3 | SEO & Digital | Meta tags, sitemap, schema markup |
| 4 | UX & Conversion | Navigation, CTAs, mobile, accessibility |
| 5 | Marketing & UTP | Positioning, messaging, differentiation |
| 6 | Automation & Processes | Integrations, operational gaps |
| 7 | Strategy | Cross-domain synthesis + roadmap |

## Tech Stack

| Layer | Technology | Deploy |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Vercel |
| Backend | Node.js + Express + TypeScript | Railway |
| Database | Supabase PostgreSQL | Supabase Cloud (EU) |
| Auth | Supabase Auth (magic link + Google) | Supabase Cloud |
| Realtime | Supabase Realtime | Supabase Cloud |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) | via Backend |

## Documentation

Flat `docs/` folder (**12 files**). Start here:

| Doc | Contents |
| --- | --- |
| [docs/MASTER.md](./docs/MASTER.md) | Master index, knowledge domains, governance, PR checklist |
| [docs/PRODUCT.md](./docs/PRODUCT.md) | Product overview, modes, deliverables |
| [docs/SETUP.md](./docs/SETUP.md) | Local development, migrations, demo seed |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Full-stack architecture + data flow |
| [docs/DATABASE.md](./docs/DATABASE.md) | Schema, migrations, RLS overview |
| [docs/API.md](./docs/API.md) | REST endpoints |
| [docs/PIPELINE.md](./docs/PIPELINE.md) | Phases, parallel wings, review gates |
| [docs/AGENTS.md](./docs/AGENTS.md) | AI agents, collectors, fact-checker |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | React pages, hooks, routing, design system (style guide) |
| [docs/AUTH.md](./docs/AUTH.md) | Authentication flow |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Vercel + Railway + Supabase deploy |
| [docs/SECURITY.md](./docs/SECURITY.md) | Threat model, rate limits, CORS, GDPR |

## Key Design Principle

**Data-First, Token-Smart:** each phase runs collectors (no AI), then assembles context, then makes a single Claude call. Claude analyses and scores — it doesn't collect. This minimises API costs and makes results verifiable.

## Project Structure

```
/                    ← Frontend (React + Vite)
├── src/app/
│   ├── pages/       ← 7 pages
│   ├── hooks/       ← useAuth, useAudit, usePipeline, useAudits
│   ├── data/        ← apiService.ts, auditTypes.ts
│   ├── lib/         ← supabase.ts
│   └── components/  ← AppShell, ProtectedRoute, ReviewPointModal
├── docs/            ← Documentation-index (MASTER.md)
server/              ← Backend (Express + TypeScript)
├── src/
│   ├── agents/      ← Pipeline agents + BaseAgent
│   ├── collectors/  ← Data collectors (no AI)
│   ├── services/    ← Pipeline, context builder, fact-checker
│   ├── routes/      ← Express route handlers
│   └── middleware/  ← Auth, rate-limit
└── migrations/      ← SQL migrations (001–007)
```
