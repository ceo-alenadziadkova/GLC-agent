# ADR: Rollout plan — Orchestrator, roadmap manifest, multi-lane timeline (phased, code-grounded)


| Field                      | Value                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                 | Accepted (living plan — update milestones in follow-up commits when scope completes)                                                                                                                     |
| **Date**                   | 2026-04-19                                                                                                                                                                                               |
| **Scope**                  | Phased delivery of orchestration + client roadmap UX aligned with `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`                                |
| **Engineering principles** | KISS, DRY, SOLID; policy/copy/thresholds in config modules and feature-flag facade — **no new inline business literals in services or UI** (see `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`) |

**No-hardcode (concrete):** extend `server/src/config/orchestration-*-policy.ts`, `orchestration-telemetry-policy.ts`, `orchestration-roadmap-presets.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`; app copy in `src/app/config/orchestration-*.ts` / `orchestration-roadmap-ui-copy.en.ts` / `portal-manifest-wizard-copy.en.ts`; server flags via `server/src/config/feature-flags.ts`, SPA via `src/app/config/app-feature-flags.ts` (parity tests where applicable).

### Canonical product docs

- `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`
- `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`
- `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`
- `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`

---

## Progress snapshot (evidence-based)

**MVP (Phases 0–7 in this ADR): ~100% complete in repo** as of 2026-04-20 — phased checklists below are **closed**; evidence: `server/src/services/orchestration/README.md` (DoD matrix), migrations `069`–`071`, Vitest `orchestration-*.test.ts`, E2E `e2e/orchestration-*.spec.ts` when `E2E_ORCHESTRATION_*` is set.

**Toward the full “north star” vision** (ideal backlog V1–V12 below): track separately from MVP %; remaining work is **post-MVP** (meta-phases P / Q / R).

### Already implemented (non-exhaustive, verify in tree)


