import type { QueryClient } from './tanstack-react-query';

import type { AuditState } from '../data/audit/contracts/state/audit-state.types';
import type { StrategyLabContextView } from '../data/audit/contracts/report/report-domain.types';
import { glcKeys } from './glc-keys';

/**
 * Merges PATCH /strategy-lab-context response into the audit detail query cache so overrides
 * reflect immediately before the follow-up refetch completes.
 */
export function applyStrategyLabContextPatchToAuditCache(
  queryClient: QueryClient,
  auditId: string,
  strategy_lab_context: StrategyLabContextView,
): void {
  queryClient.setQueryData<AuditState | undefined>(glcKeys.audit.detail(auditId), prev => {
    if (!prev?.strategy) return prev;
    return {
      ...prev,
      strategy: {
        ...prev.strategy,
        strategy_lab_context,
      },
    };
  });
}
