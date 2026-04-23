/**
 * Shared auth context for E2E tests that need a real bearer token.
 * Reuses the same env vars as API-oriented orchestration specs.
 */
import { expect, type Page } from '@playwright/test';

export const consultantAuthEnv = {
  auditId: process.env.E2E_ORCHESTRATION_AUDIT_ID,
  token: process.env.E2E_ORCHESTRATION_AUTH_TOKEN,
} as const;

export function requireConsultantAuth(): { auditId: string; token: string } {
  const { auditId, token } = consultantAuthEnv;
  if (!auditId || !token) {
    throw new Error('Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN');
  }
  return { auditId, token };
}

const consultantEmail = process.env.E2E_CONSULTANT_E2E_EMAIL?.trim() ?? '';
const consultantPassword = process.env.E2E_CONSULTANT_E2E_PASSWORD?.trim() ?? '';

/**
 * Browser sign-in for consultant Playwright tests (email/password against `/login`).
 */
export async function loginConsultantBrowser(page: Page): Promise<void> {
  if (!consultantEmail || !consultantPassword) {
    throw new Error('Set E2E_CONSULTANT_E2E_EMAIL and E2E_CONSULTANT_E2E_PASSWORD');
  }
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: /email/i }).fill(consultantEmail);
  await page.getByLabel(/password/i).fill(consultantPassword);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
}
