import { useCallback } from 'react';
import { toast } from 'sonner';

import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { api } from '../data/apiService';
import type { StrategyRoadmap, StrategyLabContextView } from '../data/audit/contracts/report/report-domain.types';

type Options = {
  auditId: string | undefined;
  strategy: StrategyRoadmap | null | undefined;
  reload: () => void | Promise<void>;
  mergeStrategyLabContextInAuditCache: (ctx: StrategyLabContextView) => void;
};

export function useStrategyBoardIdentityPreference({
  auditId,
  strategy,
  reload,
  mergeStrategyLabContextInAuditCache,
}: Options) {
  return useCallback(async () => {
    if (!auditId || !strategy) return;
    const next = !(strategy.strategy_lab_context?.preserve_board_identity_on_rename === true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        preserve_board_identity_on_rename: next ? true : null,
      });
      mergeStrategyLabContextInAuditCache(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.boardIdentity.saveOk);
      void reload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.boardIdentity.saveFailed);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, reload, strategy]);
}
