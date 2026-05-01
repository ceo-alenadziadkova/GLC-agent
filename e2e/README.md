# Playwright E2E (smoke)

## Commands

```bash
pnpm exec playwright install chromium
pnpm run test:e2e
```

`playwright.config.ts` starts the Vite dev server automatically unless `CI` is set and a server is already running.

**Local preflight (no secrets in output):** `pnpm run e2e:orchestration:preflight` — lists which `E2E_ORCHESTRATION_*` and related variables are set (see [`e2e/.env.orchestration.example`](./.env.orchestration.example)). **P0 ops checklist (secrets, SLO, export triage):** [../docs/operations/readiness-p0-e2e-orchestration-slo.md](../docs/operations/readiness-p0-e2e-orchestration-slo.md).

**Orchestration E2E in CI:** [`.github/workflows/test.yml`](../.github/workflows/test.yml) runs `pnpm run test:e2e:orchestration` (all `e2e/orchestration-*.spec.ts` files) after unit tests.

**Non-empty DoD (v9):** if you set repository **secrets** `E2E_ORCHESTRATION_AUDIT_ID` and `E2E_ORCHESTRATION_AUTH_TOKEN`, you must also set **repository variable** `VITE_API_URL` to the same public API origin as your deployed backend (e.g. `https://api.example.com`, no trailing slash). The workflow maps it to `E2E_VITE_API_PROXY_TARGET` so the Vite dev server’s `/api` **proxy** targets that origin; otherwise the job fails the validation step (Playwright would hit `localhost:3001` with no server). Without those secrets, protected tests **skip** (green but no real coverage).

- Full UI / cockpit flows: set `E2E_ORCHESTRATION_UI=1` in the workflow (already on for the CI job) and, for the stale-banner consultant test, add secrets `E2E_CONSULTANT_E2E_EMAIL` and `E2E_CONSULTANT_E2E_PASSWORD` (consultant user that exists in the same API as `VITE_API_URL`).
- Local: export the same env vars, or run a local `glc-audit-server` on port **3001** and omit `E2E_VITE_API_PROXY_TARGET` so the default Vite proxy works.

**Canonical telemetry names** for LLM cost/cache dashboards: `kpi_orchestration_llm_cache_hit_rate` and `kpi_orchestration_llm_cost_per_audit_usd` (see [ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md](../docs/adrs/ADR-ORCHESTRATION-PRODUCT-MVP-ROADMAP-SYNC-2026-04-23.md) and `server/src/config/orchestration-telemetry-policy.ts`).

**KPI (CI):** when `E2E_ORCHESTRATION_JSON=1`, Playwright writes `test-results/orchestration-e2e.json` and the follow-up step runs `node scripts/e2e-orchestration-kpi.mjs`, which logs a line such as `e2e_orchestration_kpi total=… non_skip_percent=…`. Set repository variable **`E2E_ORCHESTRATION_STRICT=1`** to fail the job if `E2E_ORCHESTRATION_AUDIT_ID` and `E2E_ORCHESTRATION_AUTH_TOKEN` are set but **every** orchestration test was skipped (forces real API coverage when creds exist). Locals: `E2E_ORCHESTRATION_JSON=1 pnpm run test:e2e:orchestration && pnpm run e2e:orchestration:kpi`.

**Post-MVP (v9) plan vs code:** if you have an external “v9 full product” checklist, reconcile it to [ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md](../docs/adrs/ADR-ORCHESTRATION-POST-MVP-V9-CRITICAL-DELTA.md) first — most P-1–P-6, P-9, P-11 are **shipped**; remaining work is mostly **P-7 ops**, **P-8 creds + KPI**, **P-10 bundle**, and **P-5 product gate** for V4.

**Pre-PR (orchestration):** `pnpm run verify:orchestration-all` (contract + `test:orchestration` + telemetry + build + main bundle budget).

## Post–v9 DoD (optional backlog, not required for merge)

Larger product follow-ups: unified governance state machine service, IndexedDB for revision history, “commit scenario from compare” in the manifest wizard, cockpit activity feed. Tracked as engineering backlog; out of v9 minimal DoD.

## Spec files

