#!/usr/bin/env node
/**
 * Reads Playwright JSON report from test-results/orchestration-e2e.json
 * (written when E2E_ORCHESTRATION_JSON=1 — see playwright.config.ts).
 * Prints KPI lines for CI logs: total / passed / failed / skipped and non-skip %.
 *
 * E2E_ORCHESTRATION_STRICT=1: if E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN
 * are set and every test was skipped, exit 1 (org expects real API coverage).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'test-results', 'orchestration-e2e.json');

function walkSuite(suite, out) {
  if (!suite || typeof suite !== 'object') return;
  for (const s of suite.suites ?? []) {
    walkSuite(s, out);
  }
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      for (const r of t.results ?? []) {
        const st = r.status;
        if (st === 'passed' || st === 'skipped' || st === 'failed' || st === 'timedOut' || st === 'interrupted') {
          out[st] = (out[st] ?? 0) + 1;
        } else if (st) {
          out.other = (out.other ?? 0) + 1;
        }
      }
    }
  }
}

function main() {
  if (!fs.existsSync(reportPath)) {
    if (process.env.E2E_ORCHESTRATION_JSON === '1' && process.env.CI) {
      console.error(
        'e2e-orchestration-kpi: missing test-results/orchestration-e2e.json — run Playwright with E2E_ORCHESTRATION_JSON=1 first.',
      );
      process.exit(1);
    }
    console.log('e2e-orchestration-kpi: no JSON report (set E2E_ORCHESTRATION_JSON=1 for KPI output).');
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const counts = {};
  for (const s of raw.suites ?? []) {
    walkSuite(s, counts);
  }
  const passed = counts.passed ?? 0;
  const failed = (counts.failed ?? 0) + (counts.timedOut ?? 0) + (counts.interrupted ?? 0);
  const skipped = counts.skipped ?? 0;
  const total = passed + failed + skipped + (counts.other ?? 0);
  const executed = passed + failed;
  const nonSkipPct = total > 0 ? ((executed / total) * 100).toFixed(1) : '0.0';

  console.log(
    `e2e_orchestration_kpi total=${total} passed=${passed} failed=${failed} skipped=${skipped} non_skip_percent=${nonSkipPct}`,
  );

  const strict = process.env.E2E_ORCHESTRATION_STRICT === '1';
  const hasCreds = Boolean(process.env.E2E_ORCHESTRATION_AUDIT_ID?.trim() && process.env.E2E_ORCHESTRATION_AUTH_TOKEN?.trim());
  if (strict && hasCreds && total > 0 && executed === 0) {
    console.error(
      'e2e_orchestration_kpi: E2E_ORCHESTRATION_STRICT=1 but all tests were skipped despite E2E_ORCHESTRATION_* being set — fix secrets or VITE_API_URL proxy (see e2e/README.md).',
    );
    process.exit(1);
  }
}

main();
