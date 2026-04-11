/**
 * Relative API paths for the SPA (single place to rename or prefix routes).
 */

export const API_PATHS = {
  analyticsDashboard: '/api/analytics/dashboard',
  auditRequests: '/api/audit-requests',
  audits: '/api/audits',
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

export function apiIntakeTracePublicationLog(limit: number): string {
  return `/api/intake-trace-tool/wording-publication-log?limit=${limit}`;
}
