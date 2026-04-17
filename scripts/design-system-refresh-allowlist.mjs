#!/usr/bin/env node
/**
 * Rewrite scripts/design-system-baseline.allowlist.txt from current audit output
 * (no prior allowlist). Run after migrating violations so line numbers stay accurate.
 *
 * Usage: node scripts/design-system-refresh-allowlist.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', 'design-system-baseline.allowlist.txt');

function captureLines(cmd) {
  try {
    execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, DS_BASELINE_ALLOWLIST_PATH: '__missing_allowlist__' },
    });
    return [];
  } catch (e) {
    const text = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    return text.split(/\r?\n/).filter((l) => l.startsWith('src/'));
  }
}

const rawCmd = 'node scripts/design-system-raw-values-check.mjs';
const enfCmd = 'node scripts/design-system-enforcement-check.mjs';

const lines = [...new Set([...captureLines(rawCmd), ...captureLines(enfCmd)])].sort();
fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
console.error(`design-system-refresh-allowlist: wrote ${lines.length} lines to ${path.relative(ROOT, OUT)}`);
