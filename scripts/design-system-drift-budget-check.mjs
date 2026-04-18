#!/usr/bin/env node
/**
 * §4.1 Drift Budget: fail if stable migration-drift signature count exceeds the committed baseline.
 * Baseline: scripts/design-system-drift-budget.json (field stableSignatureCount).
 *
 * Usage:
 *   node scripts/design-system-drift-budget-check.mjs
 *   node scripts/design-system-drift-budget-check.mjs --record   # rewrite baseline to current count
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectMigrationDriftMergedRows,
  stableSignatureCount,
} from './design-system-migration-drift-sigs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUDGET_PATH = path.join(ROOT, 'scripts', 'design-system-drift-budget.json');

const record = process.argv.includes('--record');

function readBaseline() {
  if (!fs.existsSync(BUDGET_PATH)) {
    console.error(`Missing ${path.relative(ROOT, BUDGET_PATH)}. Create it with: pnpm run audit:ds:drift-budget:record`);
    process.exit(1);
  }
  const raw = fs.readFileSync(BUDGET_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('Invalid JSON in design-system-drift-budget.json');
    process.exit(1);
  }
  if (data.schemaVersion !== 1 || typeof data.stableSignatureCount !== 'number' || !Number.isFinite(data.stableSignatureCount)) {
    console.error('design-system-drift-budget.json must have schemaVersion: 1 and a numeric stableSignatureCount');
    process.exit(1);
  }
  if (data.stableSignatureCount < 0) {
    console.error('stableSignatureCount must be >= 0');
    process.exit(1);
  }
  return data;
}

function writeBaseline(count) {
  const iso = new Date().toISOString().slice(0, 10);
  const payload = {
    schemaVersion: 1,
    stableSignatureCount: count,
    asOf: iso,
    note: 'Updated via pnpm run audit:ds:drift-budget:record — commit intentionally when drift shrinks or baseline is rebaselined.',
  };
  fs.writeFileSync(BUDGET_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, BUDGET_PATH)} stableSignatureCount=${count} asOf=${iso}`);
}

const { merged } = collectMigrationDriftMergedRows(ROOT);
const current = stableSignatureCount(merged);

if (record) {
  writeBaseline(current);
  process.exit(0);
}

const baseline = readBaseline();
if (current > baseline.stableSignatureCount) {
  console.error(
    `Drift Budget exceeded: stableSignatureCount ${current} > baseline ${baseline.stableSignatureCount} (${path.relative(ROOT, BUDGET_PATH)}).`,
  );
  console.error('Fix violations or, if the baseline must move after an intentional policy change, run pnpm run audit:ds:drift-budget:record and commit with review.');
  process.exit(1);
}

console.log(
  `design-system-drift-budget: ok (stableSignatureCount ${current} <= baseline ${baseline.stableSignatureCount})`,
);
process.exit(0);
