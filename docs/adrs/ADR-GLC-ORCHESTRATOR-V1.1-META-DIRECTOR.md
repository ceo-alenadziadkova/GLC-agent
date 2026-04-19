# ADR: GLC Orchestrator v1.1 — Meta-Director, Cross-Domain Graph, and Unified Execution Plan

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Cross-domain orchestration above domain Directors (CMO/CDO/CTO/CSO/CAO) |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Human orchestrator prompt canon (operational text): `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`
- Client-facing roadmap and timeline UX (lanes, seasons, lab vs timeline): `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`
- Per-phase quality gate (domain phases): `ADR-CONTROL-OBJECT-V1.md`, `ADR-DECISION-LAYER-GATES.md`
- Cross-domain two-stage pattern for domain deep audits: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- Domain Director ADRs (examples):
  - `ADR-MARKETING-DIRECTOR-TWO-STAGE.md`
  - `ADR-TECH-DIRECTOR-TWO-STAGE.md`
  - `ADR-CDO-DIRECTOR-TWO-STAGE.md`
  - `ADR-CSO-DIRECTOR-V1.1-THREAT-PROGRAM.md`
  - `ADR-AUTOMATION-DIRECTOR-V1.1-OPERATIONAL-NERVOUS-SYSTEM.md`
- Technical decision rubric reused by orchestration scoring: `ADR-CTO-DIRECTOR-V1.1-ORCHESTRATION.md`

### ADR lifecycle

This ADR is immutable as a decision record. If the orchestrator contract changes, publish a new ADR that supersedes this one.

---

## Context

GLC is accumulating strong **Director** layers per domain (marketing, UX/conversion, tech, security/compliance, automation). Each Director can produce high-quality guidance, but **in isolation** they can conflict:

- growth recommendations can increase load before infra is ready,
- UX friction removal can collide with compliance requirements,
- automation can amplify broken processes,
- security can block speed unless sequenced correctly.

**Key mistake to avoid:** implementing “GLC OS” primarily by concatenating director prompts. That does not scale and does not guarantee coherent execution.

GLC needs a **meta orchestration layer** that consumes structured director outputs and produces:

1. one unified diagnosis,
2. one dependency-aware execution graph,
3. one prioritized roadmap,
4. explicit conflict resolutions,
5. explicit uncertainty and missing-data unlock paths.

---

## Decision

We introduce **GLC Orchestrator** (Meta-Director) as a first-class system component.

### Three-layer architecture (canonical)

1. **Layer 1 — Intake & Evidence**  
   Intake bank + recon + collectors + consultant notes, normalized into a shared evidence standard.

2. **Layer 2 — Director Reasoning (selective)**  
   Domain Directors run only when relevant (product routing + client selection + access constraints).

3. **Layer 3 — Orchestration & Synthesis**  
   GLC Orchestrator merges director outputs into a **single executable plan** with a global dependency graph and conflict resolution.

### Orchestrator responsibilities (non-negotiable)

The Orchestrator MUST:

- **not** perform primary domain analysis (no “replace directors”),
- normalize actions across domains,
- detect and resolve cross-domain conflicts,
- compute global prioritization and critical path,
- compress scope under resource constraints,
- output a unified plan with explicit confidence and missing-data gates.

### Relationship to Fact-Checker, Decision Layer, CONTROL_OBJECT, and auto-loop

This ADR **does not replace or contradict** the per-phase quality gate documented in `ADR-CONTROL-OBJECT-V1` / `ADR-DECISION-LAYER-GATES` (and implemented in `FactChecker` → `CONTROL_OBJECT` → `DecisionLayer`). The two mechanisms answer **different questions**:

| Mechanism | Question it answers |
|---|---|
| **Fact-Checker + CONTROL_OBJECT + Decision Layer** | For **one domain phase output** (phases 1–6): is the structured analysis **supported by collected evidence**, internally consistent enough, and within feasibility guardrails? Yields `accept` / `accept_with_warnings` / `refine`. |
| **Auto-loop** | If Decision Layer returns `refine`, may **rerun the same domain agent** with deterministic instruction patches derived from `CONTROL_OBJECT` (feature-flagged; **not** applied to `recon` or `strategy` in the current pipeline). |
| **GLC Orchestrator (this ADR)** | Given **accepted** (or otherwise finalized) structured outputs from domains/directors: how do recommendations **combine**, **conflict**, and **sequence** into **one** system-level execution plan? |

**Layering rule (non-negotiable):**

1. **Domain/Director analytical steps** remain subject to **collector-backed verification** and **CONTROL_OBJECT + Decision Layer** where that pipeline applies.
2. **Orchestrator** consumes **structured bundles** (Layer 2 → Layer 3) and performs **cross-domain synthesis** — it MUST NOT be used as an excuse to skip evidence discipline on primary domain analysis.
3. Mixing roles (e.g. a single prompt that both **invents domain findings** and **acts as global orchestrator**) is **out of scope** for this ADR and is an anti-pattern.

**Pipeline reality note:** Phase 7 `strategy` synthesis today is **outside** the FactChecker/CONTROL_OBJECT path used for domain phases 1–6. Introducing a persisted `glc_orchestration_pack` (or evolving strategy synthesis) should remain **consistent with this section**: any future “plan-level” gate (e.g. structural graph validation, optional `OrchestrationControlObject`) is a **separate** decision and should be recorded in a **new** ADR if it becomes product canon—not by rewriting immutable domain CO semantics.

---

## Shared evidence standard (Layer 1 contract)

All directors and the orchestrator MUST use the same evidence taxonomy:

