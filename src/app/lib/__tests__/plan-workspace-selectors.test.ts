import { describe, expect, it } from 'vitest';

import type { AuditState } from '../../data/audit/contracts/state/audit-state.types';
import { selectHasStrategyBlock, selectOrchestrationPackView } from '../plan-workspace-selectors';

describe('plan-workspace-selectors', () => {
  it('selectHasStrategyBlock is false without strategy', () => {
    expect(selectHasStrategyBlock({ strategy: undefined } as AuditState)).toBe(false);
  });

  it('selectHasStrategyBlock is true with strategy', () => {
    expect(selectHasStrategyBlock({ strategy: { id: 's' } } as AuditState)).toBe(true);
  });

  it('selectOrchestrationPackView returns null for invalid pack', () => {
    expect(selectOrchestrationPackView({ strategy: { glc_orchestration_pack: {} } } as AuditState)).toBeNull();
  });
});
