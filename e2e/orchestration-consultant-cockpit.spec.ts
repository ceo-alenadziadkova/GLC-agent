/**
 * Consultant orchestration read model (pack GET + ETag) — same gate as other orchestration E2E.
 */
import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;

test.describe('consultant orchestration cockpit API', () => {
  test('GET orchestration pack exposes ETag for caching', async ({ request }) => {
    test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');

    const res = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const headers = res.headers();
    const etag = headers['etag'] ?? headers['ETag'];
    expect(etag).toBeTruthy();
    const body = (await res.json()) as { orchestration_pack_version?: number; pack?: unknown };
    expect(typeof body.orchestration_pack_version).toBe('number');
  });

  test('GET orchestration pack returns 304 when If-None-Match matches ETag', async ({ request }) => {
    test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');

    const first = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(first.ok()).toBeTruthy();
    const etag = first.headers()['etag'] ?? first.headers()['ETag'];
    expect(etag).toBeTruthy();

    const second = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'If-None-Match': etag!,
      },
    });
    expect(second.status()).toBe(304);
  });

  test('POST govern_action with stale expected_orchestration_pack_version returns 409', async ({ request }) => {
    test.skip(!auditId || !token, 'Set E2E_ORCHESTRATION_AUDIT_ID and E2E_ORCHESTRATION_AUTH_TOKEN.');

    const first = await request.get(`/api/audits/${auditId}/orchestration/pack`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(first.ok()).toBeTruthy();
    const body = (await first.json()) as { orchestration_pack_version?: number };
    const v = body.orchestration_pack_version;
    if (v == null || v < 2) {
      test.skip();
    }

    const res = await request.post(`/api/audits/${auditId}/orchestration/pack`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        govern_action: 'accept_plan',
        expected_orchestration_pack_version: v - 1,
      },
    });
    expect(res.status()).toBe(409);
  });
});
