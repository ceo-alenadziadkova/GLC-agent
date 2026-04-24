import { useCallback, useEffect, useState } from 'react';
import { GLC_AUDITS_AND_AUDIT_REQUESTS_LIST } from '@glc/route-limits';
import { API_PATHS } from '../../../config/api-paths';
import { apiFetch } from '../../../data/api-http';

export type TokenUsageSummaryAuditRow = {
  id: string;
  company_url: string;
  company_name: string | null;
  tokens_used: number;
  token_budget: number;
  tokens_remaining: number;
  created_at: string;
};

export type TokenUsageSummaryResponse = {
  audits: TokenUsageSummaryAuditRow[];
  pagination: { total: number; limit: number; offset: number };
  scopes: {
    accessible: {
      sum_tokens_used: number;
      sum_token_budget: number;
      sum_tokens_remaining: number;
    };
    platform: {
      pool_cap: number;
      global_tokens_used: number;
      pool_tokens_remaining: number;
    } | null;
  };
};

export function useTokenUsageSummary(enabled: boolean) {
  const [data, setData] = useState<TokenUsageSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        limit: String(GLC_AUDITS_AND_AUDIT_REQUESTS_LIST.maxLimit),
        offset: '0',
      });
      const res = await apiFetch<TokenUsageSummaryResponse>(
        `${API_PATHS.auditsTokenUsageSummary}?${qs.toString()}`,
        { method: 'GET' },
      );
      setData(res);
    } catch {
      setData(null);
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      return;
    }
    void load();
  }, [enabled, load]);

  return { data, loading, error, reload: load };
}
