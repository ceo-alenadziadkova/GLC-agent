# GLC Audit Platform — Product

Consultant-led B2B audits: submit a company URL (plus intake context where applicable); the platform crawls and analyses the public site across business domains and produces a scored report and roadmap-style deliverables.

**Primary users:** Consultants running audits for SMB clients.  
**Client deliverables:** Scored domain findings, executive summary, quick wins, and (full mode) strategy initiatives in Strategy Lab (`/strategy/:id`).

Technical execution details: [PIPELINE.md](./PIPELINE.md), [AGENTS.md](./AGENTS.md). Index of all domains: [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md).

---

## Audit domains

| # | Domain key | What it evaluates |
|---|------------|-------------------|
| 0 | `recon` | Company profile, industry, tech stack, social presence, business model |
| 1 | `tech_infrastructure` | Hosting, frameworks, CDN, dependencies, performance signals |
| 2 | `security_compliance` | SSL, security headers, cookies, CORS |
| 3 | `seo_digital` | Meta tags, sitemap, robots.txt, schema, canonical URLs |
| 4 | `ux_conversion` | Structure, navigation, CTAs, mobile, forms, accessibility basics |
| 5 | `marketing_utp` | Positioning, value proposition, messaging, differentiation |
| 6 | `automation_processes` | Integrations, automation gaps, operational efficiency |
| 7 | `strategy` | Cross-domain synthesis, executive summary, prioritised initiatives |

**Auto wing:** phases 1–4 run in parallel (data-driven collectors).  
**Analytic wing:** phases 5–6 run in parallel; they lean on recon plus consultant and interview notes from review gates.  
**Strategy:** phase 7 runs after the analytic wing completes (see [PIPELINE.md](./PIPELINE.md)).

---

## Product modes

Implemented in code (`server/src/types/audit.ts`, `reviewPhasesForMode`, `maxPhaseForMode`):

| Mode | Scope (phases) | Review gates | Notes |
|------|----------------|--------------|--------|
| `full` | 0–7 | After phases `0`, `4`, `7` | Default paid audit; strategy row and final gate |
| `express` | 0–4 | After `0`, `4` | Shorter audit; no phases 5–7 |
| `free_snapshot` | 0 + partial UX (phase 4) | None | Public `POST/GET /api/snapshot`; trimmed preview (e.g. issues and quick wins capped) |

---

## Scoring

- Per-domain score **1–5** with labels (Critical → Excellent). See [AGENTS.md](./AGENTS.md) and domain output schema in code.
- **Overall score** uses industry multipliers: [AGENTS.md#industry-weights](./AGENTS.md#industry-weights).

---

## Pipeline flow (summary)

```
URL (+ intake where required)
    -> Phase 0: Recon
    -> Review gate 1 (phase 0)
    -> Phases 1–4: Auto wing (parallel)
    -> Review gate 2 (phase 4)
    -> Phases 5–6: Analytic wing (parallel) -> Phase 7: Strategy (sequential)
    -> Review gate 3 (phase 7)
    -> Report (/reports/:id) + Strategy Lab (/strategy/:id) when applicable
```

Authoritative sequencing and API interaction: [PIPELINE.md](./PIPELINE.md).

---

## Intake brief

Structured pre-audit responses live in the `intake_brief` table (migration `006_intake_brief.sql`). Schema and RLS: [DATABASE.md](./DATABASE.md).

---

## Design principles

**Data-first, token-smart:** collectors gather evidence without LLM calls; each phase uses a single Claude analysis call. See [PIPELINE.md](./PIPELINE.md).

**Evidence and verification:** outputs are validated (e.g. fact-checker) and should align with collected signals. Implementation: [AGENTS.md](./AGENTS.md).

---

## What the UI delivers

### Audit report (`/reports/:id`)

Executive summary, overall score presentation, domain scorecard, issues and quick wins as implemented in the Report Viewer page.

### Strategy Lab (`/strategy/:id`)

Prioritised initiatives (quick wins, medium term, strategic) for full audits.

---

## Roadmap and future work (product)

Broader report formats (PDF, slides), deeper funnel/sales intelligence, and optional Python-side heavy compute are **not** committed in this repo’s docs beyond high-level notes. Treat feature lists in old concept drafts as **Needs Review** until reflected in code and [API.md](./API.md).

---

## Status

**Needs Review:** “Production deployment” vs “production-ready codebase” depends on your Vercel/Railway/Supabase project state — see [DEPLOYMENT.md](./DEPLOYMENT.md). Core flows are implemented in the monorepo and documented in the canonical technical files above.
