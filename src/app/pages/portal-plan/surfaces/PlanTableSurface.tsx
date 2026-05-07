import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { Button } from '../../../components/ui/button';
import { InlineEditableLanePicker, type InlineLaneOption } from '../../../components/glc/InlineEditableLanePicker';
import { InlineEditableText } from '../../../components/glc/InlineEditableText';
import type { PlanBoardCardDto } from '../../../data/api/audits-orchestration';
import {
  usePatchPlanBoardCardMutation,
  usePlanBoardQuery,
  usePostManifestDraftRevisionMutation,
} from '../../../data/api/plan-board-queries';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import {
  ORCHESTRATION_LANE_LABELS,
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
  mergeClearLaneFilterIntoLocationSearch,
  mergeLaneFilterToggleIntoLocationSearch,
  readPlanLaneFilterKeys,
} from '../../../lib/plan-cross-nav';
import type { PlanWorkspacePaletteCommand } from '../../../lib/plan-command-registry';
import { isGlcOrchestrationPackView } from '../../../lib/orchestration-pack-guards';
import { laneDisplayLabel } from '../board/plan-board-card-helpers';
import { PortalPlanLayout } from '../PortalPlanLayout';
import { usePortalPlanOrchestration } from '../PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from '../PortalPlanUnifiedShell';
import { toast } from 'sonner';

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
  const governanceReadOnly = Boolean(boardQuery.data?.issues?.some(i => i.code === 'governance_blocked'));
  const showConsultantPlanTools = !isClient;
  const canMutateCard = showConsultantPlanTools && !governanceReadOnly;
  const tablePaletteOperational =
    Boolean(auditId) &&
    Boolean(boardQuery.data) &&
    !boardQuery.data!.issues.some(i => i.code === 'no_pack');
  const manifestDraftMutation = usePostManifestDraftRevisionMutation(
    APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && showConsultantPlanTools ? auditId : undefined,
  );

  const cardsById = useMemo(
    () => new Map(boardQuery.data?.cards.map(c => [c.id, c]) ?? []),
    [boardQuery.data?.cards],
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
    if (laneFilterKeys.length === 0) return groupedRows;
    const set = new Set(laneFilterKeys);
    return groupedRows.filter(g => set.has(g.laneKey));
  }, [groupedRows, laneFilterKeys]);

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
                        <th className="px-3 py-2 font-medium">{PLAN_BOARD_COPY.inlineTitleAriaLabel}</th>
                        <th className="px-3 py-2 font-medium">{PLAN_BOARD_COPY.laneLabelPrefix}</th>
                        <th className="px-3 py-2 font-medium">Delivery area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.cards.map(card => (
                        <PlanTableRow
                          key={card.id}
                          card={card}
                          canMutateCard={canMutateCard}
                          laneSelectOptions={laneSelectOptions}
                          onCommitTitle={title => commitCardTitleInline(card.id, title)}
                          onCommitLane={(lane, hint) => commitCardLaneInline(card.id, lane, hint)}
                          isFocusTarget={cardFocusMatch(card, focusToken)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
        </div>
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
  isFocusTarget: boolean;
}) {
  const trRef = useRef<HTMLTableRowElement | null>(null);
  const displayTitle = props.card.title ?? props.card.canonical_node_key ?? props.card.id;

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
    </tr>
  );
}
