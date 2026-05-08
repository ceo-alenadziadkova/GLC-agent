import {
  GLC_AUDITS_AND_AUDIT_REQUESTS_LIST,
  GLC_DISCOVER_SESSIONS_LIST_MAX,
  GLC_INTAKE_SUBMISSIONS_LIST_MAX,
  GLC_NOTIFICATIONS_LIST,
  GLC_PIPELINE_STATUS_EVENTS_LIMIT,
} from '@glc/route-limits';

export const SYSTEM_DEFAULTS_AUDITS_LIST = GLC_AUDITS_AND_AUDIT_REQUESTS_LIST;

/**
 * Supabase `.limit()` caps and list pagination for dashboard / status routes.
 * Numeric source: `@glc/route-limits` (shared with the SPA).
 */
export const SYSTEM_DEFAULTS_ROUTE_QUERIES = {
  notifications: GLC_NOTIFICATIONS_LIST,
  discoverSessionsMaxRows: GLC_DISCOVER_SESSIONS_LIST_MAX,
  intakeSubmissionsMaxRows: GLC_INTAKE_SUBMISSIONS_LIST_MAX,
  briefPublicSubmissionsMaxRows: 200,
  pipelineStatusEventsLimit: GLC_PIPELINE_STATUS_EVENTS_LIMIT,
  controlObjectHistoryEventsLimit: 400,
  /** Same caps as `auditsList` — GET /api/audit-requests pagination. */
  auditRequestsList: GLC_AUDITS_AND_AUDIT_REQUESTS_LIST,
  /** GET /api/audits/:id/roadmap/manifest-snapshots — newest first. */
  orchestrationRoadmapManifestSnapshotsList: {
    defaultLimit: 5,
    maxLimit: 50,
    minLimit: 1,
  },
  /** GET /api/audits/:id/orchestration/pack-diff-history — newest first. */
  orchestrationPackDiffHistoryList: {
    defaultLimit: 5,
    maxLimit: 50,
    minLimit: 1,
  },
  /**
   * GET /api/audits/:id/report — `audit_domains` versioned rows per retry.
   * Fetch newest-first with a hard cap; downstream still dedupes by `domain_key`.
   */
  reportsAuditDomainsFetchMaxRows: 512,
} as const;
