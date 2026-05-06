import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../data/apiService';
import type { RoadmapManifestRequestBody } from '../data/api/audits-orchestration';
import { invalidatePlanWorkspaceQueries } from '../lib/plan-workspace-queries';

type UseCompilePlanMutationOptions = {
  auditId: string;
  /** Called after cache invalidation (success or error), e.g. parent `reload()`. */
  onSettled?: () => void;
};

/**
 * Runs `POST /api/audits/:id/orchestration/compile` and invalidates audit, pack, and plan-board queries.
 */
export function useCompilePlanMutation({ auditId, onSettled }: UseCompilePlanMutationOptions) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RoadmapManifestRequestBody) => api.postOrchestrationCompile(auditId, body),
    onSettled: async () => {
      await invalidatePlanWorkspaceQueries(qc, auditId);
      onSettled?.();
    },
  });
}
