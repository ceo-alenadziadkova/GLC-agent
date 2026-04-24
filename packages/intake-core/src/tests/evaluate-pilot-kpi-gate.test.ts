import { describe, expect, it } from 'vitest';
import { evaluatePilotKpiGate } from '../core/diagnostic-intake/evaluate-pilot-kpi-gate.js';

describe('evaluatePilotKpiGate', () => {
  it('returns expand when all KPI gates pass', () => {
    const result = evaluatePilotKpiGate({
      windowLabel: '2026-04-01..2026-04-14',
      completionNonRegressionPass: true,
      readinessQualifiedContextUpliftPass: true,
      falseBlockedTrendPass: true,
    });

    expect(result.decision).toBe('expand');
  });

  it('returns hold when at least one KPI gate fails', () => {
    const result = evaluatePilotKpiGate({
      windowLabel: '2026-04-15..2026-04-28',
      completionNonRegressionPass: true,
      readinessQualifiedContextUpliftPass: false,
      falseBlockedTrendPass: true,
    });

    expect(result.decision).toBe('hold');
  });
});
