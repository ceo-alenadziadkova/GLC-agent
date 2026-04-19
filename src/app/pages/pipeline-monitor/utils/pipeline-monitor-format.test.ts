import { describe, expect, it } from 'vitest';
import { buildStrategyLabPath, getPhaseResultViewPath, getWorkspacePath } from './pipeline-monitor-format';
import { STRATEGY_PHASE_ID } from '../phase-meta';

describe('getPhaseResultViewPath', () => {
  const id = 'audit-uuid-123';

  it('sends consultants from strategy phase to Strategy Lab', () => {
    expect(
      getPhaseResultViewPath({ phaseId: STRATEGY_PHASE_ID, auditId: id, isClient: false }),
    ).toBe(buildStrategyLabPath(id));
  });

  it('sends clients from strategy phase to portal audit (no Strategy Lab route)', () => {
    expect(getPhaseResultViewPath({ phaseId: STRATEGY_PHASE_ID, auditId: id, isClient: true })).toBe(
      getWorkspacePath(id, true),
    );
  });

  it('sends domain phases to workspace paths', () => {
    expect(getPhaseResultViewPath({ phaseId: 3, auditId: id, isClient: false })).toBe(getWorkspacePath(id, false));
  });
});
