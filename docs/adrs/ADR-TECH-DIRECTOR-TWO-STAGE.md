# ADR: Tech Director — Two-Stage Technical Audit (Baseline → Deep Zones)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Technical domain (`tech_infrastructure`) + optional Tech Director deep audit zones |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Cross-domain pattern: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- CTO orchestration canon (prioritization, dependencies, trade-offs, failure modes): `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`
- Baseline tech domain prompt: `server/prompts/tech_infrastructure.md`

### ADR lifecycle

This ADR is immutable as a decision record. If the Tech Director contract changes, publish a new ADR that supersedes this one.

---

## Context

GLC already runs a baseline technical audit via the pipeline domain `tech_infrastructure` using `server/prompts/tech_infrastructure.md`, backed by collectors (crawl + performance signals) and the structured `DomainOutputSchema`.

We also defined a CTO-grade orchestration contract in `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md` that is substantially deeper than a single baseline domain call.

We need a product-consistent approach:

1. Every eligible client receives a fast, evidence-grounded baseline technical diagnosis.
2. Clients who want deeper technical planning opt into specific technical focus areas ("zones").
3. Deep work consumes additional compute only for selected zones.
4. Deep work must respect access levels:
   - **Zero/low access** clients still receive valuable architecture and build-vs-buy guidance, but with explicit uncertainty.
   - **Deep access** clients receive precise bottleneck identification and implementation sequencing.

---

## Decision

We implement Technical auditing as a **two-stage** system aligned with the cross-domain Director pattern:

### Stage 1 — Baseline Technical Audit (default)

- **What runs**: existing `tech_infrastructure` pipeline phase (single Claude call + collectors + fact-check path as today).
- **Purpose**: produce a concise technical overview grounded in observable signals.
- **Output**: standard domain structured output (`DomainOutputSchema`) persisted as today.

### Stage 2 — Tech Director Deep Audit (optional)

- **What runs**: a separate explicit action orchestrating deep technical zones selected by the client (and/or consultant).
- **Purpose**: produce execution-grade technical strategy: architecture paths, build-vs-buy, prioritization, dependency graph, trade-offs, failure modes, observability and reliability plans — scoped to selected zones.
- **Input**: Stage 1 outputs + consolidated context (intake slices, recon, collectors, optional deep access artifacts) + optional feedback/corrections.
- **Output**: dedicated persisted artifact (recommended name: `tech_director_pack`), versioned and rerunnable.

---

## Zone model (client-facing)

Client selects **zones**, not internal agent names.

### Canonical zone catalog (v1)

These zones map to the CTO orchestration modules in `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`, but the product surface must remain zone-first:

1. **Architecture & boundaries** (system map, coupling, anti-patterns)
2. **Scalability & load** (capacity, bottlenecks, scaling strategy)
3. **Performance** (latency, web perf, critical path, budgets)
4. **Reliability & resilience** (uptime, fault tolerance, retries/fallback)
5. **APIs & integrations** (external dependencies, contract risks)
6. **Data layer** (only if deep access signals justify it; otherwise hypothesis mode)
7. **Codebase governance** (structure/standards/tech debt — deep access preferred)
8. **Developer experience** (CI/CD, release velocity, onboarding friction — deep access preferred)
9. **Observability** (logs/metrics/tracing/alerts maturity)
10. **Infra cost optimization** (cost drivers, waste, trade-offs)
11. **Solution discovery & build-vs-buy** (market tool shortlists + recipes + migration triggers)
12. **Synthesis bundle** (priority engine + dependency graph + 30-day plan + risk register + SLO framework)

### Zone gating rules (v1)

- **Data layer / Codebase governance / Dev experience** default to `hypothesis` mode unless `deep_access` is available.
- **Synthesis bundle** may only run if at least one substantive zone is selected (not standalone by default).
- If `no public website` path applies, Stage 2 must still provide technical execution paths that do not reduce to "build a website only" (align with product policy for no-site clients).

---

## Orchestration rules

### Default routing

- Stage 1 runs when technical domain is in scope for the audit product mode.
- Stage 2 never runs unless explicitly requested.

### Stage 2 execution model

Stage 2 is implemented as **one orchestrated run** with internal modular steps:

- For each selected zone, produce a zone report with:
  - evidence classification (`Observed` / `Derived` / `Assumed` / `Missing`)
  - confidence per major claim
  - explicit dependencies on other zones (if any)
- End with a **Tech Director synthesis** that:
  - resolves conflicts across zones,
  - emits the mandatory CTO outputs: prioritization engine, dependency graph, trade-offs, failure modes, constraints compliance.

### Mandatory outputs (Stage 2)

Aligned with `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`:

- priority-scored actions (7-day top 3 + 30-day top 5)
- dependency map (parallel vs sequential; critical path)
- trade-off blocks per major option (why wins / why not / breaks when)
- failure scenarios (scale/concurrency/vendor outage/key-person)
- build-vs-buy matrix for relevant components

---

## API contract (proposed, implementation follows)

### `POST /api/audits/:id/tech/director/preview`

Returns eligible zones, recommended zones, blocked zones, and missing prerequisites.

### `POST /api/audits/:id/tech/director/run`

Request:

- `selected_zones: string[]`
- `access_level: 'zero' | 'partial' | 'deep'` (server may infer, but client/consultant can confirm)
- `client_feedback?: string`

Response:

- `tech_director_pack_id`
- `status`

### `GET /api/audits/:id/tech/director/latest`

Returns latest completed pack.

---

## Persistence model (proposed)

Store Stage 2 output as a versioned JSON document linked to `audit_id`:

- `tech_director_packs` table (recommended) OR typed `pipeline_events` (short-term)

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

- Keep `server/prompts/tech_infrastructure.md` as the baseline audit prompt.
- Preserve provenance rules already defined in the prompt.

### Stage 2 (Director)

- The canonical orchestration rubric is `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`.
- Implementation MUST chunk Stage 2 into zone modules rather than dumping the full CTO rubric as one prompt.
- Stage 2 must include a final synthesis step enforcing CTO output contracts.

---

## Consequences

### Positive

- Symmetry with marketing: consistent "baseline → deep" UX across domains.
- Cost control: deep technical work is opt-in and zone-scoped.
- Better founder-level decisions: explicit trade-offs and failure modes.

### Negative / Risks

- Additional orchestration complexity and storage.
- Without deep access, some zones risk sounding overly confident unless gating is strict.

### Mitigations

- Enforce access-aware zone modes (`observed` vs `hypothesis`).
- Mandatory synthesis + explicit missing-data gates.

---

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Replace baseline `tech_infrastructure` with full CTO Director always | Too heavy; breaks default pipeline economics |
| Keep CTO only as documentation | Does not ship product value |
| Separate ad-hoc "consulting prompts" per client | Not reproducible; breaks consistency |

---

## Rollout plan

1. Implement Stage 2 storage + API endpoints behind a feature flag.
2. Ship UI: baseline tech results + zone picker + run button.
3. Add tests for: zone eligibility, access gating, zone caps, rerun idempotency (input hash), and failure modes.
4. Iterate zone catalog based on consultant feedback (requires ADR bump if contract changes).
