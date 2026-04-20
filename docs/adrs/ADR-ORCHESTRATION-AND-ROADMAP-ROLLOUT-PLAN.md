# ADR: Rollout plan — Orchestrator, roadmap manifest, multi-lane timeline (phased, code-grounded)


| Field                      | Value                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                 | Accepted (living plan — update milestones in follow-up commits when scope completes)                                                                                                                     |
| **Date**                   | 2026-04-19                                                                                                                                                                                               |
| **Scope**                  | Phased delivery of orchestration + client roadmap UX aligned with `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`                                |
| **Engineering principles** | KISS, DRY, SOLID; policy/copy/thresholds in config modules and feature-flag facade — **no new inline business literals in services or UI** (see `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`) |


**No-hardcode (concrete):** extend `server/src/config/orchestration-*-policy.ts`, `director-orchestration-policy.ts`, `orchestration-telemetry-policy.ts`, `orchestration-roadmap-presets.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, `orchestration-graph-policy.ts`, `orchestration-client-contract.ts`; app copy and UI caps in `src/app/config/orchestration-*.ts` / `orchestration-roadmap-ui-copy.en.ts` / `portal-manifest-wizard-copy.en.ts` / `orchestration-ui-limits.ts` / `orchestration-pack-graph-flow.config.ts` / `strategy-execution-pack-api-error-codes.ts` (as applicable); server flags via `server/src/config/feature-flags.ts`, SPA via `src/app/config/app-feature-flags.ts` (parity tests where applicable). **KISS / DRY / SOLID:** one Zod SSOT per contract under `server/src/schemas/`; services orchestrate and compose; avoid duplicate DTOs or magic numbers in TSX/routes.

### Canonical product docs

- `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`
- `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`
- `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`
- `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`

---

## Map — product/architecture themes → this plan

Use this table to connect **north-star discussions** (orchestrator, client timeline, quality gates, manifest-first UX) to **concrete work** already tracked below. It does not replace Phase 0–7 or the V1–V12 backlog; it routes readers to the right row.


| Theme                                                                                                            | Product / architecture anchor                                                    | Where it lands here                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta-orchestrator: single plan, weighted graph, conflict matrix, critical path                                   | `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`                                     | **MVP:** pack build + merge + graph (`server/src/services/orchestration/`*). **Post-MVP depth:** backlog **V3** (full ADR field parity in persisted pack). |
| Orchestrator **complements** FactChecker + `CONTROL_OBJECT` + Decision Layer (per-domain), does not replace them | `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` (relationship section)              | No duplicate domain CO; optional future **plan-level** gate → backlog **V4** only after `ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md` Accepted.             |
| Client: seasons, multi-lane timeline, marketing ∥ delivery sync, lab vs timeline                                 | `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`                           | **Phases 2–4** (manifest flow, lane fidelity, Lab IA). **Post-MVP:** **V1** (calendar horizon), **V5–V8**, **V7** (cross-lane narrative).                  |
| User **commits manifest** (coverage + change scenario + horizon) **before** roadmap; versions vN / vN+1          | Same + `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`                            | **Phase 2** + backlog **V2** (wizard), **V11** (revision story).                                                                                           |
| Director two-stage + machine-readable slice merged into pack                                                     | `ADR-DIRECTOR-LAYER-TWO-STAGE-DEEP-AUDIT.md`, `director-orchestration-policy.ts` | **Phase 5** + services `director-orchestration-persistence.service.ts`, `map-domain-director-bundle-to-action-nodes.ts`.                                   |
| Flags, caps, copy — **no** inline business literals in services/UI                                               | `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`                          | **Phase 0–1** + header **No-hardcode** list above; any new limit → config module.                                                                          |


**How to read the rest of this ADR:** execute **Phased rollout** Phase 0–7 in order for operational closure; use **Post-MVP** meta-phases **P / Q / R** and rows **V1–V12** for remaining vision work. Implementation traceability: `server/src/services/orchestration/README.md` (DoD matrix, **no** duplicated % tables).

---

## Progress snapshot (evidence-based)

**MVP (Phases 0–7 in this ADR): ~100% complete in repo** as of 2026-04-20 — phased checklists below are **closed**; evidence: `server/src/services/orchestration/README.md` (DoD matrix), migrations `069`–`071`, Vitest (see **Verification log** below), E2E `e2e/orchestration-*.spec.ts` when `E2E_ORCHESTRATION_`* is set.

**Toward the full “north star” vision** (ideal backlog V1–V12 below): track separately from MVP %; remaining work is **post-MVP** (meta-phases P / Q / R).

### Verification log (rolling)

Re-run and append a row when orchestration, timeline, manifest, graph, or governance behavior changes materially.


| Date       | Check                                                                                           | Result                                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-20 | `cd server && pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts` | **23** test files, **140** tests, all **passed**                                                                                                                                                                                                         |
| 2026-04-20 | SQL migrations in tree (orchestration pack + revision metadata)                                 | `069_glc_orchestration_pack.sql`, `070_glc_orchestration_last_revision_diff.sql`, `071_glc_orchestration_revision_history.sql`                                                                                                                           |
| 2026-04-20 | E2E specs present                                                                               | `e2e/orchestration-timeline-manifest.spec.ts`, `orchestration-snapshot-regenerate.spec.ts`, `orchestration-depth-lanes-sync.spec.ts`, `orchestration-governance-conflicts.spec.ts` — gated by documented `E2E_ORCHESTRATION_`* env (see `DEPLOYMENT.md`) |
| 2026-04-21 | `cd server && pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts` | **23** test files, **140** tests, all **passed**                                                                                                                                                                                                         |
| 2026-04-21 | App Vitest (pack graph + portal timeline + Strategy Lab orchestrator UI)                      | `build-orchestration-pack-flow-graph.test.ts`, `build-orchestration-pack-dot-export.test.ts`, `PortalTimelinePage.test.tsx`, `strategy-lab-orchestrator-ui.test.tsx` — **4** files, **21** tests, all **passed**                                         |


**Note:** Later migrations (e.g. `072_`*) may exist for unrelated product concerns; they do not replace the orchestration baseline above unless they alter pack/manifest schema — then update this ADR and `server/src/services/orchestration/README.md` in the same change.

### Already implemented (non-exhaustive, verify in tree)


| Area                           | Fact in repo                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persistence**                | `audit_strategy.glc_orchestration_pack`, `orchestration_pack_version`, `glc_orchestration_last_revision_diff`, `glc_orchestration_revision_history` (migrations `069`–`071`); `audit_roadmap_manifest_snapshots` table                                                                                                                                                                                                                                                                  |
| **Manifest**                   | POST preview, POST/GET snapshots, GET latest (`server/src/routes/audits/index.ts`)                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Pack build & merge**         | Services under `server/src/services/orchestration/` (e.g. `build-glc-orchestration-pack`, `merge-orchestration-action-inputs`, `map-strategy-initiative-to-action-node`, `map-domain-director-bundle-to-action-nodes`, graph builder, dedupe)                                                                                                                                                                                                                                           |
| **Director slice persistence** | `director-orchestration-persistence.service.ts`, `GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY`, Zod slices                                                                                                                                                                                                                                                                                                                                                                                      |
| **HTTP API**                   | POST/GET orchestration pack, regenerate, pack-diff, pack-diff-history; commercial-offer path; `GET /api/audits/:id/timeline` → `buildClientTimelineReadModel`                                                                                                                                                                                                                                                                                                                           |
| **Consultant + client UI**     | `PortalTimelinePage.tsx`; **portal manifest wizard** `PortalRoadmapManifestWizardPage.tsx` (route `portal/audit/:id/roadmap-manifest`, flags `clientRoadmapManifestWizardEnabled` ∧ `orchestrationRoadmapUiEnabled`); Strategy Lab `StrategyLabOrchestrationPanel.tsx` / `StrategyLabOrchestratorListBody.tsx`; client nav timeline ordering via `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled`; `ClientPostAuditCockpitSection.tsx`, `NavigationLinksSection.tsx` (flagged) |
| **Config SSOT**                | `orchestration-*-policy.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, `orchestration-ui-limits.ts`, copy modules — aligns with no-hardcode rule                                                                                                                                                                                                                                                                                                                    |
| **Tests / E2E**                | `server/src/tests/orchestration/*.test.ts` (**22** files) + `glc-orchestration-pack.test.ts`; recommended gate: `pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts` — see **Verification log**; `e2e/orchestration-*.spec.ts` (**4** files)                                                                                                                                                                                                              |


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
- **Done (2026-04-20):** `DEPLOYMENT.md` matrix includes `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` and `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT`; SPA `APP_FEATURE_FLAGS` documented in `DEPLOYMENT.md` + `FRONTEND.md` (no `VITE`_*).

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
- **Automation (partial):** `e2e/orchestration-timeline-manifest.spec.ts` covers manifest preview + `GET /api/audits/:id/timeline` when `E2E_ORCHESTRATION`_* env is set; Vitest covers timeline season partition, director phase contract, timeline controller.
- **Manual:** keyboard tab order through timeline CTAs; screen reader spot-check on `near` / `mid` / `later` bucket headings (`PortalTimelinePage`).

