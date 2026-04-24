# ADR: CDO Director — Two-Stage UX & Conversion Audit (Baseline → Deep Zones)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | UX & conversion domain (`ux_conversion`) + optional CDO Director deep audit zones |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Cross-domain pattern: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- Human-readable CDO orchestration canon: `docs/instructions/CDO-INSTRUCTIONS.md`
- Baseline UX domain prompt: `server/prompts/ux_conversion.md`

### ADR lifecycle

This ADR is immutable as a decision record. If the CDO Director contract changes, publish a new ADR that supersedes this one.

---

## Context

GLC already runs a baseline UX audit via the pipeline domain `ux_conversion` using `server/prompts/ux_conversion.md`, backed by collectors (crawl + accessibility/UX signals) and structured `DomainOutputSchema`.

We also need a deeper conversion layer that:

- treats UX as **conversion economics** (revenue and retention outcomes), not aesthetics,
- supports JTBD + behavioral diagnosis,
- supports access-aware operation (no analytics vs deep analytics),
- remains optional and cost-controlled.

This must align with the cross-domain Director pattern already adopted for marketing and technical domains.

---

## Decision

We implement UX & conversion as a **two-stage** system:

### Stage 1 — Baseline UX & Conversion Audit (default)

- **What runs**: existing `ux_conversion` pipeline phase (single Claude call + collectors + fact-check path as today).
- **Purpose**: fast, evidence-grounded UX and conversion-path diagnosis from available crawl + accessibility + form/CTA signals + intake slices.
- **Output**: standard domain structured output (`DomainOutputSchema`) persisted as today.

### Stage 2 — CDO Director Deep Audit (optional)

- **What runs**: a separate explicit action orchestrating deep UX/CRO zones selected by the client (and/or consultant).
- **Purpose**: produce implementation-grade conversion strategy: funnel redesign options, decision-point interventions, experimentation backlog, analytics instrumentation plan, and conversion economics framing — scoped to selected zones.
- **Input**: Stage 1 outputs + consolidated context (intake slices, recon, prior domain summaries where relevant) + optional client feedback + optional analytics artifacts when access exists.
- **Output**: dedicated persisted artifact (recommended name: `cdo_director_pack`), versioned and rerunnable.

---

## Zone model (client-facing)

Client selects **zones**, not internal agent names.

### Canonical zone catalog (v1)

These zones map to modules in `docs/instructions/CDO-INSTRUCTIONS.md`:

1. User intent / JTBD
2. Funnel architecture
3. Value proposition clarity
4. Friction & cognitive load
5. Trust & credibility
6. Behavioral psychology (ethical)
7. UI consistency & usability patterns
8. Copy & microcopy
9. Experimentation backlog
10. Analytics & tracking
11. Benchmark patterns
12. Synthesis bundle (priority engine + dependency graph + 30-day plan + risks + metrics)

### Zone gating rules (v1)

- Zones **9–10** default to `hypothesis` / `instrumentation-plan` mode in `zero_access`.
- In `deep_access`, zones **9–10** can run with quantitative drop-off analysis when data exists.
- **Synthesis bundle** may only run if at least one substantive zone is selected (not standalone by default).

---

## Orchestration rules

### Default routing

- Stage 1 runs when UX domain is in scope for the audit product mode.
- Stage 2 never runs unless explicitly requested.

### Stage 2 execution model

Stage 2 is implemented as **one orchestrated run** with internal modular steps:

- For each selected zone, produce a zone report with:
  - evidence classification (`Observed` / `Derived` / `Assumed` / `Missing`)
  - confidence per major claim
  - explicit dependencies on other zones (if any)
- End with a **CDO Director synthesis** that resolves conflicts and produces a coherent conversion system.

### Mandatory outputs (Stage 2)

Aligned with `docs/instructions/CDO-INSTRUCTIONS.md`:

- prioritized actions (7-day top 3 + 30-day top 5) with explicit scoring
- dependency graph (parallel vs sequential; critical path)
- trade-off blocks per major option
- conversion economics framing with sensitivity and disclaimers (no fabricated financial precision)
- experimentation backlog and metrics framework

---

## API contract (proposed, implementation follows)

### `POST /api/audits/:id/ux/director/preview`

Returns eligible zones, recommended zones, blocked zones, and missing prerequisites.

### `POST /api/audits/:id/ux/director/run`

Request:

- `selected_zones: string[]`
- `access_level: 'zero' | 'partial' | 'deep'` (server may infer; client/consultant can confirm)
- `client_feedback?: string`

Response:

- `cdo_director_pack_id`
- `status`

### `GET /api/audits/:id/ux/director/latest`

Returns latest completed pack.

---

## Persistence model (proposed)

Store Stage 2 output as a versioned JSON document linked to `audit_id`:

- `cdo_director_packs` table (recommended) OR typed `pipeline_events` (short-term)

Minimum fields:

- `id`, `audit_id`, `created_at`
- `selected_zones`
- `access_level`
- `input_snapshot_hash`
- `pack_json`
- `status`, `error`

---

## Prompting policy

### Stage 1 (baseline)

- Keep `server/prompts/ux_conversion.md` as the baseline audit prompt.

### Stage 2 (Director)

- The canonical orchestration rubric is `docs/instructions/CDO-INSTRUCTIONS.md`.
- Implementation MUST chunk Stage 2 into zone modules rather than dumping the full CDO rubric as one prompt.
- Stage 2 must include a final synthesis step enforcing CDO output contracts.

---

## Consequences

### Positive

- Consistent product architecture with marketing/tech Director layers.
- Better conversion outcomes focus without forcing every client through maximal depth.
- Clear separation between crawl-based UX diagnosis and deep CRO strategy.

### Negative / Risks

- Additional orchestration complexity and storage.
- Risk of over-claiming uplift without disciplined economics disclaimers.

### Mitigations

- Mandatory evidence map + confidence discipline.
- Conversion economics must use ranges and sensitivity, not fake precision.

---

## Rollout plan

1. Implement Stage 2 storage + API endpoints behind a feature flag.
2. Ship UI: baseline UX results + zone picker + run button.
3. Add tests for: zone eligibility, access gating, zone caps, rerun idempotency (input hash), and failure modes.
4. Iterate zone catalog based on consultant feedback (requires ADR bump if contract changes).
