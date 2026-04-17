#!/usr/bin/env node
/**
 * Regenerate docs/design-system/violations-export.md — §4.1 migration drift mirror
 * (baseline + primitive-boundary subprocesses without grandfather allowlists).
 * Usage: pnpm run audit:ds:migration-report
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectMigrationDriftMergedRows,
  dedupeLineBased,
  findingsFullTextFromRows,
} from './design-system-migration-drift-sigs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'design-system', 'violations-export.md');
const FULL_FINDINGS = path.join(ROOT, 'docs', 'design-system', 'compliance-findings.full.txt');

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

const {
  rawSigs,
  enfSigs,
  tsColorSigs,
  primitiveBoundarySigs,
  patternsLockSigs,
  merged,
} = collectMigrationDriftMergedRows(ROOT);

const deduped = dedupeLineBased(merged);
const fullText = findingsFullTextFromRows(deduped);

const date = new Date().toISOString().slice(0, 10);
const lines = [
  '# Design system violations export (§4.1 migration drift mirror)',
  '',
  `Generated: ${date} via \`pnpm run audit:ds:migration-report\` (\`node scripts/design-system-export-violations.mjs\`).`,
  '',
  '**§4.1 Migration pipeline:** same audits as **§4.2** but baseline and primitive-boundary subprocesses run **without** grandfather allowlists (subprocess env matches strict `audit:ds:runtime`). This file is **not** the merge gate — use it to see drift while shrinking toward zero. **§4.2 Runtime governance:** `pnpm run audit:ds:ci` / `audit:ds:runtime` — **0** baseline/PB grandfather violations; only `scripts/design-system-ts-color-allowlist.txt` (PDF bridge) may suppress ts-color findings.',
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
