#!/usr/bin/env node
/**
 * Fail on raw color literals in TS/TSX (hex, rgb/rgba, hsl/hsla).
 * SSOT for color values: src/styles/tokens.css. TS should use var(--*) only.
 *
 * Allowlist file: scripts/design-system-ts-color-allowlist.txt
 *   - Per-line: `path/to/file.ts:42 [ts-color-literal] #fff`
 *   - Whole file: `@allow-file path/to/file.ts`
 *
 * Usage: node scripts/design-system-ts-color-literals-check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'design-system-ts-color-allowlist.txt');

const PATTERNS = [
  { name: 'hex-color', re: /#(?:[0-9a-fA-F]{3,8})\b/g },
  { name: 'rgb-color', re: /\brgba?\([^)]*\)/gi },
  { name: 'hsl-color', re: /\bhsla?\([^)]*\)/gi },
];

const SCAN_ROOTS = [path.join(ROOT, 'src'), path.join(ROOT, 'server', 'src')];

function loadAllowlist() {
  const allowedFiles = new Set();
  const allowedLines = new Set();
  if (!fs.existsSync(ALLOWLIST_PATH)) return { allowedFiles, allowedLines };
  for (const line of fs.readFileSync(ALLOWLIST_PATH, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^@allow-file\s+(.+)$/);
    if (m) {
      allowedFiles.add(m[1].replace(/\\/g, '/'));
      continue;
    }
    allowedLines.add(t);
  }
  return { allowedFiles, allowedLines };
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      walk(full, exts, out);
    } else if (e.isFile() && exts.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function main() {
  const { allowedFiles, allowedLines } = loadAllowlist();
  const exts = new Set(['.ts', '.tsx']);
  const files = SCAN_ROOTS.flatMap((dir) => walk(dir, exts));
  const violations = [];

  for (const filePath of files) {
    const r = rel(filePath);
    if (r.endsWith('.d.ts')) continue;
    if (allowedFiles.has(r)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      for (const { re } of PATTERNS) {
        const matches = line.match(re);
        if (!matches) continue;
        for (const value of matches) {
          if (allowedLines.has(`${r}:${lineNo} [ts-color-literal] ${value}`)) continue;
          violations.push({ file: r, line: lineNo, type: 'ts-color-literal', value });
        }
      }
    });
  }

  if (violations.length === 0) {
    console.log('design-system-ts-color-literals-check: no violations found');
    process.exit(0);
  }

  console.error(`design-system-ts-color-literals-check: violations found (${violations.length})`);
  for (const v of violations) {
    console.error(`${v.file}:${v.line} [${v.type}] ${v.value}`);
  }
  process.exit(1);
}

main();
