# Playwright E2E (smoke)

## Commands

```bash
pnpm exec playwright install chromium
pnpm run test:e2e
```

`playwright.config.ts` starts the Vite dev server automatically unless `CI` is set and a server is already running.

## Scope

Current specs only cover **public** routes that do not require a working backend API or Supabase session:

- `/login` renders
- `/dashboard`, `/portal`, and `/audit/new` redirect unauthenticated users to `/login`
- `/` renders marketing home for unauthenticated sessions

Testing **Snapshot** (`/snapshot`) end-to-end needs a reachable **`VITE_API_URL`** (CORS + credentialed cookie). **Sign-out** or full email login flows need Supabase and are left for manual or staging runs.

See [TESTING.md](../TESTING.md) for the full coverage matrix.

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
