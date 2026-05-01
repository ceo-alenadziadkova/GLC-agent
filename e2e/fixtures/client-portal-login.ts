import { expect, type Page } from '@playwright/test';

const portalEmail = process.env.E2E_PORTAL_E2E_EMAIL?.trim() ?? '';
const portalPassword = process.env.E2E_PORTAL_E2E_PASSWORD?.trim() ?? '';

/**
 * Browser sign-in for client portal Playwright tests (email/password against `/login`).
 */
export async function loginClientPortalBrowser(page: Page): Promise<void> {
  if (!portalEmail || !portalPassword) {
    throw new Error('Set E2E_PORTAL_E2E_EMAIL and E2E_PORTAL_E2E_PASSWORD');
  }
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /email/i }).fill(portalEmail);
  await page.getByLabel(/password/i).fill(portalPassword);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}
