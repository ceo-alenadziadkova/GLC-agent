# ADR: Orchestration + client roadmap — post–Product MVP (v9) critical delta (2026-04+)

**Status:** Accepted (engineering documentation)  
**Supersedes:** ad-hoc v9 “full product” planning text that duplicated shipped work.  
**Companion:** [ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md](./ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md) (rolling sync; §5 gap closers marked **shipped**).

## Problem

A post-MVP roadmap (“v9 full product”) must not be confused with a greenfield build list. Much of the §5 surface area, governance CTA, lane registry, LLM cache plumbing, and race-safety UI **already exist in the repository**; repeating them as “to do” misallocates planning and review time.

## Decision

1. **Canonical telemetry names** for LLM cost and cache observability on orchestration paths are **not** bare `kpi_llm_*`. They are:
   - `kpi_orchestration_llm_cache_hit_rate`
   - `kpi_orchestration_llm_cost_per_audit_usd`  
   Defined in [`server/src/config/orchestration-telemetry-policy.ts`](../../server/src/config/orchestration-telemetry-policy.ts) and validated by `pnpm run audit:orchestration-telemetry` (DoD-7).

2. **Server-side manifest preview memo** (scenario compare / dual `POST /api/audits/:id/roadmap/manifest-preview`) **exists**: [`server/src/services/orchestration/roadmap-manifest-preview-memo.ts`](../../server/src/services/orchestration/roadmap-manifest-preview-memo.ts) (TTL 60s; gated when scenario compare is enabled on the server).

3. **LLM prompt cache implementation paths** in code (do not map one-to-one to obsolete filenames such as `orchestration-synthesis.service.ts` or `services/director/deep-dive-*.service.ts`):
   - [`server/src/services/orchestration/orchestration-pack-synthesis-claude.ts`](../../server/src/services/orchestration/orchestration-pack-synthesis-claude.ts) — pack conflict synthesis
   - [`server/src/services/strategy/strategy-execution-pack-claude.ts`](../../server/src/services/strategy/strategy-execution-pack-claude.ts) — execution pack
   - [`server/src/agents/base/claude-agent-invoke.ts`](../../server/src/agents/base/claude-agent-invoke.ts) — shared domain-agent invocation  
   Director deep-dive traffic uses existing orchestrator/agent code paths, not a separate `deep-dive-*.service.ts` module name.

4. **Remaining post-MVP work is verification + ops + product gates**, not re-implementation of shipped UX:
   - **DoD-4 (P-7):** panels, alerts, on-call routing, and optional synthetic canary — org-specific; reference [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md#orchestration-slo-product-mvp) and the optional [`.github/workflows/orchestration-synthetic-probe.yml`](../../.github/workflows/orchestration-synthetic-probe.yml).
   - **E2E (P-8):** `pnpm run test:e2e:orchestration` includes many specs that **skip** without `E2E_ORCHESTRATION_*` (and related UI auth secrets). CI stays green; **meaningful** coverage needs repository **secrets** + `VITE_API_URL` (proxy) as documented in [`e2e/README.md`](../../e2e/README.md). A JSON KPI report is emitted in CI when `E2E_ORCHESTRATION_JSON=1` (see `scripts/e2e-orchestration-kpi.mjs`).
   - **Bundle (P-10):** re-run `pnpm build && pnpm run audit:bundle-main-budget` after large UX merges.
   - **V4 `control_object` (P-5):** Zod and [`PlanControlObjectPanel`](../../src/app/components/glc/PlanControlObjectPanel.tsx) are in tree; **GA** is gated on product + ADR acceptance — enable [`FEATURE_PLAN_CONTROL_OBJECT`](../../server/src/config/feature-flags.ts) and [`planControlObjectUiEnabled`](../../src/app/config/app-feature-flags.ts) together, not a new schema migration for JSONB-only fields.

5. **Optional architecture follow-ups** (not required for the minimal delta): pack query single-cache unification, dedicated `governance.service.ts` state machine — see [`e2e/README.md`](../../e2e/README.md) (post–v9 backlog note).

## Consequences

- PR and release notes for post-MVP should **link this ADR** when claiming “v9” scope, instead of re-pasting a full build matrix.
- Dashboards and runbooks use **`kpi_orchestration_*`** names from the telemetry policy to avoid DoD-7 drift.
- E2E “full matrix” is an **ops + secret** problem as much as a code problem.

## Implementation checklist (read-only for reviewers)

- [ ] `ORCHESTRATION_DASHBOARD_URL` and alert routes documented in the org index (not in git).
- [ ] Synthetic workflow variables: `VITE_API_URL` / `ORCH_PUBLIC_API_BASE`; optional `ORCHESTRATION_PROBE_TOKEN` + `ORCHESTRATION_CANARY_AUDIT_ID`.
- [ ] CI: orchestration E2E job prints KPI lines from `e2e-orchestration-kpi.mjs` (and optional `E2E_ORCHESTRATION_STRICT=1` when the org enforces non-skip).
- [ ] V4 UI: only after [ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md](./ADR-ORCHESTRATION-PLAN-LEVEL-QUALITY-V4.md) (or equivalent) is **Accepted**.

## References

- [ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md](./ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md)
- [docs/DEPLOYMENT.md — Orchestration SLO](../DEPLOYMENT.md#orchestration-slo-product-mvp)
- [docs/PRODUCT.md](../PRODUCT.md) (orchestration naming)
