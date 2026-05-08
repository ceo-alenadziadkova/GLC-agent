import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import type { InlineLaneOption } from '../../../components/glc/InlineEditableLanePicker';
import type { PlanBoardCardDto } from '../../../data/api/orchestration-types';
import {
  usePatchPlanBoardCardsBatchMutation,
  usePatchPlanBoardCardMutation,
  usePlanBoardQuery,
  usePostManifestDraftRevisionMutation,
} from '../../../data/api/plan-board-queries';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_PRIORITY_REASON_CODES,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import { PLAN_WORKSPACE_UI_COPY } from '../../../config/plan-workspace-ui-copy.en';
import { usePlanCommandRegistration } from '../../../context/PlanCommandRegistryContext';
import { usePlanFocusCanonicalToken } from '../../../hooks/usePlanFocusKey';
import { useProfile } from '../../../hooks/useProfile';
import { useQueryClient } from '../../../lib/tanstack-react-query';
import { invalidatePlanBoardQueriesAfterConflict } from '../../../lib/plan-board-query-invalidation';
import {
  buildPlanSurfaceHrefWithFocus,
  mergePlanCardMetricFiltersIntoLocationSearch,
  mergeClearLaneFilterIntoLocationSearch,
  mergeLaneFilterToggleIntoLocationSearch,
  readPlanCardMetricFilters,
  readPlanLaneFilterKeys,
} from '../../../lib/plan-cross-nav';
import type { PlanWorkspacePaletteCommand } from '../../../lib/plan-command-registry';
import { canEditPlanBoardCardFields } from '../../../lib/plan-board-policy';
import { isGlcOrchestrationPackView } from '../../../lib/orchestration-pack-guards';
import { PortalPlanLayout } from '../PortalPlanLayout';
import { usePortalPlanOrchestration } from '../PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from '../PortalPlanUnifiedShell';
import { toast } from 'sonner';
import { PlanTicketDetailsPanel, type PlanTicketDetailsDraft } from '../PlanTicketDetailsPanel';
import { usePlanTableSurfaceModel } from './plan-table/usePlanTableSurfaceModel';
import { PlanTableActiveLaneChips } from './plan-table/PlanTableActiveLaneChips';
import { PlanTableMetricFiltersBar } from './plan-table/PlanTableMetricFiltersBar';
import { PlanTableBulkActionsBar } from './plan-table/PlanTableBulkActionsBar';
import { PlanTableGroupedSections } from './plan-table/PlanTableGroupedSections';

const ORCHESTRATION_LANE_IDS_ORDERED = Object.keys(ORCHESTRATION_LANE_LABELS) as OrchestrationLaneId[];

export type PlanTableSurfaceProps = {
  unifiedShellTabActive?: boolean;
};

function cardFocusMatch(card: PlanBoardCardDto, focus: string | null): boolean {
  if (!focus) return false;
  if (card.id === focus) return true;
  if (card.canonical_node_key === focus) return true;
  if (card.pack_graph_node_id === focus) return true;
  return false;
}

/**
 * Table projection of plan delivery (`plan_task_delivery` via plan-board API): group by lane and column.
 */
