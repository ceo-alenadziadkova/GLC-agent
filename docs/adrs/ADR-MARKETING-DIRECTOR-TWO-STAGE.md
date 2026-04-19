# ADR: Marketing Director — Two-Stage Marketing Audit (Baseline → Deep Zones)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Marketing domain (`marketing_utp`) + optional Marketing Director deep audit zones |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Cross-domain pattern: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- Human-readable marketing orchestration canon: `docs/instructions/CMO-INSTRUCTIONS.md`

### ADR lifecycle

This ADR is immutable as a decision record. If the marketing Director contract changes, publish a new ADR that supersedes this one.

---

## Context

GLC already runs a baseline marketing audit via the pipeline domain `marketing_utp` using the domain prompt `server/prompts/marketing_utp.md` and structured `DomainOutputSchema`.

Separately, we maintain a richer marketing orchestration instruction set in `docs/instructions/CMO-INSTRUCTIONS.md` (CMO Director + many sub-agents). That instruction set is valuable but must not be executed for every client by default because it is heavy and expensive.

We need a product-consistent approach:

1. Every client gets a fast, credible baseline marketing diagnosis.
2. Clients who want deeper work opt into specific marketing focus areas ("zones").
3. Deep work consumes additional compute only for selected zones.
4. Deep work must reuse baseline outputs + intake + recon + collectors, and must remain evidence-aware.

---

## Decision

We implement Marketing as a **two-stage** system aligned with the cross-domain Director pattern:

### Stage 1 — Baseline Marketing Audit (default)

- **What runs**: existing `marketing_utp` pipeline phase (single Claude call + collectors + fact-check path as today).
- **Purpose**: produce a concise marketing overview suitable for client comprehension and consultant triage.
- **Output**: standard domain structured output (`DomainOutputSchema`) plus any existing persisted domain row artifacts.

### Stage 2 — Marketing Director Deep Audit (optional)

- **What runs**: a separate explicit action that orchestrates deep marketing zones selected by the client.
- **Purpose**: produce implementation-grade marketing strategy and assets only for chosen zones.
- **Input**: Stage 1 outputs + full consolidated client context (intake slices, recon, prior domain summaries where relevant) + optional client feedback/corrections.
- **Output**: a dedicated persisted artifact (recommended name: `marketing_director_pack`) separate from the baseline domain row, versioned and rerunnable.

---

## Zone model (client-facing)

Client selects **zones**, not internal agent names.

### Canonical zone catalog (v1)

These zones map to the CMO instruction modules in `CMO-INSTRUCTIONS.md`, but the product surface must remain zone-first:

1. **Market map** (competitive landscape + timing)
2. **Awareness ladder** (stage mapping + transition barriers)
3. **Positioning** (core problem, differentiation, anti-positioning)
4. **Voice & messaging system** (tone, vocabulary, persuasion rules)
5. **Content strategy** (idea backlog mapped to stages/goals)
6. **Viral hooks** (high-share concepts with explicit brand risk labels)
7. **Storytelling** (reusable narrative frameworks)
8. **Channel traffic plan** (hypotheses + measurement)
9. **Distribution system** (repurposing + cadence + amplification)
10. **Personal brand** (only if signals indicate founder-led demand)
11. **Growth loops** (compounding loops + health metrics)
12. **30-day execution plan + risk register + measurement framework** (synthesis block; may be selected as a bundle)

### Zone bundling rules (v1)

- **Synthesis bundle** (30-day plan + risks + metrics) may only run if at least one substantive zone is selected (not standalone by default).
- **Personal brand** zone is conditional on eligibility signals (example signals: founder-led GTM, strong founder visibility in recon, explicit intake signals). If ineligible, it must not appear as selectable.

---

## Orchestration rules

### Default routing

- Stage 1 always runs when marketing is in scope for the audit product mode.
- Stage 2 never runs unless explicitly requested.

### Stage 2 execution model

Stage 2 is implemented as **one orchestrated run** with internal modular steps:

- For each selected zone, produce a zone report with:
  - evidence classification (`Observed` / `Derived` / `Assumed` / `Missing`)
  - confidence per major claim
  - explicit dependencies on other zones (if any)
- End with a **Director synthesis** that resolves conflicts and produces a single coherent strategy.

### Cost and safety controls

- Hard cap on selected zones per run (product default; stored in server config, not inline magic numbers in services).
- If inputs are insufficient for a selected zone, the zone output must be `deferred` with a precise missing-data checklist (no filler).

---

## API contract (proposed, implementation follows)

This ADR defines the contract shape; implementation may adjust paths but must preserve semantics.

### `POST /api/audits/:id/marketing/director/preview`

Purpose: return eligible zones + estimated depth + missing prerequisites.

Response (conceptual):

- `eligible_zones[]`
- `recommended_zones[]` (advisory)
- `blocked_zones[]` + reasons
- `missing_context[]` (high severity gaps)

### `POST /api/audits/:id/marketing/director/run`

Request:

- `selected_zones: string[]`
- `client_feedback?: string` (optional)
- `locale?: 'en' | 'ru' | 'mixed'` (optional)

Response:

- `marketing_director_pack_id`
- `status` (`queued` | `running` | `completed` | `failed`)
- `warnings[]` (non-blocking)

### `GET /api/audits/:id/marketing/director/latest`

Returns latest completed pack for UI rendering.

---

## Persistence model (proposed)

Store Stage 2 output as a versioned JSON document linked to `audit_id`:

- `marketing_director_packs` table (recommended) OR `pipeline_events` typed event (acceptable short-term, but prefer dedicated table for UX querying)

Minimum fields:

- `id`, `audit_id`, `created_at`
- `selected_zones`
- `input_snapshot_hash` (hash of inputs used)
- `pack_json` (structured)
- `status`, `error` (if failed)

---

## Prompting policy

### Stage 1 (baseline)

- Keep `server/prompts/marketing_utp.md` as the baseline audit prompt.
- Must remain aligned with provenance rules already present in the prompt.

### Stage 2 (Director)

- The canonical orchestration rubric is `docs/instructions/CMO-INSTRUCTIONS.md`.
- Implementation MUST chunk Stage 2 into zone modules rather than concatenating the entire instruction file blindly.
- Stage 2 must include a final synthesis step that enforces coherence across zones.

---

## Consequences

### Positive

- Clear separation between "always-on baseline" and "opt-in deep marketing".
- Predictable cost and latency.
- Better client UX: diagnose first, deepen intentionally.
- Reuses existing marketing domain while enabling CMO-grade depth.

### Negative / Risks

- Additional backend orchestration and storage.
- Risk of inconsistent outputs if synthesis is weak or zones conflict.
- Requires careful UI copy so users understand zones vs baseline.

### Mitigations

- Mandatory synthesis step + coherence checks.
- Zone caps + eligibility gating.
- Stable zone IDs and mapping table maintained in code config.

---

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Replace baseline `marketing_utp` with full CMO Director always | Too heavy for default pipeline; harms UX and cost |
| Keep CMO only as external documentation | Does not deliver product value; diverges from server truth |
| Run each CMO module as separate user-triggered jobs without synthesis | Fragmented strategy; weak coherence |

---

## Rollout plan

1. Implement Stage 2 storage + API endpoints behind a feature flag.
2. Ship UI: baseline results + zone picker + run button.
3. Add server tests for: eligibility rules, zone caps, rerun idempotency (hash inputs), and failure modes.
4. Iterate zone catalog based on consultant feedback (requires ADR bump if contract changes).
