#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'glc-legacy-baseline.json');
const LEGACY_CSS_PATH = path.join(ROOT, 'src', 'styles', 'components', 'legacy.css');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function countLegacyMetrics(content) {
  const lines = content.split(/\r?\n/).length - 1;
  const selectors = (content.match(/^\.glc-[^\s,{]+/gm) ?? []).length;
  return { lines, selectors };
}

function main() {
  if (!fs.existsSync(BASELINE_PATH) || !fs.existsSync(LEGACY_CSS_PATH)) {
    console.error('legacy-css-growth: baseline or target file is missing');
    process.exit(1);
  }

  const baseline = readJson(BASELINE_PATH);
  const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
  const metrics = countLegacyMetrics(content);

  const lineOk = metrics.lines <= baseline.legacyCssMaxLines;
  const selectorOk = metrics.selectors <= baseline.legacyCssMaxGlcSelectors;

  if (lineOk && selectorOk) {
    console.log(
      `legacy-css-growth: ok (lines ${metrics.lines}/${baseline.legacyCssMaxLines}, selectors ${metrics.selectors}/${baseline.legacyCssMaxGlcSelectors})`,
    );
    process.exit(0);
  }

  console.error(
    `legacy-css-growth: failed (lines ${metrics.lines}/${baseline.legacyCssMaxLines}, selectors ${metrics.selectors}/${baseline.legacyCssMaxGlcSelectors})`,
  );
  process.exit(1);
}

main();
