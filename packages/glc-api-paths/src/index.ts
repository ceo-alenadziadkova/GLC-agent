/**
 * Canonical `/api/...` paths for SPA, Express mounts, and idempotency keys.
 * Single source — server and web app re-export from here.
 */

/** Top-level HTTP prefix for all API routes (matches server `API_PREFIX` and Vite dev proxy). */
export const API_HTTP_ROOT_PREFIX = '/api' as const;
const withApiRoot = (segment: string): string => `${API_HTTP_ROOT_PREFIX}${segment}`;

/** Express `app.use` mount prefixes (must match `API_ROUTE_MOUNT_ENTRIES`). */
export const API_HTTP_PATH_PREFIX = {
  public: withApiRoot('/public'),
  profile: withApiRoot('/profile'),
  platform: withApiRoot('/platform'),
  briefPublic: withApiRoot('/brief-public'),
  snapshot: withApiRoot('/snapshot'),
  intake: withApiRoot('/intake'),
  intakeTraceTool: withApiRoot('/intake-trace-tool'),
  discover: withApiRoot('/discover'),
  marketing: withApiRoot('/marketing'),
  auditRequests: withApiRoot('/audit-requests'),
  analytics: withApiRoot('/analytics'),
  notifications: withApiRoot('/notifications'),
  audits: withApiRoot('/audits'),
  benchmarks: withApiRoot('/benchmarks'),
  log: withApiRoot('/log'),
} as const;

export type ApiHttpPathPrefixKey = keyof typeof API_HTTP_PATH_PREFIX;

export {
  LEGAL_DOCUMENT_BUNDLE_VERSION,
  LEGAL_DOCUMENT_SPA_ROUTES,
  LEGAL_DOCUMENT_VERSIONS,
  type LegalDocumentSpaRouteKey,
} from './legal-documents.js';

export const API_PATHS = {
  publicBrand: `${API_HTTP_PATH_PREFIX.public}/brand`,
  publicLegalDocuments: `${API_HTTP_PATH_PREFIX.public}/legal-documents`,
  analyticsDashboard: `${API_HTTP_PATH_PREFIX.analytics}/dashboard`,
  auditRequests: API_HTTP_PATH_PREFIX.auditRequests,
  audits: API_HTTP_PATH_PREFIX.audits,
  auditsTokenUsageSummary: `${API_HTTP_PATH_PREFIX.audits}/token-usage-summary`,
  benchmarks: API_HTTP_PATH_PREFIX.benchmarks,
  benchmarksRecompute: `${API_HTTP_PATH_PREFIX.benchmarks}/recompute`,
  platformBenchmarksRecompute: `${API_HTTP_PATH_PREFIX.platform}/benchmarks/recompute`,
  discover: API_HTTP_PATH_PREFIX.discover,
  discoverUiFragment: `${API_HTTP_PATH_PREFIX.discover}/ui-fragment`,
  discoverAnalyticsEvents: `${API_HTTP_PATH_PREFIX.discover}/analytics-events`,
  discoverSessions: `${API_HTTP_PATH_PREFIX.discover}/sessions`,
  briefPublicSession: `${API_HTTP_PATH_PREFIX.briefPublic}/session`,
  briefPublicSubmissions: `${API_HTTP_PATH_PREFIX.briefPublic}/submissions`,
  intake: API_HTTP_PATH_PREFIX.intake,
  intakeLinkAudit: `${API_HTTP_PATH_PREFIX.intake}/link-audit`,
  intakeSubmissions: `${API_HTTP_PATH_PREFIX.intake}/submissions`,
  intakeTraceToolAnalytics: `${API_HTTP_PATH_PREFIX.intakeTraceTool}/analytics-events`,
  intakeWordingDrafts: `${API_HTTP_PATH_PREFIX.intakeTraceTool}/wording-drafts`,
  intakeWordingDraftsPublish: `${API_HTTP_PATH_PREFIX.intakeTraceTool}/wording-drafts/publish`,
  intakeWordingDraftsRollback: `${API_HTTP_PATH_PREFIX.intakeTraceTool}/wording-drafts/rollback`,
  log: API_HTTP_PATH_PREFIX.log,
  logSnapshot: `${API_HTTP_PATH_PREFIX.log}/snapshot`,
  marketingBrief: `${API_HTTP_PATH_PREFIX.marketing}/brief`,
  notifications: API_HTTP_PATH_PREFIX.notifications,
  notificationsUnreadCount: `${API_HTTP_PATH_PREFIX.notifications}/unread-count`,
  notificationsReadAll: `${API_HTTP_PATH_PREFIX.notifications}/read-all`,
  platformSelfServeOwner: `${API_HTTP_PATH_PREFIX.platform}/self-serve-owner`,
  profile: API_HTTP_PATH_PREFIX.profile,
  profileLegalConsents: `${API_HTTP_PATH_PREFIX.profile}/legal-consents`,
  snapshot: API_HTTP_PATH_PREFIX.snapshot,
  snapshotQuota: `${API_HTTP_PATH_PREFIX.snapshot}/quota`,
  snapshotClaim: `${API_HTTP_PATH_PREFIX.snapshot}/claim`,
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
  return `${API_HTTP_PATH_PREFIX.intakeTraceTool}/wording-publication-log?limit=${limit}`;
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

export function apiAuditsStrategyExecutionPack(auditId: string): string {
  return `${apiAuditsPath(auditId)}/strategy/execution-pack`;
}

export function apiAuditsStrategyExecutionPacks(auditId: string): string {
  return `${apiAuditsPath(auditId)}/strategy/execution-packs`;
}

export function apiAuditsStrategyLabContext(auditId: string): string {
  return `${apiAuditsPath(auditId)}/strategy/lab-context`;
}

/** Platform admin: clear `cancelled` so the audit owner can retry or continue. */
export function apiPlatformAuditPipelineResumeCancelled(auditId: string): string {
  return `${API_HTTP_PATH_PREFIX.platform}/audits/${encodeURIComponent(auditId)}/pipeline/resume-cancelled`;
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

export function apiBriefPublicSession(token: string): string {
  return `${API_PATHS.briefPublicSession}/${encodeURIComponent(token)}`;
}

export function apiBriefPublicSubmit(token: string): string {
  return `${apiBriefPublicSession(token)}/submit`;
}

export function apiBriefPublicConvert(token: string): string {
  return `${apiBriefPublicSession(token)}/convert`;
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
