# ADR: Plan Workspace Unified (v1)

**Status:** Accepted  
**Date:** 2026-05-06  
**Supersedes:** `ADR-PLAN-WORKSPACE-UNIFIED-PROPOSED-V1.md` (same decision record; filename dropped `-PROPOSED-` on acceptance.)

## Context

Strategy Lab (`/strategy/:id`) and Plan (`/plan/:id`) today feel like two tools: separate URLs, parallel navigation patterns (journey strip + phase anchors + orchestrator tablist + accordions), and a two-step “Save snapshot” then “Build pack” mental model. Consultants must learn multiple IA surfaces to reach one outcome.

Observed issues (code-grounded):

- Strategy Lab page composition: layout + hooks split across dedicated modules (Phase 1); Plan-workspace shell work completed in Phase 2/3.
- Plan execution views use coordinated invalidation via `invalidatePlanWorkspaceQueries` (`glcKeys.planWorkspace.detail`, audit + pack + plan-board keys).
- Cross-surface deep link `?focus=` is honored on Board, Roadmap, and Table (resolved to pack graph node id where applicable); legacy `task=` remains for deep links that already use it.

Related ADRs:

- [ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md](./ADR-DELIVERY-BOARD-REPLACES-NARRATIVE-TIMELINE-PROPOSED-V1.md) — PB-019 (legacy narrative timeline sunset), PB-020 (board identity / initiative edit).
- [ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md](./ADR-PRESERVE-CANONICAL-NODE-KEY-EPIC1.md) — canonical node key preservation.

## Decision (target architecture)

1. **Single “Plan Workspace” IA** — canonical URL `/plan/:id` with modes `?mode=define|shape|execute` (and execute sub-views `view=board|roadmap|table`). Strategy Lab studio content is embedded under `?mode=define|shape`; `/strategy/:id` redirects to `/plan/:id?mode=shape` with hash → mode mapping.
2. **Single linear progress** — journey strip links use `?mode=` on plan routes; Plan step opens `?mode=execute` with default workbench `view`.
3. **Single compile action (product)** — primary “Compile plan” backed by `POST /api/audits/:id/orchestration/compile`; snapshot-only under Advanced (in-panel accordion on standalone `/strategy`, or `PlanAdvancedDrawer` + Plan chrome overflow on `/plan?mode=define|shape`). Cmd/Ctrl+K can dispatch a compile request event when Shape surface is mounted.
4. **Symmetric deep linking** — `?focus=<canonical_node_key>` honored on Board, Roadmap, and Table.
5. **Progressive disclosure** — On canonical Plan studio (`/plan?mode=define|shape`), Advanced orchestration sections register into `PlanAdvancedDrawer` (right sheet) and open from Strategy Planning chrome overflow or the in-panel shortcut; standalone Strategy Lab (`/strategy`) keeps the in-panel Advanced accordion for tests and legacy mount without the drawer provider.
6. **React Query aggregation** — `glcKeys.planWorkspace.detail(auditId)` documents the invalidation bundle; `invalidatePlanWorkspaceQueries` invalidates audit detail, orchestration pack, and plan-board queries.

## Trade-offs

| Decision | Plus | Minus | Mitigation |
|----------|------|-------|------------|
| Unify routes under `/plan/:id` | One mental model | Bookmarks / old links | `Navigate replace` from `/strategy/:id`; alias in `@glc/intake-core` spa-routes for two releases |
| Server compile endpoint | One transaction, clearer UX | New API surface | Keep `manifest-snapshots` + `orchestrator/run`; deprecate gradually |
| Replace narrative Timeline with Table | Aligns with Delivery Board ADR | Presentation loss for some users | Print preset `view=table&print=true` (future) |
| Container-query layout | One layout code path | Safari ≥ 16 | Verify browserslist; fallback media queries |
| Cmd-K palette | Power-user speed | Discoverability | Header hint + first-run tooltip (future) |

## Migration phases

- **Phase 1 — Status: Implemented** — Hooks extraction, single compile CTA, `?focus=` symmetry, inline Board edits, removal of `StrategyLabPhaseNav`, journey strip (see codebase at acceptance date).
- **Phase 2 — Status: Implemented** — `?mode=define|shape|execute`, `PlanModeBar`, embedded `StrategyLab` under `/plan`, `LegacyStrategyPathRedirect`, `StrategyJourneyHeader` + workbench links to canonical plan URLs, client/consultant CTAs updated.
- **Phase 3 — Status: Implemented** — Table execute view (`PlanTableSurface` over plan-board cards), `invalidatePlanWorkspaceQueries` / `glcKeys.planWorkspace.detail`, Cmd/Ctrl+K `PlanCommandPalette` + command registry, narrative Timeline removal (GLC-PB-019).

## Consequences

- Documentation and MASTER index link to this ADR for “Plan workspace unification”.
- Further UX (batch table edits, optional Advanced-only overflow without in-panel shortcut) is out of scope for this ADR revision.

## Footer

**ADR file status:** Accepted — Phase 1–3 implemented in tree.  
**Tickets:** **GLC-PB-019** narrative Timeline removed from unified Plan shell; **GLC-PB-020** board identity preference lives under orchestration Advanced (accordion on `/strategy`, drawer on `/plan` studio).
