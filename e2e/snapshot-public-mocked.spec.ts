import { test, expect } from '@playwright/test';

/**
 * Behaviour: docs/API.md — public snapshot POST → poll GET with credentialed cookie;
 * TESTING.md §A — full guest funnel without a live pipeline (Playwright route mocks).
 */
const GLC_PENDING_SNAPSHOT_TOKEN_KEY = 'glc_pending_snapshot_token';

const MOCK_SNAPSHOT_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const MOCK_GUEST_COOKIE_VALUE = 'a'.repeat(64);

function completedPreviewBody(snapshotToken: string): Record<string, unknown> {
  return {
    audit_id: '00000000-0000-4000-8000-000000000001',
    snapshot_token: snapshotToken,
    status: 'completed',
    company_url: 'https://example.com',
    company_name: 'E2E Mock Co',
    tech_stack: {},
    location: null,
    ux_score: 72,
    ux_label: 'Good',
    ux_summary: 'Mock snapshot summary for Playwright.',
    issues: [],
    quick_wins: [],
    overall_score: 72,
    scan_basis_code: 'homepage_only',
    scan_confidence_band: 'high',
    scan_coverage: {
      pages_fetched: 1,
      max_pages_planned: 5,
      elapsed_ms: 1200,
      budget_ms: 30_000,
      pages: [{ role: 'home', url: 'https://example.com/' }],
      robots_home_disallowed: false,
      playwright_used: false,
      playwright_eligible: false,
    },
  };
}

test.describe('snapshot public flow (mocked API)', () => {
  test('POST starts run, poll completes, guest cookie on poll, pending token in localStorage', async ({
    page,
  }) => {
    let pollCount = 0;
    let cookieHeaderOnPoll: string | undefined;

    const pollPath = `/api/snapshot/${MOCK_SNAPSHOT_UUID}`;

    // Register specific routes first (Playwright matches in registration order).
    await page.route('**/api/snapshot/quota', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ remaining: 10, limit: 10 }),
      });
    });

    await page.route(`**${pollPath}*`, async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const urlObj = new URL(route.request().url());
      if (urlObj.searchParams.get('compare') === '1') {
        await route.fulfill({ status: 404, body: '{}' });
        return;
      }
      pollCount += 1;
      cookieHeaderOnPoll = route.request().headers()['cookie'];
      if (pollCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'running', snapshot_token: MOCK_SNAPSHOT_UUID }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(completedPreviewBody(MOCK_SNAPSHOT_UUID)),
      });
    });

    await page.route('**/api/snapshot', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': `glc_snapshot_guest=${MOCK_GUEST_COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax`,
        },
        body: JSON.stringify({ snapshot_token: MOCK_SNAPSHOT_UUID, status: 'running' }),
      });
    });

    await page.goto('/snapshot');
    await expect(
      page.getByRole('heading', { name: /how well does your website convert visitors\?/i }),
    ).toBeVisible({ timeout: 20_000 });
    await page.locator('input.glc-light-snapshot-input').fill('example.com');
    await page.getByRole('button', { name: /analyse my website/i }).click();

    await expect.poll(() => pollCount, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
    expect(cookieHeaderOnPoll ?? '').toContain('glc_snapshot_guest=');

    await expect(page.getByText(/E2E Mock Co/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Sampled 1 of up to 5 pages/i)).toBeVisible();

    const pending = await page.evaluate(key => localStorage.getItem(key), GLC_PENDING_SNAPSHOT_TOKEN_KEY);
    expect(pending).toBe(MOCK_SNAPSHOT_UUID);
  });
});
