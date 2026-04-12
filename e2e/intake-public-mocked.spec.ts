import { test, expect } from '@playwright/test';

/**
 * Behaviour: public GET /api/intake/:token — IntakeBrief shell (routes.tsx `intake/:token`).
 * Token shape: server INTAKE_TOKEN_HEX_REGEX (40 hex chars).
 */
const E2E_INTAKE_TOKEN = 'b'.repeat(40);

test.describe('intake public link (mocked API)', () => {
  test('loads questionnaire shell when token API succeeds', async ({ page }) => {
    await page.route(
      url => {
        const u = new URL(url);
        return u.pathname === `/api/intake/${E2E_INTAKE_TOKEN}`;
      },
      async route => {
        if (route.request().method() !== 'GET') {
          await route.abort();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metadata: {},
            questions: [
              {
                id: 'e2e_q1',
                priority: 'required',
                question: 'E2E smoke intake question?',
                type: 'free_text',
                section: 'Test',
              },
            ],
            responses: {},
            submitted_at: null,
            expires_at: '2099-01-01T00:00:00.000Z',
          }),
        });
      },
    );

    await page.goto(`/intake/${E2E_INTAKE_TOKEN}`);
    await expect(page.getByText(/E2E smoke intake question/i)).toBeVisible({ timeout: 15_000 });
  });
});