- `Observed`
- `Derived`
- `Assumed`
- `Missing`

Plus:

- `confidence` (`high` | `medium` | `low`)
- `evidence_refs[]` (typed references: intake id, url, collector field, artifact id)

---

## Director output contract (Layer 2 → Layer 3)

Each Director MUST emit machine-readable bundles (conceptual JSON), minimally:

```json
{
  "domain": "cmo | cdo | cto | cso | automation",
  "actions": [
    {
      "id": "stable_string_id",
      "title": "",
      "description": "",
      "impact": 1,
      "effort": 1,
      "risk": 1,
      "urgency": 1,
      "confidence": "high",
      "dependencies": ["other_action_id"],
      "evidence": {
        "observed": [],
        "derived": [],
        "assumed": [],
        "missing": []
      }
    }
  ],
  "bottlenecks": [],
  "risks": []
}
```

Notes:

- `risk` is **business/operational/security risk** depending on domain; orchestrator normalizes into a comparable scale with explicit definitions.
- `dependencies` may be cross-domain; orchestrator validates graph integrity.

---

## Orchestrator algorithm (Layer 3 contract)

### PHASE 0 — Global diagnostic (Theory of Constraints)

Orchestrator MUST select **one dominant system constraint**:

- `TRAFFIC constrained`
- `CONVERSION constrained`
- `TECH constrained`
- `RISK constrained`
- `DELIVERY constrained` (ops/automation throughput)

Then compute:

- **constraint chain**: if constraint A is relieved, what becomes the next bottleneck?
- **resource envelope**: bandwidth, risk tolerance, urgency (explicitly `Assumed` if unknown)

### PHASE 1 — Dynamic director routing

Domains receive **weights** (example range 0.5–2.0):

- primary constraint domain → highest weight
- secondary → medium
- others → lower / dormant

Routing is not “always run all directors”.

### PHASE 2 — Action normalization

- dedupe/merge similar actions
- normalize titles and fields
- attach domain weights and blocking metadata

Each action MUST gain:

- `domain_weight` (number)
- `blocking_factor` (0–3): how many downstream actions are blocked
- `parallelizable` (boolean)
- `time_to_value` (`fast | medium | slow`)

### PHASE 3 — Weighted dependency graph

Dependencies are not only binary; include weights:

- `1.0` hard dependency
- `0.7` strong influence
- `0.4` partial
- `0.2` weak

### PHASE 4 — Critical path detection

Orchestrator MUST output a critical path sequence that maximizes unblocked value under constraints.

### PHASE 5 — Global prioritization engine (v1.1)

Each action receives a `priority_score` using a consistent function (implementation must centralize constants in config, not inline literals).

Conceptual formula:

`priority_score = (impact * confidence_numeric * domain_weight * blocking_multiplier) / (effort * risk * time_penalty)`

Where:

- `confidence_numeric`: high=1.0, medium=0.7, low=0.4
- `blocking_multiplier` increases with `blocking_factor`
- `time_penalty` penalizes slow TTFV unless justified by dependency chain

### PHASE 6 — Conflict resolution engine (mandatory matrix)

Minimum conflict classes:

1. Growth vs Tech → stabilize/scale infra before pushing growth
2. UX vs Compliance → compliant UX path (no bypass)
3. Automation vs broken process → process fix first
4. Speed vs Risk → phased rollout when risk high
5. Cost vs Quality/Scale → phased “good enough” path

Default resolution principles:

- system stability > unchecked growth
- compliance constraints cannot be ignored
- process clarity > automation
- conversion fixes > traffic buys (when conversion is dominant constraint)

If unresolved, orchestrator MUST emit a phased plan (Phase A/Phase B) rather than forcing a false single answer.

### PHASE 7 — Execution compression

If resources are low or urgency is high:

- remove low-impact actions
- merge duplicates
- prefer fewer, higher-leverage actions

Output flag:

- `compressed_plan: true | false`

---

## Unified output (single client-facing artifact)

Orchestrator MUST output **one** unified plan, not five reports.

Minimum sections:

1. System diagnosis (dominant constraint + constraint chain)
2. Top global bottlenecks (3–5)
3. Top actions: next 7 days (3) + next 30 days (5) — **global**, not per domain
4. Weighted execution graph + critical path
5. Domain influence map (how each domain shaped decisions)
6. Risk layer (cross-domain)
7. Metrics framework (north star + leading + lagging)
8. Confidence map + missing data unlock list
9. Execution mode: `compressed | standard | aggressive`

---

## Persistence & API (implementation contract)

### Artifact

Persist orchestrator output as `glc_orchestration_pack` (versioned JSON), separate from domain rows.

### Endpoints (proposed)

- `POST /api/audits/:id/orchestrator/preview` — routing + required directors + missing inputs
- `POST /api/audits/:id/orchestrator/run` — compute unified plan
- `GET /api/audits/:id/orchestrator/latest`

---

## Consequences

### Positive

- Coherent cross-domain execution.
- Scales as directors multiply without becoming prompt soup.
- Enables UI roadmap/graph visualization later.

### Negative / Risks

- Requires strict structured outputs from directors.
- Orchestrator can become a “black box” if transparency rules slip.

### Mitigations

- Mandatory evidence and confidence mapping in final plan.
- Persist graph + weights + conflict resolutions for auditability.

---

## Rollout plan

1. Implement `glc_orchestration_pack` schema + server service (not prompt-only).
2. Enforce director output contracts in Stage 2 packs first (highest leverage).
3. Add orchestrator unit tests: conflict matrix, cycle detection, compression.
4. UI: render graph + critical path + unified roadmap.
