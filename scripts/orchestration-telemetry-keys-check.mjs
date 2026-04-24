#!/usr/bin/env node
/**
 * DoD-7: orchestration KPI string literals must be defined only in
 * `server/src/config/orchestration-telemetry-policy.ts` (ORCHESTRATION_TELEMETRY_METRICS).
 * Run from repo root: `node scripts/orchestration-telemetry-keys-check.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const POLICY = path.join(ROOT, 'server/src/config/orchestration-telemetry-policy.ts');
const PATTERN = /['"]\s*(kpi_orchestration_[a-z0-9_]+)\s*['"]/g;

function walkDir(dir, out) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith('.')) continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === 'dist' || name.name === 'coverage') continue;
      walkDir(p, out);
    } else if (name.name.endsWith('.ts') && !name.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
}

const allTs = [];
walkDir(path.join(ROOT, 'server'), allTs);
walkDir(path.join(ROOT, 'src'), allTs);

const violations = [];
for (const file of allTs) {
  if (path.normalize(file) === path.normalize(POLICY)) continue;
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = PATTERN.exec(text)) !== null) {
    const key = m[1];
    const line = text.slice(0, m.index).split('\n').length;
    violations.push({ file, line, key });
  }
}

if (violations.length) {
  console.error('orchestration-telemetry-keys-check: ad-hoc kpi_orchestration_* literals found:');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.key}`);
  }
  console.error('Use ORCHESTRATION_TELEMETRY_METRICS from server/src/config/orchestration-telemetry-policy.ts');
  process.exit(1);
}
console.log('orchestration-telemetry-keys-check: ok');