**Cumulative ~100%**

---

## Post-MVP ideal backlog (V1–V12) and meta-phases P / Q / R

Track **vision** work here; do **not** merge into Phase 0–7 % above. Full row definitions stay concise; expand in product planning when needed.


| #   | Theme                                                                                           | Status (rolling)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Calendar-native `plan_horizon` on manifest + timeline partition                                 | **Done (MVP calendar)**                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V2  | Manifest-first wizard (portal): coverage → scenario → horizon → preview → snapshot → build pack | **Done (portal MVP)** — `PortalRoadmapManifestWizardPage.tsx`, `portal-manifest-wizard-copy.en.ts`                                                                                                                                                                                                                                                                                                                                                                               |
| V3  | Full orchestrator ADR v1.1 formula parity in pack fields                                        | Partial                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V4  | Plan-level governance / `CONTROL_OBJECT`                                                        | Backlog — gate: [ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md](./ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md)                                                                                                                                                                                                                                                                                                                                                                       |
| V5  | Client-grade dependency graph UX                                                                | Partial — portal timeline **Plan dependency map** (`PortalTimelinePackGraphPanel`: critical path + dependency list **sync with map** — node or **edge** focus, **fitView** on edge endpoint pair, canvas **edge click**; `PortalPackGraphFlowCanvas.tsx` + `ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT` min/max zoom + fit padding; **expanded map** budgets, **fit-to-view** control, `@xyflow/react` + Dagre, DOT export; `build-orchestration-pack-flow-graph.ts`; caps in `orchestration-ui-limits.ts` / `orchestration-pack-graph-flow.config.ts`); deeper canvas polish / consultant parity / full-graph modes still backlog |
| V6  | Evidence taxonomy UX (`Observed` / `Derived` / `Assumed` / `Missing`)                           | Partial — counts on pack graph nodes from director actions (`evidence_taxonomy`); badges on portal timeline, pack graph panel, Strategy Lab orchestrator lists (`OrchestrationEvidenceTaxonomyBadges`*); full initiative-level drill-down / report surfacing still incremental                                                                                                                                                                                                   |
| V7  | Cross-lane narratives (marketing × delivery)                                                    | Partial — portal timeline **Sync markers** intro copy when blocking cross-lane deps exist (`ORCHESTRATION_UI_COPY.timelineCrossLaneNarrative`*); richer lane stories / consultant cockpit parity still backlog                                                                                                                                                                                                                                                                   |
| V8  | Execution packs in journey                                                                      | Partial — client **Detail pack** CTA on timeline top 7d/30d → `POST .../strategy/execution-pack`, invalidate pack list, **mapped API error toasts** (`format-execution-pack-timeline-request-error.ts`), **busy state** on active row (`PortalTimelinePage.tsx`); Lab remains multi-select / path options                                                                                                                                                                        |
| V9  | Expansion directors / lanes                                                                     | Backlog                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V10 | Consultant parity cockpit                                                                       | Backlog                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V11 | Human-readable vN→vN+1 revision story                                                           | Partial — `ClientPostAuditCockpitSection`, `PortalTimelinePage` (same copy + `buildOrchestrationRevisionStorySummary`); Strategy Lab history remains detailed view                                                                                                                                                                                                                                                                                                               |
| V12 | Prompt / synthesis quality loop                                                                 | Ongoing                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |



