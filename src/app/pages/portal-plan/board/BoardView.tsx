import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
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
  useDraggable,
  useDroppable,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';
import { DotsSixVerticalIcon, DotsThreeOutlineVerticalIcon } from '@phosphor-icons/react';

import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import type {
  AuditTimelineDto,
  PlanBoardGetBody,
} from '../../../data/api/audits-orchestration';
import type { PlanBoardCardDto } from '../../../data/api/audits-orchestration';
import { auditsOrchestrationApi } from '../../../data/api/audits-orchestration';
import {
  bucketPlanBoardCardsByColumn,
  planBoardQueryKeys,
  useDeletePlanBoardCardMutation,
  usePatchPlanBoardCardMutation,
  usePlanBoardQuery,
  usePostPlanBoardManualCardMutation,
  usePostPlanBoardReconcileMutation,
} from '../../../data/api/plan-board-queries';
import { ApiError } from '../../../data/api-error';
import { PLAN_BOARD_COLUMN_HEADINGS_EN, PLAN_BOARD_UI_COLUMNS } from '../../../config/plan-board-ui-columns';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';

function manualCardNeedsPackAlignmentBanner(columnId: string): boolean {
  return columnId !== 'backlog' && columnId !== 'next_up';
}
import { buildAppRoute } from '../../../config/route-paths';
import { ORCHESTRATION_SEASON_PRESETS } from '../../../config/orchestration-roadmap-manifest';
import type { OrchestrationSeasonPreset } from '../../../config/orchestration-roadmap-manifest';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_PRIORITY_REASON_CODES,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import type { OrchestrationLaneId } from '../../../config/orchestration-roadmap-ui-copy.en';
import { useProfile } from '../../../hooks/useProfile';
import { useQueryClient } from '../../../lib/tanstack-react-query';
import { glcKeys } from '../../../lib/glc-keys';
import { PORTAL_PLAN_FOCUS_QUERY_KEY } from '../../../lib/plan-cross-nav';
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

const BUCKET_ORDER: OrchestrationTimelineTimeBucket[] = ['now', 'next', 'later'];

function bucketHeading(id: OrchestrationTimelineTimeBucket): string {
  if (id === 'now') return PLAN_BOARD_COPY.bucketNowColumnTitle;
  if (id === 'next') return PLAN_BOARD_COPY.bucketNextColumnTitle;
  return PLAN_BOARD_COPY.bucketLaterColumnTitle;
}

function emptyColumnBuckets(): Record<string, string[]> {
  return Object.fromEntries(PLAN_BOARD_UI_COLUMNS.map((c) => [c, []]));
}

function cloneBuckets(columns: Record<string, string[]>): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const k of Object.keys(columns)) {
    next[k] = [...(columns[k] ?? [])];
  }
  return next;
}

function findColumn(columns: Record<string, string[]>, id: UniqueIdentifier): string | undefined {
  const s = String(id);
  if (Object.prototype.hasOwnProperty.call(columns, s)) return s;
  for (const [col, ids] of Object.entries(columns)) {
    if (ids.includes(s)) return col;
  }
  return undefined;
}

