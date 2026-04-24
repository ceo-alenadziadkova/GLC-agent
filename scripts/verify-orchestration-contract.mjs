#!/usr/bin/env node
/**
 * Single entry: Zod pack tests + SPA contract parity.
 * Run: `node scripts/verify-orchestration-contract.mjs` from repo root.
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('pnpm', ['--filter', 'glc-audit-server', 'exec', 'vitest', 'run', 'src/tests/glc-orchestration-pack.test.ts', 'src/tests/glc-orchestration-pack-adr-v1-1-parity.test.ts']);
run('pnpm', ['exec', 'vitest', 'run', 'src/app/config/orchestration-contract-parity.test.ts']);
