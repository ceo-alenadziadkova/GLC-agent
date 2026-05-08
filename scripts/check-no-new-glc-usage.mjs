#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'glc-usage-baseline.json');
const LEGACY_CSS_REL = 'src/styles/components/legacy.css';
const EXT_RE = /\.(ts|tsx|css)$/;
const GLC_RE = /\bglc-[a-z0-9_-]+\b/gi;

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && EXT_RE.test(entry.name)) out.push(fullPath);
  }
  return out;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function countUsage() {
  const files = walk(SRC_DIR);
  let total = 0;
  for (const filePath of files) {
    const rel = toRel(filePath);
    if (rel === LEGACY_CSS_REL) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(GLC_RE);
    if (matches) total += matches.length;
  }
  return total;
}

function main() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error('no-new-glc-usage: missing baseline file');
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const current = countUsage();
  const limit = baseline.maxNonLegacyGlcUsage;

  if (current <= limit) {
    console.log(`no-new-glc-usage: ok (${current}/${limit})`);
    process.exit(0);
  }

  console.error(`no-new-glc-usage: failed (${current}/${limit})`);
  process.exit(1);
}

main();