| Area                           | Fact in repo                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Persistence**                | `audit_strategy.glc_orchestration_pack`, `orchestration_pack_version`, `glc_orchestration_last_revision_diff`, `glc_orchestration_revision_history` (migrations `069`–`071`); `audit_roadmap_manifest_snapshots` table                                                                                       |
| **Manifest**                   | POST preview, POST/GET snapshots, GET latest (`server/src/routes/audits/index.ts`)                                                                                                                                                                                                                           |
| **Pack build & merge**         | Services under `server/src/services/orchestration/` (e.g. `build-glc-orchestration-pack`, `merge-orchestration-action-inputs`, `map-strategy-initiative-to-action-node`, `map-domain-director-bundle-to-action-nodes`, graph builder, dedupe)                                                                |
| **Director slice persistence** | `director-orchestration-persistence.service.ts`, `GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY`, Zod slices                                                                                                                                                                                                           |
| **HTTP API**                   | POST/GET orchestration pack, regenerate, pack-diff, pack-diff-history; commercial-offer path; `GET /api/audits/:id/timeline` → `buildClientTimelineReadModel`                                                                                                                                                |
| **Consultant + client UI**     | `PortalTimelinePage.tsx`; **portal manifest wizard** `PortalRoadmapManifestWizardPage.tsx` (route `portal/audit/:id/roadmap-manifest`, flags `clientRoadmapManifestWizardEnabled` ∧ `orchestrationRoadmapUiEnabled`); Strategy Lab `StrategyLabOrchestrationPanel.tsx` / `StrategyLabOrchestratorListBody.tsx`; client nav timeline ordering via `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled`; `ClientPostAuditCockpitSection.tsx`, `NavigationLinksSection.tsx` (flagged) |
| **Config SSOT**                | `orchestration-*-policy.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, `orchestration-ui-limits.ts`, copy modules — aligns with no-hardcode rule                                                                                                                                         |
| **Tests / E2E**                | `server/src/tests/orchestration-*.test.ts`, `glc-orchestration-pack.test.ts`, `e2e/orchestration-*.spec.ts`                                                                                                                                                                                                  |


### Gaps vs final vision (post-MVP product backlog)

- **Seasonal UX**: preset-driven partitions and optional `plan_horizon` are in policy + read model; **quarter-only anchors** or **explicit TZ display rules** for client copy remain optional follow-ups.
- **Manifest-first wizard**: **standalone portal route ships** (`PortalRoadmapManifestWizardPage.tsx`, cockpit + timeline CTAs); optional polish (stepper UX, richer empty states) remains product-dependent.
- **Lab vs timeline**: MVP IA is flag-driven; **incremental copy polish** in Lab sections may continue.
- **Director coverage**: persistence exists; **uniform deep bundles** across all domains and pipeline hooks are product-dependent.
- **Optional LLM conflict synthesis**: gated by flags/policies — completeness depends on product activation.
- **Plan-level CONTROL_OBJECT** (separate from domain CO): **not** required for MVP; future ADR if introduced.

---

## Phased rollout (execution order)

Each phase ends with a **cumulative % toward final vision** (same definition as above: both ADRs + production-hardened UX).

### Phase 0 — Baseline & flags (complete when safe defaults documented)

**Goal:** Operators know which flags turn on timeline-primary UX and pack API for each environment.

- Confirm `isOrchestrationPackApiEnabled`, `isOrchestrationTimelinePrimaryUxEnabled`, `APP_FEATURE_FLAGS.clientTimelineEnabled` (and related) are documented in `DEPLOYMENT.md` / env matrix — **no new hardcoded toggles in components**.
- **Done (2026-04-20):** `DEPLOYMENT.md` matrix includes `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` and `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT`; SPA `APP_FEATURE_FLAGS` documented in `DEPLOYMENT.md` + `FRONTEND.md` (no `VITE_*`).

**Cumulative ~63%**

### Phase 1 — Harden read paths & DRY (server)

**Goal:** Single read path for pack + manifest + execution plan (avoid duplicate loaders).

- Audit `orchestration-read.service.ts`, `orchestrator-timeline-read.service.ts`, report routes for **one abstraction** for “authenticated audit strategy row + plan” where duplication hurts (extract only if measured duplication).
- Ensure all limits (graph nodes, history length) remain in **policy modules** (already pattern: `ORCHESTRATION_GRAPH_MAX_NODES`, etc.).

**Cumulative ~68%**

### Phase 2 — Client manifest → pack flow (product closure)

**Goal:** User never hits an empty timeline without understanding **why** (`missing_pack`, `stale_manifest`, `draft`).

- **Reuse** existing preview + snapshot APIs; **client** copy and CTA routing from `PortalTimelinePage` and `ClientPostAuditCockpitSection` (copy in config only).
- **Done (2026-04-20):** dedicated **manifest wizard** route under portal — `PortalRoadmapManifestWizardPage.tsx` composes POST preview, POST snapshot, POST orchestrator run; **no** duplicate manifest schema.

**Cumulative ~74%**

### Phase 3 — Timeline fidelity (seasons & lanes)

**Goal:** Align `ADR-CLIENT-UNIFIED-ROADMAP` seasonal language with data: manifest presets drive **labels** and bucket boundaries via **config** (`orchestration-roadmap-presets` / timeline policy), not inline TSX.

- Replace or augment heuristic partitioning when manifest provides explicit horizon.
- Cross-lane dependency emphasis already partially in DTO — extend **tests** for regression.

**Cumulative ~80%**

### Phase 4 — Strategy Lab repositioning (IA)

**Goal:** Lab is **detail**; timeline is **primary** when flag on.

- Navigation labels and tab order: config/copy + `buildClientNav` / `buildConsultantNav` already pattern — extend consistently.
- Deprecate “only quick/medium/strategic” as **primary** mental model in user-facing copy (keep data for backward compatibility).

**Cumulative ~86%**

### Phase 5 — Director bundle coverage

**Goal:** Each domain that ships Director deep **persists** a valid slice for merge; integration tests per domain.

- Follow `director-orchestration-policy.ts`; no ad-hoc keys in agents.
- **Does not** replace domain `CONTROL_OBJECT` / Decision Layer.

**Cumulative ~92%**

### Phase 6 — Optional synthesis & governance polish

**Goal:** If product enables LLM conflict synthesis, ensure token phase, telemetry (`ORCHESTRATION_TELEMETRY_POLICY`), and failure fallback **deterministic pack** remain KISS.

- Governance reasons stay in `orchestration-plan-governance-policy` / messages modules.

**Cumulative ~96%**

### Phase 7 — “Final” product definition gate

**Goal:** Sign-off checklist: client + consultant happy path E2E, diff/history UX, consultant commercial-offer flow if in scope, accessibility spot-check on timeline.

- Any **new** plan-level quality gate → **new ADR**, not scope creep here.
- **Automation (partial):** `e2e/orchestration-timeline-manifest.spec.ts` covers manifest preview + `GET /api/audits/:id/timeline` when `E2E_ORCHESTRATION_*` env is set; Vitest covers timeline season partition, director phase contract, timeline controller.
- **Manual:** keyboard tab order through timeline CTAs; screen reader spot-check on `near` / `mid` / `later` bucket headings (`PortalTimelinePage`).

**Cumulative ~100%**

---

## Post-MVP ideal backlog (V1–V12) and meta-phases P / Q / R

Track **vision** work here; do **not** merge into Phase 0–7 % above. Full row definitions stay concise; expand in product planning when needed.

| # | Theme | Status (rolling) |
|---|--------|------------------|
| V1 | Calendar-native `plan_horizon` on manifest + timeline partition | **Done (MVP calendar)** |
| V2 | Manifest-first wizard (portal): coverage → scenario → horizon → preview → snapshot → build pack | **Done (portal MVP)** — `PortalRoadmapManifestWizardPage.tsx`, `portal-manifest-wizard-copy.en.ts` |
| V3 | Full orchestrator ADR v1.1 formula parity in pack fields | Partial |
| V4 | Plan-level governance / `CONTROL_OBJECT` | Backlog — gate: [ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md](./ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md) |
| V5 | Client-grade dependency graph UX | Backlog |
| V6 | Evidence taxonomy UX (`Observed` / `Derived` / `Assumed` / `Missing`) | Partial |
| V7 | Cross-lane narratives (marketing × delivery) | Partial |
| V8 | Execution packs in journey | Partial |
| V9 | Expansion directors / lanes | Backlog |
| V10 | Consultant parity cockpit | Backlog |
| V11 | Human-readable vN→vN+1 revision story | Partial — `ClientPostAuditCockpitSection`, `PortalTimelinePage` (same copy + `buildOrchestrationRevisionStorySummary`); Strategy Lab history remains detailed view |
| V12 | Prompt / synthesis quality loop | Ongoing |

| Meta-phase | Rows | Intent |
|------------|------|--------|
| **P** — Client & consultant experience | V2, V5, V6, V7, V8, V11 (+ optional V1 display policy) | Wizard shipped; graph, evidence, lanes narrative, execution packs, revision story remain |
| **Q** — Orchestration depth & governance | V3, V4 | ADR field parity; plan-level quality only after V4 ADR Accepted |
| **R** — Ecosystem & quality loop | V9, V10, V12 | New lanes/directors, cockpit parity, telemetry iteration |

### Recommended next engineering slice (sprint anchor)

**Selected meta-phase:** **P** — **V2** **Done (portal MVP)**. **V11** revision narrative now on **execution timeline** (`PortalTimelinePage`) when `glc_orchestration_last_revision_diff` is present. **Next default P focus:** **V5** (graph UX) or deeper V11 (e.g. Lab diff browser), unless product re-prioritizes — update this sentence in the same commit as the decision.

**Process:** When closing a V-row, update the table above and (if behavior changed) the DoD matrix in `server/src/services/orchestration/README.md`. **Rollout phase % and MVP history** stay only in this ADR; the README does not duplicate phase percentages ([see “How to update”](#how-to-update-this-adr)).

---

## Risk register (short)


| Risk                      | Mitigation                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Timeline feels empty      | Strong empty states + link to manifest (already partially in DTO `waiting_list_domains`) |
| Flag matrix confusion     | Single env table in `DEPLOYMENT.md`                                                      |
| Over-engineering graph UI | Textual critical path first (already); fancy viz only after API stable                   |


---

## How to update this ADR

When a phase completes, adjust **Progress snapshot** percentages and tick milestones in git with a short commit message. Do not rewrite historical decisions in other ADRs; supersede only when contracts change.

### Documentation split (single source of truth)

- **Rollout progress** — MVP phase %, cumulative table, post-MVP V1–V12 status: **this ADR only**.
- **Implementation map / DoD traceability** — module pointers, flags, telemetry: `server/src/services/orchestration/README.md` (update when shipped behavior changes; **do not** paste rollout % tables there).