/**
 * Authenticated SPA check: legacy `/roadmap/:id` and `/timeline/:id` client-replace to canonical path-first `/plan/:id/...`.
 * Requires browser login + audit id (same gate as consultant orchestration UI specs).
 */
import { expect, test } from '@playwright/test';

import { loginClientPortalBrowser } from './fixtures/client-portal-login';
import { loginConsultantBrowser } from './fixtures/consultant-login';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID?.trim() ?? '';
const portalPlanAuditId = process.env.E2E_PORTAL_PLAN_AUDIT_ID?.trim() ?? auditId;
const email = process.env.E2E_CONSULTANT_E2E_EMAIL?.trim() ?? '';
const password = process.env.E2E_CONSULTANT_E2E_PASSWORD?.trim() ?? '';
const portalEmail = process.env.E2E_PORTAL_E2E_EMAIL?.trim() ?? '';
const portalPassword = process.env.E2E_PORTAL_E2E_PASSWORD?.trim() ?? '';

function planUrlDigest(href: string): { pathname: string; view: string | null; keep: string | null } {
  const u = new URL(href);
  return {
    pathname: u.pathname,
    view: u.searchParams.get('view'),
    keep: u.searchParams.get('keep'),
  };
}

test.describe('plan legacy URLs normalize to canonical /plan after login', () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !email || !password,
      'Set E2E_ORCHESTRATION_UI=1, E2E_ORCHESTRATION_AUDIT_ID, E2E_CONSULTANT_E2E_EMAIL, E2E_CONSULTANT_E2E_PASSWORD.',
    );
    if (auditId.includes('/') || auditId.includes('..')) {
      test.skip(true, 'Refusing unsafe audit id for URL construction.');
    }
  });

  test('roadmap path becomes /plan/:id/roadmap without view', async ({ page }) => {
    await loginConsultantBrowser(page);
    await page.goto(`/roadmap/${auditId}`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => planUrlDigest(page.url()), { timeout: 30_000 })
      .toEqual({ pathname: `/plan/${auditId}/roadmap`, view: null, keep: null });
  });

  test('timeline path becomes /plan/:id/board (narrative timeline retired)', async ({ page }) => {
    await loginConsultantBrowser(page);
    await page.goto(`/timeline/${auditId}`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => planUrlDigest(page.url()), { timeout: 30_000 })
      .toEqual({ pathname: `/plan/${auditId}/board`, view: null, keep: null });
  });

  test('legacy roadmap merges non-view params onto canonical URL', async ({ page }) => {
    await loginConsultantBrowser(page);
    await page.goto(`/roadmap/${auditId}?keep=e2e`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => planUrlDigest(page.url()), { timeout: 30_000 })
      .toEqual({
        pathname: `/plan/${auditId}/roadmap`,
        view: null,
        keep: 'e2e',
      });
  });
});

test.describe('portal plan legacy URLs normalize to canonical /portal/plan after login', () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_ORCHESTRATION_UI !== '1' ||
        !portalPlanAuditId ||
        !portalEmail ||
        !portalPassword,
      'Set E2E_ORCHESTRATION_UI=1, E2E_PORTAL_E2E_EMAIL, E2E_PORTAL_E2E_PASSWORD, and E2E_ORCHESTRATION_AUDIT_ID or E2E_PORTAL_PLAN_AUDIT_ID.',
    );
    if (portalPlanAuditId.includes('/') || portalPlanAuditId.includes('..')) {
      test.skip(true, 'Refusing unsafe audit id for URL construction.');
    }
  });

  test('portal roadmap path becomes /portal/plan/:id/roadmap without view', async ({ page }) => {
    await loginClientPortalBrowser(page);
    await page.goto(`/portal/roadmap/${portalPlanAuditId}`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => planUrlDigest(page.url()), { timeout: 30_000 })
      .toEqual({ pathname: `/portal/plan/${portalPlanAuditId}/roadmap`, view: null, keep: null });
  });

  test('portal timeline path becomes /portal/plan/:id/board (narrative timeline retired)', async ({ page }) => {
    await loginClientPortalBrowser(page);
    await page.goto(`/portal/timeline/${portalPlanAuditId}`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => planUrlDigest(page.url()), { timeout: 30_000 })
      .toEqual({ pathname: `/portal/plan/${portalPlanAuditId}/board`, view: null, keep: null });
  });

  test('portal legacy roadmap merges non-view params onto canonical URL', async ({ page }) => {
    await loginClientPortalBrowser(page);
    await page.goto(`/portal/roadmap/${portalPlanAuditId}?keep=e2e-portal`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => planUrlDigest(page.url()), { timeout: 30_000 })
      .toEqual({
        pathname: `/portal/plan/${portalPlanAuditId}/roadmap`,
        view: null,
        keep: 'e2e-portal',
      });
  });
});
