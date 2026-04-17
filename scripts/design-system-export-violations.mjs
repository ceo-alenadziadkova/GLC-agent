#!/usr/bin/env node
/**
 * Regenerate docs/design-system/violations-export.md — §4.1 migration drift mirror
 * (baseline + primitive-boundary subprocesses without grandfather allowlists).
 * Usage: pnpm run audit:ds:migration-report
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'design-system', 'violations-export.md');
const FULL_FINDINGS = path.join(ROOT, 'docs', 'design-system', 'compliance-findings.full.txt');

function run(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        DS_BASELINE_ALLOWLIST_PATH: '__missing_allowlist__',
        DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH: '__missing_allowlist__',
      },
    });
  } catch (e) {
    const out = [e.stdout, e.stderr].filter(Boolean).join('\n');
    if (out) return out;
    throw e;
  }
}

function parseLines(output) {
  const sigs = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith('src/') && !line.startsWith('server/')) continue;
    const m = line.match(/^([^:]+):(\d+) \[([^\]]+)\] (.*)$/);
    if (!m) continue;
    sigs.push({ file: m[1], line: Number(m[2]), type: m[3], value: m[4] });
  }
  return sigs;
}

function tallyByType(sigs) {
  const map = new Map();
  for (const s of sigs) {
    map.set(s.type, (map.get(s.type) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function tallyByFile(sigs, limit = 30) {
  const map = new Map();
  for (const s of sigs) {
    map.set(s.file, (map.get(s.file) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

const rawOut = run('node scripts/design-system-raw-values-check.mjs');
const enfOut = run('node scripts/design-system-enforcement-check.mjs');
const tsColorOut = run('node scripts/design-system-ts-color-literals-check.mjs');
const primitiveBoundaryOut = run('node scripts/design-system-primitive-boundary-check.mjs');
const patternsLockOut = run('node scripts/design-system-patterns-lock-check.mjs');

const rawSigs = parseLines(rawOut);
const enfSigs = parseLines(enfOut);
const tsColorSigs = parseLines(tsColorOut);
const primitiveBoundarySigs = parseLines(primitiveBoundaryOut);
const patternsLockSigs = parseLines(patternsLockOut);
const merged = [...rawSigs, ...enfSigs, ...tsColorSigs, ...primitiveBoundarySigs, ...patternsLockSigs];

const seenSig = new Set();
const deduped = [];
for (const s of merged) {
  const line = `${s.file}:${s.line} [${s.type}] ${s.value}`;
  if (seenSig.has(line)) continue;
  seenSig.add(line);
  deduped.push(s);
}
deduped.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.type.localeCompare(b.type) || a.value.localeCompare(b.value),
);
const fullText = deduped.map((s) => `${s.file}:${s.line} [${s.type}] ${s.value}`).join('\n') + '\n';

const date = new Date().toISOString().slice(0, 10);
const lines = [
  '# Design system violations export (§4.1 migration drift mirror)',
  '',
  `Generated: ${date} via \`pnpm run audit:ds:migration-report\` (\`node scripts/design-system-export-violations.mjs\`).`,
  '',
  '**§4.1 Migration pipeline:** same audits as **§4.2** but baseline and primitive-boundary subprocesses run **without** grandfather allowlists (env matches strict `audit:ds:runtime`). This file is **not** the merge gate — use it to see drift while shrinking toward zero. **§4.2 Runtime governance:** `pnpm run audit:ds:ci` / `audit:ds:runtime` — **0** baseline/PB grandfather violations; only `scripts/design-system-ts-color-allowlist.txt` (PDF bridge) may suppress ts-color findings.',
  '',
  '## Summary',
  '',
  '| Audit | Parsed findings |',
  '| --- | ---: |',
  `| design-system-raw-values-check (app scope) | ${rawSigs.length} |`,
  `| design-system-enforcement-check (app scope) | ${enfSigs.length} |`,
  `| design-system-ts-color-literals-check (src + server/src) | ${tsColorSigs.length} |`,
  `| design-system-primitive-boundary-check | ${primitiveBoundarySigs.length} |`,
  `| design-system-patterns-lock-check | ${patternsLockSigs.length} |`,
  `| **Total rows** (merged raw + enforcement + ts-color + primitive-boundary + patterns-lock) | **${merged.length}** |`,
  `| **Deduped rows** (written to \`compliance-findings.full.txt\`) | **${deduped.length}** |`,
  '',
  '## By violation type (merged)',
  '',
  '| Type | Count |',
  '| --- | ---: |',
  ...tallyByType(deduped).map(([t, c]) => `| \`${t}\` | ${c} |`),
  '',
  '## Top files by finding count (merged)',
  '',
  '| File | Count |',
  '| --- | ---: |',
  ...tallyByFile(deduped, 40).map(([f, c]) => `| \`${f}\` | ${c} |`),
  '',
  '## Full findings (machine-readable)',
  '',
  `One line per finding: \`file:line [type] value\`. Deduped merge of §4.1 subprocess output (no baseline / no primitive-boundary grandfather; patterns-lock has no allowlist).`,
  '',
  `- [\`compliance-findings.full.txt\`](./compliance-findings.full.txt) — **${deduped.length}** lines`,
  '',
  '## Regenerate',
  '',
  '```bash',
  'pnpm run audit:ds:migration-report',
  '# or: node scripts/design-system-export-violations.mjs',
  '```',
  '',
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
fs.writeFileSync(FULL_FINDINGS, fullText, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
console.log(`Wrote ${path.relative(ROOT, FULL_FINDINGS)}`);
