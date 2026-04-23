# ADR: CSO Director — Two-Stage Security & Compliance Audit (Baseline → Deep Zones)


| Field               | Value                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Status**          | Accepted                                                                                      |
| **Date**            | 2026-04-19                                                                                    |
| **Scope**           | Security & compliance domain (`security_compliance`) + optional CSO Director deep audit zones |
| **Supersedes**      | —                                                                                             |
| **Superseded by**   | `../ADR-CSO-DIRECTOR-V1.1-THREAT-PROGRAM.md`                                                     |
| **Decision owners** | Product + Consulting + AI Platform                                                            |


> **Note:** This ADR is superseded by [`ADR-CSO-DIRECTOR-V1.1-THREAT-PROGRAM.md`](../ADR-CSO-DIRECTOR-V1.1-THREAT-PROGRAM.md) (threat model, attack surface, risk scoring, exploitability/exposure, expanded KPIs, cost layer, quick wins vs structural). Keep this file for historical context only.

### Related decisions

- Cross-domain pattern: [`ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`](../ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md)

### ADR lifecycle

This ADR is immutable as a decision record. If the CSO Director contract changes, publish a new ADR that supersedes this one.

---

## Context

GLC already runs a baseline security audit via the pipeline domain `security_compliance` using `server/prompts/security_compliance.md`, backed by `SecurityCollector` (headers, TLS, cookies, CORS signals) and structured `DomainOutputSchema`.

Security and compliance work naturally splits into two families of concerns:

1. **Compliance & privacy governance** — policies, consent, data processing posture, jurisdictional obligations, vendor/subprocessor risk, DPIA-style thinking (without pretending to be legal counsel).
2. **Security operations & engineering** — concrete controls, configurations, monitoring, incident readiness, secure SDLC practices.

Clients differ strongly in:

- whether they take online payments (`a6`, `e1`),
- EU exposure (`e2`),
- self-assessed GDPR maturity (`e3`),
- regional invoicing obligations where applicable (`e4`),
- how billing flows are handled (`d_billing_flow`).

We also need access-aware behavior:

- **Public / zero internal access** clients still receive high-value guidance from crawl + headers + intake, but cannot be diagnosed as if we had internal SIEM, IAM, or policy packs.
- **Deep internal access** (policies, ticketing, cloud consoles, pentest reports) unlocks higher precision for ops zones.

This ADR aligns security & compliance with the cross-domain Director pattern used for marketing, tech, and UX.

---

## Decision

We implement Security & Compliance as a **two-stage** system:

### Stage 1 — Baseline Security & Compliance Audit (default)

- **What runs**: existing `security_compliance` pipeline phase (single Claude call + `SecurityCollector` + fact-check path as today).
- **Purpose**: fast, evidence-grounded security posture review from externally observable signals + intake compliance slices.
- **Output**: standard domain structured output (`DomainOutputSchema`) persisted as today.

### Stage 2 — CSO Director Deep Audit (optional)

- **What runs**: a separate explicit action orchestrating deep security/compliance **zones** selected by the client (and/or consultant).
- **Purpose**: produce implementation-grade security and compliance program work: control backlog, vendor/subprocessor risk, incident readiness, privacy program gaps, payment compliance scoping, and measurable improvement plan — scoped to selected zones.
- **Input**: Stage 1 outputs + consolidated context (intake slices, recon, prior domain summaries where relevant) + optional internal artifacts when access exists + optional client feedback.
- **Output**: dedicated persisted artifact (recommended name: `cso_director_pack`), versioned and rerunnable.

---

## Zone taxonomy (client-facing): Compliance vs Ops

Client selects **zones**, not internal agent names.

### A) Compliance & Privacy Program (governance)

1. **Data protection & privacy (GDPR-first)**
  - lawful basis mapping (high-level)
  - consent/banner realism (site-visible signals + intake `e3`)
  - retention/minimization posture (hypothesis unless internal docs exist)
2. **Cookies & tracking governance**
  - third-party trackers observed
  - consent gating patterns (observable)
  - analytics/marketing tag risk triage
3. **Payments & financial compliance scoping**
  - scope from intake (`a6`, `e1`) + observed payment flows
  - hosted vs on-site card data assumptions (explicitly labeled)
  - “what evidence is missing to validate PCI scope” checklist
4. **Vendor / subprocessor risk**
  - third-party dependencies from site + stack signals
  - data sharing boundaries (hypothesis unless contracts exist)
5. **Policy pack completeness (external signals)**
  - presence and quality signals for privacy/terms/cookie policy pages (crawl)
  - gap list vs common EU baseline expectations
6. **Regional compliance add-ons (conditional)**
  - activate only when intake/geo signals justify (example: `e4` when applicable)

### B) Security Operations & Engineering (technical controls)

1. **Transport & edge security**
  - TLS/HSTS posture, mixed content risks (signals from collectors/crawl)
