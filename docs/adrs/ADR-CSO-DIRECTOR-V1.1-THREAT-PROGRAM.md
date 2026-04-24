# ADR: CSO Director v1.1 — Threat Program, Attack Surface, and Risk-Scored Security Operating Layer

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Security & compliance domain (`security_compliance`) + optional CSO Director deep audit (Stage 2) |
| **Supersedes** | [`superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md) |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Cross-domain pattern: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- Superseded baseline CSO Director ADR: [`superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md)

### ADR lifecycle

This ADR is immutable as a decision record. If the CSO Director contract changes again, publish a new ADR that supersedes this one.

---

## Context

[`superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md) established the two-stage pattern and a Compliance-vs-Ops zone taxonomy. That was directionally correct, but insufficient for a **security program decision engine** because it lacked explicit:

1. Threat modeling (assets, actors, vectors, impacts)
2. Attack surface mapping (what is reachable and how)
3. Standardized risk scoring (likelihood × impact) and exploitability/exposure framing
4. Stronger continuous-program metrics (security + compliance operations)
5. Business-integrated cost framing (implement/maintain/breach scenarios)

We need these layers to reduce **security theater**, improve prioritization, and increase enterprise trust — while preserving GLC constraints:

- baseline remains a single-phase domain audit,
- deep work is opt-in,
- no silent assumptions,
- no legal advice,
- no fabricated precision without evidence.

---

## Decision

We extend CSO Director Stage 2 outputs with mandatory program layers:

### 1) Threat Modeling Layer (MANDATORY in Stage 2)

Every CSO Director pack MUST include a structured threat model:

- **Assets**: what we protect (data classes, money movement, brand trust, availability of booking/checkout, admin capabilities)
- **Threat actors**: who matters for this client segment (opportunistic attackers, fraud rings, malicious insiders, nation-state is optional and only when justified)
- **Attack vectors**: realistic paths given observed attack surface (see section 2)
- **Impact scenarios**: confidentiality/integrity/availability/fraud outcomes in business language

Confidence rules:

- Anything not evidenced MUST be labeled `Assumed` with a validation plan.

### 2) Attack Surface Mapping (MANDATORY in Stage 2)

Every CSO Director pack MUST include an attack surface inventory, split into:

- **Public endpoints** (pages, forms, APIs inferred from crawl and known routes)
- **Auth surfaces** (login, reset password, OAuth callbacks if observable)
- **APIs** (public integrations, webhooks if discoverable)
- **Third-party integrations** (tags, payment widgets, booking engines, analytics)
- **Admin interfaces** (only if discoverable; otherwise `Missing` + verification steps)

This map feeds prioritization and threat modeling.

### 3) Risk Scoring System (MANDATORY)

For each prioritized item (issue/control gap/initiative), compute:

- `likelihood` (1–5)
- `impact` (1–5)
- `risk_score = likelihood * impact` (range 1–25)

Definitions MUST be included in the pack appendix (short rubric), and scores MUST cite evidence classes:

- observable misconfigurations increase likelihood
- exposure increases likelihood
- asset criticality increases impact

Optional note: a **CVSS-lite** mapping may be used internally as a label, but the canonical scalar for prioritization in GLC remains `risk_score` unless a future ADR changes this.

### 4) Exploitability vs Exposure Layer (MANDATORY)

Each prioritized item MUST include:

- **Exploitability**: `easy | moderate | hard` (based on prerequisites, authentication, complexity)
- **Exposure**: `public | authenticated | internal` (based on reachability; `internal` only with internal evidence or explicit client statement)

Purpose: prevent overstating risk for hard-to-exploit issues that are publicly visible.

### 5) Metrics Framework Upgrade (MANDATORY)

Expand metrics into two tracks:

**Security operations KPIs (examples)**

- MTTD / MTTR (only if measurable or explicitly adopted as targets; otherwise `Missing` + instrumentation plan)
- % systems monitored (if inventory exists; else hypothesis + plan)
- % critical assets covered (define critical assets in threat model)
- incident frequency / near-miss cadence (if known; else `Missing`)

**Compliance program KPIs (examples)**

- % tracked vendors/subprocessors (program metric; start from discovered third parties)
- % consent coverage for observed trackers (signal-based proxy + gaps)
- DPIA coverage (count of high-risk processing activities identified vs documented; hypothesis mode without internal docs)

### 6) Cost of Security Layer (MANDATORY)

Each top initiative MUST include a cost view:

- **Cost to implement** (band: time + money, ranges)
- **Cost to maintain** (operational load, tooling subscriptions, staffing)
- **Cost of breach / incident** (scenario-based ranges, explicitly `Assumed` unless historical incidents are provided)

This is business framing, not accounting precision.

### 7) Quick Wins vs Structural Fixes (MANDATORY)

Stage 2 output MUST split recommendations into:

- **Quick wins** (≤ 7 days)
- **Structural fixes** (≥ 30 days)

And cross-link to dependency graph: structural items must declare prerequisites.

---

## Zone taxonomy (unchanged intent, stronger linkage)

The Compliance-vs-Ops split from [`superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md) remains, but every zone output MUST connect to:

- threat model assets,
- attack surface entries,
- risk scoring,
- exploitability/exposure,
- metrics,
- cost,
- quick win vs structural classification.

---

## API / persistence (unchanged from v1.0)

The endpoint shapes in [`superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md`](./superseded/ADR-CSO-DIRECTOR-TWO-STAGE.md) remain valid:

- `POST /api/audits/:id/security/director/preview`
- `POST /api/audits/:id/security/director/run`
- `GET /api/audits/:id/security/director/latest`

Artifact name remains `cso_director_pack`, but pack JSON schema version should increment in implementation (separate from ADR text).

---

## Consequences

### Positive

- Stronger prioritization and less theater.
- Better alignment between security work and business decisions.
- Clearer continuous compliance/security program evolution.

### Negative / Risks

- More output volume; must be kept structured and skimmable.
- Higher risk of overconfidence if rubric discipline slips.

### Mitigations

- Mandatory evidence classification and explicit rubric appendix.
- Hard requirement for exploitability/exposure fields on prioritized items.

---

## Rollout plan

1. Update CSO Director orchestration templates to emit the new mandatory sections.
2. Add schema/versioning for `cso_director_pack` JSON in implementation.
3. Add tests for: required fields present, rubric consistency, and “no fabricated precision” guardrails.
