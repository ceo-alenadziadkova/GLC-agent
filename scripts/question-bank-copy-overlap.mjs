#!/usr/bin/env node
/**
 * Lists question-bank option/stem strings that also appear as literals in TS/TSX sources
 * (possible duplication / drift). Excludes tests, snapshot library, demo seed, wappalyzer.
 *
 * Run: node scripts/question-bank-copy-overlap.mjs
 *      pnpm audit:bank-copy
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  '__tests__',
  'snapshot',
]);
const SKIP_FILE_SUBSTR = [
  'wappalyzer-imported-rules',
  'seed-demo.ts',
  '.test.ts',
  '.test.tsx',
];

const BANK_PATH = path.join(ROOT, 'packages/intake-core/src/question-bank.v1.json');

function shouldSkipDir(absPath, name) {
  if (SKIP_DIR_NAMES.has(name)) return true;
  if (name === 'snapshot' && absPath.includes(`${path.sep}server${path.sep}src${path.sep}`)) return true;
  return false;
}

/** @param {string} dir */
function* walkFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (shouldSkipDir(abs, ent.name)) continue;
      yield* walkFiles(abs);
    } else if (ent.isFile() && (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx'))) {
      if (SKIP_FILE_SUBSTR.some(s => abs.includes(s))) continue;
      yield abs;
    }
  }
}

function collectBankStrings(raw) {
  /** @type {Set<string>} */
  const out = new Set();
  const push = (s) => {
    const t = typeof s === 'string' ? s.trim() : '';
    if (t.length >= 14) out.add(t);
  };

  for (const q of raw.questions ?? []) {
    push(q.question);
    if (q.hint) push(q.hint);
    const opts = q.answer?.options;
    if (Array.isArray(opts)) for (const o of opts) push(o);
  }

  const catalogs = raw.optionCatalogs;
  if (catalogs && typeof catalogs === 'object') {
    for (const arr of Object.values(catalogs)) {
      if (Array.isArray(arr)) for (const o of arr) push(o);
    }
  }

  return [...out].sort((a, b) => b.length - a.length);
}

function main() {
  const raw = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));
  const needles = collectBankStrings(raw);
  const scanRoots = [
    path.join(ROOT, 'packages/intake-core/src'),
    path.join(ROOT, 'server/src'),
    path.join(ROOT, 'src'),
  ];

  /** @type {Map<string, string[]>} */
  const hits = new Map();

  const files = scanRoots.flatMap((r) => [...walkFiles(r)]);

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(ROOT, file);
    for (const s of needles) {
      if (content.includes(s)) {
        const list = hits.get(s) ?? [];
        if (list.length < 8) list.push(rel);
        hits.set(s, list);
      }
    }
  }

  console.log(`Question bank strings (length >= 14): ${needles.length}`);
  console.log(`Scanned ${files.length} TS/TSX files under packages/intake-core/src, server/src, src`);
  console.log('');

  const duplicated = [...hits.entries()];
  if (duplicated.length === 0) {
    console.log('No overlaps found (no bank string of length >= 14 appears in TS/TSX).');
    return;
  }

  duplicated.sort((a, b) => b[0].length - a[0].length);
  console.log(`Overlaps (bank text also present in code — review for drift): ${duplicated.length}\n`);

  for (const [s, locs] of duplicated) {
    const preview = s.length > 100 ? `${s.slice(0, 97)}...` : s;
    console.log(`— ${JSON.stringify(preview)}`);
    for (const loc of locs) console.log(`    ${loc}`);
    console.log('');
  }
}

main();
