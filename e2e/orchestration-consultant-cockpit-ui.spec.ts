/**
 * Happy-path browser smoke: login → consultant orchestration cockpit shell.
 * Does not POST rebuild (avoids side effects on shared staging audit).
 */
import { expect, test } from '@playwright/test';

import { loginConsultantBrowser } from './fixtures/consultant-login';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID?.trim() ?? '';
const email = process.env.E2E_CONSULTANT_E2E_EMAIL?.trim() ?? '';
const password = process.env.E2E_CONSULTANT_E2E_PASSWORD?.trim() ?? '';

test.describe('consultant orchestration cockpit (UI walkthrough)', () => {
  test('loads cockpit heading and a settled data state after login', async ({ page }) => {
    test.skip(
      process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !email || !password,
      'Set E2E_ORCHESTRATION_UI=1, E2E_ORCHESTRATION_AUDIT_ID, E2E_CONSULTANT_E2E_EMAIL, E2E_CONSULTANT_E2E_PASSWORD.',
    );

    await loginConsultantBrowser(page);
    await page.goto(`/audit/${auditId}/orchestration`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Orchestration cockpit' })).toBeVisible({ timeout: 45_000 });

    await expect(
      page.getByText(
        /No pack persisted for this audit yet|Could not load orchestration data|Critical path/,
      ),
    ).toBeVisible({ timeout: 60_000 });
  });
});
