#!/usr/bin/env node
/**
 * Primitive boundary: no inline visual `style={{...}}` (and optional Tailwind palette
 * heuristics) outside primitive kit islands:
 *   - src/app/components/ui/**
 *   - src/design-system/ui/**
 *
 * Allowlist: scripts/design-system-primitive-boundary.allowlist.txt
 * Override path: DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH
 *
 * P1 Tailwind palette (optional): DS_PRIMITIVE_BOUNDARY_TAILWIND=1
 *
 * Usage: node scripts/design-system-primitive-boundary-check.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractJsxExpressionBlocksOpeningWithDoubleBrace,
  styleBlockHasVisualKey,
} from './design-system-jsx-style-blocks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PRIMITIVE_ISLAND_PREFIXES = ['src/app/components/ui/', 'src/design-system/ui/'];

const DEFAULT_ALLOWLIST = 'scripts/design-system-primitive-boundary.allowlist.txt';
const ALLOWLIST_PATH =
  process.env.DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH ?? path.join(ROOT, DEFAULT_ALLOWLIST);

const LEGACY_BUTTON_CLASS_RE = /\bglc-btn-(primary|secondary|ghost)\b/g;

/** Tailwind default palette scales (semantic tokens like bg-background are not matched). */
const TAILWIND_PALETTE_RE =
  /\b(bg|text|from|to|via|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|150|200|300|400|500|600|700|800|900|950)\b/g;

/** Arbitrary bracket utilities with raw hex or rgb/hsl inside (line-level heuristic). */
const TAILWIND_ARBITRARY_COLOR_RE = /\[[^\]]*(?:#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\()[^\]]*\]/gi;

const SCAN_ROOTS = [path.join(ROOT, 'src', 'app'), path.join(ROOT, 'src', 'design-system')];

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function isUnderPrimitiveIsland(r) {
  return PRIMITIVE_ISLAND_PREFIXES.some((p) => r === p.slice(0, -1) || r.startsWith(p));
}

function shouldSkipFile(r) {
  if (!r.endsWith('.tsx')) return true;
  if (r.endsWith('.d.tsx')) return true;
  if (r.includes('.test.')) return true;
  if (r.endsWith('.stories.tsx')) return true;
  if (isUnderPrimitiveIsland(r)) return true;
  return false;
}

function collectBoundaryTsxFiles() {
  const exts = new Set(['.tsx']);
  const all = SCAN_ROOTS.flatMap((dir) => walk(dir, exts));
  return all.filter((p) => !shouldSkipFile(rel(p)));
}

function loadAllowlist() {
  const abs = path.isAbsolute(ALLOWLIST_PATH) ? ALLOWLIST_PATH : path.resolve(ROOT, ALLOWLIST_PATH);
  if (process.env.DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH === '__missing_allowlist__') {
    return new Set();
  }
  if (!fs.existsSync(abs)) return new Set();
  const content = fs.readFileSync(abs, 'utf8');
  return new Set(content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function checkPrimitiveBoundaryInline() {
  const violations = [];
  for (const filePath of collectBoundaryTsxFiles()) {
    const r = rel(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    for (const { startLine, block } of extractJsxExpressionBlocksOpeningWithDoubleBrace(content)) {
      if (!styleBlockHasVisualKey(block)) continue;
      violations.push({
        file: r,
        line: startLine,
        type: 'primitive-boundary-inline',
        value: block.replace(/\s+/g, ' ').trim().slice(0, 220),
      });
    }
  }
  return violations;
}

function checkLegacyButtonsOutsideIslands() {
  const violations = [];
  for (const filePath of collectBoundaryTsxFiles()) {
    const r = rel(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      const matches = line.match(LEGACY_BUTTON_CLASS_RE);
      if (!matches) return;
      for (const value of matches) {
        violations.push({
          file: r,
          line: i + 1,
          type: 'primitive-boundary-legacy-button',
          value,
        });
      }
    });
  }
  return violations;
}

function lineLooksLikeClassContext(line) {
  return (
    /\bclassName\s*=/.test(line) ||
    /\bcn\s*\(/.test(line) ||
    /\bclsx\s*\(/.test(line) ||
    /class:\s*['"`]/.test(line) ||
    /\bcva\s*\(/.test(line)
  );
}

function checkTailwindPaletteHeuristic() {
  const violations = [];
  for (const filePath of collectBoundaryTsxFiles()) {
    const r = rel(filePath);
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) return;
      const noBlockComment = trimmed.replace(/\/\*[\s\S]*?\*\//g, '');
      if (!lineLooksLikeClassContext(noBlockComment)) return;
      const paletteMatches = noBlockComment.match(TAILWIND_PALETTE_RE);
      if (paletteMatches) {
        for (const value of [...new Set(paletteMatches)]) {
          violations.push({
            file: r,
            line: i + 1,
            type: 'primitive-boundary-tailwind-palette',
            value,
          });
        }
      }
      const arbMatches = noBlockComment.match(TAILWIND_ARBITRARY_COLOR_RE);
      if (arbMatches) {
        for (const value of [...new Set(arbMatches)]) {
          if (/\bvar\s*\(/.test(value)) continue;
          violations.push({
            file: r,
            line: i + 1,
            type: 'primitive-boundary-tailwind-arbitrary',
            value: value.slice(0, 120),
          });
        }
      }
    });
  }
  return violations;
}

function applyAllowlist(list, allowlist) {
  return list.filter((v) => !allowlist.has(`${v.file}:${v.line} [${v.type}] ${v.value}`));
}

function printViolations(title, list) {
  if (list.length === 0) return;
  console.error(`\n${title} (${list.length})`);
  for (const v of list) {
    console.error(`${v.file}:${v.line} [${v.type}] ${v.value}`);
  }
}

function main() {
  const allowlist = loadAllowlist();
  let violations = [...checkPrimitiveBoundaryInline(), ...checkLegacyButtonsOutsideIslands()];
  violations = applyAllowlist(violations, allowlist);

  if (process.env.DS_PRIMITIVE_BOUNDARY_TAILWIND === '1') {
    const tw = applyAllowlist(checkTailwindPaletteHeuristic(), allowlist);
    violations = violations.concat(tw);
  }

  if (violations.length === 0) {
    console.log('design-system-primitive-boundary-check: no violations found');
    process.exit(0);
  }

  console.error(`design-system-primitive-boundary-check: violations found (${violations.length})`);
  const byType = new Map();
  for (const v of violations) {
    if (!byType.has(v.type)) byType.set(v.type, []);
    byType.get(v.type).push(v);
  }
  for (const [type, list] of [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    printViolations(type, list);
  }
  process.exit(1);
}

main();
