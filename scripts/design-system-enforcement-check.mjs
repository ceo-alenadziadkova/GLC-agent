#!/usr/bin/env node
/**
 * Target architecture enforcement checks:
 * - no new inline visual styles in TSX
 * - no token-like raw visual values in src/app/config/**
 * - utilities.css must remain layout-only (no visual glc-* utility styling)
 *
 * Optional scope:
 * - DS_ENFORCEMENT_SCOPE=ds: only src/design-system
 * - DS_ENFORCEMENT_SCOPE=ui: src/design-system + src/app/components/ui
 * - DS_ENFORCEMENT_SCOPE=app: expanded app scope (default)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const INLINE_STYLE_VISUAL_KEYS = [
  'color',
  'background',
  'backgroundColor',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
  'boxShadow',
  'textShadow',
  'filter',
];

const TOKEN_LIKE_RAW_RE = /#(?:[0-9a-fA-F]{3,8})\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\b\d*\.?\d+(px|rem|em)\b/g;
const LEGACY_BUTTON_CLASS_RE = /\bglc-btn-(primary|secondary|ghost)\b/g;
const BASELINE_ALLOWLIST_PATH = process.env.DS_BASELINE_ALLOWLIST_PATH ?? 'scripts/design-system-baseline.allowlist.txt';
const validScopeModes = new Set(['ds', 'ui', 'app']);
const requestedScope = process.env.DS_ENFORCEMENT_SCOPE ?? 'app';
const scopeMode = validScopeModes.has(requestedScope) ? requestedScope : 'app';

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, exts));
    } else if (entry.isFile() && exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function loadAllowlist() {
  const abs = path.resolve(ROOT, BASELINE_ALLOWLIST_PATH);
  if (!fs.existsSync(abs)) return new Set();
  const content = fs.readFileSync(abs, 'utf8');
  return new Set(content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function inlineStyleTargetDirs() {
  if (scopeMode === 'ds') return ['src/design-system'];
  if (scopeMode === 'ui') return ['src/design-system', 'src/app/components/ui'];
  return ['src/design-system', 'src/app/components/ui', 'src/app/components', 'src/app/pages', 'src/app/marketing'];
}

/**
 * JSX `style={{ ... }}` may span lines; balance `{`/`}` from the opening `{` of the
 * outer `{ ... }` expression (same as prior single-line check, extended).
 */
function extractJsxExpressionBlocksOpeningWithDoubleBrace(content) {
  const blocks = [];
  const re = /\bstyle=\{\{/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const exprOpen = m.index + 'style='.length;
    const end = findMatchingBraceEnd(content, exprOpen);
    if (end === -1) continue;
    const block = content.slice(exprOpen, end + 1);
    const startLine = content.slice(0, exprOpen).split('\n').length;
    blocks.push({ startLine, block });
  }
  return blocks;
}

function findMatchingBraceEnd(content, openBraceIndex) {
  let depth = 0;
  let inStr = null;
  let escape = false;
  let inTemplateExpr = false; // ${ inside `

  for (let i = openBraceIndex; i < content.length; i++) {
    const c = content[i];

    if (inStr === '`') {
      if (inTemplateExpr) {
        if (c === '}') {
          inTemplateExpr = false;
          continue;
        }
        continue;
      }
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '$' && content[i + 1] === '{') {
        inTemplateExpr = true;
        i++;
        continue;
      }
      if (c === '`') {
        inStr = null;
        continue;
      }
      continue;
    }

    if (inStr === '"' || inStr === "'") {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === inStr) {
        inStr = null;
        continue;
      }
      continue;
    }

    if (c === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && content[i + 1] === '*') {
      i += 2;
      while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) i++;
      i++;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }

    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function styleBlockHasVisualKey(block) {
  return INLINE_STYLE_VISUAL_KEYS.some((key) => new RegExp(`\\b${key}\\s*:`).test(block));
}

function checkInlineVisualStyles() {
  const targets = inlineStyleTargetDirs().flatMap((dir) => walk(path.join(ROOT, dir), new Set(['.tsx'])));
  const violations = [];
  for (const filePath of targets) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const { startLine, block } of extractJsxExpressionBlocksOpeningWithDoubleBrace(content)) {
      if (!styleBlockHasVisualKey(block)) continue;
      violations.push({
        file: rel(filePath),
        line: startLine,
        type: 'inline-visual-style',
        value: block.replace(/\s+/g, ' ').trim().slice(0, 220),
      });
    }
  }
  return violations;
}

