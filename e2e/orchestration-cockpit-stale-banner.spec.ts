/**
 * Consultant cockpit: stale pack banner after POST govern_action returns 409.
 * Needs consultant browser session: set E2E_CONSULTANT_E2E_EMAIL, E2E_CONSULTANT_E2E_PASSWORD,
 * E2E_ORCHESTRATION_AUDIT_ID, and E2E_ORCHESTRATION_UI=1. POST is mocked to 409; GET pack uses the real API.
 */
import { expect, test, type Page } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID?.trim() ?? '';
const email = process.env.E2E_CONSULTANT_E2E_EMAIL?.trim() ?? '';
const password = process.env.E2E_CONSULTANT_E2E_PASSWORD?.trim() ?? '';

async function loginConsultantLocal(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}

test.describe('consultant orchestration cockpit stale banner', () => {
  test('shows stale banner when govern POST returns 409', async ({ page }) => {
    test.skip(
      process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !email || !password,
      'Set E2E_ORCHESTRATION_UI=1, E2E_ORCHESTRATION_AUDIT_ID, E2E_CONSULTANT_E2E_EMAIL, E2E_CONSULTANT_E2E_PASSWORD.',
    );

    await page.route(`**/api/audits/${auditId}/orchestration/pack`, async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'AUDITS_ORCHESTRATION_PACK_STALE_VERSION',
            error: 'Orchestration pack was updated; refresh and try again',
            details: { current_orchestration_pack_version: 1 },
          }),
        });
      }
      return route.continue();
    });

    await loginConsultantLocal(page);
    await page.goto(`/audit/${auditId}/orchestration`, { waitUntil: 'domcontentloaded' });
    const accept = page.getByRole('button', { name: /accept plan/i });
    await expect(accept).toBeEnabled({ timeout: 45_000 });
    await accept.click();
    await expect(page.getByTestId('orchestration-stale-pack-banner')).toBeVisible({ timeout: 15_000 });
  });
});
