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

/** Repo-relative POSIX paths always skipped (exact match). */
const SKIP_EXACT_REPO_PATHS = new Set(['server/scripts/seed-demo.ts']);

const SKIP_FILE_SUFFIXES = ['.test.ts', '.test.tsx'];

function shouldSkipDir(rel) {
  const norm = rel.replace(/\\/g, '/');
  // Walk roots at server/src — first segment `snapshot` is the engine tree to exclude.
  if (norm === 'snapshot' || norm.startsWith('snapshot/')) return true;
  // Walk roots at src — Vitest harness lives under src/test (not production).
  if (norm === 'test' || norm.startsWith('test/')) return true;
  const parts = rel.split(path.sep);
  return parts.some((p) => SKIP_DIR_NAMES.has(p));
}

function shouldSkipFile(rel, repoRelPrefix) {
  const base = path.basename(rel);
  const norm = rel.replace(/\\/g, '/');
  const repoRel = repoRelPrefix ? `${repoRelPrefix}/${norm}` : norm;
  if (SKIP_EXACT_REPO_PATHS.has(repoRel)) return true;
  if (norm.includes('/__tests__/')) return true;
  // walk(server/src) yields paths like tests/bank-brief-fixtures.ts
  if (norm.startsWith('tests/') || norm === 'tests') return true;
  if (base === 'wappalyzer-imported-rules.ts' || base === 'site-html-signals.ts') return true;
  return SKIP_FILE_SUFFIXES.some((s) => rel.endsWith(s));
}

function* walk(dir, relBase = '', repoRelPrefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = relBase ? `${relBase}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldSkipDir(rel)) continue;
      yield* walk(full, rel, repoRelPrefix);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      if (!shouldSkipFile(rel, repoRelPrefix)) yield { full, rel, repoRelPrefix };
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

/** Strip `//` comments without treating `://` in URLs as a comment start. */
function stripLineComment(line) {
  let from = 0;
  while (true) {
    const i = line.indexOf('//', from);
    if (i === -1) return line;
    if (i > 0 && line[i - 1] === ':') {
      from = i + 2;
      continue;
    }
    return line.slice(0, i);
  }
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

  for (const { full, rel, repoRelPrefix } of walk(
    path.join(ROOT, 'server', 'src'),
    '',
    'server/src',
  )) {
    const content = fs.readFileSync(full, 'utf8');
    const a = analyzeFile(content, `${repoRelPrefix}/${rel.replace(/\\/g, '/')}`);
    totals.files += 1;
    totals.urlHits += a.urlHits;
    totals.localhostHits += a.localhostHits;
    totals.timerLiteralHits += a.timerLiteralHits;
    totals.bigNumHits += a.bigNumHits;
    totals.importMetaHits += a.importMetaHits;
    totals.processEnvHits += a.processEnvHits;
    if (a.score > 0) byFile.push(a);
  }

  for (const { full, rel, repoRelPrefix } of walk(path.join(ROOT, 'packages'), '', 'packages')) {
    const content = fs.readFileSync(full, 'utf8');
    const a = analyzeFile(content, `${repoRelPrefix}/${rel.replace(/\\/g, '/')}`);
    totals.files += 1;
    totals.urlHits += a.urlHits;
    totals.localhostHits += a.localhostHits;
    totals.timerLiteralHits += a.timerLiteralHits;
    totals.bigNumHits += a.bigNumHits;
    totals.importMetaHits += a.importMetaHits;
    totals.processEnvHits += a.processEnvHits;
    if (a.score > 0) byFile.push(a);
  }

  for (const { full, rel, repoRelPrefix } of walk(path.join(ROOT, 'src'), '', 'src')) {
    const content = fs.readFileSync(full, 'utf8');
    const a = analyzeFile(content, `${repoRelPrefix}/${rel.replace(/\\/g, '/')}`);
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
  console.log(
    'Totals (server/src + packages/* + src; excluding snapshot/tests/__tests__/*.test.* / wappalyzer / site-html-signals / server/scripts/seed-demo.ts):',
  );
  console.log(`  Files scanned:              ${totals.files}`);
  console.log(`  http(s):// substring hits:  ${totals.urlHits}`);
  console.log(`  localhost / 127.0.0.1 hits: ${totals.localhostHits}`);
  console.log(
    `  setTimeout/Interval(, N)    ${totals.timerLiteralHits}  (same-line 2nd arg only; multiline callbacks undercounted)`,
  );
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
