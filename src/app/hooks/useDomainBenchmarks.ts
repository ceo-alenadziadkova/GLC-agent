import { useQuery } from '@tanstack/react-query';

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

type DomainKey = (typeof DOMAIN_KEYS)[number];

/**
 * Loads latest domain benchmark snapshots for Strategy Lab (one TanStack Query; sequential fetches per domain).
 */
export function useDomainBenchmarks(args: {
  /** When false, no network (portal clients). */
  enabled: boolean;
  industry: string | null | undefined;
}): Partial<Record<DomainKey, DomainBenchmarkSnapshot | null>> {
  const { enabled, industry } = args;
  const ind = normalizeAuditIndustryKey(industry ?? null);
  const period = STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD;

  const query = useQuery({
    queryKey: glcKeys.domainBenchmarks.bundle(ind ?? 'none', period),
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<Partial<Record<DomainKey, DomainBenchmarkSnapshot | null>>> => {
      const out: Partial<Record<DomainKey, DomainBenchmarkSnapshot | null>> = {};
      for (const dk of DOMAIN_KEYS) {
        let snap = ind ? await api.getLatestSnapshot({ phase_id: dk, industry: ind, period }) : null;
        if (!snap) {
          snap = await api.getLatestSnapshot({
            phase_id: dk,
            industry: 'all',
            period,
          });
        }
        out[dk] = snap;
      }
      return out;
    },
  });

  return query.data ?? {};
}