| File | Role |
| --- | --- |
| `smoke.spec.ts` | Public marketing, auth redirects, discovery wizard UX (step-by-step, f9) |
| `protected-routes.spec.ts` | Extra protected deep links (pipeline, reports, strategy, plan/roadmap/timeline, settings, admin\*, portal\*) → `/login` |
| `snapshot-public-mocked.spec.ts` | Snapshot POST → poll → done with **Playwright network mocks** (guest cookie + pending token) |
| `intake-public-mocked.spec.ts` | `IntakeBrief` shell with mocked `GET /api/intake/:token` |
| `discovery-ui-fragment.spec.ts` | `GET /api/discover/ui-fragment` contract + both discovery URLs |
| `staging-auth-claim.spec.ts` | Real Supabase staging: sign-in, sign-out, snapshot skeleton (skipped without env) |
| `orchestration-timeline-manifest.spec.ts` | Protected orchestration manifest preview flow (coverage -> preview) |
| `orchestration-consultant-cockpit.spec.ts` | Pack GET ETag, 304, stale `govern_action` 409 (API; `E2E_ORCHESTRATION_*` token + audit id) |
| `orchestration-snapshot-regenerate.spec.ts` | Protected orchestration snapshot -> pack regenerate -> diff history flow |
| `orchestration-governance-conflicts.spec.ts` | Protected orchestration governance payload contract (`200/409`) |
| `orchestration-depth-lanes-sync.spec.ts` | Protected orchestration pack contract for director depth/lane sync |
| `orchestration-scenario-compare.spec.ts` | Dual `POST /roadmap/manifest-preview` (what-if compare API path) |
| `orchestration-now-next-later.spec.ts` | Pack `time_bucket` + optional Now·Next·Later tab (UI with `E2E_ORCHESTRATION_UI=1`) |
| `orchestration-execution-pack-repeat.spec.ts` | Execution-pack repeat CTA (UI; `E2E_ORCHESTRATION_UI=1`) |
| `orchestration-revision-history.spec.ts` | Revision panel (UI; `E2E_ORCHESTRATION_UI=1`) |
| `orchestration-cockpit-stale-banner.spec.ts` | Consultant cockpit: stale pack banner after govern `POST` 409 (needs `E2E_CONSULTANT_E2E_*` + `E2E_ORCHESTRATION_UI=1`) |
| `orchestration-consultant-cockpit-ui.spec.ts` | Login → open cockpit: heading + settled state (no pack, error, or critical path) — `E2E_ORCHESTRATION_UI=1` + consultant + audit id |
| `orchestration-plan-legacy-canonical.spec.ts` | Consultant: `/roadmap/:id` and `/timeline/:id` → `/plan/:id` (+ `view=timeline`, query merge). Portal: `/portal/roadmap|timeline/:id` → `/portal/plan/:id`. Needs `E2E_ORCHESTRATION_UI=1` + `E2E_ORCHESTRATION_AUDIT_ID`; consultant gate uses `E2E_CONSULTANT_E2E_*`; portal gate uses `E2E_PORTAL_E2E_*` and optional `E2E_PORTAL_PLAN_AUDIT_ID` |
| `orchestration-deep-dive.spec.ts` | `GET` quota for `marketing_utp` and `ux_conversion` deep-dive API; optional `E2E_ORCHESTRATION_DEEP_DIVE_UI=1` runs the marketing quota check under a mobile viewport project |

## Scope

Most specs target **public** routes and do not require a Supabase session.

- `/login` renders; core protected entry points redirect unauthenticated users to `/login`
- `protected-routes.spec.ts` extends that to additional consultant, admin, and client portal paths
- `/` marketing home; marketing shells: `/snapshot`, `/express-audit`, `/audit`, `/brief`, `/faq`
- Discovery: wizard UX in `smoke.spec.ts`; fragment API + dual path in `discovery-ui-fragment.spec.ts`
- **Snapshot** full guest funnel without a live pipeline: `snapshot-public-mocked.spec.ts` (mocks `/api/snapshot*`). Against a **real** API, credentialed cookie behaviour still depends on `VITE_API_URL` / proxy (see `src/app/lib/api-base-url.ts`).
- **Sign-out** and **claim** with a real session: `staging-auth-claim.spec.ts` + `E2E_STAGING_*` env vars.

See [TESTING.md](../docs/instructions/TESTING.md) for the full coverage matrix.

## Staging P0 skeleton

`e2e/staging-auth-claim.spec.ts` contains a guarded staging skeleton for:

- login -> protected route -> sign out -> login redirect
- snapshot -> auth -> claim high-level flow

The spec is skipped unless all required env vars are provided:

- `E2E_STAGING_BASE_URL`
- `E2E_STAGING_EMAIL`
- `E2E_STAGING_PASSWORD`

Optional:

- `E2E_STAGING_SNAPSHOT_URL` (defaults to `https://example.com`)

## Orchestration protected E2E

Orchestration specs are intentionally token-based and run only when env is provided:

- `E2E_ORCHESTRATION_AUDIT_ID`
- `E2E_ORCHESTRATION_AUTH_TOKEN`

Optional (consultant browser UI, including stale-banner spec):

- `E2E_CONSULTANT_E2E_EMAIL`
- `E2E_CONSULTANT_E2E_PASSWORD`

Optional (client portal plan redirect checks in `orchestration-plan-legacy-canonical.spec.ts`):

- `E2E_PORTAL_E2E_EMAIL`
- `E2E_PORTAL_E2E_PASSWORD`
- `E2E_PORTAL_PLAN_AUDIT_ID` (otherwise uses `E2E_ORCHESTRATION_AUDIT_ID` when set)

`E2E_VITE_API_PROXY_TARGET` (CI: from `VITE_API_URL` var) — API origin for the Vite `/api` proxy when not using a local server on 3001.

Without `E2E_ORCHESTRATION_AUDIT_ID` / `E2E_ORCHESTRATION_AUTH_TOKEN` the token-based API specs are skipped (safe default for local smoke runs).
