import { describe, expect, it } from 'vitest';
import {
  buildPortalReportPath,
  buildPortalStrategyLabPath,
  buildStrategyLabPath,
  getPhaseResultViewPath,
  getWorkspacePath,
} from './pipeline-monitor-format';
import { STRATEGY_PHASE_ID } from '../phase-meta';

describe('getPhaseResultViewPath', () => {
  const id = 'audit-uuid-123';

  it('sends consultants from strategy phase to Strategy Lab', () => {
    expect(
      getPhaseResultViewPath({ phaseId: STRATEGY_PHASE_ID, auditId: id, isClient: false, auditStatus: 'completed' }),
    ).toBe(buildStrategyLabPath(id));
  });

  it('sends clients from strategy phase to portal strategy lab', () => {
    expect(getPhaseResultViewPath({ phaseId: STRATEGY_PHASE_ID, auditId: id, isClient: true, auditStatus: 'completed' })).toBe(
      buildPortalStrategyLabPath(id),
    );
  });

  it('sends domain phases to workspace paths', () => {
    expect(getPhaseResultViewPath({ phaseId: 3, auditId: id, isClient: false, auditStatus: 'review' })).toBe(
      getWorkspacePath(id, false),
    );
  });

  it('sends clients to report when audit is completed', () => {
    expect(getPhaseResultViewPath({ phaseId: 3, auditId: id, isClient: true, auditStatus: 'completed' })).toBe(
      buildPortalReportPath(id),
    );
  });
});
