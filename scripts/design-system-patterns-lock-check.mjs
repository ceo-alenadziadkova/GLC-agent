#!/usr/bin/env node
/**
 * Pattern layer lock: under src/design-system/patterns/** only composition/layout.
 * Forbids inline style, raw color literals, and common Tailwind visual utilities.
 *
 * Usage: node scripts/design-system-patterns-lock-check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PATTERNS_ROOT = path.join(ROOT, 'src', 'design-system', 'patterns');

const COLOR_LITERAL_RES = [
  { name: 'hex-color', re: /#(?:[0-9a-fA-F]{3,8})\b/g },
  { name: 'rgb-color', re: /\brgba?\([^)]*\)/gi },
  { name: 'hsl-color', re: /\bhsla?\([^)]*\)/gi },
];

/** Tailwind / class tokens that belong in primitives or CSS bridges, not pattern TS. */
const LINE_RULES = [
  { type: 'patterns-lock-inline-style', re: /\bstyle\s*=/g },
  { type: 'patterns-lock-shadow', re: /\bshadow-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-ring', re: /\bring(?:-[a-z0-9_-]+)?\b/gi },
  { type: 'patterns-lock-ring-offset', re: /\bring-offset-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-font', re: /\bfont-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-leading', re: /\bleading-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-tracking', re: /\btracking-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-antialiased', re: /\bantialiased\b/g },
  { type: 'patterns-lock-text-size', re: /\btext-(2xs|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/gi },
  {
    type: 'patterns-lock-text-color',
    re: /\btext-(?!left\b|right\b|center\b|start\b|end\b|justify\b)[a-z][a-z0-9_-]*/gi,
  },
  { type: 'patterns-lock-bg', re: /\bbg-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-gradient-from', re: /\bfrom-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-gradient-to', re: /\bto-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-gradient-via', re: /\bvia-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-fill', re: /\bfill-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-stroke', re: /\bstroke-(?!(?:0|1|2)\b)[a-z0-9_-]+/gi },
  { type: 'patterns-lock-rounded', re: /\brounded(-[a-z0-9_-]+|\[[^\]]+\])?/gi },
  {
    type: 'patterns-lock-border-color',
    re: /\bborder-(default|subtle|strong|primary|secondary|muted|accent|destructive|input|ring|border|warning|info|success)\b/gi,
  },
  { type: 'patterns-lock-opacity', re: /\bopacity-[a-z0-9_-]+/gi },
  { type: 'patterns-lock-glc-visual', re: /\bglc-[a-z0-9_-]+/gi },
];

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, exts, out);
    } else if (e.isFile() && exts.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function collectPatternFiles() {
  const exts = new Set(['.ts', '.tsx']);
  return walk(PATTERNS_ROOT, exts).filter((p) => {
    const r = rel(p);
    if (r.includes('.test.')) return false;
    return true;
  });
}

function collectLineMatches(line, lineNo, fileRel, violations) {
  for (const { type, re } of LINE_RULES) {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let m;
    while ((m = r.exec(line)) !== null) {
      violations.push({ file: fileRel, line: lineNo, type, value: m[0] });
    }
  }
}

function collectColorLiterals(line, lineNo, fileRel, violations) {
  for (const { name, re } of COLOR_LITERAL_RES) {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let m;
    while ((m = r.exec(line)) !== null) {
      violations.push({ file: fileRel, line: lineNo, type: `patterns-lock-${name}`, value: m[0] });
    }
  }
}

function checkFile(filePath) {
  const fileRel = rel(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    const lineNo = idx + 1;
    collectColorLiterals(line, lineNo, fileRel, violations);
    collectLineMatches(line, lineNo, fileRel, violations);
  });
  return violations;
}

function dedupeViolations(list) {
  const seen = new Set();
  const out = [];
  for (const v of list) {
    const k = `${v.file}:${v.line}:${v.type}:${v.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function main() {
  const all = collectPatternFiles().flatMap((p) => checkFile(p));
  const violations = dedupeViolations(all);

  if (violations.length === 0) {
    console.log('design-system-patterns-lock-check: no violations found');
    process.exit(0);
  }

  console.error(`design-system-patterns-lock-check: violations found (${violations.length})`);
  violations.sort(
    (a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.type.localeCompare(b.type) || a.value.localeCompare(b.value),
  );
  for (const v of violations) {
    console.error(`${v.file}:${v.line} [${v.type}] ${v.value}`);
  }
  process.exit(1);
}

main();
