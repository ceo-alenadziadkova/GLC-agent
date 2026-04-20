import { useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { AUDITS_LIST_DEFAULTS } from '../config/audits-list-defaults';
import { useAuth } from './useAuth';

export function useAudits(limit: number = AUDITS_LIST_DEFAULTS.defaultLimit) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const q = useInfiniteQuery({
    queryKey: glcKeys.audits.list(limit, 0, userId),
    queryFn: ({ pageParam }) => api.listAudits(limit, pageParam as number),
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
