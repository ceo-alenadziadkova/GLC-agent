/**
 * Consultant Plan Delivery Board smoke: shell heading, board panel landmark, segmented nav,
 * optional per-card Move menu when operational rows exist on the audit (no pack rebuild).
 *
 * Gates: same browser login + audit id stack as other `E2E_ORCHESTRATION_UI` specs.
 * Skips when Board tab is omitted from static rollout (mode below `internal` in `APP_FEATURE_FLAGS`).
 */
import { expect, test } from '@playwright/test';

import { loginConsultantBrowser } from './fixtures/consultant-login';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID?.trim() ?? '';
const email = process.env.E2E_CONSULTANT_E2E_EMAIL?.trim() ?? '';
const password = process.env.E2E_CONSULTANT_E2E_PASSWORD?.trim() ?? '';

function assertSafeAuditId(): void {
  if (auditId.includes('/') || auditId.includes('..')) {
    test.skip(true, 'Refusing unsafe audit id for URL construction.');
  }
}

test.describe('plan delivery board (consultant UI)', () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !email || !password,
      'Set E2E_ORCHESTRATION_UI=1, E2E_ORCHESTRATION_AUDIT_ID, E2E_CONSULTANT_E2E_EMAIL, E2E_CONSULTANT_E2E_PASSWORD.',
    );
    assertSafeAuditId();
  });

  test('opens /plan/:id/board and shows Delivery Board shell', async ({ page }) => {
    await loginConsultantBrowser(page);
    await page.goto(`/plan/${auditId}/board`, { waitUntil: 'domcontentloaded' });

    await expect.poll(() => new URL(page.url()).pathname).toMatch(/\/plan\/[^/]+\/board$/);

    const boardNav = page.getByRole('navigation', { name: 'Plan presentation' });
    await expect(boardNav.getByRole('link', { name: 'Board', exact: true })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: 'Delivery Board', level: 1 })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId('portal-plan-board-panel')).toBeVisible();
  });

  test('segmented nav switches Board to Roadmap and back', async ({ page }) => {
    await loginConsultantBrowser(page);
    await page.goto(`/plan/${auditId}/board`, { waitUntil: 'domcontentloaded' });

    const boardLink = page.getByRole('link', { name: 'Board', exact: true });
    await expect(boardLink).toBeVisible({ timeout: 30_000 });

    await page.getByRole('link', { name: 'Roadmap', exact: true }).click();

    await expect.poll(() => new URL(page.url()).pathname).toMatch(/\/plan\/[^/]+\/roadmap$/);

    await expect(page.getByTestId('portal-plan-roadmap-panel')).toBeVisible({ timeout: 60_000 });

    await boardLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/\/plan\/[^/]+\/board$/);
  });

  test('per-card Move menu opens when operational cards render', async ({ page }) => {
    test.info().annotations.push({
      type: 'note',
      description:
        'Skips when the audit has no plan_task_delivery rows (empty board). Does not PATCH or reorder.',
    });

    await loginConsultantBrowser(page);
    await page.goto(`/plan/${auditId}/board`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: 'Board', exact: true })).toBeVisible({
      timeout: 30_000,
    });

    const moreButton = page.getByRole('button', { name: 'More actions' }).first();
    try {
      await moreButton.waitFor({ state: 'visible', timeout: 90_000 });
    } catch {
      test.skip(true, 'No per-card menus on this audit (likely no persisted pack/cards yet).');
    }

    await moreButton.click();
    await expect(page.getByText('Move to column', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.keyboard.press('Escape');
  });
});
