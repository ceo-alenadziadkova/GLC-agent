import { useState, useEffect, useCallback } from 'react';
import { api } from '../data/apiService';
import type { DashboardData } from '../data/apiService';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Exposed separately from useAudits().reload so the Dashboard page can
  // soft-refresh only the operational panels (action queue, activity feed)
  // after a review action, without re-fetching the full audit list.
  return { data, loading, error, reloadDashboard: load };
}
