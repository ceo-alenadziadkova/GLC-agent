#!/usr/bin/env node
/**
 * Runs workspace package builds then `tsc --noEmit`.
 * Implemented as a small script so stray args from `pnpm run typecheck <anything>`
 * (e.g. mistaken `@glc/intake-core`) are not forwarded to `tsc`, which would treat
 * them as project roots and fail with TS5083.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runPnpm(args) {
  const r = spawnSync('pnpm', args, { stdio: 'inherit', cwd: serverRoot, env: process.env });
  if (r.status !== 0 && r.status != null) process.exit(r.status);
  if (r.error) throw r.error;
}

runPnpm(['run', 'build:workspace-deps']);
runPnpm(['exec', 'tsc', '--noEmit']);
