/**
 * Rollout Phase 7 gate: exercise manifest preview + timeline read model against a real audit.
 * Requires `E2E_ORCHESTRATION_AUDIT_ID` and `E2E_ORCHESTRATION_AUTH_TOKEN` (see rollout ADR).
 */
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

  test('GET timeline returns version, seasons, and optional season_preset', async ({ request }) => {
    skipWithoutAuth();

    const res = await request.get(`/api/audits/${auditId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      timeline?: {
        status?: string;
        version?: { manifest_state?: string; season_preset?: string | null };
        seasons?: unknown[];
        dependencies?: Array<{ cross_lane?: boolean }>;
      };
    };
    expect(body.timeline?.version?.manifest_state).toBeTruthy();
    expect(Array.isArray(body.timeline?.seasons)).toBeTruthy();
    if (body.timeline?.dependencies?.length) {
      expect(typeof body.timeline.dependencies[0]?.cross_lane).toBe('boolean');
    }
  });

  test('POST roadmap manifest-snapshots returns 201 when payload matches execution_plan', async ({ request }) => {
    skipWithoutAuth();

    const manifestBody = {
      selected_domains: ['tech_infrastructure', 'marketing_utp'],
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
    };
    const snapRes = await request.post(`/api/audits/${auditId}/roadmap/manifest-snapshots`, {
      headers: { Authorization: `Bearer ${token}` },
      data: manifestBody,
    });
    expect(snapRes.status()).toBe(201);
    const snap = (await snapRes.json()) as { id?: string };
    expect(typeof snap.id).toBe('string');
    expect(snap.id!.length).toBeGreaterThan(0);
  });

  test('PATCH strategy lab-context accepts director_stage2_domains', async ({ request }) => {
    skipWithoutAuth();

    const patchRes = await request.patch(`/api/audits/${auditId}/strategy/lab-context`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { director_stage2_domains: ['tech_infrastructure'] },
    });
    expect(patchRes.ok()).toBeTruthy();
    const body = (await patchRes.json()) as { strategy_lab_context?: { director_stage2_domains?: string[] } };
    expect(body.strategy_lab_context?.director_stage2_domains).toContain('tech_infrastructure');

    const clearRes = await request.patch(`/api/audits/${auditId}/strategy/lab-context`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { director_stage2_domains: null },
    });
    expect(clearRes.ok()).toBeTruthy();
  });
});
