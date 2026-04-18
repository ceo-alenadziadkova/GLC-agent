import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../data/apiService';
import type { DashboardData } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { GLC_QUERY_STALE_TIME_MS_DEFAULT } from '../config/query-client-defaults';

export function useDashboard() {
  const queryClient = useQueryClient();
  const q = useQuery<DashboardData>({
    queryKey: glcKeys.dashboard(),
    queryFn: () => api.getDashboard(),
    staleTime: GLC_QUERY_STALE_TIME_MS_DEFAULT,
  });

  return {
    data: q.data ?? null,
    loading: q.isPending && !q.data,
    error: q.error ? (q.error as Error).message : null,
    reloadDashboard: () => {
      void queryClient.invalidateQueries({ queryKey: glcKeys.dashboard() });
    },
  };
}
