# ADR: Client unified roadmap v1 — multi-lane seasonal timeline, pre-commit coverage, and lab vs timeline

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-04-19 |
| **Scope** | Client and consultant UX for post-audit execution: roadmap shape, navigation, relationship to GLC Orchestrator, Director deep stages, and shared business context |
| **Supersedes** | — |
| **Superseded by** | — |
| **Decision owners** | Product + Consulting + AI Platform |

### Related decisions

- Partial audit coverage runtime contract (`execution_plan`, packages): `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`
- Meta orchestration (single system plan, conflict resolution, graph): `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`
- Phased rollout (milestones, progress %, engineering constraints): `ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md`
- Two-stage Director pattern: `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`
- Per-phase quality gate (domain phases): `ADR-CONTROL-OBJECT-V1.md`, `ADR-DECISION-LAYER-GATES.md`
- Human orchestrator prompt canon: `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`

### ADR lifecycle

Immutable decision record. If the client roadmap contract or persistence model changes materially, publish a new ADR that supersedes this one.

---

## Context

Today, client-facing value is often experienced as: **domain-scored report** + **strategy-style initiatives** (e.g. Strategy Lab time buckets and domain filters). That model weakens when the product introduces:

1. **GLC Orchestrator** — one dependency-aware execution plan across domains, not five parallel narratives.
2. **Director two-stage depth** — baseline vs optional deep zones; not every domain runs the same depth.
3. **Explicit coverage packages** — the user already selects which domains run (`execution_plan`); roadmap UX must stay honest to that scope.

Users also need a **single place** where technical delivery, marketing/SEO motion (when purchased), process/automation, and risk/compliance (when in scope) **stay synchronized in time** — e.g. marketing “preheat” and content plans aligned to technical milestones, not a disconnected checklist.

Finally, the business asked to preserve **explicit user choice before roadmap generation**: pick **what** is in scope, **how** change is executed (integrate vs build vs hybrid), and **which season/horizon** frames execution — then generate (or regenerate) the roadmap.

---

## Decision

### 1) Canonical client artifact: **Seasonal multi-lane timeline** (not domain tabs as primary)

The **primary** post-audit navigation for “what happens next” is a **timeline** segmented by **seasons** (calendar quarters, 90-day windows, or milestone-based phases — product-defined presets).

**Lanes** (tracks) are derived from **orchestrator placement** of actions, not from “which agent spoke last”. Typical lanes (subset enabled by coverage):

| Lane | Purpose |
|---|---|
| **Product / change** | Milestones for the chosen change scenario (integrate / build / hybrid). |
| **Tech & delivery** | Infra, releases, scalability and dependency risks that gate other lanes. |
| **Marketing & narrative** | UTP-aligned messaging, launch comms, **preheat** before capability goes live. |
| **SEO** (if in package) | Technical + content SEO work **tied** to new URLs, IA, or releases — not a generic parallel checklist. |
| **Processes & automation** | Stabilize handoffs first; automate after clarity (orchestrator conflict rules). |
| **Risk / compliance** (if in package) | Gates before UX friction removal or data collection changes. |

**Synchronization rule (UX + data):** dependencies between actions are **visible across lanes** (e.g. “Content wave 2 starts after MVP feature 1”). The orchestrator graph is the source of truth for ordering; the timeline is a **projection** of that graph onto time + lanes.

### 2) Mandatory **pre-roadmap commitment** (user choice before generation)

Before the first generated roadmap (and before any **regeneration** after scope change), the user MUST confirm a **Roadmap input manifest** (coverage + scenario + season; persisted as immutable snapshot rows — see implementation mapping below):

1. **Coverage** — which domains/modules are in contract (honest to `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN`).
2. **Change scenario** — `integrate_existing` | `build_new` | `hybrid` (exact enum is implementation detail; must drive dependency templates).
3. **Season / horizon** — selected planning window; feeds orchestrator **execution compression** and lane density.
4. **Optional: priority weights** — e.g. speed vs risk tolerance (if collected in intake).

**Flow:**

1. User edits manifest → **Preview** (“included / cut / waiting list”) with explicit **data confidence** callouts.
2. User confirms → **Roadmap version vN** is produced (orchestrator + persisted pack).

