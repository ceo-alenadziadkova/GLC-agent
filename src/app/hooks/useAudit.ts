import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';

export function useAudit(auditId: string | undefined) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: glcKeys.audit.detail(auditId ?? ''),
    queryFn: () => api.getAudit(auditId!),
    enabled: Boolean(auditId),
    staleTime: 120_000,
  });

  const errorMsg =
    q.isError && q.error
      ? q.error instanceof ApiError && q.error.status === 404
        ? 'We could not find this audit.'
        : (q.error as Error).message
      : null;

  return {
    audit: q.data ?? null,
    loading: q.isPending && !q.data,
    error: errorMsg,
    reload: () => {
      if (auditId) {
        void queryClient.invalidateQueries({ queryKey: glcKeys.audit.detail(auditId) });
      }
    },
  };
}
