import { test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('execution pack repeat dialog', () => {
  test('portal timeline may render repeat-confirm when enabled', async ({ page }) => {
    test.skip(process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !token, 'Set E2E_ORCHESTRATION_UI=1 and auth.');
    await page.goto(`${baseUrl}/portal/audit/${auditId}/timeline`, { waitUntil: 'domcontentloaded' });
    // Smoke: page loads; repeat dialog is stateful — we only assert no crash.
    await page.waitForTimeout(500);
  });
});
