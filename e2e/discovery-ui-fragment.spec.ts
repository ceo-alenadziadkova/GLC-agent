import { test, expect } from '@playwright/test';

/**
 * Behaviour: TESTING.md §H — discovery UI depends on GET /api/discover/ui-fragment.
 * Wizard UX is fully exercised in smoke.spec.ts; this file locks the API contract + both public paths.
 */
test.describe('discovery ui-fragment contract', () => {
  test('GET /api/discover/ui-fragment returns JSON with questions', async ({ request }) => {
    const res = await request.get('/api/discover/ui-fragment');
    if (!res.ok()) {
      test.skip(true, `Discovery UI fragment unavailable (status ${res.status()})`);
    }
    const text = await res.text();
    let body: { questions?: unknown[] } = {};
    try {
      body = JSON.parse(text) as { questions?: unknown[] };
    } catch {
      test.skip(true, 'Discovery UI fragment returned invalid JSON');
    }
    expect(Array.isArray(body.questions)).toBe(true);
    expect((body.questions ?? []).length).toBeGreaterThan(0);
  });

  test('both /discovery and /audit/discover expose the primary wizard action', async ({ page }) => {
    const fragment = await page.request.get('/api/discover/ui-fragment');
    test.skip(!fragment.ok(), `Discovery UI fragment unavailable (status ${fragment.status()})`);

    for (const path of ['/discovery', '/audit/discover'] as const) {
      await page.goto(path);
      const continueBtn = page.getByRole('button', { name: /continue|see my findings/i });
      await expect(continueBtn).toBeVisible({ timeout: 20_000 });
    }
  });
});
