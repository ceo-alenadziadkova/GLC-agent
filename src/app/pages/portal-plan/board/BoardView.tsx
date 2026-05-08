import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '../../../components/ui/button';
import type { AuditTimelineDto, PlanBoardGetBody } from '../../../data/api/audits-orchestration';
import { auditsOrchestrationApi } from '../../../data/api/audits-orchestration';
import {
  bucketPlanBoardCardsByColumn,
  usePatchPlanBoardCardsBatchMutation,
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
  ORCHESTRATION_UI_COPY,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationLaneId } from '../../../config/orchestration-roadmap-ui-copy.en';
import { usePlanCommandRegistration } from '../../../context/PlanCommandRegistryContext';
import { useProfile } from '../../../hooks/useProfile';
import { usePlanFocusCanonicalToken } from '../../../hooks/usePlanFocusKey';
import { useQueryClient } from '../../../lib/tanstack-react-query';
import {
  buildPlanSurfaceHrefWithFocus,
  buildPlanWorkspaceHref,
  mergePlanCardMetricFiltersIntoLocationSearch,
  mergeClearLaneFilterIntoLocationSearch,
  mergeLaneFilterToggleIntoLocationSearch,
  readPlanCardMetricFilters,
  readPlanLaneFilterKeys,
} from '../../../lib/plan-cross-nav';
import type { PlanWorkspacePaletteCommand } from '../../../lib/plan-command-registry';
import { canEditPlanBoardCardFields } from '../../../lib/plan-board-policy';
import { invalidatePlanBoardQueriesAfterConflict } from '../../../lib/plan-board-query-invalidation';
import { isGlcOrchestrationPackView } from '../../../lib/orchestration-pack-guards';
import { PortalPlanLayout } from '../PortalPlanLayout';
import { PortalPlanEmptyCallout, PortalPlanLoadingState } from '../PortalPlanPageStates';
import { usePortalPlanOrchestration } from '../PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from '../PortalPlanUnifiedShell';
import { BoardShell } from './plan-board-board-shell';
import { buildPlanBoardCardMetrics } from './plan-board-card-helpers';
import {
  emptyOperationalColumnBuckets,
} from './plan-board-dnd-helpers';
import { BoardHorizonBucketsSection } from './plan-board-horizon-section';
import { BoardHeader } from './BoardHeader';
import { BoardFilters } from './BoardFilters';
import { BoardColumns } from './BoardColumns';
import { BoardDialogs } from './BoardDialogs';
import { useBoardActions } from './BoardActions';
import { useBoardViewSelectors } from './useBoardViewSelectors';
import { useBoardViewInteractions } from './useBoardViewInteractions';

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
  const navigate = useNavigate();
  const location = useLocation();
  const laneFilterKeys = useMemo(() => readPlanLaneFilterKeys(location.search), [location.search]);
  const metricFilters = useMemo(() => readPlanCardMetricFilters(location.search), [location.search]);

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
  const cards = boardQuery.data?.cards ?? [];

  const patchMutation = usePatchPlanBoardCardMutation({ auditId });
  const batchPatchMutation = usePatchPlanBoardCardsBatchMutation({ auditId });
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
        : bucketPlanBoardCardsByColumn(cards, operationalColumnIds),
    );
  }, [cards, hydrateSignature, operationalColumnIds, operationalColumnIdsKey]);

  const boardPackReady = !loadPending && !loadError && isGlcOrchestrationPackView(pack);
  const glcPack = boardPackReady ? pack : null;
  const timelineParity = boardQuery.data?.timeline_parity;
  const timelineDto = timelineQuery.data?.timeline;
  const seasonPreset = resolveBoardSeasonPreset({
    parity: timelineParity,
    timeline: timelineDto ?? null,
  });
  const selectors = useBoardViewSelectors({
    cards,
    columns: boardQuery.data?.columns,
    defaultColumns: PLAN_BOARD_UI_COLUMNS.map((id) => ({ id, title: PLAN_BOARD_COLUMN_HEADINGS_EN[id] })),
    timelineParity,
    timeline: timelineDto ?? null,
    glcPack,
    pendingManifestDraftCanonicalKeys: boardQuery.data?.manifest_draft_revision_pending_canonical_keys ?? [],
    laneFilterKeys,
    metricFilters,
    focusToken,
    auditId,
    isClient,
    seasonPreset,
  });
  const operationalColumnIds = selectors.operationalColumnIds;
  const operationalColumnIdsKey = operationalColumnIds.join('|');

  const governanceReadOnly = Boolean(boardQuery.data?.issues?.some((i) => i.code === 'governance_blocked'));
  const canEditCardFields = canEditPlanBoardCardFields({
    role: isClient ? 'client' : 'consultant',
    governanceReadOnly,
  });

  const laneSelectOptions = useMemo(
    () => ORCHESTRATION_LANE_IDS_ORDERED.map(laneId => ({ value: laneId, label: ORCHESTRATION_LANE_LABELS[laneId] })),
    [],
  );
  const manifestDraftLaneHintsEnabled =
    APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools;

  const dragLocked =
    orchestrationPackVersion <= 0 ||
    patchMutation.isPending ||
    deleteMutation.isPending ||
    boardQuery.isPending ||
    manifestDraftMutation.isPending ||
    governanceReadOnly;

  const orphanCount = boardQuery.data?.cards?.filter((c) => Boolean(c.orphaned_reason)).length ?? 0;

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkPriority, setBulkPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [ticketDetailsCardId, setTicketDetailsCardId] = useState<string | null>(null);

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
  const selectedTicketCard =
    ticketDetailsCardId != null ? selectors.cardsById.get(ticketDetailsCardId) ?? null : null;
  const baseInteractions = useBoardViewInteractions({
    auditId,
    pathname: location.pathname,
    currentSearch: location.search,
    orchestrationPackVersion,
    packVersionUsed: boardQuery.data?.pack_version_used ?? null,
    showConsultantPlanTools,
    cardsById: selectors.cardsById,
    patchCard: ({ cardId, body }) => patchMutation.mutateAsync({ cardId, body }),
    queueManifestDraftRevision: (payload) => manifestDraftMutation.mutateAsync(payload),
    invalidateAfterConflict: async (conflictAuditId, err) =>
      invalidatePlanBoardQueriesAfterConflict(qc, conflictAuditId, err),
    mergeClearLaneFiltersLocation: ({ pathname, currentSearch }) =>
      mergeClearLaneFilterIntoLocationSearch({ pathname, currentSearch }),
    mergeMetricFiltersLocation: ({ pathname, currentSearch, patch }) =>
      mergePlanCardMetricFiltersIntoLocationSearch({ pathname, currentSearch, patch }),
    navigate,
    bulkMoveSelected: async () => Promise.resolve(),
    bulkPatchSelected: async () => Promise.resolve(),
    setSelectedCardIds,
    setDeleteCardId,
    setTicketDetailsCardId,
  });
  const {
    moveCardViaMenu,
    confirmDeleteCard,
    handleDragStart,
    handleDragEnd,
    bulkMoveSelected,
    bulkPatchSelected,
    saveTicketDetails,
  } = useBoardActions({
    selectedCardColumnId: selectedTicketCard?.column_id ?? null,
    selectedCardIds,
    setSelectedCardIds,
    columnBuckets,
    setColumnBuckets,
    setDraggingCardId,
    setDeleteCardId,
    orchestrationPackVersion,
    expectedPackVersion: orchestrationPackVersion,
    auditId,
    persistCardPlacement: baseInteractions.persistCardPlacement,
    patchCard: ({ cardId, body }) => patchMutation.mutateAsync({ cardId, body }),
    deleteCard: ({ cardId, body }) => deleteMutation.mutateAsync({ cardId, body }),
    batchPatchCards: ({ expected_pack_version, patches }) =>
      batchPatchMutation.mutateAsync({ expected_pack_version, patches }),
    invalidateAfterConflict: async (conflictAuditId, err) => invalidatePlanBoardQueriesAfterConflict(qc, conflictAuditId, err),
  });
  const boardInteractions = useBoardViewInteractions({
    auditId,
    pathname: location.pathname,
    currentSearch: location.search,
    orchestrationPackVersion,
    packVersionUsed: boardQuery.data?.pack_version_used ?? null,
    showConsultantPlanTools,
    cardsById: selectors.cardsById,
    patchCard: ({ cardId, body }) => patchMutation.mutateAsync({ cardId, body }),
    queueManifestDraftRevision: (payload) => manifestDraftMutation.mutateAsync(payload),
    invalidateAfterConflict: async (conflictAuditId, err) =>
      invalidatePlanBoardQueriesAfterConflict(qc, conflictAuditId, err),
    mergeClearLaneFiltersLocation: ({ pathname, currentSearch }) =>
      mergeClearLaneFilterIntoLocationSearch({ pathname, currentSearch }),
    mergeMetricFiltersLocation: ({ pathname, currentSearch, patch }) =>
      mergePlanCardMetricFiltersIntoLocationSearch({ pathname, currentSearch, patch }),
    navigate,
    bulkMoveSelected,
    bulkPatchSelected,
    setSelectedCardIds,
    setDeleteCardId,
    setTicketDetailsCardId,
  });

  const planBoardPaletteCommands = useMemo((): PlanWorkspacePaletteCommand[] => {
    if (unifiedShellTabActive === false) return [];
    if (!auditId || !boardOperationalVisible || boardQuery.isPending || !boardQuery.data) return [];
    const cards = boardQuery.data.cards ?? [];
    const out: PlanWorkspacePaletteCommand[] = [];
    for (const card of cards) {
      const safeTitle = (card.title ?? card.canonical_node_key ?? card.id).replace(/"/g, "'");
      for (const col of selectors.operationalColumnDescriptors) {
        if (col.id === card.column_id) continue;
        out.push({
          id: `move-card-${card.id}-${col.id}`,
          label: `Move "${safeTitle}" to ${col.title}`,
          keywords: `move card column delivery ${safeTitle} ${col.title}`,
          run: () => {
            void moveCardViaMenu(col.id, card.id);
          },
        });
      }
      const focusForRoadmap = card.canonical_node_key ?? card.pack_graph_node_id ?? null;
      if (focusForRoadmap) {
        const href = buildPlanSurfaceHrefWithFocus({
          auditId,
          isClient,
          view: 'roadmap',
          focusCanonicalKey: focusForRoadmap,
        });
        out.push({
          id: `open-roadmap-${card.id}`,
          label: `Open "${safeTitle}" in Roadmap`,
          keywords: `roadmap schedule focus ${safeTitle}`,
          run: () => {
            navigate(href);
          },
        });
      }
    }
    if (selectors.focusCardForCommands) {
      const safeTitle = (
        selectors.focusCardForCommands.title ??
        selectors.focusCardForCommands.canonical_node_key ??
        selectors.focusCardForCommands.id
      ).replace(/"/g, "'");
      out.push({
        id: 'focus-priority-high',
        label: `Set "${safeTitle}" priority to high`,
        keywords: `priority high focused ${safeTitle}`,
        run: () => {
          void boardInteractions.commitCardPriorityInline(selectors.focusCardForCommands!.id, 'high');
        },
      });
      out.push({
        id: 'focus-priority-urgent',
        label: `Set "${safeTitle}" priority to urgent`,
        keywords: `priority urgent focused ${safeTitle}`,
        run: () => {
          void boardInteractions.commitCardPriorityInline(selectors.focusCardForCommands!.id, 'urgent');
        },
      });
      out.push({
        id: 'focus-due-in-7d',
        label: `Set "${safeTitle}" due in 7 days`,
        keywords: `due date focused ${safeTitle}`,
        run: () => {
          const next = new Date();
          next.setDate(next.getDate() + 7);
          const iso = next.toISOString().slice(0, 10);
          void boardInteractions.commitCardDueDateInline(selectors.focusCardForCommands!.id, iso);
        },
      });
    }
    out.push({
      id: 'add-manual-card',
      label: PLAN_WORKSPACE_UI_COPY.commandPaletteAddManualCard,
      keywords: 'manual backlog card add create',
      run: () => {
        document.querySelector<HTMLElement>('[data-plan-manual-card-form]')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        document.querySelector<HTMLInputElement>('[data-plan-manual-card-title]')?.focus();
      },
    });
    for (const laneId of ORCHESTRATION_LANE_IDS_ORDERED) {
      out.push({
        id: `filter-lane-${laneId}`,
        label: PLAN_WORKSPACE_UI_COPY.commandPaletteToggleLaneFilter.replace(
          '{lane}',
          ORCHESTRATION_LANE_LABELS[laneId],
        ),
        keywords: `filter lane table board ${laneId}`,
        run: () => {
          navigate(
            mergeLaneFilterToggleIntoLocationSearch({
              pathname: location.pathname,
              currentSearch: location.search,
              laneId,
            }),
          );
        },
      });
    }
    return out;
  }, [
    auditId,
    boardOperationalVisible,
    boardQuery.data,
    boardQuery.isPending,
    isClient,
    location.pathname,
    location.search,
    boardInteractions.commitCardDueDateInline,
    boardInteractions.commitCardPriorityInline,
    moveCardViaMenu,
    navigate,
    selectors.focusCardForCommands,
    selectors.operationalColumnDescriptors,
    unifiedShellTabActive,
  ]);

  usePlanCommandRegistration('plan-board-operational', planBoardPaletteCommands);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, {}));

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

  return (
    <PortalPlanSurfaceChrome branch="board" tabActive={unifiedShellTabActive} title={PLAN_BOARD_COPY.shellTitle} subtitle={subtitle}>
      <BoardShell>
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board">
          <p className="sr-only">{PLAN_BOARD_COPY.readOnlyAnnouncement}</p>

          <BoardHorizonBucketsSection
            byBucket={selectors.byBucket}
            titles={selectors.titles}
            nodeById={selectors.nodeById}
          />

          <section aria-labelledby="plan-board-operational-heading" className="space-y-3">
            <BoardHeader
              state={{
                showConsultantPlanTools,
                columnPolicyEditable: Boolean(boardQuery.data?.column_policy_editable),
                draggingCardId,
              }}
              actions={{
                onOpenBoardSettings: () => {
                  setBoardSettingsOpen(true);
                },
              }}
            />
            <BoardFilters
              visibility={{ boardOperationalVisible, showConsultantPlanTools }}
              filters={{
                laneFilterKeys,
                metricFilters,
                availableDomainFilters: selectors.availableDomainFilters,
                availableAssignees: selectors.availableAssignees,
              }}
              bulk={{
                selectedCount: selectedCardIds.size,
                columns: selectors.operationalColumnDescriptors,
                dragLocked,
                busy: batchPatchMutation.isPending,
                bulkPriority,
                bulkAssignee,
                bulkDueDate,
              }}
              setters={{
                onSetBulkPriority: setBulkPriority,
                onSetBulkAssignee: setBulkAssignee,
                onSetBulkDueDate: setBulkDueDate,
              }}
              actions={{
                onClearLaneFilters: boardInteractions.onClearLaneFilters,
                onPatchFilters: boardInteractions.onPatchFilters,
                onMoveAll: boardInteractions.onMoveAll,
                onApplyPriority: () => boardInteractions.onApplyPriority(bulkPriority),
                onApplyAssignee: () => boardInteractions.onApplyAssignee(bulkAssignee),
                onApplyDueDate: () => boardInteractions.onApplyDueDate(bulkDueDate),
                onClearSelected: boardInteractions.onClearSelected,
              }}
            />

            <BoardColumns
              status={{
                boardOperationalVisible,
                strategyStudioHref,
                governanceReadOnly,
                showConsultantPlanTools,
                orphanCount,
                auditId,
                orchestrationPackVersion,
                boardIssueNoPack: Boolean(boardQuery.data?.issues?.some((i) => i.code === 'no_pack')),
                boardPending: boardQuery.isPending,
                boardError: boardQuery.isError,
                manifestDraftPendingCount: boardQuery.data?.manifest_draft_revision_pending_canonical_keys?.length ?? 0,
              }}
              grid={{
                visible: boardOperationalVisible && !boardQuery.isPending,
                props: {
                  sensors,
                  draggingCardId,
                  cardsById: selectors.cardsById,
                  operationalColumnDescriptors: selectors.operationalColumnDescriptors,
                  columnBuckets,
                  laneFilterKeys,
                  metricFilters,
                  cardMetricsById: selectors.cardMetricsById,
                  boardColumns: boardQuery.data?.columns,
                  showConsultantPlanTools,
                  dragLocked,
                  auditId,
                  governanceReadOnly,
                  orchestrationPackVersion,
                  canEditCardFields,
                  laneSelectOptions,
                  manifestDraftLaneHintsEnabled,
                  selectedCardIds,
                  focusToken,
                  pendingManifestDraftCanonicalSet: selectors.pendingManifestDraftCanonicalSet,
                  buildCardPresentation: selectors.buildCardPresentation,
                  onDragStart: handleDragStart,
                  onDragEnd: handleDragEnd,
                  onMoveViaMenu: moveCardViaMenu,
                  onToggleSelect: boardInteractions.onToggleSelect,
                  onDeleteCard: boardInteractions.onDeleteCard,
                  onOpenTicketDetails: boardInteractions.onOpenTicketDetails,
                  onCommitTitle: boardInteractions.commitCardTitleInline,
                  onCommitLane: boardInteractions.commitCardLaneInline,
                  onCommitPriority: boardInteractions.commitCardPriorityInline,
                  onCommitDueDate: boardInteractions.commitCardDueDateInline,
                  onQuickPromoteToNextUp: (cardId) => moveCardViaMenu('next_up', cardId),
                },
              }}
            />
          </section>
        </PortalPlanLayout>

        <BoardDialogs
          state={{
            deleteDialogOpen: deleteCardId != null,
            boardSettingsOpen,
            ticketDetailsOpen: ticketDetailsCardId != null,
            patchPending: patchMutation.isPending,
          }}
          data={{
            auditId,
            columns: boardQuery.data?.columns,
            selectedTicketCard,
            canEditCardFields,
          }}
          actions={{
            onDeleteDialogOpenChange: (open) => !open && setDeleteCardId(null),
            onConfirmDelete: () => void confirmDeleteCard(deleteCardId),
            onBoardSettingsOpenChange: setBoardSettingsOpen,
            onTicketDetailsOpenChange: (open) => {
              if (!open) setTicketDetailsCardId(null);
            },
            onSaveTicketDetails: saveTicketDetails,
          }}
        />
      </BoardShell>
    </PortalPlanSurfaceChrome>
  );
}
