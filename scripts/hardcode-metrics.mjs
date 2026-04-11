#!/usr/bin/env node
/**
 * Heuristic counts of literals often reviewed during hardcode audits.
 *
 * Excludes (align with scripts/hardcode-inventory.sh policy):
 *   - server/src/snapshot (entire tree)
 *   - Vitest tests: *.test.ts, *.test.tsx, __tests__ dirs, server/src/tests
 *   - server/scripts/seed-demo.ts
 *   - server/src/lib/wappalyzer-imported-rules.ts
 *   - server/src/lib/site-html-signals.ts
 *   - node_modules, dist, .git, coverage, build outputs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  'coverage',
  '.turbo',
  'playwright-report',
  'test-results',
]);

const SKIP_FILE_BASENAMES = new Set(['seed-demo.ts']);

const SKIP_FILE_SUFFIXES = ['.test.ts', '.test.tsx'];

function shouldSkipDir(rel) {
  const norm = rel.replace(/\\/g, '/');
  // Walk roots at server/src — first segment `snapshot` is the engine tree to exclude.
  if (norm === 'snapshot' || norm.startsWith('snapshot/')) return true;
  const parts = rel.split(path.sep);
  return parts.some((p) => SKIP_DIR_NAMES.has(p));
}

function shouldSkipFile(rel) {
  const base = path.basename(rel);
  if (SKIP_FILE_BASENAMES.has(base)) return true;
  if (rel.includes(`${path.sep}__tests__${path.sep}`)) return true;
  if (rel.startsWith(`server${path.sep}src${path.sep}tests${path.sep}`)) return true;
  if (base === 'wappalyzer-imported-rules.ts' || base === 'site-html-signals.ts') return true;
  return SKIP_FILE_SUFFIXES.some((s) => rel.endsWith(s));
}

function* walk(dir, relBase = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = relBase ? `${relBase}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldSkipDir(rel)) continue;
      yield* walk(full, rel);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      if (!shouldSkipFile(rel)) yield { full, rel };
    }
  }
}

const RE = {
  /** Full URL-ish substring (greedy to first quote/space) */
  httpUrl: /https?:\/\/[^\s'"`\)]+/g,
  localhost: /\blocalhost\b|127\.0\.0\.1/g,
  /** setTimeout(fn, 350) or setInterval(..., 1000) */
  timerMsLiteral:
    /(?:setTimeout|setInterval)\s*\([^,]+,\s*(\d+)\s*\)/g,
  /** 4+ digit standalone number (noisy; use as volume hint only) */
  bigIntLiteral: /\b[1-9]\d{3,}\b/g,
  importMetaEnv: /import\.meta\.env\.[A-Z0-9_]+/g,
  processEnv: /process\.env\.[A-Z0-9_]+/g,
};

function stripLineComment(line) {
  const i = line.indexOf('//');
  return i === -1 ? line : line.slice(0, i);
}

function analyzeFile(content, rel) {
  const lines = content.split(/\r?\n/);
  let urlHits = 0;
  let localhostHits = 0;
  let timerLiteralHits = 0;
  let bigNumHits = 0;
  let importMetaHits = 0;
  let processEnvHits = 0;

  for (const rawLine of lines) {
    const line = stripLineComment(rawLine);
    if (!line.trim()) continue;

    const urls = line.match(RE.httpUrl);
    if (urls) urlHits += urls.length;

    const loc = line.match(RE.localhost);
    if (loc) localhostHits += loc.length;

    let m;
    const timerRe = new RegExp(RE.timerMsLiteral.source, 'g');
    while ((m = timerRe.exec(line)) !== null) timerLiteralHits += 1;

    const big = line.match(RE.bigIntLiteral);
    if (big) bigNumHits += big.length;

    const ime = line.match(RE.importMetaEnv);
    if (ime) importMetaHits += ime.length;

    const pe = line.match(RE.processEnv);
    if (pe) processEnvHits += pe.length;
  }

  return {
    rel,
    urlHits,
    localhostHits,
    timerLiteralHits,
    bigNumHits,
    importMetaHits,
    processEnvHits,
    score: urlHits + localhostHits + timerLiteralHits,
  };
}

