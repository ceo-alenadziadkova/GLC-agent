/** Stable query keys for TanStack Query (prefix `glc` avoids collisions). */
export const glcKeys = {
  audit: {
    detail: (id: string) => ['glc', 'audit', 'detail', id] as const,
  },
  brief: {
    detail: (id: string) => ['glc', 'brief', 'detail', id] as const,
  },
  audits: {
    list: (limit: number, offset: number) => ['glc', 'audits', 'list', limit, offset] as const,
    listsPrefix: ['glc', 'audits', 'list'] as const,
  },
  dashboard: () => ['glc', 'dashboard'] as const,
  notifications: () => ['glc', 'notifications'] as const,
  /** Invalidate all admin request-queue queries (any filter / offset). */
  adminRequestQueueRoot: ['glc', 'admin', 'request-queue'] as const,
  adminRequestQueue: (filter: 'all' | 'pending', auditRequestsOffset: number) =>
    ['glc', 'admin', 'request-queue', filter, auditRequestsOffset] as const,
  discoverySessions: () => ['glc', 'admin', 'discovery-sessions'] as const,
};
