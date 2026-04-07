import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../data/apiService';
import type { DashboardData } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';

export function useDashboard() {
  const queryClient = useQueryClient();
  const q = useQuery<DashboardData>({
    queryKey: glcKeys.dashboard(),
    queryFn: () => api.getDashboard(),
    staleTime: 120_000,
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
