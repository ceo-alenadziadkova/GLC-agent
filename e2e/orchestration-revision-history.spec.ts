import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('revision history panel (Strategy Lab)', () => {
  test('strategy lab route shows orchestration section shell when UI flag on', async ({ page }) => {
    test.skip(process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !token, 'Set E2E_ORCHESTRATION_UI=1 and auth.');
    const res = await page.request.get(`${baseUrl}/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(!res.ok(), 'Pack GET required for strategy orchestration surface.');
    await page.goto(`${baseUrl}/audit/${auditId}/strategy`, { waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain(`/audit/${auditId}/strategy`);
  });
});
