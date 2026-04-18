import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { AUDITS_LIST_DEFAULTS } from '../config/audits-list-defaults';

export function useAudits(limit: number = AUDITS_LIST_DEFAULTS.defaultLimit) {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [limit]);

  const q = useQuery({
    queryKey: glcKeys.audits.list(limit, offset),
    queryFn: () => api.listAudits(limit, offset),
    staleTime: AUDITS_LIST_DEFAULTS.staleTimeMs,
  });

  const audits = q.data?.data ?? [];
  const total = q.data?.total ?? 0;

  const loadMore = useCallback(() => {
    if (offset + limit < total) setOffset((o) => o + limit);
  }, [offset, limit, total]);

  const deleteAudit = useCallback(
    async (id: string) => {
      await api.deleteAudit(id);
      setOffset(0);
      await queryClient.invalidateQueries({ queryKey: glcKeys.audits.listsPrefix });
    },
    [queryClient],
  );

  return {
    audits,
    total,
    loading: q.isPending && !q.data,
    error: q.error ? (q.error as Error).message : null,
    hasMore: offset + limit < total,
    reload: () => {
      setOffset(0);
      void queryClient.invalidateQueries({ queryKey: glcKeys.audits.listsPrefix });
    },
    loadMore,
    deleteAudit,
  };
}
