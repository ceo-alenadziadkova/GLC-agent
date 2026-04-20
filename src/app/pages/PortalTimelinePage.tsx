import { Link, useParams } from 'react-router';
import { ArrowsClockwise, FileText, Flask } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { useAudit } from '../hooks/useAudit';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../config/orchestration-roadmap-ui-copy.en';
import { CLIENT_AUDIT_VIEW_COPY } from '../config/client-audit-view-copy';
import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import {
  ORCHESTRATION_LAB_FOCUS_QUERY_KEY,
  ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE,
  ORCHESTRATION_MANIFEST_SETUP_DOM_ID,
} from '../config/orchestration-ui-limits';
import { useProfile } from '../hooks/useProfile';
import { buildAppRoute } from '../config/route-paths';
import { ApiError } from '../data/api-error';
import { api } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';

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
  const laneByNodeId = useMemo(() => {
    const m = new Map<string, OrchestrationLaneId>();
    for (const lane of timeline?.lanes ?? []) {
      for (const item of lane.items) {
        m.set(item.id, item.lane);
      }
    }
    return m;
  }, [timeline?.lanes]);

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

  return (
    <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={ORCHESTRATION_UI_COPY.timelineHint}>
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
            {statusMessage && (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-xs ds-text-secondary">
                {statusMessage}
              </div>
            )}
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
            {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled ? (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                <div className="text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineManifestFlowTitle}</div>
                <p className="mt-1 text-xs leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineManifestFlowHint}</p>
                {!isClient ? (
                  <Button asChild variant="default" size="sm" className="mt-3 no-underline">
                    <Link to={labManifestFlowHref}>{ORCHESTRATION_UI_COPY.timelineManifestFlowCta}</Link>
                  </Button>
                ) : (
                  <p className="mt-2 text-[length:var(--text-2xs)] ds-text-tertiary">{ORCHESTRATION_UI_COPY.clientTimelineReadOnlyHint}</p>
                )}
                {timeline.version.stale_manifest ? (
                  <p className="mt-2 text-xs font-medium ds-text-score-3">{ORCHESTRATION_UI_COPY.timelineManifestStaleCta}</p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {timeline.seasons.map((season) => (
                <div key={season.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                  <div className="mb-2 text-xs font-semibold ds-text-primary">
                    {season.id === 'near'
                      ? ORCHESTRATION_UI_COPY.bucketNear
                      : season.id === 'mid'
                        ? ORCHESTRATION_UI_COPY.bucketMid
                        : ORCHESTRATION_UI_COPY.bucketFar}
                  </div>
                  <ul className="space-y-1 text-xs ds-text-secondary">
                    {season.node_ids.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {season.node_ids.map((nodeId) => (
                      <li key={nodeId}>{readNodeTitle(nodeId)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.lanesTitle}</div>
              {timeline.lanes.map((lane) => (
                <div key={lane.lane_id} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2">
                  <div className="text-xs font-medium ds-text-primary">{ORCHESTRATION_LANE_LABELS[lane.lane_id]}</div>
                  <ul className="mt-1 list-inside list-disc text-xs ds-text-secondary">
                    {lane.items.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {lane.items.map((item) => (
                      <li key={item.id}>
                        {item.title}
                        {item.analysis_depth ? (
                          <span className="ml-1 ds-text-tertiary">
                            [
                            {item.analysis_depth === 'deep'
                              ? ORCHESTRATION_UI_COPY.nodeBadgeDeep
                              : ORCHESTRATION_UI_COPY.nodeBadgeBaseline}
                            ]
                          </span>
                        ) : null}
                        {item.source ? (
                          <span className="ml-1 ds-text-tertiary">
                            [
                            {item.source === 'director'
                              ? ORCHESTRATION_UI_COPY.nodeBadgeDirector
                              : ORCHESTRATION_UI_COPY.nodeBadgeStrategy}
                            ]
                          </span>
                        ) : null}
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
                    <li key={`top7-${id}`}>{readNodeTitle(id)}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
                <div className="mb-1 text-xs font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions30dLabel}</div>
                <ul className="list-inside list-disc text-xs ds-text-secondary">
                  {timeline.top_30d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                  {timeline.top_30d.map((id) => (
                    <li key={`top30-${id}`}>{readNodeTitle(id)}</li>
                  ))}
                </ul>
              </div>
            </div>
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
