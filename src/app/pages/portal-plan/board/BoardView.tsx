import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { AuditTimelineDto, PlanBoardGetBody } from '../../../data/api/audits-orchestration';
import { auditsOrchestrationApi } from '../../../data/api/audits-orchestration';
import {
  bucketPlanBoardCardsByColumn,
  useDeletePlanBoardCardMutation,
  usePatchPlanBoardCardMutation,
  usePlanBoardQuery,
  usePostManifestDraftRevisionMutation,
} from '../../../data/api/plan-board-queries';
import { PLAN_BOARD_COLUMN_HEADINGS_EN, PLAN_BOARD_UI_COLUMNS } from '../../../config/plan-board-ui-columns';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PLAN_WORKSPACE_UI_COPY } from '../../../config/plan-workspace-ui-copy.en';
import { buildAppRoute } from '../../../config/route-paths';
import { ORCHESTRATION_SEASON_PRESETS } from '../../../config/orchestration-roadmap-manifest';
import type { OrchestrationSeasonPreset } from '../../../config/orchestration-roadmap-manifest';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_PRIORITY_REASON_CODES,
  ORCHESTRATION_UI_COPY,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationLaneId } from '../../../config/orchestration-roadmap-ui-copy.en';
import { useProfile } from '../../../hooks/useProfile';
import { usePlanFocusCanonicalToken } from '../../../hooks/usePlanFocusKey';
import { useQueryClient } from '../../../lib/tanstack-react-query';
import { buildPlanSurfaceHrefWithFocus, buildPlanWorkspaceHref } from '../../../lib/plan-cross-nav';
import { invalidatePlanBoardQueriesAfterConflict } from '../../../lib/plan-board-query-invalidation';
import { isGlcOrchestrationPackView } from '../../../lib/orchestration-pack-guards';
import {
  orchestrationNodeTitleMap,
  projectRoadmapNodesFromCriticalPath,
} from '../../../lib/orchestration-timeline-projection';
import type { OrchestrationTimelineTimeBucket } from '../../../lib/orchestration-timeline-projection';
import { PortalPlanLayout } from '../PortalPlanLayout';
import { PortalPlanEmptyCallout, PortalPlanLoadingState } from '../PortalPlanPageStates';
import { usePortalPlanOrchestration } from '../PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from '../PortalPlanUnifiedShell';
import { PlanManualCardCreateForm } from '../PlanManualCardCreateForm';
import { PlanBoardUnifiedPlanStatusBanner } from './plan-board-unified-plan-status-banner';
import { PlanBoardColumnPolicySheet } from './plan-board-column-policy-sheet';
import { PlanBoardOperationalCard } from './PlanBoardOperationalCard';
import { BoardShell } from './plan-board-board-shell';
import { PlanBoardBacklogPanel } from './plan-board-backlog-panel';
import { formatLaneDensityLine, isBacklogOperationalColumn } from './plan-board-card-helpers';
import { BoardColumnShell } from './plan-board-column-shell';
import {
  applyBucketDrag,
  cloneBuckets,
  emptyOperationalColumnBuckets,
  findColumn,
  moveCardIntoColumn,
} from './plan-board-dnd-helpers';
import { BoardHorizonBucketsSection } from './plan-board-horizon-section';
import { toast } from 'sonner';

export { PlanBoardOperationalCard } from './PlanBoardOperationalCard';

const ORCHESTRATION_LANE_IDS_ORDERED = Object.keys(ORCHESTRATION_LANE_LABELS) as OrchestrationLaneId[];

export type PortalDeliveryBoardSurfaceProps = {
  unifiedShellTabActive?: boolean | undefined;
};

function resolveBoardSeasonPreset(args: {
  parity: PlanBoardGetBody['timeline_parity'];
  timeline: AuditTimelineDto | null | undefined;
}): OrchestrationSeasonPreset {
  const timelinePreset =
    args.timeline?.status === 'ready' ? args.timeline.version.season_preset ?? null : null;
  const candidates = [args.parity?.season_preset ?? null, timelinePreset].filter(Boolean);
  for (const raw of candidates) {
    const s = typeof raw === 'string' ? raw : null;
    if (s != null && (ORCHESTRATION_SEASON_PRESETS as readonly string[]).includes(s)) {
      return s as OrchestrationSeasonPreset;
    }
  }
  return 'rolling_90d';
}

