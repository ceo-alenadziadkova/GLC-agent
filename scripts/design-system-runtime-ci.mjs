#!/usr/bin/env node
/**
 * Runtime design-system gate (§4.2): no grandfather allowlists for baseline or primitive-boundary.
 * PDF / server color bridge remains allowlisted via design-system-ts-color-allowlist.txt only.
 *
 * Migration drift report (§4.1): pnpm run audit:ds:migration-report
 *
 * Usage: node scripts/design-system-runtime-ci.mjs
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RUNTIME_ENV = {
  ...process.env,
  DS_BASELINE_ALLOWLIST_PATH: '__missing_allowlist__',
  DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH: '__missing_allowlist__',
};

function runStep(cmd) {
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'inherit',
      env: RUNTIME_ENV,
    });
  } catch {
    process.exit(1);
  }
}

runStep('DS_RAW_SCOPE=app node scripts/design-system-raw-values-check.mjs');

runStep('DS_ENFORCEMENT_SCOPE=app node scripts/design-system-enforcement-check.mjs');
runStep('node scripts/design-system-ts-color-literals-check.mjs');
runStep('node scripts/design-system-primitive-boundary-check.mjs');
runStep('node scripts/design-system-patterns-lock-check.mjs');

console.log('design-system-runtime-ci: all steps passed');
process.exit(0);
