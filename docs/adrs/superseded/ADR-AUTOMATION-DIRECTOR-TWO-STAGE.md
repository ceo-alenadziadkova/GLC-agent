# ADR: Automation & Processes Director — Two-Stage Automation Audit (Baseline → Deep Zones)


| Field               | Value                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Status**          | Accepted                                                                                               |
| **Date**            | 2026-04-19                                                                                             |
| **Scope**           | Automation domain (`automation_processes`) + optional Automation & Processes Director deep audit zones |
| **Supersedes**      | —                                                                                                      |
| **Superseded by**   | `../ADR-AUTOMATION-DIRECTOR-V1.1-OPERATIONAL-NERVOUS-SYSTEM.md`                                           |
| **Decision owners** | Product + Consulting + AI Platform                                                                     |


> **Note:** This ADR is superseded by [`ADR-AUTOMATION-DIRECTOR-V1.1-OPERATIONAL-NERVOUS-SYSTEM.md`](../ADR-AUTOMATION-DIRECTOR-V1.1-OPERATIONAL-NERVOUS-SYSTEM.md) (process economics, bottleneck taxonomy, automation risk, automation observability, SSOT layer, maturity model, TTFV). Keep this file for historical context only.

### Related decisions

- Cross-domain pattern: [`ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`](../ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md)
- Technical orchestration baseline (dependencies, trade-offs, prioritization): [`ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`](../ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md)

### ADR lifecycle

This ADR is immutable as a decision record. If the Automation Director contract changes, publish a new ADR that supersedes this one.

---

## Context

GLC already runs a baseline operations automation audit via `automation_processes` in the core pipeline. It uses intake-driven operational signals (tools, handoffs, response speed, closing/billing flow, manual bottlenecks, data export readiness, AI usage readiness) and recon/tech context.

Automation decisions differ from pure technical architecture and from compliance:

1. The core problem is usually **operational friction and execution delay**, not only missing software.
2. Many improvements are **process design + integration sequencing**, not “buy another tool.”
3. Value depends on **adoption reality** (owner approvals, team habits, data quality), not only implementation.

Therefore, we need a deep layer that separates:

- **Process governance and operating design** (how work should flow),
- **Automation operations and implementation** (how tools, integrations, and data pipelines execute reliably).

This mirrors the compliance-vs-ops split concept but adapted for automation outcomes.

---

## Decision

We implement automation as a **two-stage** system aligned with the cross-domain Director pattern.

### Stage 1 — Baseline Automation Audit (default)

- **What runs**: existing `automation_processes` pipeline phase.
- **Purpose**: fast diagnosis of manual bottlenecks, tool-stack signals, and automation readiness.
- **Output**: standard domain structured output (`DomainOutputSchema`) persisted as today.

### Stage 2 — Automation & Processes Director Deep Audit (optional)

- **What runs**: explicit deep action over selected automation zones.
- **Purpose**: implementation-grade operations automation program with sequencing, dependencies, ROI framing, and adoption guardrails.
- **Input**: Stage 1 outputs + intake/recon/domain context + optional client feedback + optional internal process maps/tool access.
- **Output**: dedicated persisted artifact (recommended name: `automation_director_pack`), versioned and rerunnable.

---

## Zone taxonomy (client-facing): Process Governance vs Automation Ops

Client selects **zones**, not internal agent names.

### A) Process Governance & Operating Design

1. **Process map and ownership clarity**
  - current-state flow (lead → response → close → fulfillment → billing)
  - ownership gaps and handoff ambiguity
2. **SOP and decision governance**
  - where process truth lives (`d4` style signals)
  - approval and escalation rules (`f7` and related signals)
3. **Service-level operating targets**
  - response-time standards (`d_response_time`)
  - task completion windows and queue discipline
4. **Data readiness and quality gates**
  - exportability (`d4b`)
  - key data categories (`d6`)
  - minimum data contract for automation reliability
5. **Change management and adoption**
  - team friction, training needs, operational rollout sequence

### B) Automation Operations & Implementation

1. **Workflow automation opportunities**
  - repetitive bottlenecks (`d2`, `d3`, `d_automation_attempt`)
  - high-frequency/high-friction flows first
2. **Integrations and system handoffs**
  - CRM/no-CRM reality (`d1`, `d1a`, `d1b`)
  - booking/PMS/POS/accounting handoffs
