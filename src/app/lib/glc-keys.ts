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
  strategyExecutionPacks: {
    list: (auditId: string) => ['glc', 'strategy-execution-packs', 'list', auditId] as const,
  },
};
