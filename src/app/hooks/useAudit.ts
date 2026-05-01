import { useQuery } from '../lib/tanstack-react-query';
import { api, ApiError } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { GLC_QUERY_STALE_TIME_MS_DEFAULT } from '../config/query-client-defaults';
import { AUDIT_HOOKS_COPY } from '../config/audit-hooks-copy.en';

export function useAudit(auditId: string | undefined) {
  const q = useQuery({
    queryKey: glcKeys.audit.detail(auditId ?? ''),
    queryFn: () => api.getAudit(auditId!),
    enabled: Boolean(auditId),
    staleTime: GLC_QUERY_STALE_TIME_MS_DEFAULT,
  });

  const errorMsg =
    q.isError && q.error
      ? q.error instanceof ApiError && q.error.status === 404
        ? AUDIT_HOOKS_COPY.auditNotFound
        : (q.error as Error).message
      : null;

  return {
    audit: q.data ?? null,
    loading: q.isPending && !q.data,
    error: errorMsg,
    isFetching: q.isFetching,
    /** Explicit refetch (retry) for this audit; preferred over invalidate-only for user-triggered reload. */
    reload: () => {
      if (!auditId) return;
      void q.refetch();
    },
  };
}
