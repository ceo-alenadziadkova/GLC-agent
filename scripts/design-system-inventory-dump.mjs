#!/usr/bin/env node
/**
 * Deduped style literal inventory for docs (as-is extraction).
 * Walks `src` tree for .css, .ts, .tsx and writes docs/design-system/inventory-dump.md
 *
 * Usage: node scripts/design-system-inventory-dump.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TOKENS_CSS = path.join(SRC, 'styles', 'tokens.css');
const OUT = path.join(ROOT, 'docs', 'design-system', 'inventory-dump.md');

const FILE_EXT = new Set(['.css', '.ts', '.tsx']);

const PATTERNS = [
  { key: 'hex-color', re: /#(?:[0-9a-fA-F]{3,8})\b/g },
  { key: 'rgb-color', re: /\brgba?\([^)]*\)/gi },
  { key: 'hsl-color', re: /\bhsla?\([^)]*\)/gi },
  { key: 'unit-literal', re: /\b-?\d*\.?\d+(px|rem|em)\b/g },
];

const CLAMP_RE = /clamp\([^)]+\)/g;

/** @param {string} dir */
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
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

/**
 * @param {string} content
 * @param {RegExp} pattern
 * @param {Set<string>} into
 */
function collectMatches(content, pattern, into) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let m;
  while ((m = re.exec(content)) !== null) {
    into.add(m[0]);
  }
}

/** CSS custom property names defined in tokens.css (assignment lines). */
function extractTokensCssCustomProperties() {
  if (!fs.existsSync(TOKENS_CSS)) return [];
  const text = fs.readFileSync(TOKENS_CSS, 'utf8');
  const names = new Set();
  const re = /^\s*(--[\w-]+)\s*:/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    names.add(m[1]);
  }
  return [...names].sort();
}

function main() {
  const files = walk(SRC).sort();
  const buckets = {
    'hex-color': new Set(),
    'rgb-color': new Set(),
    'hsl-color': new Set(),
    'unit-literal': new Set(),
    'clamp': new Set(),
  };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { key, re } of PATTERNS) {
      collectMatches(content, re, buckets[key]);
    }
    collectMatches(content, CLAMP_RE, buckets.clamp);
  }

  const tokenNames = extractTokensCssCustomProperties();
  const isoDate = new Date().toISOString().slice(0, 10);

  const lines = [
    '# Design system inventory dump (generated)',
    '',
    `Generated: ${isoDate} (run \`pnpm run audit:ds:inventory-dump\`).`,
    '',
    'This file lists **deduplicated literals** found under `src/**/*.css|ts|tsx` plus **custom property names** assigned in `src/styles/tokens.css`.',
    'It is an appendix to [current.md](./current.md) (as-is §1–10). Governance and enforcement context: [roadmap-notes.md](./roadmap-notes.md). Regenerate after visual changes; do not hand-edit lists.',
    '',
    '## Custom properties defined in tokens.css',
    '',
    `Total: **${tokenNames.length}**`,
    '',
    ...tokenNames.map((n) => `- \`${n}\``),
    '',
    '## Literal sets (unique, sorted)',
    '',
  ];

  for (const key of ['hex-color', 'rgb-color', 'hsl-color', 'unit-literal', 'clamp']) {
    const sorted = [...buckets[key]].sort((a, b) => a.localeCompare(b));
    lines.push(`### ${key}`);
    lines.push('');
    lines.push(`Count: **${sorted.length}**`);
    lines.push('');
    lines.push('```');
    lines.push(...sorted);
    lines.push('```');
    lines.push('');
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.error(`Wrote ${path.relative(ROOT, OUT)}`);
}

main();
