# Demo — Hospital Universitari Son Espases

A complete simulated audit for a real Mallorcan public hospital, so you can demo all UI pages without running the AI pipeline.

**Client:** Hospital Universitari Son Espases, Palma de Mallorca
**Industry:** Healthcare
**Overall score:** 2.2 / 5 (Needs Work) — healthcare-weighted
**Scope:** All 8 phases, 3 review gates, full strategy roadmap

> ⚠️ **SIMULATED EVALUATION** — Data is based on a surface-level review of the public website. Items marked [estimated] are representative patterns, not results of a complete programmatic crawl.

---

## Prerequisites

1. Supabase project set up and `server/migrations/001_initial_schema.sql` applied
2. `server/.env` contains valid `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. Frontend running: `pnpm dev` (http://localhost:5173)

---

## Step 1 — Run the Seed Script

```bash
cd server
npx ts-node scripts/seed-demo.ts --email your@email.com
```

Replace `your@email.com` with the email you use to log into the app.

**If you haven't registered yet**, omit `--email` — the audit will be inserted with a demo user UUID. It will appear in the API (service role bypasses RLS) but not in the UI unless logged in as that user. Register first, then re-run with `--email`.

The script is **idempotent** — running it again deletes and re-inserts the demo audit cleanly.

---

## Step 2 — Open the Demo

The script prints the exact URLs. You can also navigate manually:

| Page | URL |
|---|---|
| Portfolio | `/portfolio` |
| Pipeline log | `/pipeline/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Audit Workspace | `/audit/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Report Viewer | `/reports/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |
| Strategy Lab | `/strategy/b1a2c3d4-e5f6-7890-abcd-ef1234567890` |

The audit ID is fixed: `b1a2c3d4-e5f6-7890-abcd-ef1234567890`

---

## What the Demo Shows

### Portfolio
- One completed audit: "Hospital Universitari Son Espases"
- Status: completed · Score: 2.2 · Industry: Healthcare · Date: March 2026

### Pipeline Monitor
- Complete phase history: 8 phases + 3 review gates
- Token usage per phase (total: 142,800 / 200,000)
- Review notes from consultant and client interview visible in Gate 2

### Audit Workspace (6 domain tabs)

| Domain | Score | Key Finding |
|---|---|---|
| Tech Infrastructure | 2 | No CDN, no HTTP/2, outdated WordPress |
| Security & Compliance | 3 | SSL ✅ HSTS ✅ but missing CSP + X-Frame-Options |
| SEO & Digital | 2 | No JSON-LD schema, no hreflang for es/ca |
| UX & Conversion | 2 | CTA buried, IBSALUT portal friction, accessibility gaps |
| Marketing & Positioning | 2 | No value proposition, IdISBa research invisible |
| Automation & Processes | 2 | PDF forms, no patient portal, no wait-time display |

### Report Viewer
- Animated score ring: 2.2
- Executive summary
- Healthcare-weighted scorecard
- All issues across domains aggregated

### Strategy Lab
- **Quick Wins** (5 items): JSON-LD schema, security headers, CTA fix, meta descriptions, Cloudflare CDN
- **Core Growth** (4 items): hreflang, WCAG 2.1 AA audit, GDPR cookies, form digitalisation
- **Strategic** (3 items): IBSALUT-integrated appointment widget, IdISBa microsite, managed hosting migration

---

## Reset / Remove Demo

```bash
# Re-seed (replaces existing)
cd server && npx ts-node scripts/seed-demo.ts --email your@email.com

# Or delete via Supabase dashboard:
# audits table → delete row where company_url = 'https://www.hospitalsonespases.es'
# All related rows cascade-delete automatically.
```
