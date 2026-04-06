# Playwright E2E (smoke)

## Commands

```bash
npx playwright install chromium
npm run test:e2e
```

`playwright.config.ts` starts the Vite dev server automatically unless `CI` is set and a server is already running.

## Scope

Current specs only cover **public** routes that do not require a working Supabase anonymous session:

- `/login` renders
- `/dashboard` and `/` redirect unauthenticated users to `/login`

Testing **Snapshot** (`/snapshot`), **sign-out**, or email login end-to-end requires a dedicated environment (Supabase URL + anon key, optional API) and is left for manual or staging runs.

See [TESTING.md](../TESTING.md) for the full coverage matrix.
