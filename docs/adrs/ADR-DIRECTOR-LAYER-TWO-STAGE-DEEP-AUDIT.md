# ADR: Director Layer with Two-Stage Deep Audit Across All Domains

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Cross-domain orchestration pattern for extended audits (`tech_infrastructure`, `security_compliance`, `seo_digital`, `ux_conversion`, `marketing_utp`, `automation_processes`, and future domains) |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### ADR lifecycle

This ADR is an architectural decision record. The decision is immutable. If the model changes, publish a new ADR that supersedes this one.

---

## Context

GLC already provides baseline domain audits through the core pipeline. These baseline audits are valuable for quick diagnosis, but they are intentionally compact and standardized.

For many clients, a second layer is needed:

- deeper strategy and implementation guidance,
- selective focus on specific problem areas,
- context-aware recommendations after the client sees the initial results,
- optional consultant-led enrichment (repo/infra/business context where available).

At the same time, we must avoid:

- running heavy prompt orchestration for every client by default,
- forcing all users through maximal-depth analysis,
- overloading users with extra mandatory questionnaires.

The product direction is to make this approach consistent across all domains, not only marketing.

---

## Decision

We adopt a **Director Layer pattern** for all current and future spheres/domains.

The pattern is mandatory and consists of two stages.

### Stage 1: Baseline Overview (always-first)

Run the existing standard domain audit flow and produce a concise overview:

- current state,
- key weaknesses/risks,
- confidence and missing data,
- high-level opportunities.

Purpose: give the client fast situational clarity with low interaction cost.

### Stage 2: Director Deep Audit (on-demand)

Only after Stage 1, allow an optional deep run controlled by a domain Director.

The client selects **audit zones** (not internal "agent" terminology).  
Each selected zone triggers targeted deep analysis and implementation strategy.

Purpose: provide detailed, execution-ready guidance only where the client wants deeper work.

---

## Core principles (apply to every Director)

1. **Two-stage flow is required**
   - No direct jump to full deep orchestration by default.
   - Stage 2 requires explicit client opt-in.

2. **Zones over agent exposure**
   - UI and API contracts use "zones" / "focus areas".
   - Internal sub-agent orchestration is implementation detail.

3. **Incremental depth**
   - Deep analysis runs only for selected zones.
   - Unselected zones are not executed.

4. **Evidence-first**
   - Stage 2 must reuse Stage 1 context, intake answers, and collected signals.
   - Uncertainty must remain explicit (observed/derived/assumed/missing).

5. **No mandatory questionnaire expansion**
   - Existing intake baseline remains primary source.
   - Additional clarifications are optional and targeted.

6. **Execution over narrative**
   - Deep outputs must include actionable plan, dependencies, and measurable outcomes.

---

## Domain-agnostic Director contract

Each domain Director MUST implement:

1. **Overview-to-Deep Handoff**
   - consume baseline overview artifacts,
   - ingest client feedback/corrections,
   - preserve context continuity.

2. **Zone Selection Contract**
   - list available zones with plain-language descriptions,
   - accept selected zones as input,
   - execute only selected zones.

3. **Prioritized Deep Output**
   - priority-ranked actions,
   - dependency mapping,
   - risk register,
   - metric framework.

4. **Constraint Awareness**
   - recommendations must respect timeline/team/budget realities.

---

## Prototype interpretation

In prototype phase, what we call "agents" are treated as **deep-audit zones** layered on top of the baseline domain audit.

Therefore:

- the baseline domain audit remains the default entry point,
- deep zones are additive and selective,
- zone orchestration is reusable across domains.

---

## Platform implementation rules

### Routing and cost control

- Stage 1 baseline execution remains unchanged in core pipeline.
- Stage 2 Director execution is a separate explicit action.
- No full deep orchestration without zone selection.

### API and UX behavior

- After Stage 1, return:
  - overview summary,
  - suggested zones,
  - prompt for optional deep analysis.
- Stage 2 endpoint accepts:
  - selected zones,
  - optional client feedback,
  - optional extra context.

### Naming and abstraction

- Product-facing: "focus areas" / "audit zones".
- Internal orchestration may use sub-agent architecture.

---

## Consequences

### Positive

- Consistent cross-domain model for scalable product evolution.
- Better UX: clients start simple, then deepen intentionally.
- Lower compute/prompt cost via selective deep execution.
- Higher relevance: deep output reflects explicit client priorities.

### Negative / Risks

- Additional orchestration complexity in backend services.
- Need for robust handoff artifacts between Stage 1 and Stage 2.
- Risk of fragmented outputs if zone dependencies are not controlled.

### Mitigations

- Enforce standardized Director input/output contracts.
- Require dependency and coherence checks in Stage 2 synthesis.
- Keep zone taxonomies stable and documented per domain.

---

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Always run full deep orchestration | Too expensive, too slow, unnecessary for many clients |
| Keep only one-stage baseline audit | Insufficient for clients needing implementation-grade strategy |
| Separate custom flow per domain with no shared pattern | Hard to maintain, inconsistent UX and backend contracts |

---

## Rollout model

1. Adopt this ADR as the canonical product architecture rule for Director flows.
2. Implement Directors incrementally per domain, reusing the same two-stage contract.
3. Keep baseline domain audits as default; treat deep zones as optional expansion path.
4. Add domain-specific zone catalogs and synthesis templates over time.

