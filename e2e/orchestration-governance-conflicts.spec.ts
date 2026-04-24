import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;

function skipWithoutAuth() {
  test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');
}

test.describe('orchestration governance conflicts', () => {
  test('returns governance payload with reason codes on pack build', async ({ request }) => {
    skipWithoutAuth();

    const snapshotsRes = await request.get(`/api/audits/${auditId}/roadmap/manifest-snapshots?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(snapshotsRes.ok()).toBeTruthy();
    const snapshotsBody = (await snapshotsRes.json()) as { snapshots?: Array<{ id: string }> };
    const latestSnapshot = snapshotsBody.snapshots?.[0];
    test.skip(!latestSnapshot, 'No manifest snapshot available for orchestration governance checks.');

    const packRes = await request.post(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { manifest_snapshot_id: latestSnapshot!.id },
    });
    expect([200, 409]).toContain(packRes.status());
    const packBody = (await packRes.json()) as {
      plan_governance?: { reason_codes?: string[]; decision_hint?: string };
      details?: {
        plan_governance?: { reason_codes?: string[]; decision_hint?: string };
        not_ready_reason_code?: string;
      };
    };
    if (packRes.status() === 409) {
      expect(packBody.details?.not_ready_reason_code ?? packBody.details?.plan_governance?.decision_hint).toBeTruthy();
      return;
    }
    const governance = packBody.plan_governance ?? packBody.details?.plan_governance;
    expect(governance?.decision_hint).toBeTruthy();
    expect(Array.isArray(governance?.reason_codes)).toBeTruthy();
  });
});
