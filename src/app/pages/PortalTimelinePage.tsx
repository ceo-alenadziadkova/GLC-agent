import { Link, useParams } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { ArrowsClockwise, DownloadSimple, FileText, Flask } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { laneIdsForOrchestrationDisplayPreset } from '../config/orchestration-client-roadmap-lanes';
import { AppShell } from '../components/AppShell';
import { PortalTimelinePackGraphPanel } from '../components/glc/PortalTimelinePackGraphPanel';
import { Button } from '../components/ui/button';
import { DirectorDeepDiveDialog } from '../components/DirectorDeepDiveDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useIsMobile } from '../components/ui/use-mobile';
import { useAudit } from '../hooks/useAudit';
import {
  formatManifestStateForClient,
  formatTimelineApiStatusSupportLine,
  formatTimelineCalendarPlanWindowLine,
  formatTimelineCalendarPlanWindowLineClient,
  ORCHESTRATION_IA_COPY,
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_LANE_PROMISES,
  ORCHESTRATION_PRIORITY_REASON_CODES,
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
import { useAuthEmail } from '../hooks/useAuthEmail';
import {
  getEffectiveDirectorDeepDiveOnDemandEnabled,
  getEffectiveDirectorSubAgentsEnabled,
  getEffectiveOrchestrationRoadmapNarrativeEnabled,
} from '../config/orchestration-client-feature-gates';
import { buildAppRoute } from '../config/route-paths';
import { ApiError } from '../data/api-error';
import { api } from '../data/apiService';
import type { AuditTimelineDto } from '../data/api/audits-orchestration';

type TimelineLaneItem = AuditTimelineDto['lanes'][number]['items'][number];
import { glcKeys } from '../lib/glc-keys';
import { useOrchestrationReadModel } from '../data/api/use-orchestration-read-model';
import { formatAppMediumDateTime } from '../lib/date-format';
import {
  OrchestrationEvidenceTaxonomyBadges,
  OrchestrationTimelineProvenanceBadges,
  type OrchestrationEvidenceTaxonomy,
} from '../lib/orchestration-node-badges';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { buildOrchestrationRevisionStorySummary } from '../lib/orchestration-revision-story';
import { formatExecutionPackTimelineRequestError } from '../lib/format-execution-pack-timeline-request-error';
import {
  formatLanePairHeadline,
  selectTopCrossLaneBlockingEdges,
} from '../lib/orchestration-lane-pair-narratives';
import type { OrchestrationTimelineStatus } from '../config/orchestration-contract';
import { logger } from '../lib/logger';

const NowNextLaterBoard = lazy(async () => {
  const m = await import('../features/portal-timeline/NowNextLaterBoard');
  return { default: m.NowNextLaterBoard };
});

function formatTimelineLoadError(err: unknown): string | null {
  if (err == null) return null;
  if (err instanceof ApiError) {
    const code = err.code ? ` (${err.code})` : '';
    return `${err.message}${code}`.trim();
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function ConsultantTimelineDiagnostics({
  className,
  timelineStatus,
  manifestState,
}: {
  className?: string;
  timelineStatus: OrchestrationTimelineStatus;
  manifestState: string;
}) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
        {ORCHESTRATION_UI_COPY.timelineConsultantTechnicalSummary}
      </summary>
      <div className="mt-3 space-y-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        <p className="font-mono text-[length:var(--text-2xs)] leading-relaxed">
          {formatTimelineApiStatusSupportLine(timelineStatus)}
        </p>
        <p className="font-mono text-[length:var(--text-2xs)] leading-relaxed">
          {ORCHESTRATION_UI_COPY.timelineManifestStateLabel} {manifestState}
        </p>
      </div>
    </details>
  );
}

function degradedDataGapsFallbackLine(
  code: NonNullable<NonNullable<AuditTimelineDto['data_gaps']>['fallback_reason_code']>,
): string {
  if (code === 'director_slice_missing') return ORCHESTRATION_UI_COPY.timelineDegradedFallbackDirectorMissing;
  if (code === 'director_slice_partial') return ORCHESTRATION_UI_COPY.timelineDegradedFallbackDirectorPartial;
  return ORCHESTRATION_UI_COPY.timelineDegradedFallbackDirectorInvalid;
}

function buildPlanSnapshotLines(timeline: AuditTimelineDto, isClient: boolean): string[] {
  const v = timeline.version;
  const parts: string[] = [];
  parts.push(`${ORCHESTRATION_UI_COPY.timelineRoadmapVersionPrefix.trim()}${v.roadmap_version}`);
  if (v.season_preset) {
    parts.push(ORCHESTRATION_SEASON_LABELS[v.season_preset]);
  }
  parts.push(isClient ? formatManifestStateForClient(v.manifest_state) : `${ORCHESTRATION_UI_COPY.timelineManifestStateLabel} ${v.manifest_state}`);
  return parts;
}

function collectMilestoneNodeRows(
  milestone: { unlocks: string[] },
  top7d: string[],
  top30d: string[],
): Array<{ id: string; bucket: '7d' | '30d' }> {
  const want = new Set(milestone.unlocks);
  const rows: Array<{ id: string; bucket: '7d' | '30d' }> = [];
  for (const x of top7d) {
    if (want.has(x)) rows.push({ id: x, bucket: '7d' });
  }
  for (const x of top30d) {
    if (want.has(x)) rows.push({ id: x, bucket: '30d' });
  }
  return rows;
}

type TopActionItemRowProps = {
  nid: string;
  readNodeTitle: (id: string) => string;
  nodeById: Map<string, TimelineLaneItem>;
  nodeProvenanceById: Map<string, { source?: 'strategy' | 'director'; analysis_depth?: 'baseline' | 'deep' }>;
  evidenceTaxonomyByNodeId: Map<string, OrchestrationEvidenceTaxonomy | undefined>;
  clientTimelinePackOneClickCta: boolean;
  executionPackPendingNodeId: string | null;
  onRequestExecutionPack: (id: string) => void;
  canMarkInitiative: boolean;
  initiativeMarkPendingId: string | null;
  onMarkInitiative: (id: string) => void;
  markBadgeLabel: string;
  isMarkedNextStep: boolean;
  bucketForAria: string;
};

function TopActionItemRow({
  nid,
  readNodeTitle,
  nodeById,
  nodeProvenanceById,
  evidenceTaxonomyByNodeId,
  clientTimelinePackOneClickCta,
  executionPackPendingNodeId,
  onRequestExecutionPack,
  canMarkInitiative,
  initiativeMarkPendingId,
  onMarkInitiative,
  markBadgeLabel,
  isMarkedNextStep,
  bucketForAria,
}: TopActionItemRowProps) {
  return (
    <li className="rounded-md border border-[var(--border-default)] px-2 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <span>{readNodeTitle(nid)}</span>
          {isMarkedNextStep ? (
            <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[length:var(--text-2xs)] font-medium text-[var(--status-success-fg)]">
              {markBadgeLabel}
            </span>
          ) : null}
          <OrchestrationTimelineProvenanceBadges {...(nodeProvenanceById.get(nid) ?? {})} />
          <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(nid)} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canMarkInitiative ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex shrink-0"
              disabled={initiativeMarkPendingId === nid}
              aria-busy={initiativeMarkPendingId === nid}
              onClick={() => void onMarkInitiative(nid)}
            >
              {initiativeMarkPendingId === nid ? (
                <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {initiativeMarkPendingId === nid
                ? ORCHESTRATION_UI_COPY.initiativeMarkNextStepBusy
                : ORCHESTRATION_UI_COPY.initiativeMarkNextStepCta}
            </Button>
          ) : null}
          {clientTimelinePackOneClickCta ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex shrink-0 items-center gap-1"
              disabled={executionPackPendingNodeId === nid}
              aria-busy={executionPackPendingNodeId === nid}
              onClick={() => void onRequestExecutionPack(nid)}
              aria-label={`${ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaAriaLabel} ${readNodeTitle(nid)} (${bucketForAria})`}
            >
              {executionPackPendingNodeId === nid ? (
                <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : null}
              {executionPackPendingNodeId === nid
                ? ORCHESTRATION_UI_COPY.executionPackFromTimelineCtaBusy
                : ORCHESTRATION_UI_COPY.executionPackFromTimelineCta}
            </Button>
          ) : null}
        </div>
      </div>
      {nodeById.get(nid)?.explain ? <TimelineDecisionCard explain={nodeById.get(nid)!.explain!} /> : null}
    </li>
  );
}

