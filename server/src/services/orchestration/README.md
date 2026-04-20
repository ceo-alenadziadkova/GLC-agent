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

## Read path inventory (single loader for orchestration)

- **Execution plan + user scoping:** `loadAuditExecutionPlanRow` in `orchestration-read.service.ts` reads `audits` via `fetchAuditByIdForUser` and normalizes `execution_plan`. All manifest/pack controllers and `orchestrator-timeline-read.service.ts` use this helper — **no second Supabase path** for the same concern.
- **Full report aggregate:** `server/src/routes/reports.ts` loads `audit_strategy` with `select('*')` alongside recon/domains for PDF/CSV/JSON report profiling. That is an intentional **wider read** for the report artifact; it is not duplicated logic with `loadAuditExecutionPlanRow` (different columns and consumer). Refactor to a shared primitive only if both need the same normalized shape.

See `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and client roadmap ADR for product contracts.

## Definition of Done (orchestration program)

Rollout is complete when the following ADR acceptance criteria are met (implementation detail lives in linked modules):

| ADR | Path |
|-----|------|
| Orchestrator v1.1 (Meta-Director) | `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` |
| Client unified roadmap (multi-lane timeline) | `docs/adrs/ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE.md` |
| Partial audit coverage execution | `docs/adrs/ADR-PARTIAL-AUDIT-COVERAGE-EXECUTION-PLAN.md` |

**Contract SSOT:** Zod schemas under `server/src/schemas/` (pack, manifest, timeline, director slice, governance). Client mirrors stable enums/versions via `src/app/config/orchestration-contract.ts` and `src/app/config/orchestration-contract-parity.test.ts`.

## Artifact inventory (code map)

| Artifact | Primary modules |
|----------|-----------------|
| GLC orchestration pack | `build-glc-orchestration-pack.ts`, `schemas/glc-orchestration-pack.ts` |
| Roadmap manifest | `roadmap-manifest.service.ts`, `schemas/roadmap-manifest.ts` |
| Orchestrator timeline (read model) | `orchestrator-timeline-read.service.ts`, `schemas/orchestrator-timeline.ts` |
| Lane projection | `orchestration-lane-projection.ts` (used by `orchestration-graph-builder.ts`) |
| Director slice (baseline / deep) | `schemas/glc-director-orchestration-slice.ts`, `merge-orchestration-action-inputs.ts`, `director-orchestration-persistence.service.ts`, persist hook: `../pipeline/phaseRunner.ts` |
| Portal UI / flags | `src/app/pages/client-audit-view/`, `src/app/config/app-feature-flags.ts`, `src/app/lib/app-shell-nav.ts` |

**Production rollout:** enable `FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT` only after domain agents emit a parseable director slice; strict phases (`director-orchestration-policy.ts`) fail fast when the flag is off. Timeline-primary UX: `FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX` (server) must stay aligned with `APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled` (see `src/app/config/orchestration-contract-parity.test.ts`).
