import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { PIPELINE_STRATEGY_PHASE_INDEX } from '../config/pipeline-phase-policy';
import type { StrategyInitiativeBucket } from '../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { api } from '../data/apiService';
import type { StrategyInitiative } from '../data/audit/contracts/report/report-domain.types';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';

type UseInitiativeTitleMutationOptions = {
  auditId: string | undefined;
};

/**
 * Persists a single initiative title via pipeline phase result patch (Strategy phase) and invalidates plan workspace queries.
 */
export function useInitiativeTitleMutation({ auditId }: UseInitiativeTitleMutationOptions) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { bucket: StrategyInitiativeBucket; initiative: StrategyInitiative; title: string }) => {
      if (!auditId) throw new Error('auditId is required');
      const trimmed = args.title.trim();
      if (trimmed.length < 2) throw new Error('Title too short');
      return api.patchPipelinePhaseResult(auditId, PIPELINE_STRATEGY_PHASE_INDEX, {
        result: {
          [args.bucket]: [
            {
              id: args.initiative.id,
              title: trimmed,
              description: args.initiative.description,
              board_identity_key:
                typeof args.initiative.board_identity_key === 'string' && args.initiative.board_identity_key.length > 0
                  ? args.initiative.board_identity_key
                  : null,
            },
          ],
        },
      });
    },
    onSuccess: async () => {
      if (auditId) {
        await invalidatePlanWorkspaceQueries(qc, auditId);
        toast.success(STRATEGY_LAB_COPY.boardIdentity.saveInitiativeOk);
      }
    },
  });
}
