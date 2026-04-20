# GLC Orchestrator services

Cross-domain synthesis **above** finalized domain outputs and strategy initiatives. This layer answers: how do recommendations combine, sequence, and land on lanes — not whether a single domain phase matches collected evidence.

## Non-goals (do not merge with per-phase quality gates)

- **No FactChecker** and no site-evidence verification for orchestration output.
- **No CONTROL_OBJECT v1** for orchestration in phase 0; per-domain CO semantics stay unchanged.
- **No replacement** for domain agents or `StrategyAgent`; the orchestrator consumes structured JSON already saved on `audit_strategy`.

## Modules

- `map-strategy-initiative-to-action-node.ts` — DRY mapper from `StrategyInitiative` to `OrchestrationActionNode`; lists longer than `ORCHESTRATION_GRAPH_MAX_NODES` emit `initiative-cap-drop:*` entries in `conflicts_resolved`.
- `dedupe-orchestration-action-nodes.ts` — duplicate initiative `id` handling per `ORCHESTRATION_DUPLICATE_INITIATIVE_ID_POLICY`.
- `orchestration-graph-builder.ts` — deterministic DAG, cycle repair, lane index, critical path heuristic.
- `build-glc-orchestration-pack.ts` — validates `glc_orchestration_pack` with Zod (deterministic graph only).
- `orchestration-synthesis-context.ts` — bounded JSON user payload for synthesis (pack, scorecard, domain signals).
- `orchestration-pack-synthesis-claude.ts` — single Claude `tool_use` + `TokenTracker` (feature-flagged).
- `orchestration-synthesis.service.ts` — merge LLM `conflicts_resolved` rows into the deterministic pack (`FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS`).
- `roadmap-manifest.service.ts` — manifest Zod parse, equality with `execution_plan.selected_domains`, snapshot persistence.
- `orchestration-read.service.ts` — loads audit + strategy + manifest, builds and can persist a pack.
- `orchestration-pack-persist-run.service.ts` — shared plan governance + persist used by POST `/orchestration/pack`, commercial-offer rebuild, and optional auto-pack after phase 7 (`FEATURE_ORCHESTRATION_PACK_AUTO_AFTER_STRATEGY`).

## Read path inventory (single loader for orchestration)

- **Execution plan + user scoping:** `loadAuditExecutionPlanRow` in `orchestration-read.service.ts` reads `audits` via `fetchAuditByIdForUser` and normalizes `execution_plan`. All manifest/pack controllers and `orchestrator-timeline-read.service.ts` use this helper — **no second Supabase path** for the same concern.
- **ACL-only reads:** `director-orchestration-persistence.service.ts` calls `fetchAuditByIdForUser` only to verify access before writing `audit_domains`; it does **not** duplicate `loadAuditExecutionPlanRow` (no `execution_plan` normalization on that hot path — intentional YAGNI).
- **Full report aggregate:** `server/src/routes/reports.ts` loads `audit_strategy` with `select('*')` alongside recon/domains for PDF/CSV/JSON report profiling. That is an intentional **wider read** for the report artifact; it is not duplicated logic with `loadAuditExecutionPlanRow` (different columns and consumer). Refactor to a shared primitive only if both need the same normalized shape.

