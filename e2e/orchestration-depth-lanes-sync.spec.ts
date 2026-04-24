import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;

function skipWithoutAuth() {
  test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');
}

test.describe('orchestration depth and lane sync', () => {
  test('pack payload exposes baseline/deep provenance and lane arrays', async ({ request }) => {
    skipWithoutAuth();

    const res = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      pack?: {
        graph?: { nodes?: Array<{ source?: string; analysis_depth?: string }> };
        lanes?: Record<string, string[]>;
      };
    };
    const nodes = body.pack?.graph?.nodes ?? [];
    const lanes = body.pack?.lanes ?? {};
    expect(Array.isArray(nodes)).toBeTruthy();
    expect(typeof lanes).toBe('object');
    const directorNodes = nodes.filter(node => node.source === 'director');
    if (directorNodes.length > 0) {
      expect(
        directorNodes.some(node => node.analysis_depth === 'baseline' || node.analysis_depth === 'deep'),
      ).toBeTruthy();
    }
  });
});
