import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS } from '@glc/intake-core';
import { toast } from 'sonner';

import { PIPELINE_STRATEGY_PHASE_INDEX } from '../config/pipeline-phase-policy';
import type { StrategyInitiativeBucket } from '../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { api } from '../data/apiService';
import type { StrategyInitiative } from '../data/audit/contracts/report/report-domain.types';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';

type UseInitiativeDetailsMutationOptions = {
  auditId: string | undefined;
};

function stableBoardIdentityKey(bucket: StrategyInitiativeBucket, initiativeId: string): string {
  const raw = `${bucket}:${initiativeId}`;
  return raw.length > CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS
    ? raw.slice(0, CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS)
    : raw;
}

export function useInitiativeDetailsMutation({ auditId }: UseInitiativeDetailsMutationOptions) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      bucket: StrategyInitiativeBucket;
      initiative: StrategyInitiative;
      description?: string;
      preserveBoardIdentity?: boolean;
    }) => {
      if (!auditId) throw new Error('auditId is required');
      const nextDescription =
        typeof args.description === 'string' ? args.description.trim() : args.initiative.description;
      if (nextDescription.length < 2) throw new Error('Description too short');
      const nextIdentity =
        typeof args.preserveBoardIdentity === 'boolean'
          ? args.preserveBoardIdentity
            ? args.initiative.board_identity_key && args.initiative.board_identity_key.length > 0
              ? args.initiative.board_identity_key
              : stableBoardIdentityKey(args.bucket, args.initiative.id)
            : null
          : args.initiative.board_identity_key ?? null;
      return api.patchPipelinePhaseResult(auditId, PIPELINE_STRATEGY_PHASE_INDEX, {
        result: {
          [args.bucket]: [
            {
              id: args.initiative.id,
              title: args.initiative.title.trim(),
              description: nextDescription,
              board_identity_key: nextIdentity,
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
    onError: () => {
      toast.error(STRATEGY_LAB_COPY.boardIdentity.saveInitiativeFailed);
    },
  });
}
