# ADR: Automation Director v1.1 — Operational Nervous System (Process Economics → Safe Automation at Scale)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Automation domain (`automation_processes`) + optional Automation & Processes Director deep audit (Stage 2) |
| **Supersedes** | [`superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md) |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Cross-domain pattern: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- Technical orchestration baseline (dependencies, trade-offs, prioritization): `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`
- Superseded baseline automation ADR: [`superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md)

### ADR lifecycle

This ADR is immutable as a decision record. If the Automation Director contract changes again, publish a new ADR that supersedes this one.

---

## Context

[`superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md) established the two-stage pattern and a useful split between **process governance** and **automation operations**.

However, it was insufficient as an **operational nervous system** because it lacked explicit:

1. **Process economics** (baseline cost of manual work and expected automation value ranges)
2. **Bottleneck taxonomy** (why work stalls)
3. **Automation risk layer** (how automation can silently break reality)
4. **Automation observability** (how we know automations are healthy at scale)
5. **System-of-record (SSOT) discipline** (where truth lives and conflict resolution rules)
6. **Automation maturity model** (progress framing)
7. **Time-to-first-value (TTFV)** (prioritization driver)

We adopt these layers while preserving GLC constraints:

- no silent assumptions,
- no fabricated financial precision,
- no “automation = buy tools” default,
- adoption and governance are first-class.

---

## Decision

We extend Automation Director Stage 2 outputs with mandatory program layers below.

### 1) Process Economics (MANDATORY)

Every Stage 2 pack MUST include a **Process Cost Model** for the top 3–7 recurring workflows (not every edge case).

For each workflow, provide:

- **time_per_occurrence** (minutes/hours; `Observed` if measured, else `Assumed` with range)
- **frequency** (per day/week/month; range if unknown)
- **fully_loaded_cost_per_hour** (optional; **must** be `Assumed` unless client provides staffing costs)
- **monthly_process_cost_estimate** = `time_per_occurrence * frequency * cost_per_hour` (ranges)

Then define automation value as:

- `automation_value_estimate = current_monthly_cost_estimate - automated_monthly_cost_estimate - implementation_amortization`

All monetary outputs MUST be:

- ranges,
- labeled `Assumed` when inputs are missing,
- accompanied by sensitivity cases (low/base/high).

### 2) Bottleneck Classification System (MANDATORY)

Each bottleneck MUST be classified with one primary type (secondary allowed):

- `human_delay`
- `information_gap`
- `tool_limitation`
- `approval_friction`
- `data_quality_issue`

This classification drives solution selection (process vs tooling vs data vs governance).

### 3) Automation Risk Layer (MANDATORY)

For each automation initiative, assess:

- **silent_failure_risk** (low/med/high) + detection plan
- **data_corruption_risk** (low/med/high) + safeguards (idempotency, validation, reconciliation)
- **over_automation_risk** (low/med/high) + human-in-the-loop checkpoints
- **dependency_risk** (vendor/API instability) + fallback playbook

If risk is high, the initiative MUST be staged (pilot → expand) with explicit rollback.

### 4) Automation Observability (MANDATORY)

Define minimum observability for any production-grade automation:

- **% workflows monitored** (target + current; current may be `Missing` with plan)
- **failure alerts** (what fires, who receives, SLA)
- **retry success rate** (metric definition; baseline may be `Missing` until instrumentation exists)

This is separate from generic “reliability” language: it is explicitly about **automation health**.

### 5) Single Source of Truth (SSOT) Layer (MANDATORY)

For each core object (lead, customer, booking, invoice, inventory item, etc.), define:

- **system_of_record** (which system owns truth)
- **read replicas / derived views** (what is allowed to be downstream)
- **conflict rules** (what happens when systems disagree; reconciliation owner)

If SSOT cannot be determined, mark `Missing` and block “hard automation” recommendations that would amplify conflicts.

### 6) Automation Maturity Model (MANDATORY)

Classify the organization and each major workflow lane on levels:

1. **Manual** — ad hoc, inconsistent metrics
2. **Assisted** — templates/checklists, partial tooling
3. **Partial automation** — some steps automated with human checkpoints
4. **System-driven** — automation owns routine path; humans handle exceptions
5. **Self-optimizing** — measured loops, continuous improvement, controlled experiments

This model MUST be used to sequence roadmap waves.

### 7) Time-to-First-Value (TTFV) Layer (MANDATORY)

Each prioritized initiative MUST include:

- `ttfv_hours_days_weeks` (explicit estimate band)
- why this TTFV is realistic given adoption constraints
- what instrumentation must exist to confirm value within TTFV window

TTFV MUST influence prioritization alongside impact/effort.

---

## Zone taxonomy (v1.0 remains, but outputs must attach economics + taxonomy)

The Process Governance vs Automation Ops split from [`superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-AUTOMATION-DIRECTOR-TWO-STAGE.md) remains.

Every zone output MUST connect to:

- process economics,
- bottleneck taxonomy,
- automation risks,
- observability,
- SSOT,
- maturity positioning,
- TTFV.

---

## API / persistence (unchanged from v1.0)

Endpoint shapes remain:

- `POST /api/audits/:id/automation/director/preview`
- `POST /api/audits/:id/automation/director/run`
- `GET /api/audits/:id/automation/director/latest`

Artifact name remains `automation_director_pack`, but pack JSON schema version should increment in implementation.

---

## Consequences

### Positive

- Stronger business case for automation (not tool shopping).
- Better prioritization and safer rollouts.
- Clearer path from “strategy” to “repeatable execution”.

### Negative / Risks

- More client-facing complexity; must be presented as structured tables, not prose walls.
- Higher temptation to invent numbers; must be disciplined with `Assumed` ranges.

### Mitigations

- Mandatory sensitivity cases and explicit missing-data gates.
- Pilot-first requirements when risk is high.

---

## Rollout plan

1. Update Stage 2 orchestration templates to emit mandatory sections.
2. Add schema/versioning for `automation_director_pack` JSON in implementation.
3. Add tests for required fields, SSOT gating rules, and “no fabricated precision” guardrails.
