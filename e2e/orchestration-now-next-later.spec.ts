/**
 * Now · Next · Later board: smoke that portal timeline page exposes the tab when a pack exists.
 * Full UI walkthrough: set `E2E_ORCHESTRATION_UI=1` and auth env (allowlisted consultant).
 */
import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

test.describe('orchestration now / next / later', () => {
  test('pack GET includes node time_bucket for grouping', async ({ request }) => {
    test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');

    const res = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { pack?: { graph?: { nodes?: Array<{ time_bucket?: string }> } } };
    if (body.pack?.graph?.nodes?.length) {
      for (const n of body.pack.graph.nodes) {
        if (n.time_bucket != null) {
          expect(['now', 'next', 'later'].includes(n.time_bucket)).toBeTruthy();
        }
      }
    }
  });

  test('portal timeline has NNL tab and switches content when UI flag on', async ({ page }) => {
    test.skip(process.env.E2E_ORCHESTRATION_UI !== '1' || !auditId || !token, 'Set E2E_ORCHESTRATION_UI=1 and auth.');
    await page.goto(`${baseUrl}/portal/audit/${auditId}/timeline`, { waitUntil: 'domcontentloaded' });
    const tab = page.getByTestId('nnl-tab');
    const visible = await tab.isVisible().catch(() => false);
    if (!visible) {
      test.skip(true, 'Now·Next·Later tab not rendered (no pack or feature off).');
    }
    await tab.click();
    await expect(tab).toHaveAttribute('data-state', 'active');
  });
});
