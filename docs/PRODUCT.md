# GLC Audit Platform — Product

Consultant-led B2B audits: submit a company URL (plus intake context where applicable); the platform crawls and analyses the public site across business domains and produces a scored report and roadmap-style deliverables.

**Primary users:** Consultants running audits for SMB clients.  
**Client deliverables:** Scored domain findings, executive summary, quick wins, and (full mode) strategy initiatives in Strategy Lab (`/strategy/:id`).

Technical execution details: [PIPELINE.md](./PIPELINE.md), [AGENTS.md](./AGENTS.md). Index of all domains: [MASTER.md](./MASTER.md).

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

### Intake Experience (progressive model)

**Golden loop:** each information level unlocks more value in the audit. Same canonical brief; questions are grouped into layers and surfaced progressively (legacy flat list ~25 items maps to layers with typed fields: select, multi-select, rating, textarea, confirm).

| Layer | Goal | Time | Product tie-in | Example nudge (copy evolves in UX) |
|---|---|---|---|---|
| `0` | URL-only entry; immediate "wow" | ~10 s | Free UX Snapshot entry | Surface a few findings; invite short context so precision improves. |
| `1` | Quick Intake — required (red) + a few key recommended (yellow) | 10–12 min | Express / pre-brief backbone | After Express path: note domains that still lack inside-out context (e.g. marketing, automation). |
| `2` | Deep Intake — remaining recommended + optional (green) | 15–20 min | Full Audit readiness | Data Quality meter shows progress toward full context. |
| `3` | Post-audit enrichment | async (agents) | Follow-up, not generic FAQ | From `unknown_items[]`, generate **specific** follow-ups (e.g. missing CRM signal → "Which CRM, if any?"). |

Core UX contract:
- Server computes and returns intake derived state (`progress_pct`, `readiness_badge`, `next_best_action`, data-quality style signals where implemented); frontend renders it.
- `responses_format` is versioned for backward compatibility (`1` legacy, `2` structured `{ value, source }` responses).
- Progress/readiness UI stays B2B: plain text, icons, and color semantics (no emoji in intake/report interface code).
- **Principles:** progress bar; Data Quality meter; light gamification / micro-milestones; guilt-free "Don't know"; recon-based prefills with confirm ("We detected WordPress — correct?"); prefer selects over free text where possible; short examples next to textareas.

### Intake collection modes

One canonical question bank backs every intake path; **`collection_mode`** (`self_serve` | `interview` | `pre_brief`) and **`collected_by`** (`client` | `consultant`) describe *how* answers were captured.

**Entry-point grid (product framing):** combine **URL vs. discovery** with **self-serve vs. consultant-led**:

| | Self-serve (client) | Consultant-led (interview) |
|--|--------------------|---------------------------|
| **URL present** | Mode A — wizard on live site | Mode B — live capture against the same fields |
| **No website yet** | Mode C — discovery intake (deferred sprint: `product_mode: 'discovery'`, dedicated flow) | Mode C with consultant as primary recorder |

`pre_brief` links sit on the self-serve row: short answer set before a call, same canonical fields.

Record **`collected_by`:** `client` | `consultant` so exports and quality analytics stay honest.

**Benchmark / assumption integrity (for any displayed comparative or revenue-adjacent metrics):** treat source tiers in strict order of trust — **`client_calculated`** (or client-provided with method) **>** **`glc_internal`** (measured in-platform) **>** **`verified_research`** (third-party with citation) **>** **`industry_estimate`**. If material conclusions rest on `industry_estimate` or lower, the UI or report must carry an explicit disclaimer that figures are indicative, not audited facts.

### Pre-brief (link before a meeting)

Short path (~6 questions, ~5 minutes) with a **custom link** sent ahead of a call. Goal: consultant arrives prepared; recon can crawl the site before the meeting. Same canonical fields as Layer 1 where applicable, scoped to minimum viable context.

### Recon as intake enrichment (Step 1B)

Recon is part of intake enrichment and can prefill detectable fields for confirmation.
For product semantics, "brief before anything else" means "before domain phases", not strictly before recon.

### Product thresholds by mode

- `free_snapshot`: can start with minimal pre-brief context and URL entry (Layer 0).
- `express`: Layer 1 completion for required items; more recommended fields improve readiness and scores confidence.
- `full`: Layer 2 breadth expected; quality gate aligns with answered required/recommended mix (see pipeline and validation in code).

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
