import { useQueries } from '@tanstack/react-query';

import { DOMAIN_KEYS } from '../data/auditTypes';
import type { DomainBenchmarkSnapshot } from '../data/api/benchmarks';
import { api } from '../data/apiService';
import { STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD } from '../config/strategy-lab';
import { glcKeys } from '../lib/glc-keys';

function normalizeAuditIndustryKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return t.length > 0 ? t : null;
}

/**
 * Loads latest domain benchmark snapshots for Strategy Lab (parallel, cached via TanStack Query).
 */
export function useDomainBenchmarks(args: {
  /** When false, no network (portal clients). */
  enabled: boolean;
  industry: string | null | undefined;
}): Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>> {
  const { enabled, industry } = args;
  const ind = normalizeAuditIndustryKey(industry ?? null);
  const period = STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD;

  const queries = useQueries({
    queries: DOMAIN_KEYS.map((dk) => ({
      queryKey: glcKeys.domainBenchmarks.domain(dk, ind ?? 'none', period),
      enabled,
      queryFn: async (): Promise<DomainBenchmarkSnapshot | null> => {
        let snap = ind
          ? await api.getLatestSnapshot({ phase_id: dk, industry: ind, period })
          : null;
        if (!snap) {
          snap = await api.getLatestSnapshot({
            phase_id: dk,
            industry: 'all',
            period,
          });
        }
        return snap;
      },
      staleTime: 60_000,
    })),
  });

  const out: Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>> = {};
  DOMAIN_KEYS.forEach((dk, i) => {
    out[dk] = queries[i]?.data ?? null;
  });
  return out;
}