function applyBucketDrag(columns: Record<string, string[]>, activeId: string, overId: string): Record<string, string[]> | null {
  if (String(activeId) === String(overId)) return null;

  const activeColumn = findColumn(columns, activeId);
  if (!activeColumn) return null;

  const overIsBucket = Object.prototype.hasOwnProperty.call(columns, String(overId));
  const overColumn = overIsBucket ? String(overId) : findColumn(columns, overId);
  if (!overColumn) return null;

  if (activeColumn === overColumn) {
    const list = [...(columns[activeColumn] ?? [])];
    const oldIndex = list.indexOf(activeId);
    if (oldIndex < 0) return null;

    const droppedOnColumnChrome = overIsBucket && String(overId) === activeColumn;
    let newIndex = list.indexOf(String(overId));

    let nextRow: string[] | undefined;
    if (droppedOnColumnChrome) {
      if (oldIndex === list.length - 1) return null;
      const reorder = [...list];
      reorder.splice(oldIndex, 1);
      reorder.push(activeId);
      nextRow = reorder;
    } else {
      if (newIndex < 0) return null;
      if (oldIndex === newIndex) return null;
      nextRow = arrayMove(list, oldIndex, newIndex);
    }

    const nextBuckets = cloneBuckets(columns);
    nextBuckets[activeColumn] = nextRow!;
    return nextBuckets;
  }

  const next = cloneBuckets(columns);
  const fromList = [...(next[activeColumn] ?? [])];
  const fi = fromList.indexOf(activeId);
  if (fi < 0) return null;
  fromList.splice(fi, 1);
  next[activeColumn] = fromList;

  const dest = [...(next[overColumn] ?? [])];

  let insertIdx: number;
  if (overIsBucket && String(overId) === overColumn) insertIdx = dest.length;
  else {
    insertIdx = dest.indexOf(String(overId));
    if (insertIdx < 0) insertIdx = dest.length;
  }

  dest.splice(insertIdx, 0, activeId);
  next[overColumn] = dest;

  return next;
}

function moveCardIntoColumn(columns: Record<string, string[]>, cardId: string, targetCol: string): Record<string, string[]> | null {
  const next = cloneBuckets(columns);
  let removed = false;
  for (const k of PLAN_BOARD_UI_COLUMNS) {
    const idx = next[k]?.indexOf(cardId) ?? -1;
    if (idx >= 0) {
      next[k]!.splice(idx, 1);
      removed = true;
    }
  }
  if (!removed) return null;
  next[targetCol] ??= [];
  next[targetCol]!.push(cardId);
  return next;
}

function laneDisplayLabel(raw: string | null): string | null {
  if (!raw) return null;
  if ((Object.keys(ORCHESTRATION_LANE_LABELS) as string[]).includes(raw)) {
    return ORCHESTRATION_LANE_LABELS[raw as OrchestrationLaneId];
  }
  return raw.replaceAll('_', ' ');
}