function TimelineDecisionCard({
  explain,
}: {
  explain: NonNullable<NonNullable<AuditTimelineDto['lanes'][number]['items'][number]['explain']>>;
}) {
  const hasWhy = (explain.why?.length ?? 0) > 0;
  const hasHow = Boolean(explain.how?.description);
  const hasTime = Boolean(explain.time?.bucket || explain.time?.target_window_days || explain.time?.time_to_value);
  const hasImpact = Boolean(explain.impact?.score != null || explain.impact?.label);
  const hasRisks = (explain.risks?.length ?? 0) > 0;
  if (!hasWhy && !hasHow && !hasTime && !hasImpact && !hasRisks) return null;
  return (
    <details className="mt-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-[var(--text-primary)]">
        {ORCHESTRATION_UI_COPY.timelineDecisionCardSummary}
      </summary>
      {explain.limited_context ? (
        <div className="mt-2 inline-flex items-center rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
          {ORCHESTRATION_UI_COPY.timelineLimitedContextBadge}
        </div>
      ) : null}
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        {hasWhy ? (
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.timelineDecisionWhyLabel}</div>
            <ul className="mt-1 list-disc pl-4">
              {(explain.why ?? []).map((row, idx) => (
                <li key={`why-${idx}`}>{row}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasHow ? (
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.timelineDecisionHowLabel}</div>
            <p>{explain.how?.description}</p>
            {explain.how?.path_type || explain.how?.time_estimate ? (
              <p className="text-[var(--text-tertiary)]">
                {[explain.how?.path_type, explain.how?.time_estimate].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        ) : null}
        {hasTime ? (
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.timelineDecisionTimeLabel}</div>
            <p>
              {[explain.time?.bucket, explain.time?.target_window_days ? `${explain.time.target_window_days}d` : null, explain.time?.time_to_value]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ) : null}
        {hasImpact ? (
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.timelineDecisionImpactLabel}</div>
            <p>{[explain.impact?.label, explain.impact?.score != null ? `score ${explain.impact.score}` : null].filter(Boolean).join(' · ')}</p>
          </div>
        ) : null}
        {hasRisks ? (
          <div>
            <div className="font-semibold text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.timelineDecisionRisksLabel}</div>
            <ul className="mt-1 list-disc pl-4">
              {(explain.risks ?? []).map((row, idx) => (
                <li key={`risk-${idx}`}>{row}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function PortalTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading, error } = useAudit(id);
  const { isClient } = useProfile();
  const userEmail = useAuthEmail();
  const queryClient = useQueryClient();
  const effectiveNarrative = getEffectiveOrchestrationRoadmapNarrativeEnabled(userEmail);
  const effectiveDeepDiveOnDemand = getEffectiveDirectorDeepDiveOnDemandEnabled(userEmail);
  const effectiveDirectorSubAgents = getEffectiveDirectorSubAgentsEnabled(userEmail);
  const [executionPackPendingNodeId, setExecutionPackPendingNodeId] = useState<string | null>(null);
  const [initiativeMarkPendingId, setInitiativeMarkPendingId] = useState<string | null>(null);
  const [lastMarkedNextStepId, setLastMarkedNextStepId] = useState<string | null>(null);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [selectedSubAgentFilter, setSelectedSubAgentFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const auditIdForQuery = id ?? '';
  const timelineQueryEnabled = Boolean(id) && !loading && !error && Boolean(audit);

  const { timelineQuery } = useOrchestrationReadModel(auditIdForQuery, {
    enabled: timelineQueryEnabled,
    includePack: false,
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

  const hasPackForInitiative = useCallback(
    (nodeId: string) => executionPackRows.some((row) => row.initiative_ids.includes(nodeId)),
    [executionPackRows],
  );

  const [executionPackConfirmNodeId, setExecutionPackConfirmNodeId] = useState<string | null>(null);
  const [sprintExportBusy, setSprintExportBusy] = useState(false);

  const packForCrossLaneNarrative = useMemo(() => {
    const raw = audit?.strategy?.glc_orchestration_pack;
    return isGlcOrchestrationPackView(raw) ? raw : null;
  }, [audit?.strategy?.glc_orchestration_pack]);

  const packCrossLaneNarratives = useMemo(() => {
    if (!APP_FEATURE_FLAGS.laneCrossNarrativesEnabled || !packForCrossLaneNarrative) return [];
    return selectTopCrossLaneBlockingEdges(
      packForCrossLaneNarrative,
      ORCHESTRATION_UI_LIMITS.maxCrossLaneNarrativePairs,
    );
  }, [packForCrossLaneNarrative]);

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
  const subAgentFilterOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const lane of orderedTimelineLanes) {
      for (const item of lane.items) {
        if (typeof item.source === 'string' && item.source.startsWith('sub_agent:')) {
          ids.add(item.source.slice('sub_agent:'.length));
        }
      }
    }
    return ['all', ...Array.from(ids)];
  }, [orderedTimelineLanes]);

  const evidenceTaxonomyByNodeId = useMemo(() => {
    const m = new Map<string, OrchestrationEvidenceTaxonomy>();
    const raw = audit?.strategy?.glc_orchestration_pack;
    if (!raw || !isGlcOrchestrationPackView(raw)) return m;
    for (const n of raw.graph.nodes) {
      if (n.evidence_taxonomy) m.set(n.id, n.evidence_taxonomy);
    }
    return m;
  }, [audit?.strategy?.glc_orchestration_pack]);

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
  const isDependencyCardMode = isMobile;
  const nodeTitleById = new Map(
    (timeline?.lanes ?? []).flatMap((lane) => lane.items.map((item) => [item.id, item.title] as const)),
  );
  const nodeById = new Map<string, TimelineLaneItem>(
    (timeline?.lanes ?? []).flatMap((lane) => lane.items.map((item) => [item.id, item] as const)),
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

  const requestExecutionPackFromTimeline = useCallback(
    async (nodeId: string) => {
      if (!id) return;
      setExecutionPackPendingNodeId(nodeId);
      try {
        await api.postStrategyExecutionPack(id, { initiative_ids: [nodeId] });
        await queryClient.invalidateQueries({ queryKey: glcKeys.strategyExecutionPacks.list(id) });
        toast.success(ORCHESTRATION_UI_COPY.executionPackFromTimelineSuccess);
      } catch (e) {
        toast.error(formatExecutionPackTimelineRequestError(e));
      } finally {
        setExecutionPackPendingNodeId(null);
      }
    },
    [id, queryClient],
  );

  const queueExecutionPackFromTimeline = useCallback(
    (nodeId: string) => {
      if (APP_FEATURE_FLAGS.executionPackRepeatFlowEnabled && hasPackForInitiative(nodeId)) {
        setExecutionPackConfirmNodeId(nodeId);
        return;
      }
      void requestExecutionPackFromTimeline(nodeId);
    },
    [hasPackForInitiative, requestExecutionPackFromTimeline],
  );

  const requestMarkAsNextInitiative = useCallback(
    async (actionId: string) => {
      if (!id) return;
      const snap = timeline?.version.latest_manifest_snapshot_id;
      if (!snap) {
        toast.error(ORCHESTRATION_UI_COPY.initiativeMarkNextStepUnavailable);
        return;
      }
      setInitiativeMarkPendingId(actionId);
      try {
        await api.postSelectedInitiative(id, { action_id: actionId });
        setLastMarkedNextStepId(actionId);
        await queryClient.invalidateQueries({ queryKey: glcKeys.timeline.detail(id) });
        await queryClient.invalidateQueries({ queryKey: glcKeys.orchestrationPack.detail(id) });
        await queryClient.invalidateQueries({ queryKey: glcKeys.audit.detail(id) });
        toast.success(ORCHESTRATION_UI_COPY.initiativeMarkNextStepSuccess);
      } catch {
        toast.error(ORCHESTRATION_UI_COPY.initiativeMarkNextStepError);
      } finally {
        setInitiativeMarkPendingId(null);
      }
    },
    [id, queryClient, timeline?.version.latest_manifest_snapshot_id],
  );

  const downloadSprintPlanCsv = useCallback(async () => {
    if (!id) return;
    setSprintExportBusy(true);
    try {
      const csv = await api.downloadOrchestrationSprintExportCsv(id);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sprint-plan-${id.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.sprintExportCsvError);
    } finally {
      setSprintExportBusy(false);
    }
  }, [id]);

  const milestoneTopActionPlan = useMemo(() => {
    if (!timeline) {
      return {
        sections: [] as Array<{
          milestone: NonNullable<NonNullable<AuditTimelineDto['milestones']>[number]>;
          items: ReturnType<typeof collectMilestoneNodeRows>;
        }>,
        other7d: [] as string[],
        other30d: [] as string[],
        useMilestoneTranches: false,
      };
    }
    if (!effectiveNarrative || !timeline.milestones?.length) {
      return {
        sections: [],
        other7d: timeline.top_7d,
        other30d: timeline.top_30d,
        useMilestoneTranches: false,
      };
    }
    const used = new Set<string>();
    const sections: Array<{
      milestone: NonNullable<NonNullable<AuditTimelineDto['milestones']>[number]>;
      items: ReturnType<typeof collectMilestoneNodeRows>;
    }> = [];
    for (const m of timeline.milestones) {
      const itemRows = collectMilestoneNodeRows(m, timeline.top_7d, timeline.top_30d);
      for (const { id: xid } of itemRows) used.add(xid);
      if (itemRows.length > 0) sections.push({ milestone: m, items: itemRows });
    }
    return {
      sections,
      other7d: timeline.top_7d.filter((x) => !used.has(x)),
      other30d: timeline.top_30d.filter((x) => !used.has(x)),
      useMilestoneTranches: true,
    };
  }, [timeline, effectiveNarrative]);

  const readNodeTitle = (nodeId: string): string => nodeTitleById.get(nodeId) ?? nodeId;
  const readLaneLabel = (nodeId: string): string | null => {
    const lid = laneByNodeId.get(nodeId);
    return lid ? ORCHESTRATION_LANE_LABELS[lid] : null;
  };
  const filteredTimelineLanes = useMemo(() => {
    if (selectedSubAgentFilter === 'all') return orderedTimelineLanes;
    return orderedTimelineLanes.map((lane) => ({
      ...lane,
      items: lane.items.filter((item) => item.source === `sub_agent:${selectedSubAgentFilter}`),
    }));
  }, [orderedTimelineLanes, selectedSubAgentFilter]);
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

  const manifestSetupIdProps = useMemo(() => {
    if (!timeline) return {};
    if (timeline.status === 'ready') {
      return { id: ORCHESTRATION_MANIFEST_SETUP_DOM_ID as string };
    }
    if (timeline.status === 'missing_pack' || timeline.status === 'stale_manifest') {
      return { id: ORCHESTRATION_MANIFEST_SETUP_DOM_ID as string };
    }
    return {};
  }, [timeline]);

  if (!id) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.page.missingId}>
        <div className="glc-page-content mx-auto max-w-3xl text-sm ds-text-score-1">{CLIENT_AUDIT_VIEW_COPY.page.missingId}</div>
      </AppShell>
    );
  }

  const reportHref = isClient ? buildAppRoute.portalReports(id) : buildAppRoute.reports(id);
  const labHref = isClient ? buildAppRoute.portalStrategy(id) : buildAppRoute.strategy(id);
  const roadmapHref = isClient ? buildAppRoute.portalRoadmap(id) : buildAppRoute.roadmap(id);
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
  const rawOrchestrationPack = audit.strategy?.glc_orchestration_pack;
  const portalOrchestrationPack = isGlcOrchestrationPackView(rawOrchestrationPack) ? rawOrchestrationPack : null;
  const clientTimelinePackOneClickCta =
    timeline != null &&
    isClient &&
    APP_FEATURE_FLAGS.clientExecutionPackTimelineSurfaceEnabled &&
    timeline.status === 'ready';

  let planSnapshotCard: ReactNode = null;
  if (timeline && Object.keys(manifestSetupIdProps).length === 0) {
    planSnapshotCard = (
      <div
        id={ORCHESTRATION_MANIFEST_SETUP_DOM_ID}
        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-4 text-sm leading-relaxed ds-text-secondary scroll-mt-6"
      >
        <div className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.portalTimelinePlanSnapshotTitle}</div>
        <p className="mt-2">{buildPlanSnapshotLines(timeline, isClient).join(' · ')}</p>
        {timeline.version.plan_horizon ? (
          <p className="mt-2 text-sm ds-text-secondary">
            {isClient
              ? formatTimelineCalendarPlanWindowLineClient(
                  timeline.version.plan_horizon.start_date,
                  timeline.version.plan_horizon.end_date,
                )
              : formatTimelineCalendarPlanWindowLine(
                  timeline.version.plan_horizon.start_date,
                  timeline.version.plan_horizon.end_date,
                )}
          </p>
        ) : null}
        {!isClient ? (
          <ConsultantTimelineDiagnostics
            className="mt-3"
            timelineStatus={timeline.status}
            manifestState={timeline.version.manifest_state}
          />
        ) : null}
      </div>
    );
  }

  const seasonsAllEmpty = Boolean(
    timeline && timeline.seasons.length > 0 && timeline.seasons.every((s) => s.node_ids.length === 0),
  );
  const hasLaneWorkstreamItems = Boolean(timeline?.lanes.some((l) => l.items.length > 0));
  const showDegradedEmptyBucketHint =
    timeline?.status === 'degraded' && seasonsAllEmpty && hasLaneWorkstreamItems;

  const canClientMarkInitiative =
    isClient &&
    effectiveNarrative &&
    Boolean(
      timeline &&
        timeline.status === 'ready' &&
        timeline.version.latest_manifest_snapshot_id,
    );

  const topActionsBlock = timeline ? (
    <div id="portal-timeline-priorities" className="space-y-3 scroll-mt-8" data-testid="portal-timeline-top-actions">
      {effectiveNarrative && (timeline.top_priorities?.length ?? 0) > 0 ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
          <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topPriorityReasonLabel}</div>
          <ul className="space-y-2 text-sm ds-text-secondary">
            {(timeline.top_priorities ?? []).map((item) => (
              <li key={`${item.bucket}-${item.action_id}`} className="rounded-md border border-[var(--border-default)] px-3 py-2">
                <span className="font-medium ds-text-primary">{readNodeTitle(item.action_id)}</span>
                <span className="ml-2 text-xs ds-text-tertiary">
                  {ORCHESTRATION_PRIORITY_REASON_CODES[item.reason_code] ?? item.reason_code}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {clientTimelinePackOneClickCta ? (
        <p className="text-sm leading-relaxed ds-text-tertiary">{ORCHESTRATION_UI_COPY.executionPackFromTopActionsHint}</p>
      ) : null}
      {milestoneTopActionPlan.useMilestoneTranches && milestoneTopActionPlan.sections.length > 0 ? (
        <div className="space-y-5">
          {milestoneTopActionPlan.sections.map(({ milestone: m, items }) => (
            <section
              key={m.id}
              id={`timeline-milestone-${m.id}`}
              className="scroll-mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)]/50 p-4"
            >
              <h3 className="text-sm font-semibold ds-text-primary">{m.label}</h3>
              <p className="mt-1 text-xs leading-relaxed ds-text-tertiary">
                {ORCHESTRATION_UI_COPY.milestoneUnlocksLabel}: {items.map((r) => readNodeTitle(r.id)).join(' · ')} · {m.target_window_days}d
              </p>
              <ul className="mt-2 list-none space-y-3 text-sm leading-relaxed ds-text-secondary">
                {items.map((row) => (
                  <TopActionItemRow
                    key={`ms-${m.id}-${row.id}-${row.bucket}`}
                    nid={row.id}
                    readNodeTitle={readNodeTitle}
                    nodeById={nodeById}
                    nodeProvenanceById={nodeProvenanceById}
                    evidenceTaxonomyByNodeId={evidenceTaxonomyByNodeId}
                    clientTimelinePackOneClickCta={clientTimelinePackOneClickCta}
                    executionPackPendingNodeId={executionPackPendingNodeId}
                    onRequestExecutionPack={queueExecutionPackFromTimeline}
                    canMarkInitiative={canClientMarkInitiative}
                    initiativeMarkPendingId={initiativeMarkPendingId}
                    onMarkInitiative={requestMarkAsNextInitiative}
                    markBadgeLabel={CLIENT_AUDIT_VIEW_COPY.cockpit.nextInPlanBadge}
                    isMarkedNextStep={lastMarkedNextStepId === row.id}
                    bucketForAria={row.bucket === '7d' ? ORCHESTRATION_UI_COPY.topActions7dLabel : ORCHESTRATION_UI_COPY.topActions30dLabel}
                  />
                ))}
              </ul>
            </section>
          ))}
          {milestoneTopActionPlan.other7d.length > 0 || milestoneTopActionPlan.other30d.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActionsTitle}</h3>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                  <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions7dLabel}</div>
                  <ul className="list-none space-y-3 text-sm leading-relaxed ds-text-secondary">
                    {milestoneTopActionPlan.other7d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {milestoneTopActionPlan.other7d.map((nid) => (
                      <TopActionItemRow
                        key={`oth7-${nid}`}
                        nid={nid}
                        readNodeTitle={readNodeTitle}
                        nodeById={nodeById}
                        nodeProvenanceById={nodeProvenanceById}
                        evidenceTaxonomyByNodeId={evidenceTaxonomyByNodeId}
                        clientTimelinePackOneClickCta={clientTimelinePackOneClickCta}
                        executionPackPendingNodeId={executionPackPendingNodeId}
                        onRequestExecutionPack={queueExecutionPackFromTimeline}
                        canMarkInitiative={canClientMarkInitiative}
                        initiativeMarkPendingId={initiativeMarkPendingId}
                        onMarkInitiative={requestMarkAsNextInitiative}
                        markBadgeLabel={CLIENT_AUDIT_VIEW_COPY.cockpit.nextInPlanBadge}
                        isMarkedNextStep={lastMarkedNextStepId === nid}
                        bucketForAria={ORCHESTRATION_UI_COPY.topActions7dLabel}
                      />
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                  <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions30dLabel}</div>
                  <ul className="list-none space-y-3 text-sm leading-relaxed ds-text-secondary">
                    {milestoneTopActionPlan.other30d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {milestoneTopActionPlan.other30d.map((nid) => (
                      <TopActionItemRow
                        key={`oth30-${nid}`}
                        nid={nid}
                        readNodeTitle={readNodeTitle}
                        nodeById={nodeById}
                        nodeProvenanceById={nodeProvenanceById}
                        evidenceTaxonomyByNodeId={evidenceTaxonomyByNodeId}
                        clientTimelinePackOneClickCta={clientTimelinePackOneClickCta}
                        executionPackPendingNodeId={executionPackPendingNodeId}
                        onRequestExecutionPack={queueExecutionPackFromTimeline}
                        canMarkInitiative={canClientMarkInitiative}
                        initiativeMarkPendingId={initiativeMarkPendingId}
                        onMarkInitiative={requestMarkAsNextInitiative}
                        markBadgeLabel={CLIENT_AUDIT_VIEW_COPY.cockpit.nextInPlanBadge}
                        isMarkedNextStep={lastMarkedNextStepId === nid}
                        bucketForAria={ORCHESTRATION_UI_COPY.topActions30dLabel}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
            <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions7dLabel}</div>
            <ul className="list-none space-y-3 text-sm leading-relaxed ds-text-secondary">
              {timeline.top_7d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
              {timeline.top_7d.map((nid) => (
                <TopActionItemRow
                  key={`top7-${nid}`}
                  nid={nid}
                  readNodeTitle={readNodeTitle}
                  nodeById={nodeById}
                  nodeProvenanceById={nodeProvenanceById}
                  evidenceTaxonomyByNodeId={evidenceTaxonomyByNodeId}
                  clientTimelinePackOneClickCta={clientTimelinePackOneClickCta}
                  executionPackPendingNodeId={executionPackPendingNodeId}
                  onRequestExecutionPack={queueExecutionPackFromTimeline}
                  canMarkInitiative={canClientMarkInitiative}
                  initiativeMarkPendingId={initiativeMarkPendingId}
                  onMarkInitiative={requestMarkAsNextInitiative}
                  markBadgeLabel={CLIENT_AUDIT_VIEW_COPY.cockpit.nextInPlanBadge}
                  isMarkedNextStep={lastMarkedNextStepId === nid}
                  bucketForAria={ORCHESTRATION_UI_COPY.topActions7dLabel}
                />
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
            <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.topActions30dLabel}</div>
            <ul className="list-none space-y-3 text-sm leading-relaxed ds-text-secondary">
              {timeline.top_30d.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
              {timeline.top_30d.map((nid) => (
                <TopActionItemRow
                  key={`top30-${nid}`}
                  nid={nid}
                  readNodeTitle={readNodeTitle}
                  nodeById={nodeById}
                  nodeProvenanceById={nodeProvenanceById}
                  evidenceTaxonomyByNodeId={evidenceTaxonomyByNodeId}
                  clientTimelinePackOneClickCta={clientTimelinePackOneClickCta}
                  executionPackPendingNodeId={executionPackPendingNodeId}
                  onRequestExecutionPack={queueExecutionPackFromTimeline}
                  canMarkInitiative={canClientMarkInitiative}
                  initiativeMarkPendingId={initiativeMarkPendingId}
                  onMarkInitiative={requestMarkAsNextInitiative}
                  markBadgeLabel={CLIENT_AUDIT_VIEW_COPY.cockpit.nextInPlanBadge}
                  isMarkedNextStep={lastMarkedNextStepId === nid}
                  bucketForAria={ORCHESTRATION_UI_COPY.topActions30dLabel}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={timelinePageSubtitle}>
      <div className="mx-auto max-w-3xl space-y-6 ds-pattern-page-shell-body">
        <div className="space-y-3">
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
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={roadmapHref}>{'Roadmap schedule'}</Link>
            </Button>
          </div>
          {timeline && timeline.status !== 'missing_pack' && !timelineQuery.isPending && !timelineQuery.error ? (
            <p className="text-sm leading-relaxed text-[var(--text-tertiary)] px-1">{ORCHESTRATION_UI_COPY.timelineExecutionRealismNote}</p>
          ) : null}
        </div>
        {timelineQuery.isPending && (
          <div className="flex h-40 items-center justify-center">
            <ArrowsClockwise className="h-5 w-5 animate-spin ds-text-brand" />
          </div>
        )}
        {timelineQuery.error && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--ui-danger-border-20)] bg-[var(--ui-danger-muted-bg)] px-4 py-3 text-sm text-[var(--ui-danger-fg-strong)]"
          >
            <div className="font-medium">{ORCHESTRATION_UI_COPY.timelineLoadFailed}</div>
            {timelineErrorDetail ? (
              <p className="mt-2 text-sm leading-relaxed opacity-90">{timelineErrorDetail}</p>
            ) : null}
          </div>
        )}
        {timeline && (
          <>
            {statusMessage && (timeline.status === 'missing_pack' || timeline.status === 'stale_manifest') ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-5 scroll-mt-6"
                {...manifestSetupIdProps}
              >
                <h2 className="text-base font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineEmptyCalloutTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed ds-text-secondary">{statusMessage}</p>
                {timeline.status === 'missing_pack' && isClient ? (
                  <p className="mt-3 text-sm leading-relaxed ds-text-secondary">
                    {ORCHESTRATION_UI_COPY.timelineEmptyCalloutClientHint}
                  </p>
                ) : null}
                {timeline.status === 'stale_manifest' && isClient ? (
                  <p className="mt-3 text-sm leading-relaxed ds-text-secondary">
                    {ORCHESTRATION_UI_COPY.timelineStaleManifestClientHint}
                  </p>
                ) : null}
                {!isClient ? (
                  <ConsultantTimelineDiagnostics
                    className="mt-4"
                    timelineStatus={timeline.status}
                    manifestState={timeline.version.manifest_state}
                  />
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {effectiveDeepDiveOnDemand ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setDeepDiveOpen(true)}>
                      {ORCHESTRATION_UI_COPY.deepDiveCta}
                    </Button>
                  ) : null}
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
                  <p className="mt-4 text-sm font-medium ds-text-score-3">{ORCHESTRATION_UI_COPY.timelineManifestStaleCta}</p>
                ) : null}
              </div>
            ) : null}
            {timeline && timeline.status === 'degraded' ? (
              <div
                role="status"
                aria-live="polite"
                className="scroll-mt-6 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-5"
              >
                <h2 className="text-base font-semibold ds-text-primary">
                  {ORCHESTRATION_UI_COPY.timelineStateDegradedTitle}
                </h2>
                <p className="mt-3 text-sm leading-relaxed ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.timelineStateDegradedLead}
                </p>
                {timeline.data_gaps ? (
                  <div className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      {ORCHESTRATION_UI_COPY.timelineDegradedDataGapsSectionTitle}
                    </div>
                    <ul className="mt-2 list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed ds-text-secondary">
                      {timeline.data_gaps.fallback_reason_code ? (
                        <li>{degradedDataGapsFallbackLine(timeline.data_gaps.fallback_reason_code)}</li>
                      ) : null}
                      <li>
                        {ORCHESTRATION_UI_COPY.dataGapsMissingConfidenceLabel} {timeline.data_gaps.missing_confidence}
                      </li>
                      <li>
                        {ORCHESTRATION_UI_COPY.dataGapsMissingRiskLabel} {timeline.data_gaps.missing_risk}
                      </li>
                      <li>
                        {ORCHESTRATION_UI_COPY.dataGapsDanglingDependenciesLabel} {timeline.data_gaps.dangling_dependencies}
                      </li>
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed ds-text-tertiary">{ORCHESTRATION_UI_COPY.timelineStateDegraded}</p>
                )}
                {showDegradedEmptyBucketHint ? (
                  <p className="mt-4 text-sm leading-relaxed ds-text-tertiary">
                    {ORCHESTRATION_UI_COPY.timelineDegradedEmptySeasonBucketsHint}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!isClient ? (
                    <Button asChild variant="default" size="sm" className="no-underline">
                      <Link to={labManifestFlowHref}>{ORCHESTRATION_UI_COPY.timelineManifestFlowCta}</Link>
                    </Button>
                  ) : APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled && APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled ? (
                    <Button asChild variant="default" size="sm" className="no-underline">
                      <Link to={manifestWizardHref}>{PORTAL_MANIFEST_WIZARD_COPY.shortCta}</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline" size="sm" className="no-underline">
                    <Link to={reportHref}>{ORCHESTRATION_UI_COPY.timelineEmptyCtaOpenReport}</Link>
                  </Button>
                </div>
                {!isClient ? (
                  <ConsultantTimelineDiagnostics
                    className="mt-4"
                    timelineStatus={timeline.status}
                    manifestState={timeline.version.manifest_state}
                  />
                ) : null}
              </div>
            ) : null}
            {statusMessage && timeline && timeline.status === 'restricted_client_view' ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-4 text-sm leading-relaxed ds-text-secondary"
              >
                <p>{statusMessage}</p>
                {!isClient ? (
                  <ConsultantTimelineDiagnostics
                    className="mt-3"
                    timelineStatus={timeline.status}
                    manifestState={timeline.version.manifest_state}
                  />
                ) : null}
              </div>
            ) : null}
            {timeline.status === 'ready' ? (
              <section
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-5 py-5 scroll-mt-6"
                aria-labelledby="portal-timeline-hero-title"
                {...manifestSetupIdProps}
              >
                <h2 id="portal-timeline-hero-title" className="text-base font-semibold tracking-tight ds-text-primary">
                  {ORCHESTRATION_UI_COPY.portalTimelineHeroTitle}
                </h2>
                <p className="mt-3 text-sm leading-relaxed ds-text-secondary">
                  {isClient ? ORCHESTRATION_UI_COPY.timelineNextStepReadyClient : ORCHESTRATION_UI_COPY.timelineNextStepReadyConsultant}
                </p>
                <p className="mt-4 text-sm leading-relaxed ds-text-tertiary">{buildPlanSnapshotLines(timeline, isClient).join(' · ')}</p>
                {timeline.version.plan_horizon ? (
                  <p className="mt-2 text-sm leading-relaxed ds-text-secondary">
                    {isClient
                      ? formatTimelineCalendarPlanWindowLineClient(
                          timeline.version.plan_horizon.start_date,
                          timeline.version.plan_horizon.end_date,
                        )
                      : formatTimelineCalendarPlanWindowLine(
                          timeline.version.plan_horizon.start_date,
                          timeline.version.plan_horizon.end_date,
                        )}
                  </p>
                ) : null}
                {!isClient ? (
                  <ConsultantTimelineDiagnostics
                    className="mt-4"
                    timelineStatus={timeline.status}
                    manifestState={timeline.version.manifest_state}
                  />
                ) : null}
              </section>
            ) : null}

            <Tabs
              defaultValue="overview"
              className="gap-4"
              onValueChange={value => {
                if (value === 'nowNextLater' && APP_FEATURE_FLAGS.nowNextLaterBoardEnabled) {
                  logger.info('orchestration.now_next_later.tab_selected', { tab: value });
                }
              }}
            >
              <p id="timeline-tabs-description" className="sr-only">
                Use Arrow keys to move between timeline sections.
              </p>
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:flex-nowrap">
                <TabsTrigger aria-describedby="timeline-tabs-description" value="overview">
                  {ORCHESTRATION_UI_COPY.portalTimelineTabOverview}
                </TabsTrigger>
                <TabsTrigger aria-describedby="timeline-tabs-description" value="workstreams">
                  {ORCHESTRATION_UI_COPY.portalTimelineTabWorkstreams}
                </TabsTrigger>
                <TabsTrigger aria-describedby="timeline-tabs-description" value="dependencies">
                  {ORCHESTRATION_UI_COPY.portalTimelineTabDependencies}
                </TabsTrigger>
                <TabsTrigger aria-describedby="timeline-tabs-description" value="planmap">
                  {ORCHESTRATION_UI_COPY.portalTimelineTabPlanMap}
                </TabsTrigger>
                {APP_FEATURE_FLAGS.nowNextLaterBoardEnabled && portalOrchestrationPack ? (
                  <TabsTrigger aria-describedby="timeline-tabs-description" value="nowNextLater" data-testid="nnl-tab">
                    {ORCHESTRATION_UI_COPY.portalTimelineTabNowNextLater}
                  </TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-6 outline-none" forceMount>
                {planSnapshotCard}
                {timeline.status === 'ready' &&
                roadmapRevisionDiff &&
                revisionStorySummary &&
                roadmapPackVersion ? (
                  <div
                    role="region"
                    aria-label={cockpitCopy.revisionStoryTitle}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-4"
                  >
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{cockpitCopy.revisionStoryTitle}</h3>
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      {`${cockpitCopy.roadmapVersionLabel}: ${roadmapPackVersion} · ${cockpitCopy.roadmapDiffHint} v${roadmapRevisionDiff.from_version}->v${roadmapRevisionDiff.to_version}`}
                    </p>
                    <p className="mt-3 text-base leading-relaxed text-[var(--text-primary)]">{revisionStorySummary}</p>
                    <p className="mt-3 text-sm text-[var(--text-tertiary)]">{cockpitCopy.revisionStoryHint}</p>
                    <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                      {cockpitCopy.roadmapDiffNodesLabel}: {revisionStoryNodesDelta} · {cockpitCopy.roadmapDiffDependenciesLabel}:{' '}
                      {revisionStoryDepsDelta}
                    </p>
                  </div>
                ) : null}
                {APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled ? (
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineManifestFlowTitle}</div>
                    <p className="mt-2 text-sm leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineManifestFlowHint}</p>
                    {isClient &&
                    APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled &&
                    APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled ? (
                      <Button asChild variant="default" size="sm" className="mt-4 no-underline">
                        <Link to={manifestWizardHref}>{PORTAL_MANIFEST_WIZARD_COPY.shortCta}</Link>
                      </Button>
                    ) : null}
                    {!isClient ? (
                      <Button asChild variant="default" size="sm" className="mt-4 no-underline">
                        <Link to={labManifestFlowHref}>{ORCHESTRATION_UI_COPY.timelineManifestFlowCta}</Link>
                      </Button>
                    ) : isClient &&
                      (!APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled || !APP_FEATURE_FLAGS.clientRoadmapManifestWizardEnabled) ? (
                      <p className="mt-3 text-sm ds-text-tertiary">{ORCHESTRATION_UI_COPY.clientTimelineReadOnlyHint}</p>
                    ) : null}
                    {timeline.version.stale_manifest ? (
                      <p className="mt-3 text-sm font-medium ds-text-score-3">{ORCHESTRATION_UI_COPY.timelineManifestStaleCta}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-3">
                  {timeline.seasons.map((season) => (
                    <div key={season.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                      <h3 className="mb-3 text-sm font-semibold ds-text-primary">{seasonBucketHeading(season.id)}</h3>
                      <ul className="space-y-2 text-sm leading-relaxed ds-text-secondary">
                        {season.node_ids.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                        {season.node_ids.map((nodeId) => (
                          <li key={nodeId} className="rounded-md border border-[var(--border-default)] px-2 py-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <span>{readNodeTitle(nodeId)}</span>
                              <OrchestrationTimelineProvenanceBadges {...(nodeProvenanceById.get(nodeId) ?? {})} />
                              <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(nodeId)} />
                            </div>
                            {nodeById.get(nodeId)?.explain ? (
                              <TimelineDecisionCard explain={nodeById.get(nodeId)!.explain!} />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {effectiveNarrative &&
                (timeline.milestones?.length ?? 0) > 0 &&
                !milestoneTopActionPlan.useMilestoneTranches ? (
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <h3 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineMilestonesTitle}</h3>
                    <ul className="mt-2 space-y-2 text-sm ds-text-secondary">
                      {(timeline.milestones ?? []).map((milestone) => (
                        <li key={milestone.id} className="rounded-md border border-[var(--border-default)] px-3 py-2">
                          <div className="font-medium ds-text-primary">{milestone.label}</div>
                          <div className="text-xs ds-text-tertiary">{milestone.target_window_days}d</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {topActionsBlock}
                {clientTimelinePackOneClickCta ? (
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.executionPacksSectionTitle}</div>
                    <p className="mb-3 text-sm leading-relaxed ds-text-tertiary">{ORCHESTRATION_UI_COPY.executionPacksSectionHint}</p>
                    {executionPacksQuery.isPending ? (
                      <p className="text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.previewLoading}</p>
                    ) : null}
                    {executionPacksQuery.isError ? (
                      <p className="text-sm ds-text-tertiary">{ORCHESTRATION_UI_COPY.executionPacksLoadError}</p>
                    ) : null}
                    {executionPacksQuery.isSuccess ? (
                      <>
                        {executionPackRows.length === 0 ? (
                          <p className="mb-3 text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.executionPacksEmpty}</p>
                        ) : (
                          <ul className="mb-4 list-inside list-disc space-y-2 text-sm ds-text-secondary">
                            {executionPackRows.map((row) => (
                              <li key={row.id}>
                                <span className="font-medium ds-text-primary">{formatAppMediumDateTime(row.created_at)}</span>
                                {' · '}
                                {row.initiative_ids.length} {ORCHESTRATION_UI_COPY.executionPacksRowInitiativesLabel}
                                {row.selected_path_type ? ` · ${row.selected_path_type}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm" className="no-underline">
                            <Link to={labHref}>{ORCHESTRATION_UI_COPY.executionPacksCtaLab}</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={sprintExportBusy}
                            onClick={() => void downloadSprintPlanCsv()}
                            className="inline-flex items-center gap-1.5"
                          >
                            {sprintExportBusy ? (
                              <ArrowsClockwise className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <DownloadSimple className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            )}
                            {sprintExportBusy
                              ? ORCHESTRATION_UI_COPY.sprintExportCsvBusy
                              : ORCHESTRATION_UI_COPY.sprintExportCsvCta}
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="workstreams" className="mt-4 space-y-4 outline-none">
                {subAgentFilterOptions.length > 1 ? (
                  <label className="flex flex-col gap-1 text-sm ds-text-secondary">
                    <span className="font-medium ds-text-primary">{ORCHESTRATION_UI_COPY.timelineSubAgentFilterLabel}</span>
                    <select
                      className="w-full max-w-sm rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
                      value={selectedSubAgentFilter}
                      onChange={(event) => setSelectedSubAgentFilter(event.target.value)}
                    >
                      <option value="all">{ORCHESTRATION_UI_COPY.timelineSubAgentFilterAll}</option>
                      {subAgentFilterOptions
                        .filter((id) => id !== 'all')
                        .map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.lanesTitle}</div>
                  {filteredTimelineLanes.map((lane) => (
                    <div key={lane.lane_id} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3">
                      <h3 className="text-sm font-medium ds-text-primary">{ORCHESTRATION_LANE_LABELS[lane.lane_id]}</h3>
                      {effectiveNarrative ? (
                        <p className="mt-1 text-xs ds-text-tertiary">{ORCHESTRATION_LANE_PROMISES[lane.lane_id]}</p>
                      ) : null}
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed ds-text-secondary">
                        {lane.items.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                        {lane.items.map((item) => (
                          <li key={item.id} className="flex flex-wrap items-center gap-1">
                            <span>{item.title}</span>
                            <OrchestrationTimelineProvenanceBadges source={item.source} analysis_depth={item.analysis_depth} />
                            <OrchestrationEvidenceTaxonomyBadges taxonomy={evidenceTaxonomyByNodeId.get(item.id)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="dependencies" className="mt-4 space-y-6 outline-none">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineBlockingDepsTitle}</div>
                    {isDependencyCardMode ? (
                      <div className="space-y-2">
                        {blockingDeps.length === 0 ? (
                          <p className="text-sm leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineNoDeps}</p>
                        ) : (
                          blockingDeps
                            .slice(0, ORCHESTRATION_UI_LIMITS.timelineDependencyCardsPerSectionMobile)
                            .map((dep, i) => (
                              <article
                                key={`blk-${dep.from}-${dep.to}-${i}`}
                                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm leading-relaxed ds-text-secondary"
                              >
                                {formatDepRow(dep.from, dep.to)}
                              </article>
                            ))
                        )}
                      </div>
                    ) : (
                      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed ds-text-secondary">
                        {blockingDeps.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
                        {blockingDeps.map((dep, i) => (
                          <li key={`blk-${dep.from}-${dep.to}-${i}`}>{formatDepRow(dep.from, dep.to)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineParallelTracksTitle}</div>
                    {isDependencyCardMode ? (
                      <div className="space-y-2">
                        {parallelTracks.length === 0 ? (
                          <p className="text-sm leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineNoDeps}</p>
                        ) : (
                          parallelTracks
                            .slice(0, ORCHESTRATION_UI_LIMITS.timelineDependencyCardsPerSectionMobile)
                            .map((dep, i) => (
                              <article
                                key={`par-${dep.from}-${dep.to}-${i}`}
                                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm leading-relaxed ds-text-secondary"
                              >
                                {formatDepRow(dep.from, dep.to)}
                              </article>
                            ))
                        )}
                      </div>
                    ) : (
                      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed ds-text-secondary">
                        {parallelTracks.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
                        {parallelTracks.map((dep, i) => (
                          <li key={`par-${dep.from}-${dep.to}-${i}`}>{formatDepRow(dep.from, dep.to)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                  <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineSyncMarkersTitle}</div>
                  <p className="mb-3 text-sm leading-relaxed ds-text-tertiary">{ORCHESTRATION_UI_COPY.dependencyHint}</p>
                  {crossLaneBlocking.length > 0 ? (
                    <div className="mb-4 rounded-lg border border-[var(--border-default)] px-4 py-3">
                      <div className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineCrossLaneNarrativeTitle}</div>
                      <p className="mt-2 text-sm leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineCrossLaneNarrativeBody}</p>
                    </div>
                  ) : null}
                  {packForCrossLaneNarrative && packCrossLaneNarratives.length > 0
                    ? packCrossLaneNarratives.map((row, idx) => (
                        <div
                          key={`pair-${row.from}-${row.to}-${idx}`}
                          className="mb-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-4 py-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide ds-text-tertiary">
                            {formatLanePairHeadline(packForCrossLaneNarrative, row.from, row.to)}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed ds-text-secondary">{row.line}</p>
                        </div>
                      ))
                    : null}
                  {isDependencyCardMode ? (
                    <div className="space-y-2">
                      {crossLaneBlocking.length === 0 ? (
                        <p className="text-sm leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelineNoDeps}</p>
                      ) : (
                        crossLaneBlocking.map((dep, i) => (
                          <article
                            key={`sync-${dep.from}-${dep.to}-${i}`}
                            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2 text-sm leading-relaxed ds-text-secondary"
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide ds-text-tertiary">
                              {ORCHESTRATION_UI_COPY.timelineSyncMarkerCrossLane}
                            </div>
                            <div className="mt-2 font-medium ds-text-primary">{formatDepRow(dep.from, dep.to)}</div>
                            <div className="mt-1 text-xs ds-text-tertiary">{dep.relation}</div>
                          </article>
                        ))
                      )}
                    </div>
                  ) : (
                    <ul className="space-y-3 text-sm leading-relaxed ds-text-secondary">
                      {crossLaneBlocking.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineNoDeps}</li>}
                      {crossLaneBlocking.map((dep, i) => (
                        <li key={`sync-${dep.from}-${dep.to}-${i}`} className="rounded-lg border border-[var(--border-default)] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide ds-text-tertiary">
                            {ORCHESTRATION_UI_COPY.timelineSyncMarkerCrossLane}
                          </div>
                          <div className="mt-2 font-medium ds-text-primary">{formatDepRow(dep.from, dep.to)}</div>
                          <div className="mt-1 text-xs ds-text-tertiary">{dep.relation}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="planmap" className="mt-4 space-y-6 outline-none">
                {portalOrchestrationPack && (timeline.status === 'ready' || timeline.status === 'degraded') ? (
                  <>
                    {timeline.status === 'degraded' ? (
                      <p className="text-sm leading-relaxed ds-text-secondary">{ORCHESTRATION_UI_COPY.timelinePlanMapDegradedNote}</p>
                    ) : null}
                    <PortalTimelinePackGraphPanel pack={portalOrchestrationPack} />
                  </>
                ) : (
                  <p className="text-sm ds-text-secondary">{ORCHESTRATION_UI_COPY.timelinePlanMapUnavailableHint}</p>
                )}
                {timeline.data_gaps && (
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.dataGapsTitle}</div>
                    <ul className="list-inside list-disc space-y-2 text-sm ds-text-secondary">
                      <li>
                        {ORCHESTRATION_UI_COPY.dataGapsMissingConfidenceLabel} {timeline.data_gaps.missing_confidence}
                      </li>
                      <li>
                        {ORCHESTRATION_UI_COPY.dataGapsMissingRiskLabel} {timeline.data_gaps.missing_risk}
                      </li>
                      <li>
                        {ORCHESTRATION_UI_COPY.dataGapsDanglingDependenciesLabel} {timeline.data_gaps.dangling_dependencies}
                      </li>
                    </ul>
                  </div>
                )}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                  <div className="mb-2 text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.timelineWaitingListTitle}</div>
                  <ul className="list-inside list-disc space-y-2 text-sm ds-text-secondary">
                    {timeline.waiting_list_domains.length === 0 && <li>{ORCHESTRATION_UI_COPY.timelineEmptyListMarker}</li>}
                    {timeline.waiting_list_domains.map((domain) => (
                      <li key={domain}>{domain}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              {APP_FEATURE_FLAGS.nowNextLaterBoardEnabled && portalOrchestrationPack ? (
                <TabsContent value="nowNextLater" className="mt-4 space-y-6 outline-none">
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="text-sm font-semibold ds-text-primary">
                      {ORCHESTRATION_UI_COPY.portalTimelineTabNowNextLater}
                    </div>
                    <p className="mt-2 text-sm ds-text-tertiary">
                      {ORCHESTRATION_UI_COPY.timelineHint}
                    </p>
                    <Suspense fallback={<p className="mt-4 text-sm ds-text-tertiary">Loading…</p>}>
                      <NowNextLaterBoard pack={portalOrchestrationPack} />
                    </Suspense>
                  </div>
                </TabsContent>
              ) : null}
            </Tabs>
            {effectiveDeepDiveOnDemand ? (
              <DirectorDeepDiveDialog
                open={deepDiveOpen}
                onOpenChange={setDeepDiveOpen}
                auditId={id}
                domainKey="marketing_utp"
                subAgentsEnabledOverride={effectiveDirectorSubAgents}
              />
            ) : null}
            <AlertDialog
              open={executionPackConfirmNodeId !== null}
              onOpenChange={(open) => {
                if (!open) setExecutionPackConfirmNodeId(null);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{ORCHESTRATION_UI_COPY.executionPackRepeatDialogTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{ORCHESTRATION_UI_COPY.executionPackRepeatDialogBody}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">{ORCHESTRATION_UI_COPY.executionPackRepeatDialogCancel}</AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    onClick={() => {
                      const nid = executionPackConfirmNodeId;
                      setExecutionPackConfirmNodeId(null);
                      if (nid) void requestExecutionPackFromTimeline(nid);
                    }}
                  >
                    {ORCHESTRATION_UI_COPY.executionPackRepeatDialogConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </AppShell>
  );
}
