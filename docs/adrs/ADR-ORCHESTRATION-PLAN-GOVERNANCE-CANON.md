# ADR: Orchestration Plan Governance Canon

## Status

Accepted

## Context

`glc_orchestration_pack` became a versioned, client-visible planning artifact with manifest-first generation, revision diffs, and mixed input quality (strategy fallback + director slices). We already persisted governance metrics in runtime (`decision_hint`, integrity/coverage scores), but governance semantics were implicit in services and tests.

Without a canonical contract:

- plan acceptance can drift across environments;
- low-quality packs can appear healthy when confidence/risk coverage is missing;
- rollout flags can expose interactive actions before governance checks are stable.

## Decision

We define **plan-level governance** as a first-class canonical layer for orchestration:

1. Governance evaluation is mandatory for every persisted pack version.
2. `decision_hint` contract stays strict: `accept_plan | accept_with_warnings | refine_plan`.
3. Confidence and risk coverage are treated as **real coverage metrics** (empty maps are `0`, not `1`).
4. `refine_plan` blocks persistence in orchestrator build endpoints.
5. Feature flags and role gates control interaction modes, but do not bypass governance evaluation.

## Consequences

### Positive

- Deterministic acceptance behavior for roadmap regeneration.
- Better protection against false-green plans.
- Clear compatibility point for API/UI (`plan_governance` payload and warning semantics).

### Trade-offs

- More plans can fall into `accept_with_warnings` during partial data rollout.
- Tests and fixtures must include explicit confidence/risk coverage where needed.

## Implementation Notes

- Core evaluation: `server/src/services/orchestration/orchestration-plan-governance.service.ts`
- Policy thresholds: `server/src/config/orchestration-plan-governance-policy.ts`
- Enforced in build flow: `server/src/routes/audits/controllers/post-orchestration-pack.controller.ts`
- API exposure: `server/src/data/api` contracts and Strategy Lab orchestration panel.

## Rollout

1. Keep deterministic graph as baseline mode.
2. Keep synthesis as optional layer behind feature flags.
3. Monitor warning rates (`accept_with_warnings`) after rollout and tune policy in config, not in services.

## Post-MVP (v9) — optional governance CTAs (supersedes MVP-only “no `govern_action`” copy)

- **Server canon** — unchanged: `decision_hint` and persistence gates remain as in this ADR; evaluation is in `orchestration-plan-governance.service.ts` and manifest build routes.
- **Explicit consultant CTAs (2026-04+)** — `POST /api/audits/:id/orchestration/pack` accepts an optional **body** with `govern_action: 'accept_plan' | 'accept_with_warnings' | 'refine_plan'` and `expected_orchestration_pack_version` (optimistic concurrency). This records governance intent in `glc_orchestration_revision_history` and bumps pack version for accept paths; it does **not** replace manifest-first pack builds. Rollback: `FEATURE_CONSULTANT_GOVERNANCE_CTAS=false` (see `server/src/config/feature-flags.ts`). Telemetry: `kpi_orchestration_governance_action` in `orchestration-telemetry-policy.ts`.
- **Product MVP note** — the April 2026 MVP line item “read-only + `decision_hint` only” was the **launch default**; v9 full-product work adds the optional CTA path above. Historical DoD-6 in the sync ADR should be read in that light.
- **Consultant cockpit** — [`ConsultantOrchestrationCockpitPage`](../../src/app/pages/ConsultantOrchestrationCockpitPage.tsx) shows governance, rebuild, optional CTAs, and stale-version handling; same read contract as other surfaces.
