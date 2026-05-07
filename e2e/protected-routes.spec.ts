import { test, expect } from '@playwright/test';

/**
 * Behaviour: docs/AUTH.md — unauthenticated users cannot access protected routes.
 * Complements TESTING.md §C (router map smoke).
 */
const PLACEHOLDER_AUDIT_ID = '00000000-0000-4000-8000-000000000099';

const CONSULTANT_AND_ADMIN_PATHS = [
  `/pipeline/${PLACEHOLDER_AUDIT_ID}`,
  `/reports/${PLACEHOLDER_AUDIT_ID}`,
  `/strategy/${PLACEHOLDER_AUDIT_ID}`,
  `/settings`,
  `/admin/requests`,
  `/admin/snapshots`,
  `/admin/discovery`,
  `/admin/intake-wording`,
  `/admin/question-bank-studio`,
  `/admin/design-system`,
  `/audit/${PLACEHOLDER_AUDIT_ID}`,
  `/audit/${PLACEHOLDER_AUDIT_ID}/tech_infrastructure`,
  `/plan/${PLACEHOLDER_AUDIT_ID}`,
  `/lab/${PLACEHOLDER_AUDIT_ID}`,
  `/roadmap/${PLACEHOLDER_AUDIT_ID}`,
  `/timeline/${PLACEHOLDER_AUDIT_ID}`,
] as const;

const CLIENT_PORTAL_PATHS = [
  `/portal/audit/new`,
  `/portal/pipeline/${PLACEHOLDER_AUDIT_ID}`,
  `/portal/reports/${PLACEHOLDER_AUDIT_ID}`,
  `/portal/audit/${PLACEHOLDER_AUDIT_ID}`,
  `/portal/plan/${PLACEHOLDER_AUDIT_ID}`,
  `/portal/lab/${PLACEHOLDER_AUDIT_ID}`,
  `/portal/roadmap/${PLACEHOLDER_AUDIT_ID}`,
  `/portal/timeline/${PLACEHOLDER_AUDIT_ID}`,
] as const;

test.describe('protected route redirects (unauthenticated)', () => {
  for (const path of CONSULTANT_AND_ADMIN_PATHS) {
    test(`redirect ${path} to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }

  for (const path of CLIENT_PORTAL_PATHS) {
    test(`redirect ${path} to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }
});
