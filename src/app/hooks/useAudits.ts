import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '../lib/tanstack-react-query';
import { api } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { AUDITS_LIST_DEFAULTS } from '../config/audits-list-defaults';
import { useAuth } from './useAuth';
import type { AuditOrigin } from '../data/auditTypes';

export type UseAuditsFilters = {
  source?: AuditOrigin[];
  status?: string[];
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: 'created_at' | 'updated_at';
  sortDir?: 'asc' | 'desc';
};

function normalizeFilters(filters?: UseAuditsFilters): UseAuditsFilters {
  if (!filters) return {};
  return {
    source: filters.source?.length ? filters.source : undefined,
    status: filters.status?.length ? filters.status : undefined,
    createdFrom: filters.createdFrom?.trim() || undefined,
    createdTo: filters.createdTo?.trim() || undefined,
    updatedFrom: filters.updatedFrom?.trim() || undefined,
    updatedTo: filters.updatedTo?.trim() || undefined,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  };
}

export function useAudits(
  limit: number = AUDITS_LIST_DEFAULTS.defaultLimit,
  filters?: UseAuditsFilters,
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const normalizedFilters = normalizeFilters(filters);
  const filtersKey = JSON.stringify(normalizedFilters);

  const q = useInfiniteQuery({
    queryKey: glcKeys.audits.list(limit, 0, userId, filtersKey),
    queryFn: ({ pageParam }) => api.listAudits(limit, pageParam as number, normalizedFilters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    staleTime: AUDITS_LIST_DEFAULTS.staleTimeMs,
    refetchOnMount: 'always',
  });

  const audits = q.data?.pages.flatMap((page) => page.data) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  const loadMore = useCallback(() => {
    if (!q.hasNextPage || q.isFetchingNextPage) return;
    void q.fetchNextPage();
  }, [q]);

  const deleteAudit = useCallback(
    async (id: string) => {
      await api.deleteAudit(id);
      await queryClient.invalidateQueries({ queryKey: glcKeys.audits.listsPrefix });
    },
    [queryClient],
  );

  return {
    audits,
    total,
    loading: q.isPending && !q.data,
    error: q.error ? (q.error as Error).message : null,
    hasMore: q.hasNextPage ?? false,
    reload: () => {
      void queryClient.invalidateQueries({ queryKey: glcKeys.audits.listsPrefix });
    },
    loadMore,
    deleteAudit,
  };
}
