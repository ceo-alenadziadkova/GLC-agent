#!/usr/bin/env node
/**
 * Design System raw-values compliance check.
 *
 * Default scope (audit):
 * - src/design-system
 * - src/app/components/ui
 * - src/app/components/app-shell
 * - src/app/pages
 * - src/app/config
 *
 * Optional scope:
 * - DS_RAW_SCOPE=ds: only src/design-system
 * - DS_RAW_SCOPE=ui: src/design-system + src/app/components/ui
 * - DS_RAW_SCOPE=app: expanded audit scope
 *
 * Fails when hardcoded raw style values are found:
 * - hex/rgb/hsl colors
 * - standalone px/rem/em numeric literals in strings
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const validScopeModes = new Set(['ds', 'ui', 'app']);
const requestedScope = process.env.DS_RAW_SCOPE ?? 'app';
const scopeMode = validScopeModes.has(requestedScope) ? requestedScope : 'app';
const TARGET_DIRS = scopeMode === 'ds'
  ? ['src/design-system']
  : scopeMode === 'ui'
    ? ['src/design-system', 'src/app/components/ui']
    : [
        'src/design-system',
        'src/app/components/ui',
        'src/app/components/app-shell',
        'src/app/pages',
        'src/app/config',
      ];

const FILE_EXT = new Set(['.ts', '.tsx']);
const BASELINE_ALLOWLIST_PATH = process.env.DS_BASELINE_ALLOWLIST_PATH ?? 'scripts/design-system-baseline.allowlist.txt';

const RAW_PATTERNS = [
  { name: 'hex-color', re: /#(?:[0-9a-fA-F]{3,8})\b/g },
  { name: 'rgb-color', re: /\brgba?\([^)]*\)/gi },
  { name: 'hsl-color', re: /\bhsla?\([^)]*\)/gi },
  { name: 'unit-literal', re: /\b\d*\.?\d+(px|rem|em)\b/g },
];

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (e.isFile() && FILE_EXT.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    for (const pattern of RAW_PATTERNS) {
      const matches = line.match(pattern.re);
      if (!matches) continue;
      for (const value of matches) {
        violations.push({
          file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
          line: lineNo,
          type: pattern.name,
          value,
          signature: '',
        });
      }
    }
  });

  return violations;
}

function loadAllowlist() {
  const abs = path.resolve(ROOT, BASELINE_ALLOWLIST_PATH);
  if (!fs.existsSync(abs)) return new Set();
  const content = fs.readFileSync(abs, 'utf8');
  return new Set(content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function main() {
  const allowlist = loadAllowlist();
  const allFiles = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const violations = allFiles
    .flatMap((file) => checkFile(file))
    .map((v) => ({
      ...v,
      signature: `${v.file}:${v.line} [${v.type}] ${v.value}`,
    }))
    .filter((v) => !allowlist.has(v.signature));

  if (violations.length === 0) {
    console.log(`design-system-raw-values-check (${scopeMode}): no violations found`);
    process.exit(0);
  }

  console.error(`design-system-raw-values-check (${scopeMode}): violations found`);
  for (const v of violations) {
    console.error(v.signature);
  }
  process.exit(1);
}

main();
