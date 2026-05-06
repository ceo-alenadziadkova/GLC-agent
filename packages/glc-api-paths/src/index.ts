/**
 * Canonical `/api/...` paths for SPA, Express mounts, and idempotency keys.
 * Single source — server and web app re-export from here.
 */

/** Top-level HTTP prefix for all API routes (matches server `API_PREFIX` and Vite dev proxy). */
export const API_HTTP_ROOT_PREFIX = '/api' as const;
const withApiRoot = (segment: string): string => `${API_HTTP_ROOT_PREFIX}${segment}`;
/** Shared payload contract: max length for `POST /pipeline/retry` comment. */
export const PIPELINE_RETRY_COMMENT_MAX_LENGTH = 1000;

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

/** `PATCH:${path}` for idempotent mutations (Delivery Board card updates). */
export function idempotencyPatchKey(path: string): string {
  return `PATCH:${path}`;
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

export function apiAuditsPipelinePhaseResult(auditId: string, phase: number): string {
  return `${apiAuditsPath(auditId)}/pipeline/phases/${encodeURIComponent(String(phase))}/result`;
}

/** Platform admin only: PATCH per-audit token budget (top-up). */
export function apiAuditsTokenBudget(auditId: string): string {
  return `${apiAuditsPath(auditId)}/token-budget`;
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

export function apiAuditsRoadmapManifestPreview(auditId: string): string {
  return `${apiAuditsPath(auditId)}/roadmap/manifest-preview`;
}

export function apiAuditsRoadmapManifestSnapshots(
  auditId: string,
  query?: { limit?: number },
): string {
  const base = `${apiAuditsPath(auditId)}/roadmap/manifest-snapshots`;
  if (query?.limit != null) {
    return `${base}?limit=${encodeURIComponent(String(query.limit))}`;
  }
  return base;
}

export function apiAuditsRoadmapManifestSnapshotsLatest(auditId: string): string {
  return `${apiAuditsPath(auditId)}/roadmap/manifest-snapshots/latest`;
}

export function idempotencyPostAuditsRoadmapManifestSnapshotsKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsRoadmapManifestSnapshots(auditId));
}

export function apiAuditsRoadmapManifestDraftRevisions(auditId: string): string {
  return `${apiAuditsPath(auditId)}/roadmap/manifest/draft-revisions`;
}

export function idempotencyPostAuditsRoadmapManifestDraftRevisionsKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsRoadmapManifestDraftRevisions(auditId));
}

export function apiAuditsOrchestrationPack(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestration/pack`;
}

/** `POST` — atomically persist manifest snapshot then build/persist orchestration pack (preferred over split snapshot + run). */
export function apiAuditsOrchestrationCompile(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestration/compile`;
}

export function idempotencyPostAuditsOrchestrationCompileKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsOrchestrationCompile(auditId));
}

export function apiAuditsPlanBoard(auditId: string): string {
  return `${apiAuditsPath(auditId)}/plan/board`;
}

export function apiAuditsPlanBoardColumnPolicy(auditId: string): string {
  return `${apiAuditsPlanBoard(auditId)}/column-policy`;
}

export function apiAuditsPlanBoardCard(auditId: string, cardId: string): string {
  return `${apiAuditsPlanBoard(auditId)}/cards/${cardId}`;
}

export function apiAuditsPlanBoardTelemetryViewOpened(auditId: string): string {
  return `${apiAuditsPlanBoard(auditId)}/telemetry/view-opened`;
}

export function apiAuditsPlanBoardReconcilePreview(auditId: string): string {
  return `${apiAuditsPlanBoard(auditId)}/reconcile/preview`;
}

export function idempotencyPatchAuditsPlanBoardCardKey(auditId: string, cardId: string): string {
  return idempotencyPatchKey(apiAuditsPlanBoardCard(auditId, cardId));
}

export function apiAuditsOrchestrationSelectedInitiative(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestration/selected-initiative`;
}

export function apiAuditsOrchestrationSprintExport(
  auditId: string,
  query?: { format?: 'json' | 'csv'; execution_pack?: '0' | '1' },
): string {
  const base = `${apiAuditsPath(auditId)}/orchestration/sprint-export`;
  if (!query) return base;
  const sp = new URLSearchParams();
  if (query.format) sp.set('format', query.format);
  if (query.execution_pack != null) sp.set('execution_pack', query.execution_pack);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function apiAuditsOrchestrationPackRegenerate(auditId: string): string {
  return `${apiAuditsOrchestrationPack(auditId)}/regenerate`;
}

export function idempotencyPostAuditsOrchestrationPackKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsOrchestrationPack(auditId));
}

export function idempotencyPostAuditsOrchestrationPackRegenerateKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsOrchestrationPackRegenerate(auditId));
}

export function idempotencyPostAuditsOrchestrationSelectedInitiativeKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsOrchestrationSelectedInitiative(auditId));
}

export function apiAuditsOrchestrationPackDiffHistory(
  auditId: string,
  query?: { limit?: number },
): string {
  const base = `${apiAuditsPath(auditId)}/orchestration/pack-diff-history`;
  if (query?.limit != null) {
    return `${base}?limit=${encodeURIComponent(String(query.limit))}`;
  }
  return base;
}

export function apiAuditsOrchestrationPackDiff(auditId: string, query: { from_version: number; to_version: number }): string {
  const base = `${apiAuditsPath(auditId)}/orchestration/pack-diff`;
  const qs = new URLSearchParams({
    from_version: String(query.from_version),
    to_version: String(query.to_version),
  });
  return `${base}?${qs.toString()}`;
}

export function apiAuditsOrchestrationCommercialOffer(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestration/commercial-offer`;
}

