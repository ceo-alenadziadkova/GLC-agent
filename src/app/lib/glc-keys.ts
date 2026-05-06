/** Stable query keys for TanStack Query (prefix `glc` avoids collisions). */
export const glcKeys = {
  audit: {
    detail: (id: string) => ['glc', 'audit', 'detail', id] as const,
  },
  brief: {
    detail: (id: string) => ['glc', 'brief', 'detail', id] as const,
  },
  audits: {
    list: (limit: number, offset: number, userId: string | null, filtersKey: string = 'none') =>
      ['glc', 'audits', 'list', userId ?? 'anonymous', limit, offset, filtersKey] as const,
    listsPrefix: ['glc', 'audits', 'list'] as const,
  },
  dashboard: () => ['glc', 'dashboard'] as const,
  notifications: () => ['glc', 'notifications'] as const,
  /** Invalidate all admin request-queue queries (any filter / offset). */
  adminRequestQueueRoot: ['glc', 'admin', 'request-queue'] as const,
  adminRequestQueue: (filter: 'all' | 'pending', auditRequestsOffset: number) =>
    ['glc', 'admin', 'request-queue', filter, auditRequestsOffset] as const,
  discoverySessions: () => ['glc', 'admin', 'discovery-sessions'] as const,
  timeline: {
    detail: (id: string) => ['glc', 'timeline', 'detail', id] as const,
  },
  /** `GET /api/audits/:id/orchestration/pack` — shared with portal, consultant cockpit, Strategy Lab. */
  orchestrationPack: {
    detail: (id: string) => ['glc', 'orchestration-pack', 'detail', id] as const,
  },
  /**
   * Plan workspace invalidation root (audit + pack + plan-board).
   * Use {@link invalidatePlanWorkspaceQueries} from `plan-workspace-queries.ts` — no query is registered under this key alone.
   */
  planWorkspace: {
    /** Alias for `detail` — stable aggregation key for selectors / docs. */
    detail: (id: string) => ['glc', 'plan-workspace', 'detail', id] as const,
  },
  strategyExecutionPacks: {
    list: (auditId: string) => ['glc', 'strategy-execution-packs', 'list', auditId] as const,
  },
  /** Latest benchmark snapshot per domain (Strategy Lab reference panel). */
  domainBenchmarks: {
    domain: (domainKey: string, industryKey: string, period: string) =>
      ['glc', 'domain-benchmark', domainKey, industryKey, period] as const,
  },
};