function main() {
  const byFile = [];
  let totals = {
    files: 0,
    urlHits: 0,
    localhostHits: 0,
    timerLiteralHits: 0,
    bigNumHits: 0,
    importMetaHits: 0,
    processEnvHits: 0,
  };

  for (const { full, rel } of walk(path.join(ROOT, 'server', 'src'))) {
    const content = fs.readFileSync(full, 'utf8');
    const a = analyzeFile(content, `server/src/${rel.replace(/\\/g, '/')}`);
    totals.files += 1;
    totals.urlHits += a.urlHits;
    totals.localhostHits += a.localhostHits;
    totals.timerLiteralHits += a.timerLiteralHits;
    totals.bigNumHits += a.bigNumHits;
    totals.importMetaHits += a.importMetaHits;
    totals.processEnvHits += a.processEnvHits;
    if (a.score > 0) byFile.push(a);
  }

  for (const { full, rel } of walk(path.join(ROOT, 'packages'))) {
    const content = fs.readFileSync(full, 'utf8');
    const a = analyzeFile(content, `packages/${rel.replace(/\\/g, '/')}`);
    totals.files += 1;
    totals.urlHits += a.urlHits;
    totals.localhostHits += a.localhostHits;
    totals.timerLiteralHits += a.timerLiteralHits;
    totals.bigNumHits += a.bigNumHits;
    totals.importMetaHits += a.importMetaHits;
    totals.processEnvHits += a.processEnvHits;
    if (a.score > 0) byFile.push(a);
  }

  for (const { full, rel } of walk(path.join(ROOT, 'src'))) {
    const content = fs.readFileSync(full, 'utf8');
    const a = analyzeFile(content, `src/${rel.replace(/\\/g, '/')}`);
    totals.files += 1;
    totals.urlHits += a.urlHits;
    totals.localhostHits += a.localhostHits;
    totals.timerLiteralHits += a.timerLiteralHits;
    totals.bigNumHits += a.bigNumHits;
    totals.importMetaHits += a.importMetaHits;
    totals.processEnvHits += a.processEnvHits;
    if (a.score > 0) byFile.push(a);
  }

  const sortKey = (k) => (a, b) => b[k] - a[k] || a.rel.localeCompare(b.rel);

  console.log('=== hardcode-metrics (heuristic counts, exclusions applied) ===');
  console.log(`Repo root: ${ROOT}`);
  console.log('');
  console.log('Totals (server/src + packages/* + src, excluding snapshot/tests/__tests__/*.test.* / wappalyzer / site-html-signals / seed-demo):');
  console.log(`  Files scanned:              ${totals.files}`);
  console.log(`  http(s):// substring hits:  ${totals.urlHits}`);
  console.log(`  localhost / 127.0.0.1 hits: ${totals.localhostHits}`);
  console.log(`  setTimeout/Interval(, N)    ${totals.timerLiteralHits}  (numeric delay literals)`);
  console.log(`  4+ digit number tokens:     ${totals.bigNumHits}  (noisy — includes limits, years, HTTP codes in strings)`);
  console.log(`  import.meta.env.* reads:    ${totals.importMetaHits}`);
  console.log(`  process.env.* reads:        ${totals.processEnvHits}`);
  console.log('');
  console.log('Top 25 files by (urls + localhost + timer literals):');
  byFile.sort(sortKey('score'));
  for (const row of byFile.slice(0, 25)) {
    console.log(
      `  ${String(row.score).padStart(4)}  url=${row.urlHits} loc=${row.localhostHits} timer=${row.timerLiteralHits}  ${row.rel}`,
    );
  }
  console.log('');
  console.log('Note: Many URL hits are algorithmic (https:// prefix), SVG xmlns, or docs links — triage with rg/filters.');
}

main();
