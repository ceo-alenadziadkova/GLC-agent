# Orchestration observability — DoD-4 handoff

This document turns [DEPLOYMENT.md — Orchestration SLO (Product MVP)](../DEPLOYMENT.md#orchestration-slo-product-mvp) and [`ORCHESTRATION_TELEMETRY_METRICS`](../../server/src/config/orchestration-telemetry-policy.ts) into an ops checklist. **DoD-4** is met when panels and alerts exist in your observer (Grafana, Datadog, etc.) — not when keys exist only in code.

## 1. Store the dashboard link

- Set **`ORCHESTRATION_DASHBOARD_URL`** in your ops / incident index (1Password, Notion, on-call wiki) and optionally in Railway/Vercel as a **non-`VITE_`** internal env (reference only; the app does not read it at runtime). See [DEPLOYMENT.md — Post-MVP (v9)](../DEPLOYMENT.md#orchestration-slo-product-mvp).

## 2. Minimum dashboard rows (SLOs)

| Row | Log / metric | Alert (suggested) |
| --- | --- | --- |
| Timeline latency | p95 duration for `GET` `/api/audits/:id/timeline` (filter `route` or `component:audits` as indexed) | p95 &gt; 500 ms for 15+ min |
| Pack POST latency | p95 for `POST` `/api/audits/:id/orchestration/pack` | p95 &gt; 3 s (no synthesis) or &gt; 8 s (with synthesis) |
| Error rate | 5xx on timeline/pack routes, or `metric: kpi_orchestration_timeline_run_failure` / `kpi_orchestration_pack_run_failure` on structured lines | &gt; 0.5% of success volume for 10 min |
| Synthesis fallback | `kpi_orchestration_synthesis_deterministic_fallback` | Sustained spike vs 7d baseline (e.g. &gt; 2×) |
| Cockpit usage | `kpi_orchestration_consultant_cockpit_view` | Adoption only — alert if zero in pilot week (optional) |

## 3. Canonical KPI field names (structured logs)

Emitters use the string values in `ORCHESTRATION_TELEMETRY_METRICS` (e.g. `kpi_orchestration_timeline_view`). When building Loki/CloudWatch/ Datadog queries, search for the **`metric`** (or equivalent) key matching these names. CI enforces key consistency: `pnpm run audit:orchestration-telemetry` (DoD-7).

| Policy key | Log field value |
| --- | --- |
| `staleManifestRate` | `kpi_orchestration_stale_manifest_rate` |
| `degradedInputRate` | `kpi_orchestration_degraded_input_rate` |
| `refinePlanRate` | `kpi_orchestration_refine_plan_rate` |
| `versionAdoptionRate` | `kpi_orchestration_vn_plus_1_adoption` |
| `timelineView` | `kpi_orchestration_timeline_view` |
| `timelineRunFailure` | `kpi_orchestration_timeline_run_failure` |
| `packRunFailure` | `kpi_orchestration_pack_run_failure` |
| `planGateReject` | `kpi_orchestration_plan_gate_reject` |
| `planGovernanceRolloutObservation` | `kpi_orchestration_plan_governance_rollout_observation` |
| `dependencyBreakRate` | `kpi_orchestration_dependency_break_rate` |
| `synthesisDeterministicFallback` | `kpi_orchestration_synthesis_deterministic_fallback` |
| `consultantCockpitView` | `kpi_orchestration_consultant_cockpit_view` |
| `governanceAction` | `kpi_orchestration_governance_action` (dimension `action`) |
| `llmCacheHitRate` | `kpi_orchestration_llm_cache_hit_rate` |
| `llmCostPerAuditUsd` | `kpi_orchestration_llm_cost_per_audit_usd` |

## 4. Synthetic / health probes

- Example shell probe: [`scripts/orchestration-synthetic-probe.example.sh`](../../scripts/orchestration-synthetic-probe.example.sh).
- GitHub Actions workflow: [`.github/workflows/orchestration-synthetic-probe.yml`](../../.github/workflows/orchestration-synthetic-probe.yml) (enable in the Actions tab; set `VITE_API_URL` or `ORCH_PUBLIC_API_BASE`).

## 5. Triage

See [Runbook: orchestration alert triage](../DEPLOYMENT.md#runbook-orchestration-alert-triage) in DEPLOYMENT.md.

For **client outcome** tracking (OKR / check-ins, outside platform telemetry), see [client-outcome-measurement.md](./client-outcome-measurement.md).

## 6. DoD-4 sign-off (v9 extension)

(1) Primary dashboard URL stored in the ops index. (2) At least one scheduled synthetic or ping check. (3) Alert routes tested on a known cadence (e.g. quarterly). Details: [DEPLOYMENT.md — DoD-4 ops sign-off checklist (v9)](../DEPLOYMENT.md#orchestration-slo-product-mvp).
