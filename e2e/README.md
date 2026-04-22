# Playwright E2E (smoke)

## Commands

```bash
pnpm exec playwright install chromium
pnpm run test:e2e
```

`playwright.config.ts` starts the Vite dev server automatically unless `CI` is set and a server is already running.

These tests are **not** executed in GitHub Actions; run them locally (or in staging via `e2e/staging-auth-claim.spec.ts` env vars).

## Spec files

| File | Role |
| --- | --- |
| `smoke.spec.ts` | Public marketing, auth redirects, discovery wizard UX (step-by-step, f9) |
| `protected-routes.spec.ts` | Extra protected deep links (pipeline, reports, strategy, settings, admin\*, portal\*) → `/login` |
| `snapshot-public-mocked.spec.ts` | Snapshot POST → poll → done with **Playwright network mocks** (guest cookie + pending token) |
| `intake-public-mocked.spec.ts` | `IntakeBrief` shell with mocked `GET /api/intake/:token` |
| `discovery-ui-fragment.spec.ts` | `GET /api/discover/ui-fragment` contract + both discovery URLs |
| `staging-auth-claim.spec.ts` | Real Supabase staging: sign-in, sign-out, snapshot skeleton (skipped without env) |
| `orchestration-timeline-manifest.spec.ts` | Protected orchestration manifest preview flow (coverage -> preview) |
| `orchestration-snapshot-regenerate.spec.ts` | Protected orchestration snapshot -> pack regenerate -> diff history flow |
| `orchestration-governance-conflicts.spec.ts` | Protected orchestration governance payload contract (`200/409`) |
| `orchestration-depth-lanes-sync.spec.ts` | Protected orchestration pack contract for director depth/lane sync |
| `orchestration-deep-dive.spec.ts` | `GET` quota on deep-dive API; optional `E2E_ORCHESTRATION_DEEP_DIVE_UI=1` runs the same check under a mobile viewport project |

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

Without these env vars the specs are skipped (safe default for local smoke runs).