| Meta-phase                               | Rows                                                   | Intent                                                                                   |
| ---------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **P** — Client & consultant experience   | V2, V5, V6, V7, V8, V11 (+ optional V1 display policy) | Wizard shipped; graph, evidence, lanes narrative, execution packs, revision story remain |
| **Q** — Orchestration depth & governance | V3, V4                                                 | ADR field parity; plan-level quality only after V4 ADR Accepted                          |
| **R** — Ecosystem & quality loop         | V9, V10, V12                                           | New lanes/directors, cockpit parity, telemetry iteration                                 |


### Recommended next engineering slice (sprint anchor)

**Selected meta-phase:** **P** — **V2** **Done**; **V11** on timeline; **V5** **partial** (panel + DOT); **V6** **partial** (evidence taxonomy); **V7** **partial** (sync-marker narrative); **V8** **partial** (one-click pack + error mapping + row busy UI).

**Current engineering default (until product says otherwise):** continue **V5** — consultant **parity** for the dependency map / full-graph modes, and any remaining canvas polish (panel already supports node+edge selection sync, viewport policy in `ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT`). **Alternates:** richer **V7** (lane-by-lane cross-lane stories; copy/policy only in config modules) or **V8** (execution-pack lists, repeat flows, shared error formatters / API error codes). Reprioritize by editing this paragraph in the **same commit** as the code.

