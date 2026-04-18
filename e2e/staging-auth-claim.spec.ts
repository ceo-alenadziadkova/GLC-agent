import { test, expect, type Page } from '@playwright/test';

const STAGING_BASE_URL = process.env.E2E_STAGING_BASE_URL?.trim() ?? '';
const STAGING_EMAIL = process.env.E2E_STAGING_EMAIL?.trim() ?? '';
const STAGING_PASSWORD = process.env.E2E_STAGING_PASSWORD?.trim() ?? '';
const STAGING_SNAPSHOT_URL = process.env.E2E_STAGING_SNAPSHOT_URL?.trim() ?? 'https://example.com';

const missingEnv: string[] = [];
if (!STAGING_BASE_URL) missingEnv.push('E2E_STAGING_BASE_URL');
if (!STAGING_EMAIL) missingEnv.push('E2E_STAGING_EMAIL');
if (!STAGING_PASSWORD) missingEnv.push('E2E_STAGING_PASSWORD');

async function loginWithEmailPassword(page: Page) {
  await page.goto(`${STAGING_BASE_URL}/login`);

  await page.getByRole('textbox', { name: /email/i }).fill(STAGING_EMAIL);
  await page.getByLabel(/password/i).fill(STAGING_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
}

test.describe('staging p0 auth and claim skeleton', () => {
  test.skip(
    missingEnv.length > 0,
    `Missing required staging env vars: ${missingEnv.join(', ')}`,
  );

  test('login -> protected route -> sign out -> login redirect', async ({ page }) => {
    await loginWithEmailPassword(page);

    await page.goto(`${STAGING_BASE_URL}/dashboard`);
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

    await page.getByRole('button', { name: /sign out|log out/i }).first().click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
    await expect(page.getByText(/sign in to the audit workspace and client portal/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('snapshot -> auth -> claim high-level flow', async ({ page }) => {
    await page.goto(`${STAGING_BASE_URL}/snapshot`);

    // NOTE: This is a skeleton flow. Keep selectors stable by adding data-testid
    // hooks in SnapshotLanding and claim CTA areas when wiring this into a
    // mandatory staging gate.
    const urlField = page.getByRole('textbox').first();
    await urlField.fill(STAGING_SNAPSHOT_URL);
    await page.getByRole('button', { name: /scan|start|check|continue/i }).first().click();

    await loginWithEmailPassword(page);
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  });
});
