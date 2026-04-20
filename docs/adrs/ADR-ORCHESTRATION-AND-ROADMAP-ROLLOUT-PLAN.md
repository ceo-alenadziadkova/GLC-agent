# ADR: Rollout plan — Orchestrator, roadmap manifest, multi-lane timeline (phased, code-grounded)


| Field                      | Value                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                 | Accepted (living plan — update milestones in follow-up commits when scope completes)                                                                                                                     |
| **Date**                   | 2026-04-19                                                                                                                                                                                               |
| **Scope**                  | Phased delivery of orchestration + client roadmap UX aligned with `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`                                |
| **Engineering principles** | KISS, DRY, SOLID; policy/copy/thresholds in config modules and feature-flag facade — **no new inline business literals in services or UI** (see `docs/ARCHITECTURE.md`, `.cursor/rules/no-hardcode.mdc`) |


### Canonical product docs

- `ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md`
- `ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md`
- `ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md`
- `docs/instructions/ORCHESTRATOR-INSTRUCTIONS.md`

---

## Progress snapshot (evidence-based)

**Estimated completion toward the full vision in the two client/orchestrator ADRs: ~62%** (see rationale below).

### Already implemented (non-exhaustive, verify in tree)


| Area                           | Fact in repo                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Persistence**                | `audit_strategy.glc_orchestration_pack`, `orchestration_pack_version`, `glc_orchestration_last_revision_diff`, `glc_orchestration_revision_history` (migrations `069`–`071`); `audit_roadmap_manifest_snapshots` table                                                                                       |
| **Manifest**                   | POST preview, POST/GET snapshots, GET latest (`server/src/routes/audits/index.ts`)                                                                                                                                                                                                                           |
| **Pack build & merge**         | Services under `server/src/services/orchestration/` (e.g. `build-glc-orchestration-pack`, `merge-orchestration-action-inputs`, `map-strategy-initiative-to-action-node`, `map-domain-director-bundle-to-action-nodes`, graph builder, dedupe)                                                                |
| **Director slice persistence** | `director-orchestration-persistence.service.ts`, `GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY`, Zod slices                                                                                                                                                                                                           |
| **HTTP API**                   | POST/GET orchestration pack, regenerate, pack-diff, pack-diff-history; commercial-offer path; `GET /api/audits/:id/timeline` → `buildClientTimelineReadModel`                                                                                                                                                |
| **Consultant + client UI**     | `PortalTimelinePage.tsx`; Strategy Lab `StrategyLabOrchestrationPanel.tsx` / `StrategyLabOrchestratorListBody.tsx`; client nav timeline ordering via `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled`; `ClientPostAuditCockpitSection.tsx`, timeline link in `NavigationLinksSection.tsx` (flagged) |
| **Config SSOT**                | `orchestration-*-policy.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, `orchestration-ui-limits.ts`, copy modules — aligns with no-hardcode rule                                                                                                                                         |
| **Tests / E2E**                | `server/src/tests/orchestration-*.test.ts`, `glc-orchestration-pack.test.ts`, `e2e/orchestration-*.spec.ts`                                                                                                                                                                                                  |


### Gaps vs final vision (why not 100%)

- **Seasonal UX**: timeline buckets (`near` / `mid` / `far`) are a **projection heuristic** in `orchestrator-timeline-read.service.ts` — not yet full “named seasons” tied to every manifest preset in UI.
- **Manifest-first wizard**: manifest capture exists in Lab/orchestration panel; **standalone guided flow** for “confirm before first pack” can be clearer for clients.
- **Lab vs timeline**: split is started; **full reframing** of Strategy Lab copy/IA (timeline primary, lab = detail) is incremental.
- **Director coverage**: persistence exists; **uniform deep bundles** across all domains and pipeline hooks are product-dependent.
- **Optional LLM conflict synthesis**: gated by flags/policies — completeness depends on product activation.
- **Plan-level CONTROL_OBJECT** (separate from domain CO): **not** required for MVP; future ADR if introduced.

---

## Phased rollout (execution order)

Each phase ends with a **cumulative % toward final vision** (same definition as above: both ADRs + production-hardened UX).

### Phase 0 — Baseline & flags (complete when safe defaults documented)

**Goal:** Operators know which flags turn on timeline-primary UX and pack API for each environment.

- Confirm `isOrchestrationPackApiEnabled`, `isOrchestrationTimelinePrimaryUxEnabled`, `APP_FEATURE_FLAGS.clientTimelineEnabled` (and related) are documented in `DEPLOYMENT.md` / env matrix — **no new hardcoded toggles in components**.
- **Remaining effort:** small doc/env pass.

**Cumulative ~63%**

### Phase 1 — Harden read paths & DRY (server)

**Goal:** Single read path for pack + manifest + execution plan (avoid duplicate loaders).

- Audit `orchestration-read.service.ts`, `orchestrator-timeline-read.service.ts`, report routes for **one abstraction** for “authenticated audit strategy row + plan” where duplication hurts (extract only if measured duplication).
- Ensure all limits (graph nodes, history length) remain in **policy modules** (already pattern: `ORCHESTRATION_GRAPH_MAX_NODES`, etc.).

**Cumulative ~68%**

### Phase 2 — Client manifest → pack flow (product closure)

**Goal:** User never hits an empty timeline without understanding **why** (`missing_pack`, `stale_manifest`, `draft`).

- **Reuse** existing preview + snapshot APIs; improve **client** copy and CTA routing from `PortalTimelinePage` and `ClientPostAuditCockpitSection` (copy in config only).
- Optional: dedicated **manifest step** route under portal (thin page composing existing API calls — **no** parallel manifest schema).

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

**Cumulative ~100%**

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