#!/usr/bin/env node
/**
 * DoD-8: fail CI if the main entry JS gzip size exceeds the committed budget
 * (baseline measured at a known-good build + 40KB headroom).
 * Requires `pnpm build` first (dist/ must exist).
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const DIST_ASSETS = path.join(ROOT, 'dist', 'assets');
const BUDGET_FILE = path.join(ROOT, 'scripts/bundle-main-gzip-budget.json');

function findMainChunk() {
  if (!fs.existsSync(DIST_ASSETS)) {
    throw new Error(`Missing ${DIST_ASSETS} — run pnpm build first.`);
  }
  const files = fs.readdirSync(DIST_ASSETS);
  const js = files.filter((f) => /^index-.*\.js$/.test(f) && !f.endsWith('.map'));
  if (js.length === 0) {
    throw new Error(`No index-*.js in ${DIST_ASSETS}`);
  }
  if (js.length > 1) {
    throw new Error(`Expected one index-*.js, found: ${js.join(', ')}`);
  }
  return path.join(DIST_ASSETS, js[0]);
}

const mainJs = findMainChunk();
const raw = fs.readFileSync(mainJs);
const gzipBytes = gzipSync(raw).length;

if (process.argv.includes('--print-baseline')) {
  const headroom = 40 * 1024;
  const payload = {
    maxGzipBytes: gzipBytes + headroom,
    headroomBytes: headroom,
    measuredMainJs: path.basename(mainJs),
    measuredGzipBytes: gzipBytes,
  };
  fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log('Wrote', BUDGET_FILE, payload);
  process.exit(0);
}

if (!fs.existsSync(BUDGET_FILE)) {
  throw new Error(`Missing ${BUDGET_FILE} — run: node scripts/bundle-main-gzip-budget.mjs --print-baseline`);
}
const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
const max = budget.maxGzipBytes;
if (typeof max !== 'number' || max <= 0) {
  throw new Error('bundle-main-gzip-budget.json: invalid maxGzipBytes');
}
if (gzipBytes > max) {
  console.error(
    `Bundle budget exceeded: main chunk gzip ${gzipBytes} bytes > max ${max} bytes (${path.basename(mainJs)}).`,
  );
  console.error('To raise intentionally, run: node scripts/bundle-main-gzip-budget.mjs --print-baseline');
  process.exit(1);
}
console.log(
  `bundle-main-gzip-budget: ok (${path.basename(mainJs)} gzip ${gzipBytes} / max ${max})`,
);