/** Operational columns + persisted `plan_task_delivery` rows alongside horizon buckets. */
export function PortalDeliveryBoardSurface(props?: PortalDeliveryBoardSurfaceProps) {
  const { unifiedShellTabActive } = props ?? {};
  const focusToken = usePlanFocusCanonicalToken();
  const {
    auditId,
    audit,
    auditLoading: loading,
    packQuery,
    timelineQuery,
    includeTimelineFetch,
  } = usePortalPlanOrchestration();
  const { isClient } = useProfile();

  const qc = useQueryClient();
  const showConsultantPlanTools = !isClient;

  const strategyStudioHref = buildPlanWorkspaceHref({ auditId, isClient, mode: 'shape' });
  const pack = packQuery.data?.pack ?? null;

  const loadPending =
    loading || packQuery.isPending || (includeTimelineFetch ? timelineQuery.isPending : false);
  const loadError = packQuery.isError || (includeTimelineFetch ? timelineQuery.isError : false);

  const orchestrationPackVersion = packQuery.data?.orchestration_pack_version ?? 0;

  const boardQuery = usePlanBoardQuery({
    auditId,
    enabled: Boolean(auditId) && Boolean(pack) && !loadPending && isGlcOrchestrationPackView(pack),
  });

  const operationalColumnDescriptors = useMemo(() => {
    const cols = boardQuery.data?.columns;
    if (cols && cols.length > 0) {
      return cols.map((c) => ({ id: c.id, title: c.title }));
    }
    return PLAN_BOARD_UI_COLUMNS.map((id) => ({ id, title: PLAN_BOARD_COLUMN_HEADINGS_EN[id] }));
  }, [boardQuery.data?.columns]);

  const operationalColumnIds = useMemo(
    () => operationalColumnDescriptors.map((c) => c.id),
    [operationalColumnDescriptors],
  );

  const operationalColumnIdsKey = operationalColumnIds.join('|');

  const patchMutation = usePatchPlanBoardCardMutation({ auditId });
  const deleteMutation = useDeletePlanBoardCardMutation({ auditId });
  const manifestDraftMutation = usePostManifestDraftRevisionMutation(
    APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools ? auditId : undefined,
  );

  const hydrateSignature =
    boardQuery.data?.cards
      ?.slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => `${r.id}:${r.column_id}:${r.position}`)
      .join('|') ?? '';

  const [columnBuckets, setColumnBuckets] = useState<Record<string, string[]>>(() =>
    emptyOperationalColumnBuckets([...PLAN_BOARD_UI_COLUMNS]),
  );
  useEffect(() => {
    setColumnBuckets(
      hydrateSignature === ''
        ? emptyOperationalColumnBuckets(operationalColumnIds)
        : bucketPlanBoardCardsByColumn(boardQuery.data?.cards ?? [], operationalColumnIds),
    );
  }, [hydrateSignature, operationalColumnIdsKey, boardQuery.data?.cards, operationalColumnIds]);

  const cardsById = useMemo(() => new Map(boardQuery.data?.cards.map((c) => [c.id, c]) ?? []), [boardQuery.data?.cards]);

  const pendingManifestDraftKey = [...(boardQuery.data?.manifest_draft_revision_pending_canonical_keys ?? [])]
    .slice()
    .sort()
    .join('|');
  const pendingManifestDraftCanonicalSet = useMemo(
    () => new Set(boardQuery.data?.manifest_draft_revision_pending_canonical_keys ?? []),
    [pendingManifestDraftKey],
  );

  const governanceReadOnly = Boolean(boardQuery.data?.issues?.some((i) => i.code === 'governance_blocked'));

  const laneSelectOptions = useMemo(
    () => ORCHESTRATION_LANE_IDS_ORDERED.map(laneId => ({ value: laneId, label: ORCHESTRATION_LANE_LABELS[laneId] })),
    [],
  );
  const laneInlineEnabled = !(APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools);

  const commitCardTitleInline = useCallback(
    async (cardId: string, title: string) => {
      try {
        await patchMutation.mutateAsync({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, title: title.trim() },
        });
      } catch (err) {
        await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
        throw err;
      }
    },
    [auditId, orchestrationPackVersion, patchMutation, qc],
  );

  const commitCardLaneInline = useCallback(
    async (cardId: string, lane: string) => {
      try {
        await patchMutation.mutateAsync({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, lane },
        });
      } catch (err) {
        await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
        throw err;
      }
    },
    [auditId, orchestrationPackVersion, patchMutation, qc],
  );

  const dragLocked =
    orchestrationPackVersion <= 0 ||
    patchMutation.isPending ||
    deleteMutation.isPending ||
    boardQuery.isPending ||
    manifestDraftMutation.isPending ||
    governanceReadOnly;

  const orphanCount = boardQuery.data?.cards?.filter((c) => Boolean(c.orphaned_reason)).length ?? 0;

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [laneEditCardId, setLaneEditCardId] = useState<string | null>(null);
  const [laneEditSelectedLane, setLaneEditSelectedLane] = useState<OrchestrationLaneId>('marketing_narrative');
  const [laneEditOwnerHint, setLaneEditOwnerHint] = useState('');
  const [cardTitleDraft, setCardTitleDraft] = useState<{ cardId: string; title: string } | null>(null);
  const [laneSimpleDraft, setLaneSimpleDraft] = useState<{ cardId: string; lane: OrchestrationLaneId } | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);

  const planBoardViewTelemetrySentRef = useRef(false);
  useEffect(() => {
    if (!unifiedShellTabActive || !auditId || !boardQuery.data) return;
    if (planBoardViewTelemetrySentRef.current) return;
    planBoardViewTelemetrySentRef.current = true;
    void auditsOrchestrationApi
      .postPlanBoardViewOpenedTelemetry(auditId, {
        pack_version: boardQuery.data.pack_version_used,
        has_pack: !boardQuery.data.issues.some((i) => i.code === 'no_pack'),
      })
      .catch(() => {
        /* telemetry is best-effort */
      });
  }, [auditId, boardQuery.data, unifiedShellTabActive]);

  const boardOperationalVisible =
    Boolean(boardQuery.data) && !boardQuery.data!.issues.some((i) => i.code === 'no_pack');

  async function persistCardPlacement(prev: Record<string, string[]>, after: Record<string, string[]>, cardId: string) {
    const prevColumn = findColumn(prev, cardId);
    const nextColumn = findColumn(after, cardId);
    if (!prevColumn || !nextColumn) return;

    const body: {
      expected_pack_version: number;
      to_column?: string;
      position?: number;
    } = {
      expected_pack_version: orchestrationPackVersion,
      position: (after[nextColumn] ?? []).indexOf(cardId),
    };
    if (prevColumn !== nextColumn) body.to_column = nextColumn;

    try {
      await patchMutation.mutateAsync({
        cardId,
        body,
      });
    } catch (err) {
      await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
    }
  }

  async function moveCardViaMenu(targetCol: string, cardId: string) {
    const prev = cloneBuckets(columnBuckets);
    const draft = moveCardIntoColumn(prev, cardId, targetCol);
    if (!draft) return;
    setColumnBuckets(draft);
    await persistCardPlacement(prev, draft, cardId);
  }

  function openTitleEdit(cardId: string): void {
    const current = cardsById.get(cardId);
    setCardTitleDraft({ cardId, title: (current?.title ?? '').trim() });
  }

  async function submitCardTitleDraft(): Promise<void> {
    if (!cardTitleDraft) return;
    const title = cardTitleDraft.title.trim();
    if (title.length < 2) return;
    try {
      await patchMutation.mutateAsync({
        cardId: cardTitleDraft.cardId,
        body: { expected_pack_version: orchestrationPackVersion, title },
      });
      setCardTitleDraft(null);
    } catch (err) {
      await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
    }
  }

  async function editCardLane(cardId: string) {
    const current = cardsById.get(cardId);
    if (APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools) {
      const rawLane = current?.lane?.trim() ?? '';
      const asLane =
        rawLane !== '' && (ORCHESTRATION_LANE_IDS_ORDERED as readonly string[]).includes(rawLane)
          ? (rawLane as OrchestrationLaneId)
          : 'marketing_narrative';
      setLaneEditSelectedLane(asLane);
      setLaneEditOwnerHint('');
      setLaneEditCardId(cardId);
      return;
    }
    const rawLane = current?.lane?.trim() ?? '';
    const asLane =
      rawLane !== '' && (ORCHESTRATION_LANE_IDS_ORDERED as readonly string[]).includes(rawLane)
        ? (rawLane as OrchestrationLaneId)
        : 'marketing_narrative';
    setLaneSimpleDraft({ cardId, lane: asLane });
  }

  async function submitLaneSimpleDraft(): Promise<void> {
    if (!laneSimpleDraft) return;
    try {
      await patchMutation.mutateAsync({
        cardId: laneSimpleDraft.cardId,
        body: { expected_pack_version: orchestrationPackVersion, lane: laneSimpleDraft.lane },
      });
      setLaneSimpleDraft(null);
    } catch (err) {
      await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
    }
  }

  async function submitManifestDraftLaneRevision() {
    if (!laneEditCardId) return;
    const card = cardsById.get(laneEditCardId);
    const ck = card?.canonical_node_key;
    if (!ck) return;
    try {
      await manifestDraftMutation.mutateAsync({
        canonical_node_key: ck,
        expected_pack_version: orchestrationPackVersion,
        lane: laneEditSelectedLane,
        ...(laneEditOwnerHint.trim() !== '' ? { owner_hint: laneEditOwnerHint.trim() } : {}),
      });
      toast.success(ORCHESTRATION_UI_COPY.manifestDraftLaneQueuedToast);
      setLaneEditCardId(null);
    } catch (err) {
      await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
    }
  }

  async function confirmDeleteCard(): Promise<void> {
    if (!deleteCardId) return;
    const cardId = deleteCardId;
    try {
      await deleteMutation.mutateAsync({
        cardId,
        body: { expected_pack_version: orchestrationPackVersion },
      });
      setDeleteCardId(null);
    } catch (err) {
      await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, {}));

  function handleDragStart(event: DragStartEvent) {
    setDraggingCardId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingCardId(null);
    if (!over || orchestrationPackVersion <= 0) return;

    const prev = cloneBuckets(columnBuckets);
    const next = applyBucketDrag(prev, String(active.id), String(over.id));
    if (!next) return;

    setColumnBuckets(next);
    await persistCardPlacement(prev, next, String(active.id));
  }

  const subtitle = showConsultantPlanTools ? PLAN_BOARD_COPY.shellSubtitleConsultant : PLAN_BOARD_COPY.shellSubtitleReadOnlyClient;

  if (loadPending) {
    return (
      <PortalPlanSurfaceChrome
        branch="board"
        tabActive={unifiedShellTabActive}
        title={PLAN_BOARD_COPY.shellTitle}
        subtitle={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
      >
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board">
          <PortalPlanLoadingState
            layout="roadmap"
            headline={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
            detail={PLAN_WORKSPACE_UI_COPY.loadingDetail}
          />
        </PortalPlanLayout>
      </PortalPlanSurfaceChrome>
    );
  }

  if (loadError || !isGlcOrchestrationPackView(pack)) {
    return (
      <PortalPlanSurfaceChrome branch="board" tabActive={unifiedShellTabActive} title={PLAN_BOARD_COPY.shellTitle} subtitle={subtitle}>
        <div className="mx-auto max-w-6xl space-y-4">
          <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board">
            <PortalPlanEmptyCallout title={PLAN_BOARD_COPY.emptyNoPackTitle} body={PLAN_BOARD_COPY.emptyNoPackBody}>
              <Button asChild variant="default" size="sm" className="no-underline">
                <Link to={strategyStudioHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
              </Button>
            </PortalPlanEmptyCallout>
          </PortalPlanLayout>
        </div>
      </PortalPlanSurfaceChrome>
    );
  }

  const timelineParity = boardQuery.data?.timeline_parity;
  const timelineDto = timelineQuery.data?.timeline;
  const seasonPreset = resolveBoardSeasonPreset({
    parity: timelineParity,
    timeline: timelineDto ?? null,
  });
  const projections = projectRoadmapNodesFromCriticalPath({ pack, seasonPreset });
  const titles = orchestrationNodeTitleMap(pack);
  const nodeById = new Map(pack.graph.nodes.map((n) => [n.id, n]));

  const top7List =
    timelineParity?.top_7d ?? (timelineDto?.status === 'ready' ? timelineDto.top_7d : []) ?? [];
  const top30List =
    timelineParity?.top_30d ?? (timelineDto?.status === 'ready' ? timelineDto.top_30d : []) ?? [];
  const prioritySets = { top7: new Set(top7List), top30: new Set(top30List) };

  const reasonRows =
    timelineParity?.top_priorities ?? (timelineDto?.status === 'ready' ? timelineDto.top_priorities : undefined) ?? [];
  const reasonByPackNodeId = new Map(reasonRows.map((p) => [p.action_id, p.reason_code] as const));

  const byBucket: Record<OrchestrationTimelineTimeBucket, typeof projections> = {
    now: [],
    next: [],
    later: [],
  };
  for (const row of projections) {
    byBucket[row.time_bucket].push(row);
  }

  return (
    <PortalPlanSurfaceChrome branch="board" tabActive={unifiedShellTabActive} title={PLAN_BOARD_COPY.shellTitle} subtitle={subtitle}>
      <BoardShell>
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board">
          <p className="sr-only">{PLAN_BOARD_COPY.readOnlyAnnouncement}</p>

          <BoardHorizonBucketsSection byBucket={byBucket} titles={titles} nodeById={nodeById} />

          <section aria-labelledby="plan-board-operational-heading" className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="plan-board-operational-heading" className="text-foreground text-lg font-semibold tracking-tight">
                  {PLAN_BOARD_COPY.operationalSectionTitle}
                </h2>
                <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.operationalSectionSubtitle}</p>
              </div>
              {APP_FEATURE_FLAGS.planBoardCustomColumnsEnabled &&
              showConsultantPlanTools &&
              boardQuery.data?.column_policy_editable ?
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setBoardSettingsOpen(true)}>
                  {PLAN_BOARD_COPY.boardSettingsTrigger}
                </Button>
              : null}
            </div>

            {draggingCardId ? (
              <span className="sr-only" aria-live="polite">{`${PLAN_BOARD_COPY.draggingLiveMessage}: ${draggingCardId}`}</span>
            ) : null}

            {boardOperationalVisible ?
              <PlanBoardUnifiedPlanStatusBanner
                strategyHref={strategyStudioHref}
                governanceReadOnly={governanceReadOnly}
                showOrphanReconcile={showConsultantPlanTools && orphanCount > 0}
                reconcileProps={
                  showConsultantPlanTools ?
                    {
                      auditId,
                      orchestrationPackVersion,
                      reconcilePreviewEnabled: APP_FEATURE_FLAGS.planBoardReconcileDiffPreviewEnabled,
                    }
                  : null
                }
                manifestDraftPendingCount={
                  boardQuery.data?.manifest_draft_revision_pending_canonical_keys?.length ?? 0
                }
                showManifestDraftQueueCopy={
                  APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools
                }
              />
            : null}

            {boardQuery.data?.issues?.some((i) => i.code === 'no_pack') ? (
              <PortalPlanEmptyCallout title={PLAN_BOARD_COPY.emptyNoPackTitle} body={PLAN_BOARD_COPY.emptyNoPackBody}>
                <Button asChild variant="outline" size="sm" className="no-underline">
                  <Link to={strategyStudioHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
                </Button>
              </PortalPlanEmptyCallout>
            ) : null}

            {boardQuery.isError ? (
              <div className="text-muted-foreground text-sm">Unable to load delivery board operational state.</div>
            ) : null}

            {boardOperationalVisible && boardQuery.isPending ? (
              <div className="text-muted-foreground text-sm">Loading persisted delivery cards...</div>
            ) : null}

            {boardOperationalVisible && !boardQuery.isPending ? (
              <div className="overflow-x-auto pb-1">
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <div className="flex min-w-min flex-nowrap gap-3">
                    {operationalColumnDescriptors.map((col) => {
                      const colId = col.id;
                      const heading = col.title;
                      const ids = columnBuckets[colId] ?? [];
                      const laneMixCaption = formatLaneDensityLine(ids, cardsById);
                      const backlog = isBacklogOperationalColumn(boardQuery.data?.columns, colId);

                      const columnInner = (
                        <BoardColumnShell columnId={colId} heading={heading} laneMixCaption={laneMixCaption}>
                          {backlog && showConsultantPlanTools ?
                            <li className="border-border list-none rounded-md border border-dashed px-3 py-2">
                              <PlanManualCardCreateForm
                                auditId={auditId}
                                orchestrationPackVersion={orchestrationPackVersion}
                                disabled={governanceReadOnly}
                              />
                            </li>
                          : null}
                          {ids.length === 0 && !(backlog && showConsultantPlanTools) ?
                            <li className="text-muted-foreground text-xs">{PLAN_BOARD_COPY.operationalEmptyPlaceholder}</li>
                          : null}
                          {ids.length > 0 ?
                            ids.map((id) => {
                              const dto = cardsById.get(id);
                              if (!dto) {
                                return (
                                  <li key={id} className="text-muted-foreground text-xs">
                                    Missing card view
                                  </li>
                                );
                              }
                              const packNodeId = dto.pack_graph_node_id;
                              const priorityWindow =
                                packNodeId && prioritySets.top7.has(packNodeId) ? ('7d' as const)
                                : packNodeId && prioritySets.top30.has(packNodeId) ? ('30d' as const)
                                : null;
                              const packNode = packNodeId ? nodeById.get(packNodeId) : undefined;
                              const analysisDepth =
                                packNode?.analysis_depth === 'baseline' || packNode?.analysis_depth === 'deep'
                                  ? packNode.analysis_depth
                                  : null;
                              const priorityReasonCode = packNodeId ? reasonByPackNodeId.get(packNodeId) : undefined;
                              const priorityReasonLabel =
                                priorityReasonCode != null ?
                                  ORCHESTRATION_PRIORITY_REASON_CODES[priorityReasonCode] ?? priorityReasonCode
                                : null;
                              const focusForRoadmap = dto.canonical_node_key ?? dto.pack_graph_node_id ?? null;
                              const openOnRoadmapHref =
                                focusForRoadmap != null ?
                                  buildPlanSurfaceHrefWithFocus({
                                    auditId,
                                    isClient,
                                    view: 'roadmap',
                                    focusCanonicalKey: focusForRoadmap,
                                  })
                                : null;

                              return (
                                <PlanBoardOperationalCard
                                  key={id}
                                  card={dto}
                                  columnId={colId}
                                  dragLocked={dragLocked}
                                  expectedPackVersion={orchestrationPackVersion}
                                  moveMenuColumns={operationalColumnDescriptors}
                                  boardColumns={boardQuery.data?.columns}
                                  openOnRoadmapHref={openOnRoadmapHref}
                                  onMoveViaMenu={(target) => moveCardViaMenu(target, dto.id)}
                                  priorityWindow={priorityWindow}
                                  priorityReasonLabel={priorityReasonLabel}
                                  analysisDepth={analysisDepth}
                                  canMutateCard={showConsultantPlanTools && !governanceReadOnly}
                                  onEditTitle={() => openTitleEdit(dto.id)}
                                  onEditLane={() => editCardLane(dto.id)}
                                  onCommitTitleInline={t => commitCardTitleInline(dto.id, t)}
                                  onCommitLaneInline={laneInlineEnabled ? l => commitCardLaneInline(dto.id, l) : undefined}
                                  laneSelectOptions={laneSelectOptions}
                                  laneInlineEnabled={laneInlineEnabled}
                                  onDeleteCard={() => setDeleteCardId(dto.id)}
                                  isFocusTarget={
                                    focusToken != null &&
                                    (dto.canonical_node_key === focusToken ||
                                      dto.id === focusToken ||
                                      (dto.pack_graph_node_id != null && dto.pack_graph_node_id === focusToken))
                                  }
                                  manifestDraftRevisionPending={
                                    APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard &&
                                    showConsultantPlanTools &&
                                    dto.canonical_node_key != null &&
                                    pendingManifestDraftCanonicalSet.has(dto.canonical_node_key)
                                  }
                                />
                              );
                            })
                          : null}
                        </BoardColumnShell>
                      );

                      return (
                        <PlanBoardBacklogPanel key={colId} isBacklog={backlog}>
                          {columnInner}
                        </PlanBoardBacklogPanel>
                      );
                    })}
                  </div>
                  <DragOverlay>
                    {draggingCardId ? (
                      <div className="bg-card border-border rounded-md border px-4 py-2 shadow-md">
                        {cardsById.get(draggingCardId)?.title ?? draggingCardId}
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs">{PLAN_BOARD_COPY.parityNote}</p>
          </section>
        </PortalPlanLayout>

        <Dialog
          open={laneEditCardId != null}
          onOpenChange={(open) => {
            if (!open) setLaneEditCardId(null);
          }}
        >
          <DialogContent className="max-w-md border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{PLAN_BOARD_COPY.manifestDraftLaneDialogTitle}</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.manifestDraftLaneDialogDescription}</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manifest-draft-lane">{PLAN_BOARD_COPY.manifestDraftLaneSelectLabel}</Label>
                <Select value={laneEditSelectedLane} onValueChange={v => setLaneEditSelectedLane(v as OrchestrationLaneId)}>
                  <SelectTrigger id="manifest-draft-lane" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORCHESTRATION_LANE_IDS_ORDERED.map((laneId) => (
                      <SelectItem key={laneId} value={laneId}>
                        {ORCHESTRATION_LANE_LABELS[laneId]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manifest-draft-owner">{PLAN_BOARD_COPY.manifestDraftOwnerHintLabel}</Label>
                <Input
                  id="manifest-draft-owner"
                  value={laneEditOwnerHint}
                  onChange={e => setLaneEditOwnerHint(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {PLAN_BOARD_COPY.manifestDraftLaneDialogCancel}
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={manifestDraftMutation.isPending || orchestrationPackVersion <= 0 || governanceReadOnly}
                onClick={() => void submitManifestDraftLaneRevision()}
              >
                {PLAN_BOARD_COPY.manifestDraftLaneDialogSubmit}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={cardTitleDraft != null}
          onOpenChange={(open) => {
            if (!open) setCardTitleDraft(null);
          }}
        >
          <DialogContent className="max-w-md border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{PLAN_BOARD_COPY.cardTitleEditDialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="plan-card-title-edit">{PLAN_BOARD_COPY.cardTitleEditFieldLabel}</Label>
              <Input
                id="plan-card-title-edit"
                value={cardTitleDraft?.title ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setCardTitleDraft((d) => (d ? { ...d, title: v } : d));
                }}
                maxLength={200}
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {PLAN_BOARD_COPY.cardTitleEditCancel}
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={
                  patchMutation.isPending ||
                  orchestrationPackVersion <= 0 ||
                  governanceReadOnly ||
                  (cardTitleDraft?.title.trim().length ?? 0) < 2
                }
                onClick={() => void submitCardTitleDraft()}
              >
                {PLAN_BOARD_COPY.cardTitleEditSave}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={laneSimpleDraft != null}
          onOpenChange={(open) => {
            if (!open) setLaneSimpleDraft(null);
          }}
        >
          <DialogContent className="max-w-md border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{PLAN_BOARD_COPY.cardLaneSimpleDialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="plan-card-lane-simple">{PLAN_BOARD_COPY.cardLaneSimpleFieldLabel}</Label>
              <Select
                value={laneSimpleDraft?.lane}
                onValueChange={(v) => {
                  setLaneSimpleDraft((d) =>
                    d ? { ...d, lane: v as OrchestrationLaneId } : d,
                  );
                }}
              >
                <SelectTrigger id="plan-card-lane-simple" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORCHESTRATION_LANE_IDS_ORDERED.map((laneId) => (
                    <SelectItem key={laneId} value={laneId}>
                      {ORCHESTRATION_LANE_LABELS[laneId]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {PLAN_BOARD_COPY.cardLaneSimpleCancel}
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={patchMutation.isPending || orchestrationPackVersion <= 0 || governanceReadOnly}
                onClick={() => void submitLaneSimpleDraft()}
              >
                {PLAN_BOARD_COPY.cardLaneSimpleSave}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteCardId != null} onOpenChange={(open) => !open && setDeleteCardId(null)}>
          <AlertDialogContent className="border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>{PLAN_BOARD_COPY.cardDeleteDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>{PLAN_BOARD_COPY.cardDeleteDialogDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{PLAN_BOARD_COPY.cardDeleteConfirmCancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDeleteCard();
                }}
              >
                {PLAN_BOARD_COPY.cardDeleteConfirmCta}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PlanBoardColumnPolicySheet
          auditId={auditId}
          open={boardSettingsOpen}
          onOpenChange={setBoardSettingsOpen}
          columns={boardQuery.data?.columns}
        />
      </BoardShell>
    </PortalPlanSurfaceChrome>
  );
}