/**
 * @deprecated Use `apiAuditsOrchestration*` routes.
 * Legacy aliases kept for backward compatibility during deprecation window.
 */
export function apiAuditsOrchestratorPreview(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestrator/preview`;
}

/** @deprecated Use `apiAuditsOrchestrationPack`. */
export function apiAuditsOrchestratorRun(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestrator/run`;
}

/** @deprecated Use `apiAuditsOrchestrationPack`. */
export function apiAuditsOrchestratorLatest(auditId: string): string {
  return `${apiAuditsPath(auditId)}/orchestrator/latest`;
}

export function idempotencyPostAuditsOrchestratorRunKey(auditId: string): string {
  return idempotencyPostKey(apiAuditsOrchestratorRun(auditId));
}

export function apiAuditsTimeline(auditId: string): string {
  return `${apiAuditsPath(auditId)}/timeline`;
}

export function apiAuditsDirectorDeepDive(auditId: string, domainKey: string): string {
  return `${apiAuditsPath(auditId)}/directors/${encodeURIComponent(domainKey)}/deep-dive`;
}

export function apiAuditsDirectorDeepDiveStatus(auditId: string, domainKey: string, jobId: string): string {
  return `${apiAuditsDirectorDeepDive(auditId, domainKey)}/${encodeURIComponent(jobId)}`;
}

export function apiAuditsDirectorDeepDiveQuota(auditId: string, domainKey: string): string {
  return `${apiAuditsDirectorDeepDive(auditId, domainKey)}/quota`;
}

/** Platform admin: clear `cancelled` so the audit owner can retry or continue. */
export function apiPlatformAuditPipelineResumeCancelled(auditId: string): string {
  return `${API_HTTP_PATH_PREFIX.platform}/audits/${encodeURIComponent(auditId)}/pipeline/resume-cancelled`;
}

export function apiAuditsBriefHelpRequest(auditId: string): string {
  return `${apiAuditsPath(auditId)}/brief/help-request`;
}

/** GET — composed `ClientProjectContextV1` from `intake_brief` (+ optional future enrichments). */
export function apiAuditsClientProjectContext(auditId: string): string {
  return `${apiAuditsPath(auditId)}/client-project-context`;
}

/** GET — deterministic `nextRecommended` tail (non-baseline bank ids) + questions for the audit brief. */
export function apiAuditsIntakeFollowupSuggestions(auditId: string): string {
  return `${apiAuditsPath(auditId)}/intake-followup-suggestions`;
}

/** POST — same contract as `apiIntakeIntelligenceSnapshot` but for an authenticated audit brief (consultant/portal). */
export function apiAuditsBriefIntelligenceSnapshot(auditId: string): string {
  return `${apiAuditsPath(auditId)}/brief/intelligence-snapshot`;
}

/** POST — second LLM pass: B1 `label_overrides` only (after `PUT /brief` + confirm). */
export function apiAuditsBriefIntelligenceWording(auditId: string): string {
  return `${apiAuditsPath(auditId)}/brief/intelligence-wording`;
}

/** POST — merge another audit’s bank `responses` into this brief (Basics/identity cells preserved on target). */
export function apiAuditsBriefCloneFrom(auditId: string): string {
  return `${apiAuditsPath(auditId)}/brief/clone-from`;
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

export function apiIntakeNlDescribe(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}/nl-describe`;
}

export function apiIntakeIntelligenceKpi(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}/intelligence-kpi`;
}

export function apiIntakeNextQuestion(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}/next-question`;
}

export function apiIntakeTailoredQuestions(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}/tailored-questions`;
}

/** POST — LLM (optional) + F2-ordered follow-ups after pre-brief; see ADR-INTAKE-POST-PREBRIEF-INTELLIGENCE-SNAPSHOT. */
export function apiIntakeIntelligenceSnapshot(token: string): string {
  return `${API_PATHS.intake}/${encodeURIComponent(token)}/intelligence-snapshot`;
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
