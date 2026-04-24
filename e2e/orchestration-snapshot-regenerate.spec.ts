import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;

function skipWithoutAuth() {
  test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');
}

test.describe('orchestration snapshot/regenerate flow', () => {
  test('snapshot -> regenerate pack -> diff history', async ({ request }) => {
    skipWithoutAuth();

    const snapshotRes = await request.post(`/api/audits/${auditId}/roadmap/manifest-snapshots`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        selected_domains: ['tech_infrastructure', 'marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    expect(snapshotRes.ok()).toBeTruthy();
    const snapshotBody = (await snapshotRes.json()) as { id?: string };
    expect(snapshotBody.id).toBeTruthy();

    const packRes = await request.post(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { manifest_snapshot_id: snapshotBody.id },
    });
    expect(packRes.ok()).toBeTruthy();
    const packBody = (await packRes.json()) as { roadmap_version?: number };
    expect((packBody.roadmap_version ?? 0) > 0).toBeTruthy();

    const getPackRes = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getPackRes.ok()).toBeTruthy();
    const getPackBody = (await getPackRes.json()) as { revision_history?: unknown[]; last_revision_diff_summary?: string | null };
    expect(Array.isArray(getPackBody.revision_history)).toBeTruthy();
    expect(typeof getPackBody.last_revision_diff_summary === 'string' || getPackBody.last_revision_diff_summary === null).toBeTruthy();

    const timelineRes = await request.get(`/api/audits/${auditId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(timelineRes.ok()).toBeTruthy();
    const timelineBody = (await timelineRes.json()) as {
      timeline?: { status?: string; lanes?: unknown[]; seasons?: unknown[] };
    };
    expect(typeof timelineBody.timeline?.status).toBe('string');
    expect(Array.isArray(timelineBody.timeline?.lanes)).toBeTruthy();
    expect(Array.isArray(timelineBody.timeline?.seasons)).toBeTruthy();

    const historyRes = await request.get(`/api/audits/${auditId}/orchestration/pack-diff-history?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(historyRes.ok()).toBeTruthy();
    const historyBody = (await historyRes.json()) as { items?: unknown[] };
    expect(Array.isArray(historyBody.items)).toBeTruthy();
  });
});
