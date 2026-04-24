import { describe, expect, it, vi } from 'vitest';
import * as intakeCore from '@glc/intake-core';
import { runIntakeReadinessPreflight } from '../intake-readiness-preflight.js';

describe('runIntakeReadinessPreflight', () => {
  it('calls evaluateIntakeReadinessEnvelope with criticalSignalsMode full (pipeline registry)', () => {
    const spy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockReturnValue({
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'audit_ready',
      trace: [],
    });
    runIntakeReadinessPreflight({
      responses: { a2: 'Healthcare' },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionsRaw: null,
      enforcementPoint: 'pipeline_start',
      executionCoveragePackage: 'complete',
    });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        criticalSignalsMode: 'full',
      }),
    );
    spy.mockRestore();
  });

  it('forwards execution-plan coverage scope fields to the envelope', () => {
    const spy = vi.spyOn(intakeCore, 'evaluateIntakeReadinessEnvelope').mockReturnValue({
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'audit_ready',
      trace: [],
    });
    runIntakeReadinessPreflight({
      responses: { a2: 'Healthcare' },
      slaProductMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionsRaw: null,
      enforcementPoint: 'pipeline_start',
      executionCoveragePackage: 'complete',
      applyExecutionPlanCoverageScope: true,
      executionSelectedDomains: ['ux_conversion'],
      executionIncludeStrategy: true,
    });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        applyExecutionPlanCoverageScope: true,
        executionSelectedDomains: ['ux_conversion'],
        executionIncludeStrategy: true,
      }),
    );
    spy.mockRestore();
  });
});
