/**
 * Canonical `/api/...` paths for SPA, Express mounts, and idempotency keys.
 * Single source — server and web app re-export from here.
 */

/** Top-level HTTP prefix for all API routes (matches server `API_PREFIX` and Vite dev proxy). */
export const API_HTTP_ROOT_PREFIX = '/api' as const;

/** Express `app.use` mount prefixes (must match `API_ROUTE_MOUNT_ENTRIES`). */
export const API_HTTP_PATH_PREFIX = {
  public: '/api/public',
  profile: '/api/profile',
  platform: '/api/platform',
  snapshot: '/api/snapshot',
  intake: '/api/intake',
  intakeTraceTool: '/api/intake-trace-tool',
  discover: '/api/discover',
  marketing: '/api/marketing',
  auditRequests: '/api/audit-requests',
  analytics: '/api/analytics',
  notifications: '/api/notifications',
  audits: '/api/audits',
  benchmarks: '/api/benchmarks',
  log: '/api/log',
} as const;

export type ApiHttpPathPrefixKey = keyof typeof API_HTTP_PATH_PREFIX;

export const API_PATHS = {
  publicBrand: '/api/public/brand',
  analyticsDashboard: '/api/analytics/dashboard',
  auditRequests: '/api/audit-requests',
  audits: '/api/audits',
  benchmarks: '/api/benchmarks',
  benchmarksRecompute: '/api/benchmarks/recompute',
  platformBenchmarksRecompute: '/api/platform/benchmarks/recompute',
  discover: '/api/discover',
  discoverUiFragment: '/api/discover/ui-fragment',
  discoverAnalyticsEvents: '/api/discover/analytics-events',
  discoverSessions: '/api/discover/sessions',
  intake: '/api/intake',
  intakeLinkAudit: '/api/intake/link-audit',
  intakeSubmissions: '/api/intake/submissions',
  intakeTraceToolAnalytics: '/api/intake-trace-tool/analytics-events',
  intakeWordingDrafts: '/api/intake-trace-tool/wording-drafts',
  intakeWordingDraftsPublish: '/api/intake-trace-tool/wording-drafts/publish',
  intakeWordingDraftsRollback: '/api/intake-trace-tool/wording-drafts/rollback',
  log: '/api/log',
  logSnapshot: '/api/log/snapshot',
  marketingBrief: '/api/marketing/brief',
  notifications: '/api/notifications',
  notificationsUnreadCount: '/api/notifications/unread-count',
  notificationsReadAll: '/api/notifications/read-all',
  platformSelfServeOwner: '/api/platform/self-serve-owner',
  profile: '/api/profile',
  snapshot: '/api/snapshot',
  snapshotQuota: '/api/snapshot/quota',
  snapshotClaim: '/api/snapshot/claim',
} as const;

export type ApiLogPath = (typeof API_PATHS)['log'] | (typeof API_PATHS)['logSnapshot'];

/** `POST:${path}` for idempotency storage (must stay stable for existing keys). */
export function idempotencyPostKey(path: string): string {
  return `POST:${path}`;
}

export function idempotencyPostAuditsCreateKey(): string {
  return idempotencyPostKey(API_HTTP_PATH_PREFIX.audits);
}

export function idempotencyPostAuditRequestApproveKey(requestId: string): string {
  const id = encodeURIComponent(requestId);
  return idempotencyPostKey(`${API_HTTP_PATH_PREFIX.auditRequests}/${id}/approve`);
}

export function apiIntakeTracePublicationLog(limit: number): string {
  return `/api/intake-trace-tool/wording-publication-log?limit=${limit}`;
}

export function apiAuditsPath(auditId: string): string {
  return `${API_PATHS.audits}/${encodeURIComponent(auditId)}`;
}

export function apiAuditsPipelineStart(auditId: string): string {
  return `${apiAuditsPath(auditId)}/pipeline/start`;
}

export function apiAuditsPipelineNext(auditId: string): string {
  return `${apiAuditsPath(auditId)}/pipeline/next`;
}

export function apiAuditsPipelineRetry(auditId: string): string {
  return `${apiAuditsPath(auditId)}/pipeline/retry`;
}

export function apiAuditsPipelineStop(auditId: string): string {
  return `${apiAuditsPath(auditId)}/pipeline/stop`;
}

export function apiAuditsPipelineStatus(auditId: string): string {
  return `${apiAuditsPath(auditId)}/pipeline/status`;
}

export function apiAuditsBriefHelpRequest(auditId: string): string {
  return `${apiAuditsPath(auditId)}/brief/help-request`;
}

export function apiAuditsReview(auditId: string, phase: number): string {
  return `${apiAuditsPath(auditId)}/reviews/${encodeURIComponent(String(phase))}`;
}

export function apiAuditsQualityGate(auditId: string, phase: number): string {
  return `${apiAuditsPath(auditId)}/quality-gate/${encodeURIComponent(String(phase))}`;
}

export function apiAuditsReportQuery(auditId: string, format: string, profile: string): string {
  const q = new URLSearchParams({ format, profile });
  return `${apiAuditsPath(auditId)}/report?${q.toString()}`;
}

export function apiIntakePrefill(token: string): string {
  return `${API_PATHS.intake}/prefill/${encodeURIComponent(token)}`;
}

export function apiIntakeToken(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}`;
}

export function apiIntakeRespond(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}/respond`;
}

/** GET /api/benchmarks with optional filters (consultant auth). */
export function apiBenchmarksQuery(args: {
  phase_id?: string;
  industry?: string;
  period?: string;
}): string {
  const q = new URLSearchParams();
  if (args.phase_id) q.set('phase_id', args.phase_id);
  if (args.industry) q.set('industry', args.industry);
  if (args.period) q.set('period', args.period);
  const qs = q.toString();
  return qs ? `${API_PATHS.benchmarks}?${qs}` : API_PATHS.benchmarks;
}
