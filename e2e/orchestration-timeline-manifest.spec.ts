import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;

function skipWithoutAuth() {
  test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');
}

test.describe('orchestration timeline manifest flow', () => {
  test('coverage change -> preview returns lanes and confidence callouts', async ({ request }) => {
    skipWithoutAuth();

    const previewRes = await request.post(`/api/audits/${auditId}/roadmap/manifest-preview`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        selected_domains: ['tech_infrastructure', 'marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    expect(previewRes.ok()).toBeTruthy();
    const body = (await previewRes.json()) as {
      preview?: { lanes_included?: string[]; confidence_callouts?: string[] };
    };
    expect(Array.isArray(body.preview?.lanes_included)).toBeTruthy();
    expect(Array.isArray(body.preview?.confidence_callouts)).toBeTruthy();
  });
});
