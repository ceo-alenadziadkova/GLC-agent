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

## Stale v9 blackdraft pitfalls

Pitfalls below apply to long **external** v9 “full product” write-ups (chat exports, one-off PM docs) that are **not** updated when the tree changes. They **sound** like a full gap list, but a large share of P-1–P-6, P-9, and P-11 is **already in tree** (see **Decision** above and the §5 table in the companion sync ADR). **Do not** paste those blackdrafts into sprint planning without reconciling them to this document — you will double-schedule work and chase wrong file names and metric strings.

| Blackdraft pitfall | Canonical correction |
| --- | --- |
| `kpi_llm_cache_hit_rate` / `kpi_llm_cost_per_audit_usd` | Use **`kpi_orchestration_llm_*`** (see **Decision** §1). |
| “No server memo for `manifest-preview`” | **Memo exists** — [`roadmap-manifest-preview-memo.ts`](../../server/src/services/orchestration/roadmap-manifest-preview-memo.ts). |
| `orchestration-synthesis.service.ts`, `director/deep-dive-*.service.ts` | See **Decision** §3; deep-dive is not a single `deep-dive-*.service.ts` file name. |
| Phase plan Ψ1 ‖ Ψ2 → Ψ3 → Ψ4 ‖ Ψ8 → Ψ5 → Ψ7 → Ψ9 → Ψ10 with Ψ2–Ψ5, Ψ7, Ψ8 as long parallel tranches | Ψ2–Ψ5, Ψ7, Ψ8 are **largely shipped**; the **remaining** critical path is **ops (Ψ1)**, **E2E non-skip + secrets (Ψ9)**, **bundle regression (Ψ10)**, and **V4 (Ψ6) as a product/flag gate** when the ADR is Accepted — not a multi-week “build the schema from scratch” if Zod + UI already exist. |
| “New” component paths (e.g. `ScenarioComparisonDialog.tsx`) | Treat any specific filename in an old blackdraft as **suspect**; the implementation may live under CTA, wizard, or `src/app/lib/` — **grep / read `src/`** before scheduling UI work. |
| E2E “matrix” table with a single **Env** column for every spec | Not all `e2e/orchestration-*.spec.ts` files use the same env; **authoritative** list: [`e2e/README.md`](../../e2e/README.md) and the specs themselves. “Green” CI without secrets is often **all skipped** — use KPI output + optional `E2E_ORCHESTRATION_STRICT` (see **Decision** §4). |
| `pnpm test --filter orchestration` in verification boilerplate | The repo’s verification commands are `pnpm verify:orchestration-contract`, `audit:orchestration-telemetry`, and bundle audit — do **not** assume a pnpm `orchestration` filter exists unless the root `package.json` defines it. |

**Valid backlog (not in DoD-7):** pack single-cache, `governance.service.ts` state machine, ESLint for lane literals, IndexedDB for revision history — see sync ADR and [`e2e/README.md`](../../e2e/README.md) “post–v9” notes; they are **engineering follow-ups**, not a duplicate of shipped v9 surfaces.

### Summary verdict (blackdraft vs repository)

| Area | Verdict |
| --- | --- |
| §5-style surfaces, governance, registry, LLM cache, race-safety UI (code paths) | Mostly **shipped**; remaining work is **rollout, flags, and product acceptance** |
| Metric names in external v9 docs (`kpi_llm_*`) | **Incorrect** — canonical names are `kpi_orchestration_llm_*` (see **Decision** §1) |
| Multi-week phase plan with Ψ2–Ψ8 as parallel tranches | **Overstated** for the current tree — **recompute** critical path toward ops, E2E non-skip, bundle, and V4 flag gate |
| P-7, P-8, P-10 | **Still active**: ops observability, creds + KPI for real E2E, bundle budget after UX merges |
| §16-style ideas (single-cache, `governance.service.ts`, etc.) | Valid **engineering backlog**, not duplicate “v9 DoD” surface work |

### What external blackdrafts still get right (remaining “full product” scope)

- **P-7:** Grafana panels, alerts, on-call routing, synthetic canary — **organizational**; anchors in [DEPLOYMENT.md](../DEPLOYMENT.md) and [`.github/workflows/orchestration-synthetic-probe.yml`](../../.github/workflows/orchestration-synthetic-probe.yml).
- **P-8:** “Full” E2E coverage means **repository secrets + `VITE_API_URL` proxy** (and optional `E2E_ORCHESTRATION_STRICT`), not only adding more spec files.
- **P-10:** After large orchestration UX merges, run `pnpm build && pnpm run audit:bundle-main-budget`.
- **P-5 (V4):** When the plan-level ADR is **Accepted**, enable `FEATURE_PLAN_CONTROL_OBJECT` and [`planControlObjectUiEnabled`](../../src/app/config/app-feature-flags.ts); JSONB-only fields do not require a new SQL migration by default.
- **V3 (pack schema vs ADR v1.1):** Any **new** ADR field on the pack still requires **Zod + `glc-orchestration-pack-adr-v1-1-parity` coverage in the same PR** — unchanged from sync ADR policy.

### Canonical docs (do not fork a second “v9 full product” source of truth)

Use this ADR plus [ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md](./ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md). Reconcile external chat/PM blackdrafts **to these** before sprint planning (metrics, paths, phases, E2E assumptions).

## References

- [ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md](./ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md)
- [docs/DEPLOYMENT.md — Orchestration SLO](../DEPLOYMENT.md#orchestration-slo-product-mvp)
- [docs/PRODUCT.md](../PRODUCT.md) (orchestration naming)