2. **Browser security headers & CSP**
  - header maturity, clickjacking, MIME sniffing, XSS mitigation posture (signal-based)
3. **Session & cookie security**
  - cookie flags, session fixation risks (signal-based; deeper review requires app knowledge)
4. **Application security posture (hypothesis-first)**
  - auth/session flows not fully testable without access; provide threat model + verification checklist
5. **API & integration security**
  - CORS, exposed endpoints, third-party scripts, webhook risks (signal-based)
6. **Logging, monitoring, detection, response readiness**
  - what cannot be seen publicly; produce minimum viable security telemetry plan
7. **Incident readiness & business continuity (lightweight)**
  - playbooks, ownership, comms templates (hypothesis unless internal docs exist)
8. **Secure SDLC & access governance (deep access preferred)**
  - branching, reviews, secrets, CI checks (only with internal evidence)
9. **Synthesis bundle**
  - prioritized control backlog + dependency graph + 30/90 plan + risk register + metrics

---

## Access-aware routing (MANDATORY)

### `zero_internal_access` (default for most clients)

- Compliance zones **1–6** can run in **external-evidence + intake** mode.
- Ops zones **7–13** run in **signal-based** mode with strict confidence labeling.
- Zones **10** and **14** default to **hypothesis + verification checklist** unless internal access exists.

### `partial_internal_access`

- Expand ops zones with partial evidence (e.g., exported header dumps, limited policy docs).

### `deep_internal_access`

- Ops zones **10, 12, 14** may run at full depth when evidence exists.
- Compliance zones may incorporate internal DPIA/RoPA excerpts if provided (still not legal advice).

---

## Intake-driven gating (MANDATORY)

Use intake anchors when present (see `docs/QUESTION_BANK.md`):

- Online payments surface: `a6`
- Online payments detail: `e1`
- EU scope: `e2`
- GDPR confidence: `e3`
- Regional invoicing signals: `e4` (conditional)
- Billing flow signals: `d_billing_flow`

Rules:

- If payments are not in scope, **do not** force deep PCI narrative; keep payments zone as “scoping + risk triage only”.
- If EU scope is likely, prioritize privacy/cookies/trackers zones.

---

## Orchestration rules

### Default routing

- Stage 1 runs when security domain is in scope for the audit product mode.
- Stage 2 never runs unless explicitly requested.

### Stage 2 execution model

Stage 2 is implemented as **one orchestrated run** with internal modular steps:

- For each selected zone, produce a zone report with:
  - evidence classification (`Observed` / `Derived` / `Assumed` / `Missing`)
  - confidence per major claim
  - explicit legal non-advice disclaimer where compliance law is touched
- End with a **CSO Director synthesis** that resolves conflicts and produces a coherent program: controls, owners, sequencing, and metrics.

### Mandatory outputs (Stage 2)

- prioritized actions (7-day top 3 + 30-day top 5) with explicit scoring
- dependency graph (what blocks what; parallel tracks)
- control backlog grouped by Compliance vs Ops
- risk register (including regulatory/reputational risk as qualitative severity)
- metrics framework (security KPIs + compliance operational KPIs)

---

## API contract (proposed, implementation follows)

### `POST /api/audits/:id/security/director/preview`

Returns eligible zones, recommended zones, blocked zones, and missing prerequisites.

### `POST /api/audits/:id/security/director/run`

Request:

- `selected_zones: string[]`
- `access_level: 'zero_internal' | 'partial_internal' | 'deep_internal'`
- `client_feedback?: string`

Response:

- `cso_director_pack_id`
- `status`

### `GET /api/audits/:id/security/director/latest`

Returns latest completed pack.

---

## Persistence model (proposed)

Store Stage 2 output as a versioned JSON document linked to `audit_id`:

- `cso_director_packs` table (recommended) OR typed `pipeline_events` (short-term)

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

- Keep `server/prompts/security_compliance.md` as the baseline audit prompt.

### Stage 2 (Director)

- Implementation MUST chunk Stage 2 into zone modules.
- Stage 2 must include a final synthesis step enforcing CSO output contracts.
- Any legal interpretation MUST be framed as **non-legal guidance** with “verify with qualified counsel” where relevant.

---

## Consequences

### Positive

- Matches how security work is actually purchased and executed (governance vs engineering).
- Avoids misleading precision when internal access is missing.
- Keeps baseline pipeline fast while enabling deep compliance/security programs on demand.

### Negative / Risks

- Higher orchestration complexity.
- Risk of “compliance theater” if disclaimers and evidence discipline are weak.

### Mitigations

- Mandatory evidence map + confidence + missing-data gates.
- Hard separation between external signals and internal assertions.

---

## Rollout plan

1. Implement Stage 2 storage + API endpoints behind a feature flag.
2. Ship UI: baseline security results + zone picker + run button.
3. Add tests for: intake gating, access gating, zone caps, rerun idempotency (input hash), and failure modes.
4. Iterate zone catalog based on consultant feedback (requires ADR bump if contract changes).

