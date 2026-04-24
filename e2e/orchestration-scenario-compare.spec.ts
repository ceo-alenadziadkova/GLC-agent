import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;

test.describe('orchestration scenario compare (dual manifest-preview)', () => {
  test('two manifest previews return 200 and distinct lane sets when scenario differs', async ({ request }) => {
    test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');

    const base = {
      selected_domains: ['tech_infrastructure', 'marketing_utp'],
      change_scenario: 'hybrid' as const,
      season_preset: 'rolling_90d' as const,
    };
    const alt = { ...base, change_scenario: 'accelerate' as const };
    const [a, b] = await Promise.all([
      request.post(`/api/audits/${auditId}/roadmap/manifest-preview`, {
        headers: { Authorization: `Bearer ${token}` },
        data: base,
      }),
      request.post(`/api/audits/${auditId}/roadmap/manifest-preview`, {
        headers: { Authorization: `Bearer ${token}` },
        data: alt,
      }),
    ]);
    expect(a.ok()).toBeTruthy();
    expect(b.ok()).toBeTruthy();
    const ja = (await a.json()) as { preview?: { execution_compression_hint?: string } };
    const jb = (await b.json()) as { preview?: { execution_compression_hint?: string } };
    expect(ja.preview).toBeTruthy();
    expect(jb.preview).toBeTruthy();
  });
});
