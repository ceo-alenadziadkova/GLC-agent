import { describe, expect, it, vi } from 'vitest';
import * as intakeCore from '@glc/intake-core';
import * as featureFlags from '../config/feature-flags.js';

vi.mock('../services/supabase.js', () => {
  const rpc = vi.fn().mockResolvedValue({
    data: [{ audit_id: '00000000-0000-0000-0000-000000000001', error_code: null, answers: {} }],
    error: null,
  });
  const from = vi.fn(() => ({
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  }));
  return { supabase: { rpc, from } };
});

import { convertDiscoverySessionToAudit } from '../routes/discover/services/discover-convert.service.js';

describe('discover convert intake readiness (YAGNI contract)', () => {
  it('uses criticalSignalsMode sla_only when pilot flag is enabled', async () => {
    vi.spyOn(featureFlags, 'isDiagnosticIntakePilotEnabled').mockReturnValue(true);
    const spy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockReturnValue({
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'audit_ready',
      trace: [],
    });

    await convertDiscoverySessionToAudit('session-token', '00000000-0000-0000-0000-000000000002');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        criticalSignalsMode: 'sla_only',
      }),
    );

    spy.mockRestore();
    vi.restoreAllMocks();
  });
});
