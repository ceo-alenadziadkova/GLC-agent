import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { Button } from '../../../components/ui/button';
import { InlineEditableDate } from '../../../components/glc/InlineEditableDate';
import { InlineEditableLanePicker, type InlineLaneOption } from '../../../components/glc/InlineEditableLanePicker';
import { InlineEditableNumber } from '../../../components/glc/InlineEditableNumber';
import { InlineEditableSelect } from '../../../components/glc/InlineEditableSelect';
import { InlineEditableText } from '../../../components/glc/InlineEditableText';
import type { PlanBoardCardDto } from '../../../data/api/audits-orchestration';
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
import { PLAN_BOARD_COLUMN_HEADINGS_EN, PLAN_BOARD_UI_COLUMNS } from '../../../config/plan-board-ui-columns';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
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
import {
  buildPlanBoardPrimaryMarkers,
  buildPlanBoardCardMetrics,
  isBacklogOperationalColumn,
  laneDisplayLabel,
  matchesPlanCardMetricFilters,
  normalizePlanCardDomainKey,
  type PlanBoardCardMetrics,
} from '../board/plan-board-card-helpers';
import { PortalPlanLayout } from '../PortalPlanLayout';
import { usePortalPlanOrchestration } from '../PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from '../PortalPlanUnifiedShell';
import { toast } from 'sonner';
import { PlanTicketDetailsPanel, type PlanTicketDetailsDraft } from '../PlanTicketDetailsPanel';

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

  const columnTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const col of boardQuery.data?.columns ?? []) {
      m.set(col.id, col.title);
    }
    for (const id of PLAN_BOARD_UI_COLUMNS) {
      if (!m.has(id)) m.set(id, PLAN_BOARD_COLUMN_HEADINGS_EN[id]);
    }
    return m;
  }, [boardQuery.data?.columns]);

  const groupedRows = useMemo(() => {
    const cards = boardQuery.data?.cards ?? [];
    const lanes = [...ORCHESTRATION_LANE_IDS_ORDERED, '_other'] as const;
    const out: Array<{
      laneKey: string;
      laneLabel: string;
      columnId: string;
      columnLabel: string;
      cards: PlanBoardCardDto[];
    }> = [];

    const laneKeyFor = (c: PlanBoardCardDto): string => {
      const raw = c.lane?.trim() ?? '';
      if (raw && (ORCHESTRATION_LANE_IDS_ORDERED as readonly string[]).includes(raw)) return raw;
      return '_other';
    };

    for (const laneKey of lanes) {
      for (const columnId of PLAN_BOARD_UI_COLUMNS) {
        const inLaneCol = cards.filter(c => laneKeyFor(c) === laneKey && c.column_id === columnId);
        if (inLaneCol.length === 0) continue;
        const sorted = inLaneCol.slice().sort((a, b) => {
          const da = (a.delivery_area ?? '').localeCompare(b.delivery_area ?? '');
          if (da !== 0) return da;
          return (a.title ?? a.id).localeCompare(b.title ?? b.id);
        });
        out.push({
          laneKey,
          laneLabel: laneKey === '_other' ? 'Other lanes' : ORCHESTRATION_LANE_LABELS[laneKey as OrchestrationLaneId],
          columnId,
          columnLabel: columnTitleById.get(columnId) ?? columnId,
          cards: sorted,
        });
      }
    }
    return out;
  }, [boardQuery.data?.cards, columnTitleById]);

  const filteredGroupedRows = useMemo(() => {
    const laneSet = new Set(laneFilterKeys);
    return groupedRows
      .map(group => {
        if (backlogOnly && !isBacklogOperationalColumn(boardQuery.data?.columns, group.columnId)) {
          return { ...group, cards: [] as PlanBoardCardDto[] };
        }
        if (laneSet.size > 0 && !laneSet.has(group.laneKey)) {
          return { ...group, cards: [] as PlanBoardCardDto[] };
        }
        const cards = group.cards.filter((card) => {
          const packNodeId = card.pack_graph_node_id;
          const priorityWindow =
            packNodeId && top7Set.has(packNodeId) ? ('7d' as const)
            : packNodeId && top30Set.has(packNodeId) ? ('30d' as const)
            : null;
          const reasonLabel = packNodeId ? reasonLabelByNodeId.get(packNodeId) : null;
          const metrics = buildPlanBoardCardMetrics({
            card,
            priorityWindow,
            priorityReasonLabel: reasonLabel ?? null,
          });
          return matchesPlanCardMetricFilters(metrics, metricFilters);
        });
        return { ...group, cards };
      })
      .filter(group => group.cards.length > 0);
  }, [backlogOnly, boardQuery.data?.columns, groupedRows, laneFilterKeys, metricFilters, reasonLabelByNodeId, top30Set, top7Set]);

  const availableDomainFilters = useMemo(() => {
    const m = new Map<string, number>();
    for (const card of boardQuery.data?.cards ?? []) {
      const key = normalizePlanCardDomainKey(card.delivery_area);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }, [boardQuery.data?.cards]);
  const availableAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const card of boardQuery.data?.cards ?? []) {
      const assignee = card.assignee?.trim();
      if (assignee) set.add(assignee);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [boardQuery.data?.cards]);

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
          {showConsultantPlanTools && laneFilterKeys.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
              <span className="text-muted-foreground text-xs">
                {PLAN_WORKSPACE_UI_COPY.laneFilterChipPrefix}{' '}
                {laneFilterKeys
                  .map(k => ORCHESTRATION_LANE_LABELS[k as OrchestrationLaneId] ?? k)
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
          {showConsultantPlanTools ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter table cards by domain"
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
              <Button
                type="button"
                variant={backlogOnly ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setBacklogOnly((prev) => !prev)}
              >
                Backlog only
              </Button>
              <select
                aria-label="Filter table cards by priority window"
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
                aria-label="Filter table cards by assignee"
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
              <select
                aria-label="Filter table cards by due state"
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
          {showConsultantPlanTools && selectedCardIds.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-2">
              <span className="text-xs text-muted-foreground">{`${selectedCardIds.size} selected`}</span>
              {(boardQuery.data?.columns ?? []).map((col) => (
                <Button
                  key={col.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void bulkMoveSelected(col.id)}
                  disabled={patchMutation.isPending || batchPatchMutation.isPending}
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
          {boardQuery.isPending || !boardQuery.data ?
            <p className="text-muted-foreground text-sm">{PLAN_WORKSPACE_UI_COPY.loadingHeadline}</p>
          : filteredGroupedRows.length === 0 ?
            <p className="text-muted-foreground text-sm">{PLAN_WORKSPACE_UI_COPY.tablePlaceholderBody}</p>
          : filteredGroupedRows.map(group => (
              <section key={`${group.laneKey}-${group.columnId}`} className="space-y-2" aria-labelledby={`plan-table-${group.laneKey}-${group.columnId}`}>
                <h3 id={`plan-table-${group.laneKey}-${group.columnId}`} className="text-foreground text-sm font-semibold">
                  {group.laneLabel} · {group.columnLabel}
                </h3>
                <div className="border-border overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Select</th>
                        <th className="px-3 py-2 font-medium">{PLAN_BOARD_COPY.inlineTitleAriaLabel}</th>
                        <th className="px-3 py-2 font-medium">{PLAN_BOARD_COPY.laneLabelPrefix}</th>
                        <th className="px-3 py-2 font-medium">Delivery area</th>
                        <th className="px-3 py-2 font-medium">Metrics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.cards.map(card => {
                        const packNodeId = card.pack_graph_node_id;
                        const priorityWindow =
                          packNodeId && top7Set.has(packNodeId) ? ('7d' as const)
                          : packNodeId && top30Set.has(packNodeId) ? ('30d' as const)
                          : null;
                        const reasonLabel = packNodeId ? reasonLabelByNodeId.get(packNodeId) : null;
                        const metrics = buildPlanBoardCardMetrics({
                          card,
                          priorityWindow,
                          priorityReasonLabel: reasonLabel ?? null,
                        });
                        return (
                        <PlanTableRow
                          key={card.id}
                          card={card}
                          canMutateCard={canMutateCard}
                          laneSelectOptions={laneSelectOptions}
                          onCommitTitle={title => commitCardTitleInline(card.id, title)}
                          onCommitLane={(lane, hint) => commitCardLaneInline(card.id, lane, hint)}
                          onCommitPriority={(priority) =>
                            commitInlinePatch(card.id, { expected_pack_version: orchestrationPackVersion, priority })
                          }
                          onCommitDueDate={(dueDate) =>
                            commitInlinePatch(card.id, { expected_pack_version: orchestrationPackVersion, due_date: dueDate })
                          }
                          onCommitStoryPoints={(storyPoints) =>
                            commitInlinePatch(card.id, {
                              expected_pack_version: orchestrationPackVersion,
                              story_points: storyPoints,
                            })
                          }
                          isFocusTarget={cardFocusMatch(card, focusToken)}
                          metrics={metrics}
                          selected={selectedCardIds.has(card.id)}
                          onOpenTicketDetails={() => setTicketDetailsCardId(card.id)}
                          onPromoteFromBacklog={
                            isBacklogOperationalColumn(boardQuery.data?.columns, group.columnId) && canMutateCard
                              ? async () => {
                                  try {
                                    await patchMutation.mutateAsync({
                                      cardId: card.id,
                                      body: { expected_pack_version: orchestrationPackVersion, to_column: 'next_up' },
                                    });
                                  } catch (err) {
                                    await invalidatePlanBoardQueriesAfterConflict(qc, auditId, err);
                                  }
                                }
                              : undefined
                          }
                          onToggleSelect={() =>
                            setSelectedCardIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(card.id)) next.delete(card.id);
                              else next.add(card.id);
                              return next;
                            })
                          }
                        />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
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

function PlanTableRow(props: {
  card: PlanBoardCardDto;
  canMutateCard: boolean;
  laneSelectOptions: readonly InlineLaneOption[];
  onCommitTitle: (title: string) => Promise<void>;
  onCommitLane: (lane: string, ownerHint?: string) => Promise<void>;
  onCommitPriority: (priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>;
  onCommitDueDate: (dueDate: string) => Promise<void>;
  onCommitStoryPoints: (storyPoints: number | null) => Promise<void>;
  isFocusTarget: boolean;
  metrics: PlanBoardCardMetrics;
  selected: boolean;
  onOpenTicketDetails: () => void;
  onPromoteFromBacklog?: () => Promise<void>;
  onToggleSelect: () => void;
}) {
  const trRef = useRef<HTMLTableRowElement | null>(null);
  const displayTitle = props.card.title ?? props.card.canonical_node_key ?? props.card.id;
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ] as const;
  const primaryMarkers = buildPlanBoardPrimaryMarkers({
    metrics: props.metrics,
    laneLabel: laneDisplayLabel(props.card.lane) ?? null,
    domainLabel: props.card.delivery_area ?? null,
  });

  useEffect(() => {
    if (!props.isFocusTarget) return;
    trRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [props.isFocusTarget]);

  return (
    <tr
      ref={trRef}
      data-plan-table-card-id={props.card.id}
      className={props.isFocusTarget ? 'bg-primary/5 ring-muted ring-2 ring-inset' : 'border-border border-t'}
    >
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          checked={props.selected}
          onChange={props.onToggleSelect}
          aria-label={`Select card ${displayTitle}`}
        />
      </td>
      <td className="px-3 py-2 align-top">
        {props.canMutateCard ?
          <InlineEditableText
            value={displayTitle}
            ariaLabel={PLAN_BOARD_COPY.inlineTitleAriaLabel}
            onCommit={props.onCommitTitle}
            minLength={2}
            maxLength={200}
            className="font-medium"
          />
        : <span className="font-medium">{displayTitle}</span>}
      </td>
      <td className="px-3 py-2 align-top text-muted-foreground">
        {props.card.lane ?
          props.canMutateCard ?
            <InlineEditableLanePicker
              value={props.card.lane}
              options={props.laneSelectOptions}
              ariaLabel={PLAN_BOARD_COPY.inlineLaneAriaLabel}
              onCommit={lane => props.onCommitLane(lane)}
            />
          : <span>{laneDisplayLabel(props.card.lane)}</span>
        : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="text-muted-foreground px-3 py-2 align-top">{props.card.delivery_area || '—'}</td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap gap-1">
          {primaryMarkers.map((marker) => (
            <span
              key={marker.key}
              className={`border-border rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)] ${
                marker.active === false ? 'text-muted-foreground/70' : 'text-muted-foreground'
              }`}
            >
              {marker.label}
            </span>
          ))}
          {props.metrics.priorityBucket ? (
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
              {props.metrics.priorityBucket === '7d' ? 'Top 7d' : 'Top 30d'}
            </span>
          ) : null}
          {props.metrics.priorityLevel ? (
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
              <span className="mr-1">{'Priority:'}</span>
              {props.canMutateCard ? (
                <InlineEditableSelect
                  value={props.metrics.priorityLevel}
                  options={priorityOptions}
                  ariaLabel="Edit table priority"
                  onCommit={(next) => props.onCommitPriority(next as 'low' | 'medium' | 'high' | 'urgent')}
                />
              ) : (
                props.metrics.priorityLevel
              )}
            </span>
          ) : null}
          {props.metrics.priorityReasonLabel ? (
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
              {props.metrics.priorityReasonLabel}
            </span>
          ) : null}
          {props.metrics.assignee ? (
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
              {`@${props.metrics.assignee}`}
            </span>
          ) : null}
          {props.metrics.dueDate ? (
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
              <span className="mr-1">{props.metrics.dueState === 'overdue' ? 'Overdue' : 'Due'}</span>
              {props.canMutateCard ? (
                <InlineEditableDate
                  value={props.metrics.dueDate}
                  ariaLabel="Edit table due date"
                  onCommit={(next) => props.onCommitDueDate(next)}
                />
              ) : (
                props.metrics.dueDate
              )}
            </span>
          ) : null}
          {props.canMutateCard ? (
            <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
              <span className="mr-1">{'SP:'}</span>
              <InlineEditableNumber
                value={props.card.story_points ?? null}
                ariaLabel="Edit story points"
                onCommit={props.onCommitStoryPoints}
                min={0}
                max={100}
              />
            </span>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="h-6 text-[length:var(--text-2xs)]" onClick={props.onOpenTicketDetails}>
            Edit
          </Button>
          {props.onPromoteFromBacklog ? (
            <Button type="button" variant="outline" size="sm" className="h-6 text-[length:var(--text-2xs)]" onClick={() => void props.onPromoteFromBacklog?.()}>
              Pull to next up
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