export function PlanTableSurface({ unifiedShellTabActive = true }: PlanTableSurfaceProps) {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useProfile();
  const auditId = id ?? '';
  const focusToken = usePlanFocusCanonicalToken();
  const navigate = useNavigate();
  const location = useLocation();
  const laneFilterKeys = useMemo(() => readPlanLaneFilterKeys(location.search), [location.search]);
  const metricFilters = useMemo(() => readPlanCardMetricFilters(location.search), [location.search]);
  const {
    audit,
    auditLoading: loading,
    auditError: error,
    packQuery,
    includeTimelineFetch,
    timelineQuery,
  } = usePortalPlanOrchestration();
  const qc = useQueryClient();
  const pack = packQuery.data?.pack ?? null;
  const orchestrationPackVersion = packQuery.data?.orchestration_pack_version ?? 0;

  const loadPending =
    loading ||
    packQuery.isPending ||
    (includeTimelineFetch ? timelineQuery.isPending : false);
  const loadError = packQuery.isError || (includeTimelineFetch ? timelineQuery.isError : false);

  const boardQuery = usePlanBoardQuery({
    auditId,
    enabled: Boolean(auditId) && Boolean(pack) && !loadPending && isGlcOrchestrationPackView(pack),
  });

  const patchMutation = usePatchPlanBoardCardMutation({ auditId });
  const batchPatchMutation = usePatchPlanBoardCardsBatchMutation({ auditId });
  const governanceReadOnly = Boolean(boardQuery.data?.issues?.some(i => i.code === 'governance_blocked'));
  const showConsultantPlanTools = !isClient;
  const canMutateCard = canEditPlanBoardCardFields({
    role: isClient ? 'client' : 'consultant',
    governanceReadOnly,
  });
  const tablePaletteOperational =
    Boolean(auditId) &&
    Boolean(boardQuery.data) &&
    !boardQuery.data!.issues.some(i => i.code === 'no_pack');
  const manifestDraftMutation = usePostManifestDraftRevisionMutation(
    APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools ? auditId : undefined,
  );
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkPriority, setBulkPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [ticketDetailsCardId, setTicketDetailsCardId] = useState<string | null>(null);
  const [backlogOnly, setBacklogOnly] = useState(false);

  const cardsById = useMemo(
    () => new Map(boardQuery.data?.cards.map(c => [c.id, c]) ?? []),
    [boardQuery.data?.cards],
  );
  const selectedTicketCard = ticketDetailsCardId != null ? cardsById.get(ticketDetailsCardId) ?? null : null;

  const top7Set = useMemo(
    () => new Set(boardQuery.data?.timeline_parity?.top_7d ?? []),
    [boardQuery.data?.timeline_parity?.top_7d],
  );
  const top30Set = useMemo(
    () => new Set(boardQuery.data?.timeline_parity?.top_30d ?? []),
    [boardQuery.data?.timeline_parity?.top_30d],
  );
  const reasonLabelByNodeId = useMemo(
    () =>
      new Map(
        (boardQuery.data?.timeline_parity?.top_priorities ?? []).map((row) => [
          row.action_id,
          ORCHESTRATION_PRIORITY_REASON_CODES[row.reason_code] ?? row.reason_code,
        ]),
      ),
    [boardQuery.data?.timeline_parity?.top_priorities],
  );

  const laneSelectOptions: readonly InlineLaneOption[] = useMemo(
    () => ORCHESTRATION_LANE_IDS_ORDERED.map(laneId => ({ value: laneId, label: ORCHESTRATION_LANE_LABELS[laneId] })),
    [],
  );

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
    async (cardId: string, lane: OrchestrationLaneId, ownerHint?: string) => {
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

  const commitInlinePatch = useCallback(
    async (
      cardId: string,
      body: {
        expected_pack_version: number;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        due_date?: string;
        story_points?: number | null;
      },
    ) => {
      try {
        await patchMutation.mutateAsync({ cardId, body });
      } catch (err) {
        await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
        throw err;
      }
    },
    [auditId, patchMutation, qc],
  );

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

  const bulkMoveSelected = useCallback(
    async (targetColumnId: string) => {
      if (selectedCardIds.size === 0) return;
      for (const cardId of selectedCardIds) {
        // eslint-disable-next-line no-await-in-loop
        await patchMutation.mutateAsync({
          cardId,
          body: { expected_pack_version: orchestrationPackVersion, to_column: targetColumnId },
        });
      }
      setSelectedCardIds(new Set());
    },
    [orchestrationPackVersion, patchMutation, selectedCardIds],
  );

  const bulkPatchSelected = useCallback(
    async (patch: { assignee?: string; priority?: 'low' | 'medium' | 'high' | 'urgent'; due_date?: string }) => {
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
    },
    [auditId, batchPatchMutation, orchestrationPackVersion, qc, selectedCardIds],
  );

  const {
    groupedRows: filteredGroupedRows,
    metricsByCardId,
    availableDomainFilters,
    availableAssignees,
  } = usePlanTableSurfaceModel({
    cards: boardQuery.data?.cards ?? [],
    columns: boardQuery.data?.columns,
    laneFilterKeys,
    metricFilters,
    backlogOnly,
    top7Set,
    top30Set,
    reasonLabelByNodeId,
  });

  const planTablePaletteCommands = useMemo((): PlanWorkspacePaletteCommand[] => {
    if (unifiedShellTabActive === false) return [];
    if (!auditId || !tablePaletteOperational || boardQuery.isPending || !boardQuery.data) return [];
    const cards = boardQuery.data.cards ?? [];
    const out: PlanWorkspacePaletteCommand[] = [];
    for (const card of cards) {
      const safeTitle = (card.title ?? card.canonical_node_key ?? card.id).replace(/"/g, "'");
      const focusForRoadmap = card.canonical_node_key ?? card.pack_graph_node_id ?? null;
      if (focusForRoadmap) {
        const href = buildPlanSurfaceHrefWithFocus({
          auditId,
          isClient,
          view: 'roadmap',
          focusCanonicalKey: focusForRoadmap,
        });
        out.push({
          id: `table-open-roadmap-${card.id}`,
          label: `Open "${safeTitle}" in Roadmap`,
          keywords: `roadmap schedule focus ${safeTitle}`,
          run: () => {
            navigate(href);
          },
        });
      }
    }
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
    boardQuery.data,
    boardQuery.isPending,
    isClient,
    location.pathname,
    location.search,
    navigate,
    tablePaletteOperational,
    unifiedShellTabActive,
  ]);

  usePlanCommandRegistration('plan-table-surface', planTablePaletteCommands);

  const title = PLAN_WORKSPACE_UI_COPY.tableShellTitle;
  const subtitle = PLAN_WORKSPACE_UI_COPY.tableShellSubtitle;

  if (!auditId) return null;

  if (loading && !audit) {
    return (
      <PortalPlanSurfaceChrome branch="table" tabActive={unifiedShellTabActive} title={title} subtitle={subtitle}>
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <p className="text-muted-foreground text-sm">{PLAN_WORKSPACE_UI_COPY.loadingHeadline}</p>
        </div>
      </PortalPlanSurfaceChrome>
    );
  }

  if (error || loadError || !audit) {
    return (
      <PortalPlanSurfaceChrome branch="table" tabActive={unifiedShellTabActive} title={title} subtitle={subtitle}>
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <p className="text-destructive text-sm">{error ?? PLAN_WORKSPACE_UI_COPY.tableLoadError}</p>
        </div>
      </PortalPlanSurfaceChrome>
    );
  }

  return (
    <PortalPlanSurfaceChrome branch="table" tabActive={unifiedShellTabActive} title={title} subtitle={subtitle}>
      <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="table">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6" data-testid="plan-table-surface-root">
          {showConsultantPlanTools ? (
            <PlanTableActiveLaneChips
              laneFilterKeys={laneFilterKeys}
              onClear={() =>
                navigate(
                  mergeClearLaneFilterIntoLocationSearch({
                    pathname: location.pathname,
                    currentSearch: location.search,
                  }),
                )
              }
            />
          ) : null}
          {showConsultantPlanTools ? (
            <PlanTableMetricFiltersBar
              metricFilters={metricFilters}
              backlogOnly={backlogOnly}
              availableDomainFilters={availableDomainFilters}
              availableAssignees={availableAssignees}
              onToggleBacklogOnly={() => setBacklogOnly((prev) => !prev)}
              onPatchFilters={(patch) =>
                navigate(
                  mergePlanCardMetricFiltersIntoLocationSearch({
                    pathname: location.pathname,
                    currentSearch: location.search,
                    patch,
                  }),
                )
              }
            />
          ) : null}
          {showConsultantPlanTools ? (
            <PlanTableBulkActionsBar
              selectedCount={selectedCardIds.size}
              columns={boardQuery.data?.columns ?? []}
              patchBusy={patchMutation.isPending}
              batchBusy={batchPatchMutation.isPending}
              bulkPriority={bulkPriority}
              bulkAssignee={bulkAssignee}
              bulkDueDate={bulkDueDate}
              onSetBulkPriority={setBulkPriority}
              onSetBulkAssignee={setBulkAssignee}
              onSetBulkDueDate={setBulkDueDate}
              onMoveAll={(columnId) => void bulkMoveSelected(columnId)}
              onApplyPriority={() => void bulkPatchSelected({ priority: bulkPriority })}
              onApplyAssignee={() => void bulkPatchSelected({ assignee: bulkAssignee.trim() })}
              onApplyDueDate={() => void bulkPatchSelected({ due_date: bulkDueDate })}
              onClear={() => setSelectedCardIds(new Set())}
            />
          ) : null}
          <PlanTableGroupedSections
            pending={boardQuery.isPending || !boardQuery.data}
            groups={filteredGroupedRows}
            loadingText={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
            emptyText={PLAN_WORKSPACE_UI_COPY.tablePlaceholderBody}
            canMutateCard={canMutateCard}
            laneSelectOptions={laneSelectOptions}
            boardColumns={boardQuery.data?.columns}
            metricsByCardId={metricsByCardId}
            selectedCardIds={selectedCardIds}
            isFocusTarget={(cardId) => {
              const card = cardsById.get(cardId);
              return card ? cardFocusMatch(card, focusToken) : false;
            }}
            onCommitTitle={commitCardTitleInline}
            onCommitLane={commitCardLaneInline}
            onCommitPriority={(cardId, priority) =>
              commitInlinePatch(cardId, { expected_pack_version: orchestrationPackVersion, priority })
            }
            onCommitDueDate={(cardId, dueDate) =>
              commitInlinePatch(cardId, { expected_pack_version: orchestrationPackVersion, due_date: dueDate })
            }
            onCommitStoryPoints={(cardId, storyPoints) =>
              commitInlinePatch(cardId, {
                expected_pack_version: orchestrationPackVersion,
                story_points: storyPoints,
              })
            }
            onOpenTicketDetails={setTicketDetailsCardId}
            onPromoteFromBacklog={async (cardId) => {
              try {
                await patchMutation.mutateAsync({
                  cardId,
                  body: { expected_pack_version: orchestrationPackVersion, to_column: 'next_up' },
                });
              } catch (err) {
                await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
              }
            }}
            onToggleSelect={(cardId) =>
              setSelectedCardIds((prev) => {
                const next = new Set(prev);
                if (next.has(cardId)) next.delete(cardId);
                else next.add(cardId);
                return next;
              })
            }
          />
        </div>
        <PlanTicketDetailsPanel
          auditId={auditId}
          open={ticketDetailsCardId != null}
          onOpenChange={(open) => {
            if (!open) setTicketDetailsCardId(null);
          }}
          card={selectedTicketCard}
          canMutateCard={canMutateCard}
          columnOptions={boardQuery.data?.columns ?? []}
          busy={patchMutation.isPending}
          onSave={saveTicketDetails}
        />
      </PortalPlanLayout>
    </PortalPlanSurfaceChrome>
  );
}
