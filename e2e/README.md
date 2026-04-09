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
- `/dashboard` and `/` redirect unauthenticated users to `/login`

Testing **Snapshot** (`/snapshot`) end-to-end needs a reachable **`VITE_API_URL`** (CORS + credentialed cookie). **Sign-out** or full email login flows need Supabase and are left for manual or staging runs.

See [TESTING.md](../TESTING.md) for the full coverage matrix.
