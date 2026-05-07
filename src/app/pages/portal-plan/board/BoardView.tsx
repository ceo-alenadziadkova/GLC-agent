import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
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
import { resolvePlanBoardWipLimit } from '../../../config/plan-board-workflow-policy';
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
import { PlanTicketDetailsPanel, type PlanTicketDetailsDraft } from '../PlanTicketDetailsPanel';
import {
  buildPlanBoardCardMetrics,
  formatLaneDensityLine,
  isBacklogOperationalColumn,
  matchesPlanCardMetricFilters,
} from './plan-board-card-helpers';
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
        : bucketPlanBoardCardsByColumn(boardQuery.data?.cards ?? [], operationalColumnIds),
    );
  }, [hydrateSignature, operationalColumnIdsKey, boardQuery.data?.cards, operationalColumnIds]);

  const cardsById = useMemo(() => new Map(boardQuery.data?.cards.map((c) => [c.id, c]) ?? []), [boardQuery.data?.cards]);
  const focusCardForCommands = useMemo(() => {
    if (!focusToken) return null;
    for (const card of boardQuery.data?.cards ?? []) {
      if (card.id === focusToken || card.canonical_node_key === focusToken || card.pack_graph_node_id === focusToken) {
        return card;
      }
    }
    return null;
  }, [boardQuery.data?.cards, focusToken]);

  const pendingManifestDraftKey = [...(boardQuery.data?.manifest_draft_revision_pending_canonical_keys ?? [])]
    .slice()
    .sort()
    .join('|');
  const pendingManifestDraftCanonicalSet = useMemo(
    () => new Set(boardQuery.data?.manifest_draft_revision_pending_canonical_keys ?? []),
    [pendingManifestDraftKey],
  );

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
    async (cardId: string, lane: string, ownerHint?: string) => {
      const card = cardsById.get(cardId);
      try {
        if (APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools) {
          const ck = card?.canonical_node_key;
          if (ck) {
            await manifestDraftMutation.mutateAsync({
              canonical_node_key: ck,
              expected_pack_version: orchestrationPackVersion,
              lane,
              ...(ownerHint != null && ownerHint !== '' ? { owner_hint: ownerHint } : {}),
            });
            toast.success(ORCHESTRATION_UI_COPY.manifestDraftLaneQueuedToast);
            return;
          }
        }
        await patchMutation.mutateAsync({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, lane },
        });
      } catch (err) {
        await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
        throw err;
      }
    },
    [auditId, cardsById, manifestDraftMutation, orchestrationPackVersion, patchMutation, qc, showConsultantPlanTools],
  );

  const commitCardPriorityInline = useCallback(
    async (cardId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
      try {
        await patchMutation.mutateAsync({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, priority },
        });
      } catch (err) {
        await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
        throw err;
      }
    },
    [auditId, orchestrationPackVersion, patchMutation, qc],
  );

  const commitCardDueDateInline = useCallback(
    async (cardId: string, dueDateIso: string) => {
      try {
        await patchMutation.mutateAsync({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, due_date: dueDateIso || undefined },
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

  const persistCardPlacement = useCallback(
    async (prev: Record<string, string[]>, after: Record<string, string[]>, cardId: string) => {
      const prevColumn = findColumn(prev, cardId);
      const nextColumn = findColumn(after, cardId);
      if (!prevColumn || !nextColumn) return;

      const body: {
        expected_pack_version: number;
        to_column?: string;
        position?: number;
      } = {
        expected_pack_version: boardQuery.data?.pack_version_used ?? orchestrationPackVersion,
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
    },
    [auditId, boardQuery.data?.pack_version_used, orchestrationPackVersion, patchMutation, qc],
  );

  const moveCardViaMenu = useCallback(
    async (targetCol: string, cardId: string) => {
      const prev = cloneBuckets(columnBuckets);
      const draft = moveCardIntoColumn(prev, cardId, targetCol);
      if (!draft) return;
      setColumnBuckets(draft);
      await persistCardPlacement(prev, draft, cardId);
    },
    [columnBuckets, persistCardPlacement],
  );

  const planBoardPaletteCommands = useMemo((): PlanWorkspacePaletteCommand[] => {
    if (unifiedShellTabActive === false) return [];
    if (!auditId || !boardOperationalVisible || boardQuery.isPending || !boardQuery.data) return [];
    const cards = boardQuery.data.cards ?? [];
    const out: PlanWorkspacePaletteCommand[] = [];
    for (const card of cards) {
      const safeTitle = (card.title ?? card.canonical_node_key ?? card.id).replace(/"/g, "'");
      for (const col of operationalColumnDescriptors) {
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
    if (focusCardForCommands) {
      const safeTitle = (focusCardForCommands.title ?? focusCardForCommands.canonical_node_key ?? focusCardForCommands.id).replace(/"/g, "'");
      out.push({
        id: 'focus-priority-high',
        label: `Set "${safeTitle}" priority to high`,
        keywords: `priority high focused ${safeTitle}`,
        run: () => {
          void commitCardPriorityInline(focusCardForCommands.id, 'high');
        },
      });
      out.push({
        id: 'focus-priority-urgent',
        label: `Set "${safeTitle}" priority to urgent`,
        keywords: `priority urgent focused ${safeTitle}`,
        run: () => {
          void commitCardPriorityInline(focusCardForCommands.id, 'urgent');
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
          void commitCardDueDateInline(focusCardForCommands.id, iso);
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
    commitCardDueDateInline,
    commitCardPriorityInline,
    focusCardForCommands,
    moveCardViaMenu,
    navigate,
    operationalColumnDescriptors,
    unifiedShellTabActive,
  ]);

  usePlanCommandRegistration('plan-board-operational', planBoardPaletteCommands);

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

  async function bulkMoveSelected(targetCol: string): Promise<void> {
    if (selectedCardIds.size === 0) return;
    for (const cardId of selectedCardIds) {
      // eslint-disable-next-line no-await-in-loop
      await moveCardViaMenu(targetCol, cardId);
    }
    setSelectedCardIds(new Set());
  }

  async function bulkPatchSelected(patch: { assignee?: string; priority?: 'low' | 'medium' | 'high' | 'urgent'; due_date?: string }) {
    if (selectedCardIds.size === 0) return;
    try {
      await batchPatchMutation.mutateAsync({
        expected_pack_version: orchestrationPackVersion,
        patches: [...selectedCardIds].map((card_id) => ({
          card_id,
          ...patch,
        })),
      });
      setSelectedCardIds(new Set());
    } catch (err) {
      await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
    }
  }

  const subtitle = showConsultantPlanTools ? PLAN_BOARD_COPY.shellSubtitleConsultant : PLAN_BOARD_COPY.shellSubtitleReadOnlyClient;
  const selectedTicketCard = ticketDetailsCardId != null ? cardsById.get(ticketDetailsCardId) ?? null : null;

  const saveTicketDetails = useCallback(
    async (cardId: string, draft: PlanTicketDetailsDraft) => {
      try {
        await patchMutation.mutateAsync({
          cardId,
          body: {
            expected_pack_version: orchestrationPackVersion,
            title: draft.title.trim(),
            ticket_description: draft.ticket_description.trim(),
            assignee: draft.assignee.trim(),
            assignee_user_id: draft.assignee_user_id.trim() !== '' ? draft.assignee_user_id.trim() : null,
            labels: draft.labels
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            story_points: draft.story_points.trim() !== '' ? Number(draft.story_points) : null,
            priority: draft.priority,
            lane: draft.lane.trim() !== '' ? draft.lane.trim() : undefined,
            delivery_area: draft.delivery_area.trim(),
            start_date: draft.start_date || undefined,
            due_date: draft.due_date || undefined,
            end_date: draft.end_date || undefined,
            ...(selectedTicketCard?.column_id !== draft.to_column ? { to_column: draft.to_column } : {}),
          },
        });
        toast.success('Ticket updated');
      } catch (err) {
        await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
        toast.error('Could not update ticket');
      }
    },
    [auditId, orchestrationPackVersion, patchMutation, qc, selectedTicketCard?.column_id],
  );

  const boardPackReady = !loadPending && !loadError && isGlcOrchestrationPackView(pack);
  const glcPack = boardPackReady ? pack : null;

  const timelineParity = boardQuery.data?.timeline_parity;
  const timelineDto = timelineQuery.data?.timeline;
  const seasonPreset = resolveBoardSeasonPreset({
    parity: timelineParity,
    timeline: timelineDto ?? null,
  });
  const projections = glcPack ? projectRoadmapNodesFromCriticalPath({ pack: glcPack, seasonPreset }) : [];
  const titles = glcPack ? orchestrationNodeTitleMap(glcPack) : new Map();
  const nodeById = glcPack ? new Map(glcPack.graph.nodes.map((n) => [n.id, n])) : new Map();

  const top7List =
    timelineParity?.top_7d ?? (timelineDto?.status === 'ready' ? timelineDto.top_7d : []) ?? [];
  const top30List =
    timelineParity?.top_30d ?? (timelineDto?.status === 'ready' ? timelineDto.top_30d : []) ?? [];
  const prioritySets = { top7: new Set(top7List), top30: new Set(top30List) };

  const reasonRows =
    timelineParity?.top_priorities ?? (timelineDto?.status === 'ready' ? timelineDto.top_priorities : undefined) ?? [];
  const reasonByPackNodeId = new Map(reasonRows.map((p) => [p.action_id, p.reason_code] as const));
  const priorityReasonLabelByPackNodeId = new Map(
    reasonRows.map((p) => [p.action_id, ORCHESTRATION_PRIORITY_REASON_CODES[p.reason_code] ?? p.reason_code] as const),
  );

  const cardMetricsById = useMemo(() => {
    const out = new Map<string, ReturnType<typeof buildPlanBoardCardMetrics>>();
    for (const card of boardQuery.data?.cards ?? []) {
      const packNodeId = card.pack_graph_node_id;
      const priorityWindow =
        packNodeId && prioritySets.top7.has(packNodeId) ? ('7d' as const)
        : packNodeId && prioritySets.top30.has(packNodeId) ? ('30d' as const)
        : null;
      const priorityReasonLabel = packNodeId ? priorityReasonLabelByPackNodeId.get(packNodeId) : null;
      out.set(card.id, buildPlanBoardCardMetrics({ card, priorityWindow, priorityReasonLabel }));
    }
    return out;
  }, [boardQuery.data?.cards, priorityReasonLabelByPackNodeId, prioritySets.top30, prioritySets.top7]);

  const availableDomainFilters = useMemo(() => {
    const m = new Map<string, number>();
    for (const card of boardQuery.data?.cards ?? []) {
      const key = cardMetricsById.get(card.id)?.domainKey ?? 'other';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }, [boardQuery.data?.cards, cardMetricsById]);
  const availableAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const card of boardQuery.data?.cards ?? []) {
      const assignee = card.assignee?.trim();
      if (assignee) set.add(assignee);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [boardQuery.data?.cards]);

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

            {boardOperationalVisible && showConsultantPlanTools && laneFilterKeys.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
                <span className="text-muted-foreground text-xs">
                  {PLAN_WORKSPACE_UI_COPY.laneFilterChipPrefix}{' '}
                  {laneFilterKeys
                    .map((k) => ORCHESTRATION_LANE_LABELS[k as OrchestrationLaneId] ?? k)
                    .join(', ')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    navigate(
                      mergeClearLaneFilterIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                      }),
                    )
                  }
                >
                  {PLAN_WORKSPACE_UI_COPY.laneFilterChipClear}
                </Button>
              </div>
            ) : null}
            {boardOperationalVisible && showConsultantPlanTools ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter cards by domain"
                  className="border-border bg-background h-8 rounded-md border px-2 text-xs"
                  value={metricFilters.domain}
                  onChange={(e) =>
                    navigate(
                      mergePlanCardMetricFiltersIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                        patch: { domain: e.target.value || 'all' },
                      }),
                    )
                  }
                >
                  <option value="all">All domains</option>
                  {availableDomainFilters.map(([key, count]) => (
                    <option key={key} value={key}>
                      {`${key.replaceAll('_', ' ')} (${count})`}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter cards by assignee"
                  className="border-border bg-background h-8 rounded-md border px-2 text-xs"
                  value={metricFilters.assignee}
                  onChange={(e) =>
                    navigate(
                      mergePlanCardMetricFiltersIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                        patch: { assignee: e.target.value || 'all' },
                      }),
                    )
                  }
                >
                  <option value="all">All assignees</option>
                  {availableAssignees.map((assignee) => (
                    <option key={assignee} value={assignee}>
                      {assignee}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant={metricFilters.criticalOnly ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    navigate(
                      mergePlanCardMetricFiltersIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                        patch: { criticalOnly: !metricFilters.criticalOnly },
                      }),
                    )
                  }
                >
                  Critical only
                </Button>
                <Button
                  type="button"
                  variant={metricFilters.quickOnly ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    navigate(
                      mergePlanCardMetricFiltersIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                        patch: { quickOnly: !metricFilters.quickOnly },
                      }),
                    )
                  }
                >
                  Quick wins
                </Button>
                <select
                  aria-label="Filter cards by priority window"
                  className="border-border bg-background h-8 rounded-md border px-2 text-xs"
                  value={metricFilters.priority}
                  onChange={(e) =>
                    navigate(
                      mergePlanCardMetricFiltersIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                        patch: { priority: e.target.value as 'all' | '7d' | '30d' },
                      }),
                    )
                  }
                >
                  <option value="all">All priorities</option>
                  <option value="7d">Top 7d</option>
                  <option value="30d">Top 30d</option>
                </select>
                <select
                  aria-label="Filter cards by due state"
                  className="border-border bg-background h-8 rounded-md border px-2 text-xs"
                  value={metricFilters.dueState}
                  onChange={(e) =>
                    navigate(
                      mergePlanCardMetricFiltersIntoLocationSearch({
                        pathname: location.pathname,
                        currentSearch: location.search,
                        patch: { dueState: e.target.value as 'all' | 'overdue' | 'due_soon' | 'no_due' },
                      }),
                    )
                  }
                >
                  <option value="all">All due states</option>
                  <option value="overdue">Overdue</option>
                  <option value="due_soon">Due soon (7d)</option>
                  <option value="no_due">No due date</option>
                </select>
              </div>
            ) : null}
            {boardOperationalVisible && showConsultantPlanTools && selectedCardIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-2">
                <span className="text-xs text-muted-foreground">{`${selectedCardIds.size} selected`}</span>
                {operationalColumnDescriptors.map((col) => (
                  <Button
                    key={col.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => void bulkMoveSelected(col.id)}
                    disabled={dragLocked || batchPatchMutation.isPending}
                  >
                    {`Move to ${col.title}`}
                  </Button>
                ))}
                <select
                  aria-label="Bulk set priority"
                  className="border-border bg-background h-7 rounded-md border px-2 text-xs"
                  value={bulkPriority}
                  onChange={(e) => setBulkPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                >
                  <option value="low">Priority low</option>
                  <option value="medium">Priority medium</option>
                  <option value="high">Priority high</option>
                  <option value="urgent">Priority urgent</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void bulkPatchSelected({ priority: bulkPriority })}
                  disabled={batchPatchMutation.isPending}
                >
                  Apply priority
                </Button>
                <input
                  aria-label="Bulk assignee"
                  className="border-border bg-background h-7 rounded-md border px-2 text-xs"
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  placeholder="Assignee"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void bulkPatchSelected({ assignee: bulkAssignee.trim() })}
                  disabled={batchPatchMutation.isPending || bulkAssignee.trim() === ''}
                >
                  Apply assignee
                </Button>
                <input
                  aria-label="Bulk due date"
                  type="date"
                  className="border-border bg-background h-7 rounded-md border px-2 text-xs"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void bulkPatchSelected({ due_date: bulkDueDate })}
                  disabled={batchPatchMutation.isPending || bulkDueDate === ''}
                >
                  Apply due
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedCardIds(new Set())}
                >
                  Clear
                </Button>
              </div>
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
                      const idsRaw = columnBuckets[colId] ?? [];
                      const ids = idsRaw.filter((cid) => {
                        const dto = cardsById.get(cid);
                        if (!dto) return false;
                        if (laneFilterKeys.length > 0) {
                          const lk = dto.lane?.trim() ?? '';
                          if (!laneFilterKeys.includes(lk)) return false;
                        }
                        const metrics = cardMetricsById.get(cid);
                        if (!metrics) return true;
                        return matchesPlanCardMetricFilters(metrics, metricFilters);
                      });
                      const laneMixCaption = formatLaneDensityLine(ids, cardsById);
                      const backlog = isBacklogOperationalColumn(boardQuery.data?.columns, colId);

                      const columnInner = (
                        <BoardColumnShell
                          columnId={colId}
                          heading={heading}
                          laneMixCaption={laneMixCaption}
                          workflowHint={
                            (() => {
                              const limit = resolvePlanBoardWipLimit(colId);
                              if (limit == null) return null;
                              if (ids.length <= limit) return `WIP limit ${limit}`;
                              return `WIP ${ids.length}/${limit} (over limit)`;
                            })()
                          }
                        >
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
                              const metrics = cardMetricsById.get(dto.id);
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
                                  domainLabel={dto.delivery_area ? dto.delivery_area.replaceAll('_', ' ') : null}
                                  quickWin={metrics?.quickWin ?? false}
                                  critical={metrics?.critical ?? false}
                                  assignee={metrics?.assignee ?? null}
                                  dueDate={metrics?.dueDate ?? null}
                                  dueState={metrics?.dueState ?? 'no_due'}
                                  priorityLevel={metrics?.priorityLevel ?? null}
                                  selected={selectedCardIds.has(dto.id)}
                                  onToggleSelect={() =>
                                    setSelectedCardIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(dto.id)) next.delete(dto.id);
                                      else next.add(dto.id);
                                      return next;
                                    })
                                  }
                                  canMutateCard={canEditCardFields}
                                  onCommitTitleInline={t => commitCardTitleInline(dto.id, t)}
                                  onCommitLaneInline={
                                    showConsultantPlanTools && !governanceReadOnly
                                      ? (lane, hint) => commitCardLaneInline(dto.id, lane, hint)
                                      : undefined
                                  }
                                  laneSelectOptions={laneSelectOptions}
                                  manifestDraftLaneHintsEnabled={manifestDraftLaneHintsEnabled}
                                  onDeleteCard={() => setDeleteCardId(dto.id)}
                                  onOpenTicketDetails={() => setTicketDetailsCardId(dto.id)}
                                  onCommitPriorityInline={(priority) => commitCardPriorityInline(dto.id, priority)}
                                  onCommitDueDateInline={(dueDateIso) => commitCardDueDateInline(dto.id, dueDateIso)}
                                  onQuickPromoteToNextUp={() => moveCardViaMenu('next_up', dto.id)}
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
        <PlanTicketDetailsPanel
          auditId={auditId}
          open={ticketDetailsCardId != null}
          onOpenChange={(open) => {
            if (!open) setTicketDetailsCardId(null);
          }}
          card={selectedTicketCard}
          canMutateCard={canEditCardFields}
          columnOptions={operationalColumnDescriptors}
          busy={patchMutation.isPending}
          onSave={saveTicketDetails}
        />
      </BoardShell>
    </PortalPlanSurfaceChrome>
  );
}