function formatLaneDensityLine(ids: readonly string[], cardsById: Map<string, PlanBoardCardDto>): string | null {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const lane = cardsById.get(id)?.lane;
    if (!lane) continue;
    counts.set(lane, (counts.get(lane) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const parts = [...counts.entries()].map(([lane, n]) => {
    const label = laneDisplayLabel(lane);
    return `${n} ${label ?? lane}`;
  });
  return `${PLAN_BOARD_COPY.columnLaneMixLabel}: ${parts.join(', ')}`;
}

async function invalidatePlanBoardStale(qc: ReturnType<typeof useQueryClient>, auditId: string, err: unknown) {
  if (!(err instanceof ApiError) || err.status !== 409) return;
  await qc.invalidateQueries({ queryKey: planBoardQueryKeys.audit(auditId) });
  await qc.invalidateQueries({ queryKey: glcKeys.orchestrationPack.detail(auditId) });
}

function BoardColumnShell(props: {
  columnId: string;
  heading: string;
  laneMixCaption?: string | null;
  children?: ReactNode;
}) {
  const { columnId, heading, laneMixCaption, children } = props;
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <section
      ref={setNodeRef}
      aria-label={heading}
      className={`bg-card border-border flex min-h-[12rem] flex-col rounded-lg border ${isOver ? 'ring-muted ring-2 ring-offset-2' : ''}`}
    >
      <header className="border-border border-b px-3 py-2">
        <h2 className="text-foreground text-sm font-semibold">{heading}</h2>
        {laneMixCaption ? <p className="text-muted-foreground mt-1 text-xs leading-snug">{laneMixCaption}</p> : null}
      </header>
      <ul className="flex flex-col gap-2 p-3">{children}</ul>
    </section>
  );
}

export function PlanBoardOperationalCard(props: {
  card: PlanBoardCardDto;
  columnId: string;
  dragLocked: boolean;
  expectedPackVersion: number;
  onMoveViaMenu: (targetCol: string) => Promise<void>;
  isFocusTarget?: boolean;
  priorityWindow?: '7d' | '30d' | null;
  /** Human label from orchestration parity reason registry (timeline_parity GET). */
  priorityReasonLabel?: string | null;
  analysisDepth?: 'baseline' | 'deep' | null;
  canMutateCard?: boolean;
  onEditTitle?: () => Promise<void>;
  onEditLane?: () => Promise<void>;
  onDeleteCard?: () => Promise<void>;
}) {
  const focusLiRef = useRef<HTMLLIElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.card.id,
    disabled: props.dragLocked,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : undefined,
    touchAction: 'none',
  };

  const title = props.card.title ?? props.card.canonical_node_key ?? props.card.id;
  const orphan = props.card.orphaned_reason;

  async function menuMove(columnId: string) {
    if (columnId === props.columnId) return;
    await props.onMoveViaMenu(columnId);
  }

  const mergedRef = (node: HTMLLIElement | null) => {
    focusLiRef.current = node;
    setNodeRef(node);
  };

  useEffect(() => {
    if (!props.isFocusTarget) return;
    const el = focusLiRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [props.isFocusTarget]);

  return (
    <li
      ref={mergedRef}
      style={style}
      data-plan-board-card-id={props.card.id}
      className={`bg-muted/40 border-border flex flex-col gap-2 rounded-md border px-2 py-2 ${
        props.isFocusTarget ? 'ring-muted ring-2 ring-offset-2 ring-offset-background' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={`text-muted-foreground hover:text-foreground cursor-grab shrink-0 px-1 touch-none ${props.dragLocked ? 'cursor-not-allowed opacity-35' : ''}`}
          {...listeners}
          {...attributes}
          aria-label={`${PLAN_BOARD_COPY.dragHandleLabel}: ${title}`}
          disabled={props.dragLocked}
        >
          <DotsSixVerticalIcon size={18} aria-hidden />
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-foreground flex flex-wrap items-center gap-2 text-sm leading-snug">
            <span className="font-medium">{title}</span>
          </div>

          {props.card.lane ? (
            <div className="text-muted-foreground text-xs">
              {PLAN_BOARD_COPY.laneLabelPrefix}: {laneDisplayLabel(props.card.lane)}
            </div>
          ) : null}

          {props.priorityWindow != null || props.priorityReasonLabel != null || props.analysisDepth != null ? (
            <div className="flex flex-wrap gap-1">
              {props.priorityWindow === '7d' ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {PLAN_BOARD_COPY.priorityWindow7dBadge}
                </span>
              ) : null}
              {props.priorityWindow === '30d' ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {PLAN_BOARD_COPY.priorityWindow30dBadge}
                </span>
              ) : null}
              {props.priorityReasonLabel ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {props.priorityReasonLabel}
                </span>
              ) : null}
              {props.analysisDepth === 'baseline' ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {PLAN_BOARD_COPY.analysisDepthBaselineBadge}
                </span>
              ) : null}
              {props.analysisDepth === 'deep' ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {PLAN_BOARD_COPY.analysisDepthDeepBadge}
                </span>
              ) : null}
            </div>
          ) : null}

          {orphan ? (
            <div
              className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]"
              role="status"
              aria-label={
                orphan === 'node_removed'
                  ? PLAN_BOARD_COPY.orphanBadgeAriaNodeRemoved
                  : PLAN_BOARD_COPY.orphanBadgeAriaLaneChanged
              }
            >
              {orphan === 'node_removed'
                ? PLAN_BOARD_COPY.orphanBadgeLabelNodeRemoved
                : PLAN_BOARD_COPY.orphanBadgeLabelLaneChanged}
            </div>
          ) : props.card.source === 'pack' && props.card.pack_graph_node_id ? (
            <div className="text-muted-foreground text-[length:var(--text-2xs)]">{PLAN_BOARD_COPY.criticalPathBadge}</div>
          ) : null}

          {props.card.source === 'manual' && manualCardNeedsPackAlignmentBanner(props.columnId) ? (
            <p className="text-muted-foreground text-[length:var(--text-2xs)] leading-snug" role="status">
              {PLAN_BOARD_COPY.manualBeyondNextUpBanner}
            </p>
          ) : null}

          <div className="text-muted-foreground sr-only">{`${PLAN_BOARD_COPY.shellTitle} pack baseline v${props.expectedPackVersion}`}</div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" type="button" className="border-border shrink-0" aria-label={PLAN_BOARD_COPY.cardMenuAriaLabel}>
              <DotsThreeOutlineVerticalIcon size={18} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" collisionPadding={8}>
            <DropdownMenuGroup aria-label={PLAN_BOARD_COPY.menuMoveHeading}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={props.dragLocked}>{PLAN_BOARD_COPY.menuMoveHeading}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {PLAN_BOARD_UI_COLUMNS.map((colId) => (
                    <DropdownMenuItem
                      key={colId}
                      disabled={colId === props.columnId || props.dragLocked}
                      onSelect={(e) => {
                        e.preventDefault();
                        void menuMove(colId);
                      }}
                    >
                      {PLAN_BOARD_COLUMN_HEADINGS_EN[colId]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                disabled={!props.canMutateCard}
                onSelect={(e) => {
                  e.preventDefault();
                  void props.onEditTitle?.();
                }}
              >
                Edit title
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!props.canMutateCard}
                onSelect={(e) => {
                  e.preventDefault();
                  void props.onEditLane?.();
                }}
              >
                Edit lane
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!props.canMutateCard}
                onSelect={(e) => {
                  e.preventDefault();
                  void props.onDeleteCard?.();
                }}
              >
                Delete card
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** Operational columns + persisted `plan_task_delivery` rows alongside horizon buckets. */
export function PortalDeliveryBoardSurface(props?: PortalDeliveryBoardSurfaceProps) {
  const { unifiedShellTabActive } = props ?? {};
  const [searchParams] = useSearchParams();
  const {
    auditId,
    audit,
    auditLoading: loading,
    packQuery,
    timelineQuery,
    includeTimelineFetch,
  } = usePortalPlanOrchestration();
  const { isClient } = useProfile();

  const focusCanonicalKey = searchParams.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  const focusToken =
    focusCanonicalKey != null && focusCanonicalKey.trim() !== '' ? focusCanonicalKey.trim() : null;
  const qc = useQueryClient();
  const showConsultantPlanTools = !isClient;

  const strategyHref = isClient ? buildAppRoute.portalStrategy(auditId) : buildAppRoute.strategy(auditId);
  const pack = packQuery.data?.pack ?? null;

  const loadPending =
    loading || packQuery.isPending || (includeTimelineFetch ? timelineQuery.isPending : false);
  const loadError = packQuery.isError || (includeTimelineFetch ? timelineQuery.isError : false);

  const orchestrationPackVersion = packQuery.data?.orchestration_pack_version ?? 0;

  const boardQuery = usePlanBoardQuery({
    auditId,
    enabled: Boolean(auditId) && Boolean(pack) && !loadPending && isGlcOrchestrationPackView(pack),
  });

  const patchMutation = usePatchPlanBoardCardMutation({ auditId });
  const deleteMutation = useDeletePlanBoardCardMutation({ auditId });
  const reconcileMutation = usePostPlanBoardReconcileMutation(auditId);
  const manualCardMutation = usePostPlanBoardManualCardMutation(auditId);

  const hydrateSignature =
    boardQuery.data?.cards
      ?.slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => `${r.id}:${r.column_id}:${r.position}`)
      .join('|') ?? '';

  const [columnBuckets, setColumnBuckets] = useState<Record<string, string[]>>(emptyColumnBuckets);
  useEffect(() => {
    setColumnBuckets(
      hydrateSignature === '' ? emptyColumnBuckets() : bucketPlanBoardCardsByColumn(boardQuery.data?.cards ?? []),
    );
  }, [hydrateSignature]);

  const cardsById = useMemo(() => new Map(boardQuery.data?.cards.map((c) => [c.id, c]) ?? []), [boardQuery.data?.cards]);

  const governanceReadOnly = Boolean(boardQuery.data?.issues?.some((i) => i.code === 'governance_blocked'));

  const dragLocked =
    orchestrationPackVersion <= 0 ||
    patchMutation.isPending ||
    deleteMutation.isPending ||
    boardQuery.isPending ||
    manualCardMutation.isPending ||
    governanceReadOnly;

  const orphanCount = boardQuery.data?.cards?.filter((c) => Boolean(c.orphaned_reason)).length ?? 0;

  const [manualLane, setManualLane] = useState('marketing_narrative');
  const [manualTitle, setManualTitle] = useState('');

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

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
      await invalidatePlanBoardStale(qc, auditId, err);
    }
  }

  async function moveCardViaMenu(targetCol: string, cardId: string) {
    const prev = cloneBuckets(columnBuckets);
    const draft = moveCardIntoColumn(prev, cardId, targetCol);
    if (!draft) return;
    setColumnBuckets(draft);
    await persistCardPlacement(prev, draft, cardId);
  }

  async function editCardTitle(cardId: string) {
    const current = cardsById.get(cardId);
    const initial = (current?.title ?? '').trim();
    const next = window.prompt('Edit card title', initial);
    if (next == null) return;
    const title = next.trim();
    if (title.length < 2) return;
    try {
      await patchMutation.mutateAsync({
        cardId,
        body: { expected_pack_version: orchestrationPackVersion, title },
      });
    } catch (err) {
      await invalidatePlanBoardStale(qc, auditId, err);
    }
  }

  async function editCardLane(cardId: string) {
    const current = cardsById.get(cardId);
    const initial = (current?.lane ?? '').trim();
    const next = window.prompt('Edit lane', initial);
    if (next == null) return;
    const lane = next.trim();
    if (lane.length < 1) return;
    try {
      await patchMutation.mutateAsync({
        cardId,
        body: { expected_pack_version: orchestrationPackVersion, lane },
      });
    } catch (err) {
      await invalidatePlanBoardStale(qc, auditId, err);
    }
  }

  async function deleteCard(cardId: string) {
    const shouldDelete = window.confirm('Delete this card from Delivery Board?');
    if (!shouldDelete) return;
    try {
      await deleteMutation.mutateAsync({
        cardId,
        body: { expected_pack_version: orchestrationPackVersion },
      });
    } catch (err) {
      await invalidatePlanBoardStale(qc, auditId, err);
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
      <PortalPlanSurfaceChrome branch="board" tabActive={unifiedShellTabActive} title={PLAN_BOARD_COPY.shellTitle} subtitle={subtitle}>
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board">
          <PortalPlanLoadingState layout="roadmap" headline={subtitle} />
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
                <Link to={strategyHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
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
  const projections = projectRoadmapNodesFromCriticalPath({ pack, season_preset: seasonPreset });
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
      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-10 md:px-6">
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board">
          <p className="sr-only">{PLAN_BOARD_COPY.readOnlyAnnouncement}</p>

          <section aria-labelledby="plan-board-horizon-heading" className="space-y-3">
            <div>
              <h2 id="plan-board-horizon-heading" className="text-foreground text-lg font-semibold tracking-tight">
                {PLAN_BOARD_COPY.horizonSectionTitle}
              </h2>
              <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.horizonSectionSubtitle}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {BUCKET_ORDER.map((bucket) => (
                <div
                  key={bucket}
                  aria-label={bucketHeading(bucket)}
                  className="bg-card border-border flex min-h-[10rem] flex-col rounded-lg border"
                >
                  <header className="border-border border-b px-3 py-2">
                    <div className="text-foreground text-sm font-semibold">{bucketHeading(bucket)}</div>
                  </header>
                  <ul className="flex flex-col gap-2 p-3">
                    {byBucket[bucket].length === 0 ? (
                      <li className="text-muted-foreground text-xs">—</li>
                    ) : (
                      byBucket[bucket].map((row) => {
                        const node = nodeById.get(row.node_id);
                        const lane = node?.lane as OrchestrationLaneId | undefined;
                        const laneLabel = lane ? ORCHESTRATION_LANE_LABELS[lane] : null;
                        return (
                          <li key={row.node_id} className="bg-muted/40 border-border rounded-md border px-3 py-2">
                            <div className="text-foreground text-sm font-medium leading-snug">{titles.get(row.node_id) ?? row.node_id}</div>
                            {laneLabel ? (
                              <div className="text-muted-foreground mt-1 text-xs">
                                {PLAN_BOARD_COPY.laneLabelPrefix}: {laneLabel}
                              </div>
                            ) : null}
                            <div className="text-muted-foreground mt-1 text-[length:var(--text-2xs)]">{PLAN_BOARD_COPY.criticalPathBadge}</div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="plan-board-operational-heading" className="space-y-3">
            <div>
              <h2 id="plan-board-operational-heading" className="text-foreground text-lg font-semibold tracking-tight">
                {PLAN_BOARD_COPY.operationalSectionTitle}
              </h2>
              <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.operationalSectionSubtitle}</p>
            </div>

            {draggingCardId ? (
              <span className="sr-only" aria-live="polite">{`${PLAN_BOARD_COPY.draggingLiveMessage}: ${draggingCardId}`}</span>
            ) : null}

            {boardQuery.data?.issues?.some((i) => i.code === 'no_pack') ? (
              <PortalPlanEmptyCallout title={PLAN_BOARD_COPY.emptyNoPackTitle} body={PLAN_BOARD_COPY.emptyNoPackBody}>
                <Button asChild variant="outline" size="sm" className="no-underline">
                  <Link to={strategyHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
                </Button>
              </PortalPlanEmptyCallout>
            ) : null}

            {boardQuery.isError ? (
              <div className="text-muted-foreground text-sm">Unable to load delivery board operational state.</div>
            ) : null}

            {boardOperationalVisible && boardQuery.isPending ? (
              <div className="text-muted-foreground text-sm">Loading persisted delivery cards...</div>
            ) : null}

            {boardOperationalVisible && governanceReadOnly ? (
              <div
                role="status"
                className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.governanceBlockedBannerTitle}</div>
                  <p className="text-muted-foreground mt-1 text-sm">{PLAN_BOARD_COPY.governanceBlockedBannerBody}</p>
                </div>
                <Button asChild variant="secondary" type="button" size="sm" className="shrink-0 no-underline">
                  <Link to={strategyHref}>{PLAN_BOARD_COPY.governanceBlockedStrategyCta}</Link>
                </Button>
              </div>
            ) : null}

            {boardOperationalVisible && showConsultantPlanTools && orphanCount > 0 && !governanceReadOnly ? (
              <div
                role="status"
                className="border-border bg-muted/20 flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.reconcileBannerTitle}</div>
                  <p className="text-muted-foreground mt-1 text-sm">{PLAN_BOARD_COPY.reconcileBannerBody}</p>
                </div>
                <Button
                  variant="secondary"
                  type="button"
                  size="sm"
                  disabled={reconcileMutation.isPending || orchestrationPackVersion <= 0}
                  className="shrink-0"
                  onClick={() => void reconcileMutation.mutateAsync()}
                >
                  {PLAN_BOARD_COPY.reconcileBannerCta}
                </Button>
              </div>
            ) : null}

            {boardOperationalVisible && !boardQuery.isPending ? (
              <div className="grid gap-3 md:auto-rows-fr md:[grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  {PLAN_BOARD_UI_COLUMNS.map((colId) => {
                    const heading = PLAN_BOARD_COLUMN_HEADINGS_EN[colId];
                    const ids = columnBuckets[colId] ?? [];
                    const laneMixCaption = formatLaneDensityLine(ids, cardsById);
                    return (
                      <BoardColumnShell columnId={colId} heading={heading} key={colId} laneMixCaption={laneMixCaption}>
                        {ids.length === 0 ? (
                          <li className="text-muted-foreground text-xs">{PLAN_BOARD_COPY.operationalEmptyPlaceholder}</li>
                        ) : (
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
                            return (
                              <PlanBoardOperationalCard
                                key={id}
                                card={dto}
                                columnId={colId}
                                dragLocked={dragLocked}
                                expectedPackVersion={orchestrationPackVersion}
                                onMoveViaMenu={(target) => moveCardViaMenu(target, dto.id)}
                                priorityWindow={priorityWindow}
                                priorityReasonLabel={priorityReasonLabel}
                                analysisDepth={analysisDepth}
                                canMutateCard={showConsultantPlanTools && !governanceReadOnly}
                                onEditTitle={() => editCardTitle(dto.id)}
                                onEditLane={() => editCardLane(dto.id)}
                                onDeleteCard={() => deleteCard(dto.id)}
                                isFocusTarget={
                                  focusToken != null &&
                                  (dto.canonical_node_key === focusToken ||
                                    dto.id === focusToken ||
                                    (dto.pack_graph_node_id != null && dto.pack_graph_node_id === focusToken))
                                }
                              />
                            );
                          })
                        )}
                      </BoardColumnShell>
                    );
                  })}

                  <DragOverlay>
                    {draggingCardId ? (
                      <div className="bg-card border px-4 py-2 shadow-md">{cardsById.get(draggingCardId)?.title ?? draggingCardId}</div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            ) : null}

            {boardOperationalVisible && showConsultantPlanTools && !boardQuery.isPending ? (
              <div className="border-border rounded-lg border p-4 space-y-3">
                <div>
                  <div className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.manualCardSectionTitle}</div>
                  <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.manualCardSectionHint}</p>
                </div>
                <form
                  className="flex flex-col gap-3 md:flex-row md:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const titleValue = manualTitle.trim();
                    if (titleValue.length < 2) return;
                    const laneValue = manualLane.trim() || 'marketing_narrative';
                    void manualCardMutation
                      .mutateAsync({
                        title: titleValue,
                        lane: laneValue,
                      })
                      .then(() => {
                        setManualTitle('');
                      });
                  }}
                >
                  <div className="flex-1 space-y-2">
                    <label className="text-muted-foreground text-xs sr-only" htmlFor="manual-card-title">{PLAN_BOARD_COPY.manualCardSectionTitle}</label>
                    <Input
                      id="manual-card-title"
                      value={manualTitle}
                      onChange={(event) => setManualTitle(event.target.value)}
                      placeholder={PLAN_BOARD_COPY.manualCardTitlePlaceholder}
                    />
                  </div>
                  <div className="md:w-[14rem]">
                    <label className="text-muted-foreground text-xs sr-only" htmlFor="manual-card-lane">{PLAN_BOARD_COPY.laneLabelPrefix}</label>
                    <Input id="manual-card-lane" value={manualLane} onChange={(event) => setManualLane(event.target.value)} placeholder={PLAN_BOARD_COPY.manualLanePlaceholder} />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={manualCardMutation.isPending || orchestrationPackVersion <= 0 || governanceReadOnly}
                  >
                    {PLAN_BOARD_COPY.manualSubmitCta}
                  </Button>
                </form>
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs">{PLAN_BOARD_COPY.parityNote}</p>
          </section>
        </PortalPlanLayout>
      </div>
    </PortalPlanSurfaceChrome>
  );
}
