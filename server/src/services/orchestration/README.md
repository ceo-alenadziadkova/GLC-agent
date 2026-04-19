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

See `docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md` and client roadmap ADR for product contracts.
