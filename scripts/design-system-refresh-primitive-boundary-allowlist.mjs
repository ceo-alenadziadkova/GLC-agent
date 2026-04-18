#!/usr/bin/env node
/**
 * Rewrite scripts/design-system-primitive-boundary.allowlist.txt from current
 * primitive-boundary audit output (no prior allowlist).
 *
 * Usage: node scripts/design-system-refresh-primitive-boundary-allowlist.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', 'design-system-primitive-boundary.allowlist.txt');

function captureLines(cmd) {
  try {
    execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, DS_PRIMITIVE_BOUNDARY_ALLOWLIST_PATH: '__missing_allowlist__' },
    });
    return [];
  } catch (e) {
    const text = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    return text.split(/\r?\n/).filter((l) => l.startsWith('src/'));
  }
}

const cmd = 'node scripts/design-system-primitive-boundary-check.mjs';
const lines = [...new Set(captureLines(cmd))].sort();
fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
console.error(
  `design-system-refresh-primitive-boundary-allowlist: wrote ${lines.length} lines to ${path.relative(ROOT, OUT)}`,
);