See `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and client roadmap ADR for product contracts. A **section-by-section map** (client ADR themes → modules) and a **crosswalk** between “engineering phases 0–6” and this repo’s rollout ADR phases live in `docs/adrs/ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md`.

## Definition of Done (orchestration program)

Rollout is complete when the following ADR acceptance criteria are met (implementation detail lives in linked modules):

| ADR | Path |
|-----|------|
| Orchestrator v1.1 (Meta-Director) | `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` |
| Client unified roadmap (multi-lane timeline) | `docs/adrs/ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md` |
| Partial audit coverage execution | `docs/adrs/ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md` |

**Contract SSOT:** Zod schemas under `server/src/schemas/` (pack, manifest, timeline, director slice, governance). Client mirrors stable enums/versions via `src/app/config/orchestration-contract.ts` and `src/app/config/orchestration-contract-parity.test.ts`.

### DoD traceability matrix (ADR acceptance vs implementation)

Status: **done** | **partial** | **gap** — update this table when behavior changes (living doc).

| ADR theme | Criterion (summary) | Status | Notes / modules |
|-----------|---------------------|--------|-----------------|
| ADR-GLC-ORCHESTRATOR-V1.1 | Layer 3 pack: graph, critical path, conflict rows, deterministic build | **done** | `build-glc-orchestration-pack.ts`, `orchestration-graph-builder.ts`; deterministic core is default; optional LLM conflict merge behind `FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS` with telemetry + deterministic fallback (`orchestration-synthesis.service.ts`, tests in `orchestration-synthesis.test.ts`) |
| ADR-GLC-ORCHESTRATOR-V1.1 | Director bundles → machine-readable merge input | **done** | Canonical `glc_director_execution` in domain prompts + `_append-glc-director-execution.md`; `DomainOutputSchema`, `extract-glc-director-slice-from-agent-output.ts`, `director-orchestration-persistence.service.ts`, `phaseRunner.ts`; regression in `orchestration-director-agent-output.test.ts`, `director-orchestration-domain-phase-coverage.test.ts` |
| ADR-GLC-ORCHESTRATOR-V1.1 | Global diagnosis / constraint / compression semantics in pack | **partial** | Pack DTO carries diagnosis fields; full ADR formula parity is iterative |
| ADR-CLIENT-UNIFIED-ROADMAP | Timeline primary; Lab = deep-dive | **done** (MVP) | `PortalTimelinePage.tsx` (subtitle when `orchestrationTimelinePrimaryUxEnabled`; **vN→vN+1 revision story** from `glc_orchestration_last_revision_diff` via `buildOrchestrationRevisionStorySummary`), `ORCHESTRATION_IA_COPY` + `ClientPostAuditCockpitSection.tsx`, `NavigationLinksSection.tsx`, `StrategyLabOrchestrationPanel.tsx` / `strategy-lab-copy.ts`, nav flags in `app-feature-flags.ts`, `app-shell-nav.test.ts` |
| ADR-CLIENT-UNIFIED-ROADMAP | Manifest preview → snapshot → pack; `manifest_snapshot_id` | **done** | `roadmap-manifest.service.ts`, migrations `069`–`071`, audit routes; **client portal wizard (V2):** `src/app/pages/PortalRoadmapManifestWizardPage.tsx`, `src/app/config/portal-manifest-wizard-copy.en.ts`, flags `APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled` + `orchestrationRoadmapUiEnabled` (CTAs: `ClientPostAuditCockpitSection`, `PortalTimelinePage`) |
| ADR-CLIENT-UNIFIED-ROADMAP | Seasonal buckets + cross-lane deps | **done** (MVP) | Partition: `orchestration-timeline-policy.ts` — preset weights (`partitionCriticalPathIntoSeasonBuckets`) **or** optional manifest **`plan_horizon`** + node `target_window_days` (`partitionCriticalPathIntoCalendarSeasonBuckets` / `partitionCriticalPathForTimelineDisplay`); UI bucket headings: `ORCHESTRATION_SEASON_BUCKET_LABELS_BY_PRESET` in `orchestration-roadmap-ui-copy.en.ts`; read model: `orchestrator-timeline-read.service.ts` exposes `version.plan_horizon`; tests: `orchestration-timeline-season-partition.test.ts`, `orchestrator-timeline-read.service.test.ts`. Optional: quarter-only anchors / TZ policy for display. |
| ADR-PARTIAL-AUDIT-COVERAGE | `execution_plan` canonical; manifest `selected_domains` match | **done** | `assertManifestMatchesExecutionPlan`, report coverage metadata |
| ADR-CLIENT (upsell / vN+1) | Commercial expansion → new manifest snapshot → pack persist + diff | **done** | `post-orchestration-commercial-offer.controller.ts`, `orchestration-commercial-offer.service.ts`, columns from migrations `070`–`071` |
| Rollout ADR | Single loader, flags, governance, telemetry keys | **done** | This README read path; `feature-flags.ts`, `orchestration-plan-governance-*.ts`, `orchestration-telemetry-policy.ts` |

**Doc drift guard:** compare periodically with `docs/adrs/ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md` (milestones, **percent complete**, phase remaining). **Rollout percentages and phase checklists live only in that ADR.** This README stays limited to the DoD matrix, module map, and flags/telemetry — update matrix **status** and **Notes** when behavior changes; link to the ADR for progress, do not copy % here.

### Feature flags and telemetry (production gate)

| Facade (`server/src/config/feature-flags.ts`) | Env override (infra) | Purpose |
|-----------------------------------------------|----------------------|---------|
| `isOrchestrationPackApiEnabled` | `FEATURE_ORCHESTRATION_PACK_API` | HTTP pack/manifest/timeline routes |
| `isOrchestrationPackAutoAfterStrategyEnabled` | `FEATURE_ORCHESTRATION_PACK_AUTO_AFTER_STRATEGY` | After phase 7, persist pack when latest manifest snapshot exists (logged soft-failures) |
| `getOrchestrationPlanGovernanceRolloutMode` | `FEATURE_ORCHESTRATION_PLAN_GOVERNANCE_ROLLOUT_MODE` | Persist gate: `orchestration-plan-governance-rollout-policy.ts` |
| `isDirectorOrchestrationAgentOutputEnabled` | `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT` | Strict director slice required in `phaseRunner.ts` when on |
| `isOrchestrationTimelinePrimaryUxEnabled` | `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` | Timeline KPI logs; align with `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled` (parity test) |
| `isOrchestrationConflictSynthesisEnabled` | `FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS` (+ rollout percent) | Optional LLM merge for conflict rows |

**Conflict synthesis monitoring (rollout):** structured logs use the `orchestration_synthesis.*` event prefix in `orchestration-synthesis.service.ts` and `orchestration-pack-synthesis-claude.ts` (e.g. `orchestration_synthesis.rollout_applied`, `orchestration_synthesis.rollout_skip`, `orchestration_synthesis.claude_failed`, `orchestration_synthesis.validation_retry`). Tune rollout with `FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS` and `FEATURE_ORCHESTRATION_CONFLICT_SYNTHESIS_ROLLOUT_PERCENT` (see `DEPLOYMENT.md` matrix). On failure, the pack stays **deterministic** (topology invariant); KPI `kpi_orchestration_synthesis_deterministic_fallback` is defined in `orchestration-telemetry-policy.ts`.

**Observability:** emit KPIs and alerts using keys from `server/src/config/orchestration-telemetry-policy.ts` (`ORCHESTRATION_TELEMETRY_METRICS`) only — no ad-hoc metric strings in services.

### Program closure checklist (final gate)

Before declaring the orchestration program “closed”:

1. DoD matrix above: no **gap** rows that product still cares about, or gaps explicitly deferred in ADR.
2. `pnpm vitest` for `server/src/tests/orchestration-*.test.ts`, `glc-orchestration-pack.test.ts`, `director-orchestration-persistence.test.ts`, `director-orchestration-domain-phase-coverage.test.ts`, `orchestration-commercial-offer.test.ts`, `orchestration-contract-parity.test.ts` (app).
3. E2E: `e2e/orchestration-timeline-manifest.spec.ts` (and related `e2e/orchestration-*.spec.ts`) with `E2E_ORCHESTRATION_AUDIT_ID` + `E2E_ORCHESTRATION_AUTH_TOKEN` set for staging.
4. Token budgets: pipeline / orchestration Claude calls within configured limits (`TokenTracker`, strategy pack flags).
5. Feature defaults: either remove temporary env overrides or record defaults in `SYSTEM_DEFAULTS` / `DEPLOYMENT.md` matrix.
6. Accessibility (manual): keyboard-focus order through timeline empty-state CTAs (`PortalTimelinePage`); screen-reader check on `role="status"` empty callout and seasonal bucket headings.

### Post-MVP change checklist (PR gate)

Use when merging work mapped to backlog **V1–V12** in `docs/adrs/ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md`:

1. **No-hardcode:** New thresholds, lane labels, caps, telemetry event keys, and long user-facing copy belong in `server/src/config/orchestration-*-policy.ts`, `orchestration-telemetry-policy.ts`, `orchestration-roadmap-presets.ts`, `orchestration-lanes.ts`, `orchestration-timeline-policy.ts`, and app-side `src/app/config/orchestration-*.ts` / `orchestration-roadmap-ui-copy.en.ts` — not in route handlers or TSX. Enable behavior with `server/src/config/feature-flags.ts` and `src/app/config/app-feature-flags.ts`; add or extend `orchestration-contract-parity.test.ts` when server and SPA must stay aligned.
2. **V4 / plan-level quality:** Do not add a plan-level `CONTROL_OBJECT` or new global deterministic gates beyond the current plan governance canon until `docs/adrs/ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md` is **Accepted** with explicit acceptance criteria and schema/API notes (see also `docs/adrs/ADR-ORCHESTRATION-PLAN-GOVERNANCE-CANON.md` for what is already shipped).
3. **Docs:** Update the DoD matrix in this README when orchestration behavior changes; keep rollout **percentages** and phase 0–7 history only in the rollout ADR.

## Artifact inventory (code map)

| Artifact | Primary modules |
|----------|-----------------|
| GLC orchestration pack | `build-glc-orchestration-pack.ts`, `schemas/glc-orchestration-pack.ts` |
| Roadmap manifest | `roadmap-manifest.service.ts`, `schemas/roadmap-manifest.ts` |
| Orchestrator timeline (read model) | `orchestrator-timeline-read.service.ts`, `schemas/orchestrator-timeline.ts` |
| Lane projection | `orchestration-lane-projection.ts` (used by `orchestration-graph-builder.ts`) |
| Director slice (baseline / deep) | `schemas/glc-director-orchestration-slice.ts`, `merge-orchestration-action-inputs.ts`, `director-orchestration-persistence.service.ts`, persist hook: `../pipeline/phaseRunner.ts` |
| Portal UI / flags | `src/app/pages/client-audit-view/`, `src/app/pages/PortalRoadmapManifestWizardPage.tsx`, `src/app/config/app-feature-flags.ts`, `src/app/lib/app-shell-nav.ts` |

**Production rollout:** enable `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT` only after domain agents emit a parseable director slice; strict phases (`director-orchestration-policy.ts`) fail fast when the flag is off. Narrow strict rollout with `DIRECTOR_ORCHESTRATION_STRICT_PHASE_PILOT` (empty = full strict set). Timeline-primary UX: `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` (server) must stay aligned with `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled` (see `src/app/config/orchestration-contract-parity.test.ts`).
