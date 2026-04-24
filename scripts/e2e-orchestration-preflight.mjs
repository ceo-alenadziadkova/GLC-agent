#!/usr/bin/env node
/**
 * Prints which orchestration E2E env vars are set (values redacted).
 * Exit 0 always — informational for local/CI prep. Does not run Playwright.
 *
 * @see e2e/README.md
 * @see e2e/.env.orchestration.example
 */

const keys = [
  ['E2E_ORCHESTRATION_AUDIT_ID', true],
  ['E2E_ORCHESTRATION_AUTH_TOKEN', true],
  ['VITE_API_URL', false],
  ['E2E_VITE_API_PROXY_TARGET', false],
  ['E2E_CONSULTANT_E2E_EMAIL', false],
  ['E2E_CONSULTANT_E2E_PASSWORD', true],
  ['E2E_ORCHESTRATION_UI', false],
  ['E2E_ORCHESTRATION_JSON', false],
  ['E2E_ORCHESTRATION_STRICT', false],
];

for (const [k, secret] of keys) {
  const v = process.env[k];
  if (v === undefined || v === '') {
    console.log(`${k}: (unset)`);
  } else if (secret) {
    console.log(`${k}: (set, ${v.length} chars)`);
  } else {
    console.log(`${k}: ${v}`);
  }
}

const hasCreds =
  process.env.E2E_ORCHESTRATION_AUDIT_ID && process.env.E2E_ORCHESTRATION_AUTH_TOKEN;
console.log(
  hasCreds
    ? '\nStatus: API orchestration E2E can run (subject to VITE_API_URL / proxy alignment).'
    : '\nStatus: API orchestration E2E will skip (set E2E_ORCHESTRATION_AUDIT_ID + E2E_ORCHESTRATION_AUTH_TOKEN for real coverage).',
);
