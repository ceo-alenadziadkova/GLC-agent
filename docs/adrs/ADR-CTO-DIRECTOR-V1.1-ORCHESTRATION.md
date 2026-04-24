# ADR: CTO Director v1.1 Orchestration for Technical Audit and Execution Planning

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Technical audit orchestration across no-site, existing-product, and expansion scenarios |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + Technical Direction |

### ADR lifecycle

This ADR is immutable as a decision record. Editorial fixes are allowed. Architectural changes require a new ADR that supersedes this one.

---

## Context

GLC already has strong domain pipeline coverage (`recon`, `tech_infrastructure`, `security_compliance`, `seo_digital`, `ux_conversion`, `marketing_utp`, `automation_processes`, `strategy`) and a mature intake question bank with branching and role-based feed mapping.

However, technical decision support needed an explicit orchestration layer that:

1. Works for clients with and without a website.
2. Works under different access levels (no repo access vs deep technical access).
3. Supports three business cases:
   - Greenfield (idea/MVP)
   - Modernization (existing system needs fixing)
   - Expansion (existing system needs new capabilities)
4. Produces execution-ready outputs, not only analysis.
5. Supports Build vs Buy vs Hybrid choices, including market tool discovery.

The team also required that:

- We do not overload clients with additional intake questions.
- Recommendations remain grounded in existing evidence (question bank, recon, collectors).
- Uncertainty is explicit (no silent assumptions).

---

## Decision

We establish a **CTO Director v1.1** orchestration contract as the technical equivalent of the CMO orchestration pattern.

The CTO Director is a central intelligence layer that governs technical analysis, option generation, prioritization, and execution sequencing.

### 1) Three mandatory cases

CTO Director MUST classify each audit into one primary case:

- **Case 1 — Greenfield**: no production system exists.
- **Case 2 — Modernization**: system exists with degradation/technical debt.
- **Case 3 — Expansion**: system works, new capability must be added.

### 2) Access-aware operating modes

- **Zero Access Mode**: no repo/infra/monitoring access. Use intake + recon + public signals + solution discovery. Output is hypothesis-aware.
- **Partial Access Mode**: mixed direct evidence and inferred evidence.
- **Deep Access Mode**: repo/infra/observability-backed diagnostics and precise bottleneck mapping.

### 3) No new mandatory client questionnaire

Current question bank is considered sufficient for baseline technical orchestration.  
CTO Director MUST primarily use existing signals (examples: `a5`, `a7`, `b5`, `c1`, `c2`, `c6`, `c9`, `d1`, `d_response_time`, `d_closing_flow`, `d_billing_flow`, `d2`, `d_automation_attempt`, `d3`, `d4`, `d4a`, `d4b`, `d5`, `d6`, `f1`, `f2`, `f4`, `f7`, `f8`).

Optional clarifications are allowed only when critical data is missing.

### 4) Mandatory Build-vs-Buy engine

For each relevant component, CTO Director MUST evaluate:

- **Option A**: Build custom
- **Option B**: Buy existing tool/API/SaaS
- **Option C**: Hybrid

And provide:

- Time-to-value
- Complexity
- Cost band
- Lock-in risk
- Scalability ceiling
- Migration trigger (when Buy should become Build)

### 5) Mandatory prioritization and sequencing layer

CTO Director v1.1 introduces explicit execution control:

- **Priority Engine** (required per action):
  - `impact` (1-5)
  - `urgency` (1-5)
  - `feasibility` (1-5)
  - `effort` (1-5)
  - `priority_score = (impact * urgency * feasibility) / max(effort,1)`
- **Top Actions Layer**:
  - Top 3 actions for next 7 days
  - Top 5 actions for next 30 days
- **Dependency Graph**:
  - `depends_on`
  - `parallel_with`
  - `blocks`
  - explicit critical path

### 6) Mandatory decision-quality layer

Each major option MUST include:

- Why this option wins
- Why not others
- When this decision breaks
- Best for / Worst for

### 7) Mandatory constraints model

All decisions MUST be validated against explicit constraints:

- Budget ceiling
- Team bandwidth
- Timeline constraints
- Technical constraints (legacy/platform/vendor)

No recommendation may ignore constraints.

### 8) Mandatory failure-scenario layer

For each proposed architecture path, CTO Director MUST describe failure modes:

- At 10k users
- At 100k users
- At high concurrency
- At third-party dependency outage
- At key-person dependency

---

## Agent orchestration contract

CTO Director v1.1 uses the following agent set:

1. Architecture Analyst
2. Scalability Engineer
3. Codebase Governance
4. Dev Experience
5. Data Layer
6. Performance Engineer
7. Infra Cost Optimizer
8. Reliability Engineer
9. API & Integrations
10. Observability
11. Solution Discovery (critical)

### Routing rules

- In Zero Access Mode, agents 1/2/6/7/9/11 run at max depth; others run in constrained hypothesis mode.
- In Deep Access Mode, all agents run at full depth.
- If no website is present, recommendations MUST include no-site implementation paths and MUST NOT reduce to "build a website only".

### Per-agent output footer (mandatory)

Each agent output MUST end with:

- Top findings (max 3)
- Recommended actions (max 3)
- Dependencies
- Confidence
- Risk if ignored
- Missing data for higher accuracy

---

## Default Stack Recipes (Solution Discovery upgrade)

Solution Discovery MUST provide ready recipes (not only tool lists) for rapid decision-making in Zero Access Mode, at minimum:

- SaaS MVP
- Marketplace MVP
- AI-enabled product MVP
- Service business automation stack
- Content/media stack
- No-site quick conversion stack

Each recipe must include stack, why it fits, time-to-first-value, and known limits.

---

## Output contract (CTO Director final synthesis)

The final CTO Director output MUST include:

1. Executive technical summary (case, mode, maturity)
2. Evidence map (Observed/Derived/Assumed/Missing)
3. Top bottlenecks and risks
4. Three implementation paths (Fast / Balanced / Scalable)
5. Build-vs-Buy matrix
6. Priority engine table + top 3 (7 days) + top 5 (30 days)
7. Dependency graph (critical path + parallel tracks)
8. Trade-off explanations
9. Risk register
10. Metrics/SLO framework
11. Next-level accuracy unlock (additional access that improves precision)

---

## Consequences

### Positive

- Technical audit becomes execution-ready, not only diagnostic.
- Supports all practical client situations: no-site, existing system, and capability expansion.
- Preserves client UX by avoiding mandatory intake expansion.
- Makes prioritization explicit and auditable.
- Improves founder-level decision quality via trade-off clarity and break conditions.

### Negative / Risks

- Output complexity increases and may require stricter template discipline.
- Priority scoring can create false precision if evidence quality is weak.
- Dependency graphs require careful maintenance when plans change quickly.

### Mitigations

- Enforce evidence/confidence tagging on each action.
- Keep scoring rubric stable and simple.
- Recompute priorities and dependencies on each major context update.

---

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Expand intake with many new technical questions | High risk of client overload; current bank already provides adequate baseline signal |
| Keep prioritization implicit | Produces non-executable plans and weak action clarity |
| Tool discovery without stack recipes | Too slow in zero-access scenarios and less reusable |
| Single-path recommendation only | Fails founder-level decision needs and increases strategy risk |

---

## Implementation notes

1. Adopt this ADR as the contract for CTO Director prompts and sub-agent orchestration.
2. Keep question-bank-first evidence mapping as default; do not fork a separate technical intake flow.
3. Attach priority/dependency/trade-off/failure blocks to all final technical synthesis outputs.
4. In deep-access engagements, progressively replace assumptions with observed evidence while preserving the same output contract.