3. **Notification and follow-up automation**
  - response lag reduction
  - lead rescue and reminder flows
4. **Billing, quoting, and finance workflow automation**
  - `d_billing_flow` and quote-to-cash flow consistency
  - auditability and operational error reduction
5. **AI-in-ops opportunities (safe scope)**
  - practical assistant tasks (`d4a`)
    - guardrails, review points, and fallback paths
6. **Reliability and exception handling**
  - retries, dead-letter handling, manual fallback playbooks
7. **Build-vs-buy automation stack decisions**
  - no-code/low-code/SaaS vs custom integrations
    - migration trigger criteria
8. **Synthesis bundle**
  - priority engine + dependency graph + 30/90-day rollout + KPI/ROI tracking + risk register

---

## Access-aware routing (MANDATORY)

### `zero_access`

- Use intake + recon + observable product/process signals.
- Zones 1–6 and 8–10 run in high-value heuristic mode.
- Zones requiring internal workflow telemetry must output `Missing` with concrete validation checklist.

### `partial_access`

- Include available process docs, selected tool exports, and consultant observations.
- Upgrade reliability and integration conclusions where evidence exists.

### `deep_access`

- Full-depth sequencing, dependency verification, and KPI baselining from operational data.

---

## Intake-driven anchors (MANDATORY)

When present, use these as primary evidence anchors:

- Tool stack and CRM reality: `d1`, `d1a`, `d1b`
- Response and flow friction: `d_response_time`, `d_closing_flow`, `d_billing_flow`
- Manual bottleneck and effort: `d2`, `d3`, `d_automation_attempt`
- Process governance readiness: `d4`, `f7`
- AI/data readiness: `d4a`, `d4b`, `d6`
- Scale/volume and urgency: `a8`, `f8`, `f4`

If anchors are missing, label assumptions and reduce confidence accordingly.

---

## Orchestration rules

### Default routing

- Stage 1 runs when automation domain is in scope.
- Stage 2 runs only on explicit request.

### Stage 2 execution model

- For each selected zone, produce:
  - evidence map (`Observed` / `Derived` / `Assumed` / `Missing`)
  - confidence
  - dependencies and prerequisites
- Final synthesis must resolve contradictions and output one coherent rollout program.

### Mandatory output sections (Stage 2)

1. Current process and automation map
2. Top bottlenecks and failure points
3. Options per major gap:
  - Quick process fix
  - Structural process redesign
  - Tool/integration implementation path
4. Prioritization:
  - top 3 (7 days)
  - top 5 (30 days)
5. Dependency graph and critical path
6. Build-vs-buy matrix for key automation components
7. KPI + ROI framework (ranges, not fabricated precision)
8. Risk register (operational, adoption, data quality, vendor dependency)

---

## API contract (proposed, implementation follows)

### `POST /api/audits/:id/automation/director/preview`

Returns:

- `eligible_zones[]`
- `recommended_zones[]`
- `blocked_zones[]` + reasons
- `missing_context[]`

### `POST /api/audits/:id/automation/director/run`

Request:

- `selected_zones: string[]`
- `access_level: 'zero' | 'partial' | 'deep'`
- `client_feedback?: string`

Response:

- `automation_director_pack_id`
- `status`

### `GET /api/audits/:id/automation/director/latest`

Returns latest completed pack.

---

## Persistence model (proposed)

Store Stage 2 output as versioned JSON linked to `audit_id`:

- `automation_director_packs` (recommended) OR typed `pipeline_events` (short-term)

Minimum fields:

- `id`, `audit_id`, `created_at`
- `selected_zones`
- `access_level`
- `input_snapshot_hash`
- `pack_json`
- `status`, `error`

---

## Consequences

### Positive

- Consistent Director architecture across domains.
- Better practical outcomes: less manual rework, faster response, fewer dropped leads.
- Prevents over-tooling by separating process governance from implementation operations.

### Negative / Risks

- More orchestration complexity.
- Risk of “tool-first” recommendations if process zones are skipped.

### Mitigations

- Require at least one process-governance zone in recommended set.
- Enforce dependency graph and adoption-risk checks in synthesis.

---

## Rollout plan

1. Add Stage 2 endpoints and storage behind a feature flag.
2. Expose baseline result + automation zone picker in UI.
3. Add tests for zone gating, access modes, rerun idempotency, and dependency serialization.
4. Iterate zone catalog with consultant feedback; update ADR on contract changes.

