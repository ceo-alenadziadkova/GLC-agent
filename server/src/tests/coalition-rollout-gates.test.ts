import { afterEach, describe, expect, it } from 'vitest';

import {
  evaluateCoalitionGaGateMetrics,
  type CoalitionGaGateMetrics,
} from '../config/coalition-protocol-policy.js';
import { isCoalitionRolloutUnlockedForAudit } from '../config/coalition-rollout-gates.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('coalition rollout gates', () => {
  it('keeps shadow and ga unlocked only when the master switch is on', () => {
    process.env.FEATURE_COALITION_PROTOCOL_ENABLED = 'false';
    process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE = 'ga';
    expect(isCoalitionRolloutUnlockedForAudit({ userId: 'u1', clientId: null })).toBe(false);

    process.env.FEATURE_COALITION_PROTOCOL_ENABLED = 'true';
    process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE = 'shadow';
    expect(isCoalitionRolloutUnlockedForAudit({ userId: 'u1', clientId: null })).toBe(true);
  });

  it('requires user/client allowlist for internal and pilot modes', () => {
    process.env.FEATURE_COALITION_PROTOCOL_ENABLED = 'true';
    process.env.FEATURE_COALITION_PROTOCOL_ROLLOUT_MODE = 'pilot';
    process.env.FEATURE_COALITION_PROTOCOL_ALLOWLIST_USER_IDS = 'u-allowed';
    process.env.FEATURE_COALITION_PROTOCOL_ALLOWLIST_CLIENT_IDS = 'c-allowed';

    expect(isCoalitionRolloutUnlockedForAudit({ userId: 'other', clientId: null })).toBe(false);
    expect(isCoalitionRolloutUnlockedForAudit({ userId: 'u-allowed', clientId: null })).toBe(true);
    expect(isCoalitionRolloutUnlockedForAudit({ userId: 'other', clientId: 'c-allowed' })).toBe(true);
  });

  it('evaluates KPI gates before GA promotion', () => {
    const green: CoalitionGaGateMetrics = {
      crossDomainDensityMedian: 2,
      unresolvedConflictRate: 0.1,
      modeAlignment: 1,
      assumptionCoverage: 0.9,
      consultantAgreement: 0.8,
      runtimeOverheadP95Sec: 45,
      tokenOverheadP95: 0.2,
    };
    expect(evaluateCoalitionGaGateMetrics(green)).toEqual({ passed: true, failed: [] });
    expect(evaluateCoalitionGaGateMetrics({ ...green, unresolvedConflictRate: 0.5 }).failed).toContain(
      'unresolvedConflictRate',
    );
  });
});
