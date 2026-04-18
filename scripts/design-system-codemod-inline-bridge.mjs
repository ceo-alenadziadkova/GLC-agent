#!/usr/bin/env node
/**
 * Migrate simple `className="…" style={{ color: 'var(--…)' }}` pairs to `.ds-*` bridge classes.
 * Only touches static double-quoted className + single-quoted color (and swapped quotes variant).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const COLOR_MAP = [
  ["'var(--text-primary)'", 'ds-text-primary'],
  ["'var(--text-secondary)'", 'ds-text-secondary'],
  ["'var(--text-tertiary)'", 'ds-text-tertiary'],
  ["'var(--text-quaternary)'", 'ds-text-quaternary'],
  ["'var(--glc-blue)'", 'ds-text-brand'],
  ["'var(--score-1)'", 'ds-text-score-1'],
  ["'var(--score-2)'", 'ds-text-score-2'],
  ["'var(--score-3)'", 'ds-text-score-3'],
  ["'var(--score-4)'", 'ds-text-score-4'],
  ["'var(--score-5)'", 'ds-text-score-5'],
  ['"var(--text-primary)"', 'ds-text-primary'],
  ['"var(--text-secondary)"', 'ds-text-secondary'],
  ['"var(--text-tertiary)"', 'ds-text-tertiary'],
  ['"var(--text-quaternary)"', 'ds-text-quaternary'],
  ['"var(--glc-blue)"', 'ds-text-brand'],
  ['"var(--score-1)"', 'ds-text-score-1'],
  ['"var(--score-2)"', 'ds-text-score-2'],
  ['"var(--score-3)"', 'ds-text-score-3'],
  ['"var(--score-4)"', 'ds-text-score-4'],
  ['"var(--score-5)"', 'ds-text-score-5'],
];

const PANEL_PATTERNS = [
  {
    style: "style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}",
    cls: 'ds-panel-canvas-primary',
  },
  {
    style: "style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}",
    cls: 'ds-panel-surface-primary',
  },
  {
    style: "style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}",
    cls: 'ds-panel-canvas',
  },
  {
    style: "style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}",
    cls: 'ds-border-subtle ds-bg-inset',
  },
  {
    style: "style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}",
    cls: 'ds-panel-surface',
  },
];

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

function mergeClass(existing, add) {
  const parts = add.split(/\s+/).filter(Boolean);
  const cur = existing.trim().split(/\s+/).filter(Boolean);
  const set = new Set(cur);
  for (const p of parts) set.add(p);
  return [...set].join(' ');
}

/** className="…" then optional whitespace then style={{ color: '…' }} */
function stripColorInline(content) {
  let changed = false;
  let next = content;
  for (const [colorLit, dsClass] of COLOR_MAP) {
    const re = new RegExp(
      `className="([^"]*)"(\\s*)style=\\{\\{\\s*color:\\s*${colorLit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`,
      'g',
    );
    next = next.replace(re, (_m, cls, sp) => {
      changed = true;
      return `className="${mergeClass(cls, dsClass)}"${sp}`;
    });
  }
  return { content: next, changed };
}

function stripPanelInline(content) {
  let changed = false;
  let next = content;
  for (const { style, cls } of PANEL_PATTERNS) {
    const esc = style.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`className="([^"]*)"(\\s*)${esc}`, 'g');
    next = next.replace(re, (_m, c, sp) => {
      changed = true;
      return `className="${mergeClass(c, cls)}"${sp}`;
    });
  }
  return { content: next, changed };
}

function stripFontSizeColor(content) {
  let changed = false;
  let next = content;
  const pairs = [
    [
      "style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}",
      'ds-type-xs-tertiary',
    ],
    [
      "style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}",
      'ds-type-xs-secondary',
    ],
    [
      "style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}",
      'ds-type-sm-secondary-leading',
    ],
  ];
  for (const [style, cls] of pairs) {
    const esc = style.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`className="([^"]*)"(\\s*)${esc}`, 'g');
    next = next.replace(re, (_m, c, sp) => {
      changed = true;
      return `className="${mergeClass(c, cls)}"${sp}`;
    });
  }
  return { content: next, changed };
}

function stripBgInset(content) {
  const re =
    /className="([^"]*)"(\s*)style=\{\{\s*backgroundColor:\s*'var\(--bg-inset\)'\s*\}\}/g;
  let changed = false;
  const next = content.replace(re, (_m, c, sp) => {
    changed = true;
    return `className="${mergeClass(c, 'ds-bg-inset')}"${sp}`;
  });
  return { content: next, changed };
}

function stripBgSurfaceOnly(content) {
  const re =
    /className="([^"]*)"(\s*)style=\{\{\s*backgroundColor:\s*'var\(--bg-surface\)'\s*\}\}/g;
  let changed = false;
  const next = content.replace(re, (_m, c, sp) => {
    changed = true;
    return `className="${mergeClass(c, 'ds-bg-surface')}"${sp}`;
  });
  return { content: next, changed };
}

function stripRadiusXl(content) {
  const re =
    /className="([^"]*)"(\s*)style=\{\{\s*borderRadius:\s*'var\(--radius-xl\)'\s*\}\}/g;
  let changed = false;
  const next = content.replace(re, (_m, c, sp) => {
    changed = true;
    return `className="${mergeClass(c, 'ds-radius-xl')}"${sp}`;
  });
  return { content: next, changed };
}

function processFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  const original = text;
  let any = false;
  for (const fn of [
    stripColorInline,
    stripPanelInline,
    stripFontSizeColor,
    stripBgInset,
    stripBgSurfaceOnly,
    stripRadiusXl,
  ]) {
    const r = fn(text);
    text = r.content;
    any = any || r.changed;
  }
  if (text !== original) {
    fs.writeFileSync(filePath, text, 'utf8');
    return true;
  }
  return false;
}

const targets = [
  ...walk(path.join(ROOT, 'src', 'app'), new Set(['.tsx'])),
  ...walk(path.join(ROOT, 'src', 'design-system'), new Set(['.tsx'])),
];

let n = 0;
for (const f of targets) {
  if (processFile(f)) {
    n += 1;
    console.error('updated', path.relative(ROOT, f));
  }
}
console.error(`design-system-codemod-inline-bridge: updated ${n} files`);
