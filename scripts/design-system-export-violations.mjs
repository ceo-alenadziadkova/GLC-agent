#!/usr/bin/env node
/**
 * Regenerate docs/design-system/violations-export.md from DS audits with no allowlist.
 * Usage: node scripts/design-system-export-violations.mjs
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
      env: { ...process.env, DS_BASELINE_ALLOWLIST_PATH: '__missing_allowlist__' },
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
    if (!line.startsWith('src/')) continue;
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

const rawSigs = parseLines(rawOut);
const enfSigs = parseLines(enfOut);
const merged = [...rawSigs, ...enfSigs];

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
  '# Design system violations export (no allowlist)',
  '',
  `Generated: ${date} via \`node scripts/design-system-export-violations.mjs\`.`,
  '',
  'This report lists findings **before** applying `scripts/design-system-baseline.allowlist.txt`. CI uses the allowlist to grandfather existing lines until they are migrated.',
  '',
  '## Summary',
  '',
  '| Audit | Parsed findings |',
  '| --- | ---: |',
  `| design-system-raw-values-check (app scope) | ${rawSigs.length} |`,
  `| design-system-enforcement-check (app scope) | ${enfSigs.length} |`,
  `| **Total rows** (merged raw + enforcement) | **${merged.length}** |`,
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
  `One line per finding: \`file:line [type] value\`. Deduped merge of both audits (no allowlist).`,
  '',
  `- [\`compliance-findings.full.txt\`](./compliance-findings.full.txt) — **${deduped.length}** lines`,
  '',
  '## Regenerate',
  '',
  '```bash',
  'node scripts/design-system-export-violations.mjs',
  '```',
  '',
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
fs.writeFileSync(FULL_FINDINGS, fullText, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
console.log(`Wrote ${path.relative(ROOT, FULL_FINDINGS)}`);