**Post-MVP PR ritual:** (1) ship code + Vitest (`pnpm vitest run src/tests/orchestration src/tests/glc-orchestration-pack.test.ts`; app `orchestration-contract-parity.test.ts` when the contract moves; optional `e2e/orchestration-*.spec.ts` with `E2E_ORCHESTRATION`_* when warranted); (2) update the **Status** cell for the touched **V1–V12** row in the table above; (3) if sprint focus changes, update this **Recommended next engineering slice** section; (4) if orchestration/timeline/manifest/graph/evidence behavior changed, update the DoD matrix in `server/src/services/orchestration/README.md` and append **Verification log**; (5) do **not** add a parallel rollout doc — progress stays here and in that README only. **Rollout phase % and MVP history** stay only in this ADR; the README does not duplicate phase percentages ([see “How to update”](#how-to-update-this-adr)).

---

## Risk register (short)


| Risk                      | Mitigation                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Timeline feels empty      | Strong empty states + link to manifest (already partially in DTO `waiting_list_domains`) |
| Flag matrix confusion     | Single env table in `DEPLOYMENT.md`                                                      |
| Over-engineering graph UI | Textual critical path first (already); fancy viz only after API stable                   |


---

## How to update this ADR

When a phase completes, adjust **Progress snapshot** percentages and tick milestones in git with a short commit message. After meaningful merges to `main` (or before a release), append a row to **Verification log** with the exact Vitest command and pass counts. Do not rewrite historical decisions in other ADRs; supersede only when contracts change.

**Meta Q (V3 / V4):** **V3** (full orchestrator ADR v1.1 field parity) ships only through `**server/src/schemas/`** as the single Zod SSOT, version/migration discipline, and regression tests (`orchestration-*.test.ts`, `glc-orchestration-pack.test.ts` as applicable) — no shadow DTOs in services. **V4** (plan-level quality / plan-level `CONTROL_OBJECT`) is **blocked** until `ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md` is **Accepted**; do not expand domain `CONTROL_OBJECT` or domain agents to compensate.

### Documentation split (single source of truth)

- **Rollout progress** — MVP phase %, cumulative table, post-MVP V1–V12 status: **this ADR only**.
- **Implementation map / DoD traceability** — module pointers, flags, telemetry: `server/src/services/orchestration/README.md` (update when shipped behavior changes; **do not** paste rollout % tables there).