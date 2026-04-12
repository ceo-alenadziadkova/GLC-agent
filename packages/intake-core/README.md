# @glc/intake-core

Shared intake engine, question bank wiring, and discovery copy.

## Build

The package **exports compiled output from `dist/`** (`main` / `types` in `package.json`). After changing TypeScript sources, rebuild before consumers that run plain `tsc` (e.g. `glc-audit-server`):

```bash
pnpm --filter @glc/intake-core run build
```

From the repo root, `pnpm run typecheck` (or `pnpm --filter glc-audit-server run typecheck`) rebuilds workspace packages then runs server `tsc --noEmit`. Do **not** append a package name to that command (e.g. `run typecheck @glc/intake-core`) — pnpm would forward it to `tsc` and cause TS5083.

Server Vitest resolves `@glc/intake-core` from **source** (`server/vitest.config.ts` alias), so unit tests do not depend on `dist/` for this package.