**Upsell / gap coverage:** recommendations such as “add automation — low marginal cost, unblocks X” are **dependency-aware** and trigger **vN+1** only after explicit user acceptance (with a **diff** vs vN).

### 3) **Laboratory** vs **Timeline** (split responsibilities)

| Surface | Role |
|---|---|
| **Timeline** | **When** and **what runs in parallel**; seasons; cross-lane dependencies at a glance. |
| **Laboratory** | **Deep dive** on a selected initiative or week: evidence, alternatives, tradeoffs, execution pack generation, Director deep outputs (baseline vs deep badges). |

The Lab must **not** duplicate the timeline as “another roadmap”. Legacy “quick / medium / strategic tabs only” is **not** the primary mental model once orchestrator packs exist; time + lanes are.

### 4) **Business cockpit** (first screen after primary cycle)

Short **system diagnosis** for the client:

- Dominant constraint (one), secondary constraints (few).
- Strengths / improvement zones tied to **observed vs assumed** signals.
- **Coverage map** — what is on vs off; honest gaps.
- Primary CTAs: **Open timeline** · **Full domain report** (evidence appendix) · **Adjust scope & regenerate** (manifest).

### 5) Shared context for all agents — **manifest + slices**, not “one mega CONTROL_OBJECT”

- **Single SSOT** for product/business **intent and scope**: intake + recon + **Roadmap input manifest** + key invariants (“must not break”).
- **CONTROL_OBJECT v1** remains the **per-domain-phase quality and governance record** (FactChecker + Decision Layer). It must not grow into a duplicate global roadmap store.
- Orchestrator and Directors consume **read-only slices** of the same manifest + latest verified domain summaries; they do not replace per-phase CO semantics (see `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`).

### 6) Director two-stage UX

Initiatives or actions that used **Director deep** lanes show a **badge** (`Baseline` / `Deep`) and, on expand, a short pointer to **which zones** ran — without overwhelming the timeline.

### 7) Future expansion

Additional agent families (competitors, vendor discovery, etc.) appear as **optional lanes** or **manifest modules**, gated by package — same timeline projection rules.

---

## Consequences

### Positive

- One coherent client story: **scope → plan → time → evidence**.
- Marketing/SEO can be **honestly coupled** to delivery when in package.
- Orchestrator output maps cleanly to **lanes + seasons** without forcing domain-first navigation.

### Negative / risks

- Requires **persisted orchestration pack** and versioning UX engineering.
- Timeline UI complexity; MVP may ship **2–3 lanes** before full matrix.

### Mitigations

- Ship **manifest + preview + vN versioning** before pixel-perfect graph visualization.
- Start with **textual critical path + lane columns** if graph rendering lags.

### Current UX gaps to close

The following items are required to reach the intended client decision UX for roadmap selection:

- No **board-view by periods** (`Now / Next / Later`) with initiative cards as the primary interaction surface.
- No **what-if comparison scenario** (for example: “if you select these 3 initiatives, how the plan changes”).
- No explicit **selection package evaluation** at set level (total effort range, expected impact, key risks).
- Insufficient **decision confidence at set level** (confidence is mostly shown per initiative, not for the selected bundle).

These are tracked as mandatory follow-up UX scope for the timeline/lab contract and must be delivered without breaking:
- manifest-first confirmation flow,
- versioned roadmap regeneration (`vN -> vN+1`),
- orchestrator graph as the ordering source of truth.

---

## Implementation mapping (engineering SSOT)

Product/UX contracts above are unchanged. **Persistence** is implemented as follows (canonical detail: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — section *GLC Orchestrator pack*; migration [`server/migrations/069_glc_orchestration_pack.sql`](../../server/migrations/069_glc_orchestration_pack.sql)):

- **`audits.execution_plan`** remains the canonical **coverage** contract (`selected_domains`, packages). It is **not** extended with manifest fields.
- **`audit_roadmap_manifest_snapshots`** — immutable rows (`payload` JSON validated by `RoadmapManifestPayloadSchema`; `selected_domains` must match `execution_plan.selected_domains` as a set).
- **`audit_strategy.glc_orchestration_pack`** + **`orchestration_pack_version`** — validated orchestrator JSON; **`manifest_snapshot_id`** inside the pack references the confirming manifest snapshot.

If this persistence model changes materially, publish a new ADR that supersedes this one (per *ADR lifecycle* above).
