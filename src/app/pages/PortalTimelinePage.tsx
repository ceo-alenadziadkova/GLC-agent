import { Link, useParams } from 'react-router';
import { ArrowsClockwise, FileText, Flask } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { laneIdsForOrchestrationDisplayPreset } from '../config/orchestration-client-roadmap-lanes';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { useAudit } from '../hooks/useAudit';
import {
  formatTimelineCalendarPlanWindowLine,
  ORCHESTRATION_IA_COPY,
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_SEASON_BUCKET_LABELS_BY_PRESET,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../config/orchestration-roadmap-ui-copy.en';
import { CLIENT_AUDIT_VIEW_COPY } from '../config/client-audit-view-copy';
import { PORTAL_MANIFEST_WIZARD_COPY } from '../config/portal-manifest-wizard-copy.en';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import {
  ORCHESTRATION_LAB_FOCUS_QUERY_KEY,
  ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE,
  ORCHESTRATION_MANIFEST_SETUP_DOM_ID,
  ORCHESTRATION_UI_LIMITS,
} from '../config/orchestration-ui-limits';
import { useProfile } from '../hooks/useProfile';
import { buildAppRoute } from '../config/route-paths';
import { ApiError } from '../data/api-error';
import { api } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { formatAppMediumDateTime } from '../lib/date-format';
import { OrchestrationTimelineProvenanceBadges } from '../lib/orchestration-node-badges';
import { buildOrchestrationRevisionStorySummary } from '../lib/orchestration-revision-story';

function formatTimelineLoadError(err: unknown): string | null {
  if (err == null) return null;
  if (err instanceof ApiError) {
    const code = err.code ? ` (${err.code})` : '';
    return `${err.message}${code}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function PortalTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading, error } = useAudit(id);
  const { isClient } = useProfile();

  const auditIdForQuery = id ?? '';
  const timelineQueryEnabled = Boolean(id) && !loading && !error && Boolean(audit);

  const timelineQuery = useQuery({
    queryKey: glcKeys.timeline.detail(auditIdForQuery),
    queryFn: () => api.getAuditTimeline(id as string),
    enabled: timelineQueryEnabled,
  });

  const timeline = timelineQuery.data?.timeline ?? null;

  const executionPacksQuery = useQuery({
    queryKey: glcKeys.strategyExecutionPacks.list(auditIdForQuery),
    queryFn: () => api.listStrategyExecutionPacks(id as string),
    enabled:
      Boolean(id) &&
      isClient &&
      APP_FEATURE_FLAGS.clientExecutionPackTimelineSurfaceEnabled &&
      timelineQuery.isSuccess &&
      timelineQuery.data?.timeline?.status === 'ready',
    staleTime: 60_000,
    retry: false,
  });

  const executionPackRows = useMemo(() => {
    const items = executionPacksQuery.data?.items ?? [];
    return items.slice(0, ORCHESTRATION_UI_LIMITS.maxExecutionPackListItemsClient);
  }, [executionPacksQuery.data?.items]);

  const laneByNodeId = useMemo(() => {
    const m = new Map<string, OrchestrationLaneId>();
    for (const lane of timeline?.lanes ?? []) {
      for (const item of lane.items) {
        m.set(item.id, item.lane);
      }
    }
    return m;
  }, [timeline?.lanes]);

  const orderedTimelineLanes = useMemo(() => {
    const lanes = timeline?.lanes ?? [];
    if (!isClient || lanes.length === 0) return lanes;
    const order = laneIdsForOrchestrationDisplayPreset('client_mvp');
    const byId = new Map(lanes.map((l) => [l.lane_id, l] as const));
    const out: typeof lanes = [];
    for (const laneId of order) {
      const row = byId.get(laneId);
      if (row) out.push(row);
    }
    for (const l of lanes) {
      if (!out.includes(l)) out.push(l);
    }
    return out;
  }, [timeline?.lanes, isClient]);

  const timelinePageSubtitle = APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled
    ? ORCHESTRATION_IA_COPY.timelinePageSubtitleWhenPrimary
    : ORCHESTRATION_UI_COPY.timelineHint;

  const timelineErrorDetail = formatTimelineLoadError(timelineQuery.error);
  const statusMessage =
    timeline?.status === 'missing_pack'
      ? ORCHESTRATION_UI_COPY.timelineStateMissingPack
      : timeline?.status === 'degraded'
        ? ORCHESTRATION_UI_COPY.timelineStateDegraded
        : timeline?.status === 'stale_manifest'
          ? ORCHESTRATION_UI_COPY.timelineStateStaleManifest
          : timeline?.status === 'restricted_client_view'
            ? ORCHESTRATION_UI_COPY.timelineStateRestricted
            : null;
  const blockingDeps = timeline?.dependencies.filter((row) => row.blocking) ?? [];
  const parallelTracks = timeline?.dependencies.filter((row) => !row.blocking) ?? [];
  const crossLaneBlocking = blockingDeps.filter((row) => row.cross_lane);
  const nodeTitleById = new Map(
    (timeline?.lanes ?? []).flatMap((lane) => lane.items.map((item) => [item.id, item.title] as const)),
  );
  const nodeProvenanceById = useMemo(() => {
    const m = new Map<string, { source?: 'strategy' | 'director'; analysis_depth?: 'baseline' | 'deep' }>();
    for (const lane of timeline?.lanes ?? []) {
      for (const item of lane.items) {
        if (!m.has(item.id)) {
          m.set(item.id, { source: item.source, analysis_depth: item.analysis_depth });
        }
      }
    }
    return m;
  }, [timeline?.lanes]);
  const readNodeTitle = (nodeId: string): string => nodeTitleById.get(nodeId) ?? nodeId;
  const readLaneLabel = (nodeId: string): string | null => {
    const lid = laneByNodeId.get(nodeId);
    return lid ? ORCHESTRATION_LANE_LABELS[lid] : null;
  };
  const formatDepRow = (from: string, to: string): string => {
    const a = readNodeTitle(from);
    const b = readNodeTitle(to);
    const la = readLaneLabel(from);
    const lb = readLaneLabel(to);
    const left = la ? `${a} · ${la}` : a;
    const right = lb ? `${b} · ${lb}` : b;
    return `${left} → ${right}`;
  };

  const seasonBucketHeading = (seasonId: 'near' | 'mid' | 'far'): string => {
    const preset = timeline?.version.season_preset;
    if (preset && preset in ORCHESTRATION_SEASON_BUCKET_LABELS_BY_PRESET) {
      return ORCHESTRATION_SEASON_BUCKET_LABELS_BY_PRESET[preset][seasonId];
    }
    if (seasonId === 'near') return ORCHESTRATION_UI_COPY.bucketNear;
    if (seasonId === 'mid') return ORCHESTRATION_UI_COPY.bucketMid;
    return ORCHESTRATION_UI_COPY.bucketFar;
  };

  if (!id) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.page.missingId}>
        <div className="glc-page-content mx-auto max-w-3xl text-sm ds-text-score-1">{CLIENT_AUDIT_VIEW_COPY.page.missingId}</div>
      </AppShell>
    );
  }

  const reportHref = isClient ? buildAppRoute.portalReports(id) : buildAppRoute.reports(id);
  const labHref = isClient ? buildAppRoute.portalStrategy(id) : buildAppRoute.strategy(id);
  const labManifestFlowHref = `${labHref}?${ORCHESTRATION_LAB_FOCUS_QUERY_KEY}=${ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE}`;
  const manifestWizardHref = buildAppRoute.portalRoadmapManifest(id);
  const auditHref = isClient ? buildAppRoute.portalAudit(id) : buildAppRoute.audit(id);

  if (loading && !audit) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={ORCHESTRATION_UI_COPY.previewLoading}>
        <div className="flex h-64 items-center justify-center">
          <ArrowsClockwise className="h-6 w-6 animate-spin ds-text-brand" />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.cockpit.subtitle}>
        <div className="flex h-64 items-center justify-center">
          <p className="ds-text-score-1">{error ?? ORCHESTRATION_UI_COPY.noPackYet}</p>
        </div>
      </AppShell>
    );
  }

  const cockpitCopy = CLIENT_AUDIT_VIEW_COPY.cockpit;
  const roadmapRevisionDiff = audit.strategy?.glc_orchestration_last_revision_diff ?? null;
  const roadmapPackVersion =
    typeof audit.strategy?.orchestration_pack_version === 'number' && audit.strategy.orchestration_pack_version > 0
      ? audit.strategy.orchestration_pack_version
      : null;
  const revisionStorySummary = buildOrchestrationRevisionStorySummary(roadmapRevisionDiff);
  const revisionStoryNodesDelta = roadmapRevisionDiff
    ? roadmapRevisionDiff.nodes_added.length + roadmapRevisionDiff.nodes_removed.length
    : 0;
  const revisionStoryDepsDelta = roadmapRevisionDiff
    ? roadmapRevisionDiff.edges_added.length + roadmapRevisionDiff.edges_removed.length
    : 0;

  return (
    <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={timelinePageSubtitle}>
      <div className="mx-auto max-w-3xl space-y-4 ds-pattern-page-shell-body">
        <div className="glc-soft-panel flex flex-wrap gap-2 p-4">
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={auditHref}>{CLIENT_AUDIT_VIEW_COPY.cockpit.title}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={reportHref}>
              <FileText className="h-4 w-4" />
              {CLIENT_AUDIT_VIEW_COPY.cockpit.openFullReport}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={labManifestFlowHref}>
              <Flask className="h-4 w-4" />
              {CLIENT_AUDIT_VIEW_COPY.cockpit.adjustScopeTitle}
            </Link>
          </Button>
        </div>
        {timelineQuery.isPending && (
          <div className="flex h-40 items-center justify-center">
            <ArrowsClockwise className="h-5 w-5 animate-spin ds-text-brand" />
          </div>
        )}
        {timelineQuery.error && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--ui-danger-border-20)] bg-[var(--ui-danger-muted-bg)] px-4 py-3 text-sm text-[var(--ui-danger-fg-strong)]"
          >
            <div className="font-medium">{ORCHESTRATION_UI_COPY.timelineLoadFailed}</div>
            {timelineErrorDetail ? (
              <p className="mt-2 text-xs leading-relaxed opacity-90">{timelineErrorDetail}</p>
            ) : null}
          </div>
        )}
        {timeline && (
          <>
            {statusMessage &&
            (timeline.status === 'missing_pack' || timeline.status === 'stale_manifest') ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-4"
              >
                <h2 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineEmptyCalloutTitle}</h2>
                <p className="mt-2 text-xs leading-relaxed ds-text-secondary">{statusMessage}</p>
                <p className="mt-2 text-[length:var(--text-2xs)] leading-relaxed ds-text-tertiary">
                  {ORCHESTRATION_UI_COPY.timelineDiagnosticReasonLabel}: {timeline.status}
                </p>
                {timeline.status === 'missing_pack' && isClient ? (
                  <p className="mt-2 text-xs leading-relaxed ds-text-secondary">
                    {ORCHESTRATION_UI_COPY.timelineEmptyCalloutClientHint}
                  </p>
                ) : null}
                {timeline.status === 'stale_manifest' && isClient ? (
                  <p className="mt-2 text-xs leading-relaxed ds-text-secondary">
                    {ORCHESTRATION_UI_COPY.timelineStaleManifestClientHint}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isClient &&
                  APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled &&
                  APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled ? (
                    <Button asChild variant="default" size="sm" className="no-underline">
                      <Link to={manifestWizardHref}>{PORTAL_MANIFEST_WIZARD_COPY.shortCta}</Link>
                    </Button>
                  ) : null}
                  {!isClient ? (
                    <Button asChild variant="default" size="sm" className="no-underline">
                      <Link to={labManifestFlowHref}>{ORCHESTRATION_UI_COPY.timelineManifestFlowCta}</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm" className="no-underline">
                    <Link to={reportHref}>{ORCHESTRATION_UI_COPY.timelineEmptyCtaOpenReport}</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="no-underline">
                    <Link to={auditHref}>{ORCHESTRATION_UI_COPY.timelineEmptyCtaAuditOverview}</Link>
                  </Button>
                </div>
                {timeline.status === 'stale_manifest' && !isClient ? (
                  <p className="mt-3 text-xs font-medium ds-text-score-3">{ORCHESTRATION_UI_COPY.timelineManifestStaleCta}</p>
                ) : null}
              </div>
            ) : null}
            {statusMessage && timeline.status !== 'missing_pack' && timeline.status !== 'stale_manifest' ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-xs ds-text-secondary"
              >
                {statusMessage}
                <p className="mt-2 text-[length:var(--text-2xs)] ds-text-tertiary">
                  {ORCHESTRATION_UI_COPY.timelineDiagnosticReasonLabel}: {timeline.status}
                </p>
              </div>
            ) : null}
            <div
              id={ORCHESTRATION_MANIFEST_SETUP_DOM_ID}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-xs ds-text-secondary"
            >
              {`${ORCHESTRATION_UI_COPY.timelineManifestStateLabel} ${timeline.version.manifest_state}. `}
              {timeline.version.season_preset
                ? `${ORCHESTRATION_UI_COPY.timelinePlanningWindowLabel}: ${ORCHESTRATION_SEASON_LABELS[timeline.version.season_preset]}. `
                : ''}
              {`${ORCHESTRATION_UI_COPY.timelineRoadmapVersionPrefix}${timeline.version.roadmap_version}.`}
            </div>
            {timeline.version.plan_horizon ? (
              <div
                role="status"
                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-xs ds-text-secondary"
              >
                {formatTimelineCalendarPlanWindowLine(
                  timeline.version.plan_horizon.start_date,
                  timeline.version.plan_horizon.end_date,
                )}
              </div>
            ) : null}
            {timeline.status === 'ready' &&
            roadmapRevisionDiff &&
            revisionStorySummary &&
            roadmapPackVersion ? (
              <div
                role="region"
                aria-label={cockpitCopy.revisionStoryTitle}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3"
              >
                <h3 className="text-[length:var(--text-xs)] font-semibold text-[var(--text-primary)]">
                  {cockpitCopy.revisionStoryTitle}
                </h3>
                <p className="mt-1 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
                  {`${cockpitCopy.roadmapVersionLabel}: ${roadmapPackVersion} · ${cockpitCopy.roadmapDiffHint} v${roadmapRevisionDiff.from_version}->v${roadmapRevisionDiff.to_version}`}
                </p>
                <p className="mt-2 text-[length:var(--text-sm)] leading-relaxed text-[var(--text-primary)]">
                  {revisionStorySummary}
                </p>
                <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">{cockpitCopy.revisionStoryHint}</p>
                <p className="mt-2 text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
                  {cockpitCopy.roadmapDiffNodesLabel}: {revisionStoryNodesDelta} · {cockpitCopy.roadmapDiffDependenciesLabel}:{' '}
                  {revisionStoryDepsDelta}
                </p>
              </div>
            ) : null}
            {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                <div className="text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineManifestFlowTitle}</div>
                <p className="mt-1 text-xs leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineManifestFlowHint}</p>
                {isClient &&
                APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled &&
                APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled ? (
                  <Button asChild variant="default" size="sm" className="mt-3 no-underline">
                    <Link to={manifestWizardHref}>{PORTAL_MANIFEST_WIZARD_COPY.shortCta}</Link>
                  </Button>
                ) : null}
                {!isClient ? (
                  <Button asChild variant="default" size="sm" className="mt-3 no-underline">
                    <Link to={labManifestFlowHref}>{ORCHESTRATION_UI_COPY.timelineManifestFlowCta}</Link>
                  </Button>
                ) : isClient &&
                  (!APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled || !APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled) ? (
                  <p className="mt-2 text-[length:var(--text-2xs)] ds-text-tertiary">{ORCHESTRATION_UI_COPY.clientTimelineReadOnlyHint}</p>
                ) : null}
                {timeline.version.stale_manifest ? (
                  <p className="mt-2 text-xs font-medium ds-text-score-3">{ORCHESTRATION_UI_COPY.timelineManifestStaleCta}</p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {timeline.seasons.map((season) => (
                <div key={season.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                  <h3 className="mb-2 text-xs font-semibold ds-text-primary">{seasonBucketHeading(season.id)}</h3>
                  <ul className="space-y-1 text-xs ds-text-secondary">
                    {season.node_ids.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {season.node_ids.map((nodeId) => (
                      <li key={nodeId} className="flex flex-wrap items-center gap-1">
                        <span>{readNodeTitle(nodeId)}</span>
                        <OrchestrationTimelineProvenanceBadges {...(nodeProvenanceById.get(nodeId) ?? {})} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.lanesTitle}</div>
              {orderedTimelineLanes.map((lane) => (
                <div key={lane.lane_id} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2">
                  <h3 className="text-xs font-medium ds-text-primary">{ORCHESTRATION_LANE_LABELS[lane.lane_id]}</h3>
                  <ul className="mt-1 list-inside list-disc text-xs ds-text-secondary">
                    {lane.items.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {lane.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-1">
                        <span>{item.title}</span>
                        <OrchestrationTimelineProvenanceBadges
                          source={item.source}
                          analysis_depth={item.analysis_depth}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions7dLabel}</div>
                <ul className="list-inside list-disc text-xs ds-text-secondary">
                  {timeline.top_7d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                  {timeline.top_7d.map((id) => (
                    <li key={`top7-${id}`} className="flex flex-wrap items-center gap-1">
                      <span>{readNodeTitle(id)}</span>
                      <OrchestrationTimelineProvenanceBadges {...(nodeProvenanceById.get(id) ?? {})} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions30dLabel}</div>
                <ul className="list-inside list-disc text-xs ds-text-secondary">
                  {timeline.top_30d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                  {timeline.top_30d.map((id) => (
                    <li key={`top30-${id}`} className="flex flex-wrap items-center gap-1">
                      <span>{readNodeTitle(id)}</span>
                      <OrchestrationTimelineProvenanceBadges {...(nodeProvenanceById.get(id) ?? {})} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {isClient && APP_FEATURE_FLAGS.clientExecutionPackTimelineSurfaceEnabled && timeline.status === 'ready' ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.executionPacksSectionTitle}</div>
                <p className="mb-2 text-[length:var(--text-2xs)] leading-relaxed ds-text-tertiary">
                  {ORCHESTRATION_UI_COPY.executionPacksSectionHint}
                </p>
                {executionPacksQuery.isPending ? (
                  <p className="text-xs ds-text-secondary">{ORCHESTRATION_UI_COPY.previewLoading}</p>
                ) : null}
                {executionPacksQuery.isError ? (
                  <p className="text-[length:var(--text-2xs)] ds-text-tertiary">{ORCHESTRATION_UI_COPY.executionPacksLoadError}</p>
                ) : null}
                {executionPacksQuery.isSuccess ? (
                  <>
                    {executionPackRows.length === 0 ? (
                      <p className="mb-3 text-xs ds-text-secondary">{ORCHESTRATION_UI_COPY.executionPacksEmpty}</p>
                    ) : (
                      <ul className="mb-3 list-inside list-disc space-y-1 text-xs ds-text-secondary">
                        {executionPackRows.map(row => (
                          <li key={row.id}>
                            <span className="font-medium ds-text-primary">{formatAppMediumDateTime(row.created_at)}</span>
                            {' · '}
                            {row.initiative_ids.length} {ORCHESTRATION_UI_COPY.executionPacksRowInitiativesLabel}
                            {row.selected_path_type ? ` · ${row.selected_path_type}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button asChild variant="outline" size="sm" className="no-underline">
                      <Link to={labHref}>{ORCHESTRATION_UI_COPY.executionPacksCtaLab}</Link>
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineBlockingDepsTitle}</div>
                <ul className="list-inside list-disc text-xs ds-text-secondary">
                  {blockingDeps.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
                  {blockingDeps.map((dep, i) => (
                    <li key={`blk-${dep.from}-${dep.to}-${i}`}>{formatDepRow(dep.from, dep.to)}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineParallelTracksTitle}</div>
                <ul className="list-inside list-disc text-xs ds-text-secondary">
                  {parallelTracks.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
                  {parallelTracks.map((dep, i) => (
                    <li key={`par-${dep.from}-${dep.to}-${i}`}>{formatDepRow(dep.from, dep.to)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
              <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineSyncMarkersTitle}</div>
              <p className="mb-2 text-[length:var(--text-2xs)] ds-text-tertiary">{ORCHESTRATION_UI_COPY.dependencyHint}</p>
              <ul className="space-y-2 text-xs ds-text-secondary">
                {crossLaneBlocking.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
                {crossLaneBlocking.map((dep, i) => (
                  <li
                    key={`sync-${dep.from}-${dep.to}-${i}`}
                    className="rounded-md border border-[var(--border-default)] px-3 py-2"
                  >
                    <div className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide ds-text-tertiary">
                      {ORCHESTRATION_UI_COPY.timelineSyncMarkerCrossLane}
                    </div>
                    <div className="mt-1 font-medium ds-text-primary">{formatDepRow(dep.from, dep.to)}</div>
                    <div className="mt-0.5 text-[length:var(--text-2xs)] ds-text-tertiary">{dep.relation}</div>
                  </li>
                ))}
              </ul>
            </div>
            {timeline.data_gaps && (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.dataGapsTitle}</div>
                <ul className="list-inside list-disc text-xs ds-text-secondary">
                  <li>
                    {ORCHESTRATION_UI_COPY.dataGapsMissingConfidenceLabel} {timeline.data_gaps.missing_confidence}
                  </li>
                  <li>
                    {ORCHESTRATION_UI_COPY.dataGapsMissingRiskLabel} {timeline.data_gaps.missing_risk}
                  </li>
                  <li>
                    {ORCHESTRATION_UI_COPY.dataGapsDanglingDependenciesLabel}{' '}
                    {timeline.data_gaps.dangling_dependencies}
                  </li>
                </ul>
              </div>
            )}
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
              <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineWaitingListTitle}</div>
              <ul className="list-inside list-disc text-xs ds-text-secondary">
                {timeline.waiting_list_domains.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                {timeline.waiting_list_domains.map((domain) => (
                  <li key={domain}>{domain}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
