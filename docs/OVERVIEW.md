# GLC Audit Platform — Product Overview

## What It Does

An AI-powered business audit platform for SMB consulting. A consultant submits a company URL; the platform crawls the public website, runs analysis across 8 business domains, and produces a structured report with prioritised recommendations and a transformation roadmap.

**Primary users:** Business consultants running audits for SMB clients.
**Client deliverable:** A scored audit report with executive summary, domain-by-domain findings, quick wins, and a strategic roadmap.

---

## The 8 Audit Domains

| # | Domain Key | What It Evaluates |
|---|---|---|
| 0 | `recon` | Company profile, industry, tech stack, social presence, business model |
| 1 | `tech_infrastructure` | Hosting, frameworks, CDN, dependencies, performance signals |
| 2 | `security_compliance` | SSL, security headers (CSP, HSTS, X-Frame), cookies, CORS |
| 3 | `seo_digital` | Meta tags, sitemap, robots.txt, schema markup, canonical URLs |
| 4 | `ux_conversion` | Page structure, navigation, CTAs, mobile viewport, forms |
| 5 | `marketing_utp` | Positioning, value proposition, messaging, competitive differentiation |
| 6 | `automation_processes` | Existing integrations, automation gaps, operational efficiency |
| 7 | `strategy` | Cross-domain synthesis → executive summary + prioritised roadmap |

Domains 1–4 are **Auto Wing** (data-driven, run automatically).
Domains 5–6 are **Analytic Wing** (context-dependent, rely on interview notes).
Domain 7 is **Strategy** (synthesises all preceding phases).

---

## Scoring

- Each domain gets a score **1–5** with a label:
  - 1 = Critical · 2 = Needs Work · 3 = Moderate · 4 = Good · 5 = Excellent
- **Overall score** = weighted average of domain scores using industry multipliers.
  - Example: Hospitality weights UX/SEO higher; Healthcare weights Security higher.
  - See [AGENTS.md#industry-weights](./AGENTS.md#industry-weights) for weight tables.
- Score 1–5 (not 0–100) keeps it consultant-readable and avoids false precision.

---

## Pipeline Flow

```
URL submitted
    ↓
Phase 0: Recon (site crawl → company profile)
    ↓
[Review Gate 1] — consultant adds notes, client interview answers
    ↓
Phases 1–4: Auto Wing (tech, security, SEO, UX)
    ↓
[Review Gate 2] — consultant enrichment before analytic phases
    ↓
Phases 5–6: Analytic Wing (marketing, automation)
    ↓
Phase 7: Strategy synthesis
    ↓
[Review Gate 3] — final sign-off before report delivery
    ↓
Report available (/reports/:id) + Strategy Lab (/strategy/:id)
```

Full pipeline details: [PIPELINE.md](./PIPELINE.md)

---

## Core Design Principle: Data-First, Token-Smart

Each phase runs in 3 steps:
1. **Collect** (no AI) — programmatic scraping and analysis via collectors
2. **Assemble context** — compile collected data + previous results + review notes into a briefing
3. **One Claude call** — Claude analyses and scores; does not collect

This minimises API costs and makes results verifiable. See [PIPELINE.md](./PIPELINE.md).

---

## What Gets Delivered

### Audit Report (`/reports/:id`)
- Executive summary (AI-generated, consultant-reviewed)
- Animated score ring showing overall score
- Domain scorecard with individual scores
- Key strengths and critical issues
- Quick wins list

### Strategy Lab (`/strategy/:id`)
- Prioritised initiatives in 3 timeframes:
  - **Quick Wins** — ≤1 week, €0–500
  - **Core Growth** — 1–3 months, €1K–6K
  - **Strategic** — 3–6 months, €6K–20K
- Effort mix visualisation
- "Generate Roadmap" export (future feature)

---

## Status

**Production-ready MVP.** All 8 phases implemented, frontend connected to live backend, authentication and RLS in place.

Not yet deployed to production infrastructure. See [DEPLOYMENT.md](./DEPLOYMENT.md).
