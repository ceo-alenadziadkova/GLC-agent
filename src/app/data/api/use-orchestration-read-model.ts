import { useQuery, useQueryClient } from '../../lib/tanstack-react-query';

import { glcKeys } from '../../lib/glc-keys';
import { api } from '../apiService';
import type { OrchestrationPackGetBody } from './orchestration-types';

export type UseOrchestrationReadModelOptions = {
  enabled?: boolean;
  /** When false, skips `GET /orchestration/pack` (e.g. portal timeline uses audit-embedded pack). Default true. */
  includePack?: boolean;
  /** When false, skips `GET /timeline`. Default true. */
  includeTimeline?: boolean;
};

/**
 * Single cached entry point for pack + optional timeline (Product MVP SSOT for orchestration read models).
 * Pack query uses the same key as any manual invalidation of `glcKeys.orchestrationPack.detail` and
 * sends `If-None-Match` on refetch when a prior `orchestration_pack_version` is in the cache.
 */
export function useOrchestrationReadModel(
  auditId: string | undefined,
  options?: UseOrchestrationReadModelOptions,
) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? Boolean(auditId);
  const includePack = options?.includePack ?? true;
  const includeTimeline = options?.includeTimeline ?? true;

  const packQuery = useQuery({
    queryKey: glcKeys.orchestrationPack.detail(auditId ?? ''),
    queryFn: async () => {
      if (!auditId) throw new Error('auditId required');
      const key = glcKeys.orchestrationPack.detail(auditId);
      const previous = queryClient.getQueryData<OrchestrationPackGetBody>(key);
      const ifNoneMatch = previous
        ? `"orchestration-pack-v${previous.orchestration_pack_version}"`
        : undefined;
      const result = await api.getOrchestrationPackConditional(auditId, ifNoneMatch);
      if (result.kind === 'not_modified') {
        if (previous) return previous;
        return api.getOrchestrationPack(auditId);
      }
      return result.data;
    },
    enabled: enabled && includePack && Boolean(auditId),
  });

  const timelineQuery = useQuery({
    queryKey: glcKeys.timeline.detail(auditId ?? ''),
    queryFn: () => api.getAuditTimeline(auditId as string),
    enabled: enabled && includeTimeline && Boolean(auditId),
  });

  return {
    packQuery,
    timelineQuery,
    isLoading: (includePack && packQuery.isLoading) || (includeTimeline && timelineQuery.isLoading),
    isError: (includePack && packQuery.isError) || (includeTimeline && timelineQuery.isError),
  };
}
