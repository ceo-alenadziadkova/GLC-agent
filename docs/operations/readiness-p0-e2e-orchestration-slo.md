# P0 readiness: orchestration E2E + SLO (operator checklist)

This checklist closes the **P0** items in [IMPROVEMENTS.md — Delivery OS](../IMPROVEMENTS.md#delivery-os-export-roles-and-cross-functional-swimlanes-backlog) for **meaningful CI** (non-skip orchestration tests) and **observability** alignment. It complements [e2e/README.md](../../e2e/README.md) and [orchestration-observability-dod4.md](./orchestration-observability-dod4.md).

## 1. Orchestration E2E (CI “meaningful green”)

| Step | Action |
| --- | --- |
| 1 | Add repository **secrets** `E2E_ORCHESTRATION_AUDIT_ID` and `E2E_ORCHESTRATION_AUTH_TOKEN` for an audit that exists on the same API you test against. |
| 2 | Set repository **variable** `VITE_API_URL` to the public **API origin** (no trailing slash), e.g. `https://api.example.com`. CI maps it to `E2E_VITE_API_PROXY_TARGET` so the Vite dev server’s `/api` proxy hits a real backend — otherwise protected tests skip or the validation step fails. |
| 3 | Keep **`E2E_ORCHESTRATION_JSON=1`** in CI (already in [`.github/workflows/test.yml`](../../.github/workflows/test.yml)) so `test-results/orchestration-e2e.json` is produced and `scripts/e2e-orchestration-kpi.mjs` can print `e2e_orchestration_kpi …`. |
| 4 | Optionally set repository **variable** `E2E_ORCHESTRATION_STRICT=1` to **fail** the job if secrets are set but every orchestration test was skipped (guards “green but useless”). |
| 5 | For UI-heavy specs, CI already sets `E2E_ORCHESTRATION_UI=1`. Consultant flows may need `E2E_CONSULTANT_E2E_EMAIL` / `E2E_CONSULTANT_E2E_PASSWORD`. |
| 6 | **CI job:** `fast-gate / e2e-orchestration` in [`.github/workflows/test.yml`](../../.github/workflows/test.yml) — validates proxy env when secrets are set, runs `e2e-orchestration-preflight.mjs`, `pnpm run test:e2e:orchestration`, and `e2e-orchestration-kpi.mjs` (KPI step `if: always()`). |

**Local / branch prep (no secrets in output):** `pnpm run e2e:orchestration:preflight` — see [e2e/.env.orchestration.example](../../e2e/.env.orchestration.example).

**CI:** The `fast-gate / e2e-orchestration` job runs a redacted preflight and the validation step before Playwright; logs show which keys are set without printing secret values.

## 2. Orchestration SLO + dashboards (reliability)

| Step | Action |
| --- | --- |
| 1 | Dashboards and alerts use canonical names from `ORCHESTRATION_TELEMETRY_METRICS` / `kpi_orchestration_*` — see [DEPLOYMENT.md — Orchestration SLO](../DEPLOYMENT.md#orchestration-slo-product-mvp). **Do not** use bare `kpi_llm_*` in Grafana — LLM cost/cache keys are `kpi_orchestration_llm_cache_hit_rate` and `kpi_orchestration_llm_cost_per_audit_usd` (see [orchestration-observability-dod4.md](./orchestration-observability-dod4.md#3-canonical-kpi-field-names-structured-logs)). |
| 2 | Complete **DoD-4** per [orchestration-observability-dod4.md](./orchestration-observability-dod4.md) (panels in your observer, not only keys in code). |
| 3 | **Delivery OS (export):** if export issues correlate with pack/timeline 5xx, triage with §2–3 in that doc, not as a separate “export bug” without route evidence — see [§5b Runbook: Delivery OS (export)](./orchestration-observability-dod4.md#5b-runbook-delivery-os-export). |

## 2a. Synthetic timeline canary (separate from Playwright E2E)

DoD-4 optional **GitHub** workflow [`.github/workflows/orchestration-synthetic-probe.yml`](../.github/workflows/orchestration-synthetic-probe.yml): not the same credentials as `E2E_ORCHESTRATION_*`.

| Item | Where | Purpose |
| --- | --- | --- |
| `VITE_API_URL` or `ORCH_PUBLIC_API_BASE` | Repository **variables** | Base URL for scheduled `GET /api/health` |
| `ORCHESTRATION_PROBE_TOKEN` | Repository **secret** | Bearer for `GET /api/audits/:id/timeline` canary job |
| `ORCHESTRATION_CANARY_AUDIT_ID` | Repository **secret** | Stable audit id on that API |

Details: [orchestration-observability-dod4.md — §4](./orchestration-observability-dod4.md#4-synthetic--health-probes).

## 3. Trust copy (P0, ongoing)

Keep public and intake copy aligned with [ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1](../adrs/ADR-PRODUCT-AUDIT-FIRST-VS-IDEA-INGRESS-V1.md): no implied guarantee of “viral” or full parity execution plans from pitch-only input without the audit contract.

**Spot-check (recorded):** English marketing and product surfaces were reviewed for audit-first / non–pitch-only claims. Canonical sources: [`src/app/data/marketing-home-copy.en.json`](../../src/app/data/marketing-home-copy.en.json) (incl. FAQ on roadmap from pitch or voice), [`src/app/data/marketing-workspace-packaging.en.json`](../../src/app/data/marketing-workspace-packaging.en.json) (hero, supporting line), [`src/app/data/workspace-page-copy.en.json`](../../src/app/data/workspace-page-copy.en.json) (new-audit intro, dictation/NL path). Copy consistently states: structured brief + site + full run for strongest output; NL/dictation are assists; `prefer_explicit_over_inferred` policy remains in [PRODUCT.md](../PRODUCT.md). Re-run this spot-check when those files or public intake copy change materially.

## Related

- [sprint-export-import-ops.md](./sprint-export-import-ops.md) — CSV/JSON import into Linear/Jira
- [ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md](../adrs/ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md) — P-7 ops, P-8 creds + KPI