/** IntersectionObserver rootMargin must use px strings in Chromium — not design tokens. */
const CONFIG_SKIP_TOKEN_LIKE_RAW_BASENAMES = new Set(['marketing-motion.ts']);

function checkConfigTokenLikeRawValues() {
  if (scopeMode !== 'app') return [];
  const targets = walk(path.join(ROOT, 'src', 'app', 'config'), new Set(['.ts', '.tsx']));
  const violations = [];
  for (const filePath of targets) {
    const r = rel(filePath);
    const base = path.basename(filePath);
    if (CONFIG_SKIP_TOKEN_LIKE_RAW_BASENAMES.has(base)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!line.includes(':')) return;
      const matches = line.match(TOKEN_LIKE_RAW_RE);
      if (!matches) return;
      for (const value of matches) {
        violations.push({
          file: r,
          line: i + 1,
          type: 'config-token-like-raw',
          value,
        });
      }
    });
  }
  return violations;
}

function checkUtilityVisualStyling() {
  const target = path.join(ROOT, 'src', 'styles', 'utilities.css');
  if (!fs.existsSync(target)) return [];
  const content = fs.readFileSync(target, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];
  const visualProps = [
    'color:',
    'background:',
    'background-color:',
    'font-size:',
    'font-weight:',
    'font-family:',
    'line-height:',
    'letter-spacing:',
    'border-radius:',
    'box-shadow:',
    'text-shadow:',
  ];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('/*')) return;
    if (!visualProps.some((p) => trimmed.includes(p))) return;
    violations.push({
      file: rel(target),
      line: i + 1,
      type: 'utility-visual-style',
      value: trimmed,
    });
  });
  return violations;
}

function checkLegacyButtonClassUsage() {
  if (scopeMode === 'ds') return [];
  const targets = [
    ...walk(path.join(ROOT, 'src', 'app', 'components'), new Set(['.ts', '.tsx'])),
    ...walk(path.join(ROOT, 'src', 'app', 'pages'), new Set(['.ts', '.tsx'])),
  ];
  const findings = [];
  for (const filePath of targets) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      const matches = line.match(LEGACY_BUTTON_CLASS_RE);
      if (!matches) return;
      for (const value of matches) {
        findings.push({
          file: rel(filePath),
          line: i + 1,
          type: 'legacy-button-class',
          value,
        });
      }
    });
  }
  return findings;
}

function printViolations(title, list) {
  if (list.length === 0) return;
  console.error(`\n${title} (${list.length})`);
  for (const v of list) {
    console.error(`${v.file}:${v.line} [${v.type}] ${v.value}`);
  }
}

function applyAllowlist(list, allowlist) {
  return list.filter((v) => !allowlist.has(`${v.file}:${v.line} [${v.type}] ${v.value}`));
}

function main() {
  const allowlist = loadAllowlist();
  const inlineStyleViolations = applyAllowlist(checkInlineVisualStyles(), allowlist);
  const configViolations = applyAllowlist(checkConfigTokenLikeRawValues(), allowlist);
  const utilityViolations = applyAllowlist(checkUtilityVisualStyling(), allowlist);
  const legacyButtonFindings = applyAllowlist(checkLegacyButtonClassUsage(), allowlist);
  const enforceLegacyButtons = process.env.DS_ENFORCE_LEGACY_BUTTONS === '1';
  if (legacyButtonFindings.length > 0) {
    const title = enforceLegacyButtons
      ? 'Legacy button class violations'
      : 'Legacy button class findings (informational)';
    printViolations(title, legacyButtonFindings);
  }
  const legacyButtonViolationCount = enforceLegacyButtons ? legacyButtonFindings.length : 0;
  const total = inlineStyleViolations.length + configViolations.length + utilityViolations.length + legacyButtonViolationCount;

  if (total === 0) {
    console.log(`design-system-enforcement-check (${scopeMode}): no violations found`);
    process.exit(0);
  }

  console.error(`design-system-enforcement-check (${scopeMode}): violations found`);
  printViolations('Inline visual style violations', inlineStyleViolations);
  printViolations('Config token-like raw value violations', configViolations);
  printViolations('Utilities visual styling violations', utilityViolations);
  process.exit(1);
}

main();
