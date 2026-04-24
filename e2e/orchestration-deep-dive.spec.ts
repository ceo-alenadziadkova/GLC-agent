/**
 * Deep-dive API smoke: quota for **marketing** and **ux_conversion** (CDO domain). Requires
 * `E2E_ORCHESTRATION_DEEP_DIVE=1` plus `E2E_ORCHESTRATION_AUDIT_ID` and `E2E_ORCHESTRATION_AUTH_TOKEN`
 * (see docs/DEPLOYMENT.md).
 *
 * Optional: `E2E_ORCHESTRATION_DEEP_DIVE_UI=1` runs a mobile-viewport check on the same quota
 * call (exercises the Playwright project with a phone-sized device profile).
 */
import { expect, test } from '@playwright/test';

const auditId = process.env.E2E_ORCHESTRATION_AUDIT_ID;
const token = process.env.E2E_ORCHESTRATION_AUTH_TOKEN;
const deepDiveEnabled = process.env.E2E_ORCHESTRATION_DEEP_DIVE === '1';
const deepDiveUiMobile = process.env.E2E_ORCHESTRATION_DEEP_DIVE_UI === '1';

function skipUnlessGate() {
  test.skip(
    !deepDiveEnabled || !auditId || !token,
    'Set E2E_ORCHESTRATION_DEEP_DIVE=1, E2E_ORCHESTRATION_AUDIT_ID, and E2E_ORCHESTRATION_AUTH_TOKEN.',
  );
}

test.describe('director deep-dive (API)', () => {
  test('GET quota for marketing domain returns limit fields or feature-disabled', async ({ request }) => {
    skipUnlessGate();
    const res = await request.get(`/api/audits/${auditId}/directors/marketing_utp/deep-dive/quota`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status() === 503) {
      expect((await res.json()) as { code?: string }).toMatchObject({
        code: 'DIRECTOR_DEEP_DIVE_DISABLED',
      });
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      coverage_package?: string;
      per_domain_limit?: number;
      used_count?: number;
      remaining?: number;
    };
    expect(['starter', 'pro', 'complete']).toContain(body.coverage_package);
    expect(typeof body.per_domain_limit).toBe('number');
    expect(typeof body.used_count).toBe('number');
    expect(typeof body.remaining).toBe('number');
  });

  test('GET quota for ux_conversion returns limit fields or feature-disabled', async ({ request }) => {
    skipUnlessGate();
    const res = await request.get(`/api/audits/${auditId}/directors/ux_conversion/deep-dive/quota`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status() === 503) {
      expect((await res.json()) as { code?: string }).toMatchObject({
        code: 'DIRECTOR_DEEP_DIVE_DISABLED',
      });
      return;
    }
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      coverage_package?: string;
      per_domain_limit?: number;
      used_count?: number;
      remaining?: number;
    };
    expect(['starter', 'pro', 'complete']).toContain(body.coverage_package);
    expect(typeof body.per_domain_limit).toBe('number');
    expect(typeof body.used_count).toBe('number');
    expect(typeof body.remaining).toBe('number');
  });

  test('POST selected-initiative validates payload contract', async ({ request }) => {
    skipUnlessGate();
    const res = await request.post(`/api/audits/${auditId}/orchestration/selected-initiative`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    expect((await res.json()) as { code?: string }).toMatchObject({
      code: 'AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID',
    });
  });
});

test.describe('director deep-dive (mobile project)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('GET quota with mobile viewport (same API contract)', async ({ request }) => {
    test.skip(
      !deepDiveEnabled || !deepDiveUiMobile || !auditId || !token,
      'Set E2E_ORCHESTRATION_DEEP_DIVE=1, E2E_ORCHESTRATION_DEEP_DIVE_UI=1, E2E_ORCHESTRATION_AUDIT_ID, and E2E_ORCHESTRATION_AUTH_TOKEN.',
    );
    const res = await request.get(`/api/audits/${auditId}/directors/marketing_utp/deep-dive/quota`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status() === 503) {
      expect((await res.json()) as { code?: string }).toMatchObject({
        code: 'DIRECTOR_DEEP_DIVE_DISABLED',
      });
      return;
    }
    expect(res.ok()).toBeTruthy();
  });
});
