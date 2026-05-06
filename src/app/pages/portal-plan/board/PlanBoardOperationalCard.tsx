import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVerticalIcon, DotsThreeOutlineVerticalIcon } from '@phosphor-icons/react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';

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
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import type { PlanBoardCardDto, PlanBoardGetBody } from '../../../data/api/audits-orchestration';
import { InlineEditableLanePicker, type InlineLaneOption } from '../../../components/glc/InlineEditableLanePicker';
import { InlineEditableText } from '../../../components/glc/InlineEditableText';
import { laneDisplayLabel, manualCardNeedsPackAlignmentBanner } from './plan-board-card-helpers';

export function PlanBoardOperationalCard(props: {
  card: PlanBoardCardDto;
  columnId: string;
  dragLocked: boolean;
  expectedPackVersion: number;
  onMoveViaMenu: (targetCol: string) => Promise<void>;
  moveMenuColumns: readonly { id: string; title: string }[];
  boardColumns?: PlanBoardGetBody['columns'];
  openOnRoadmapHref?: string | null;
  isFocusTarget?: boolean;
  priorityWindow?: '7d' | '30d' | null;
  /** Human label from orchestration parity reason registry (timeline_parity GET). */
  priorityReasonLabel?: string | null;
  analysisDepth?: 'baseline' | 'deep' | null;
  canMutateCard?: boolean;
  onEditTitle?: () => Promise<void>;
  onEditLane?: () => Promise<void>;
  onDeleteCard?: () => Promise<void>;
  manifestDraftRevisionPending?: boolean;
  /** When set with `canMutateCard`, title uses inline commit instead of opening the dialog by default. */
  onCommitTitleInline?: (title: string) => Promise<void>;
  /** When set with `laneInlineEnabled`, lane uses compact picker instead of the simple lane dialog. */
  onCommitLaneInline?: (lane: string) => Promise<void>;
  laneSelectOptions?: readonly InlineLaneOption[];
  laneInlineEnabled?: boolean;
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

  const roadmapLink = props.openOnRoadmapHref != null && props.openOnRoadmapHref !== '' ? props.openOnRoadmapHref : null;

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
            {props.canMutateCard && props.onCommitTitleInline ? (
              <InlineEditableText
                value={title}
                ariaLabel={PLAN_BOARD_COPY.inlineTitleAriaLabel}
                onCommit={props.onCommitTitleInline}
                disabled={props.dragLocked}
                minLength={2}
                maxLength={200}
                className="font-medium"
              />
            ) : (
              <span className="font-medium">{title}</span>
            )}
            {props.manifestDraftRevisionPending ? (
              <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                {PLAN_BOARD_COPY.manifestDraftPendingBadge}
              </span>
            ) : null}
          </div>

          {props.card.lane ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
              <span>{PLAN_BOARD_COPY.laneLabelPrefix}:</span>
              {props.canMutateCard && props.laneInlineEnabled && props.onCommitLaneInline && props.laneSelectOptions?.length ? (
                <InlineEditableLanePicker
                  value={props.card.lane}
                  options={props.laneSelectOptions}
                  ariaLabel={PLAN_BOARD_COPY.inlineLaneAriaLabel}
                  onCommit={props.onCommitLaneInline}
                  disabled={props.dragLocked}
                />
              ) : (
                <span>{laneDisplayLabel(props.card.lane)}</span>
              )}
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

          {props.card.source === 'manual' && manualCardNeedsPackAlignmentBanner(props.boardColumns, props.columnId) ? (
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
            <DropdownMenuGroup aria-label={PLAN_BOARD_COPY.cardMenuAriaLabel}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={props.dragLocked}>{PLAN_BOARD_COPY.menuMoveHeading}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {props.moveMenuColumns.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      disabled={col.id === props.columnId || props.dragLocked}
                      onSelect={(e) => {
                        e.preventDefault();
                        void menuMove(col.id);
                      }}
                    >
                      {col.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {roadmapLink ? (
                <DropdownMenuItem asChild>
                  <Link to={roadmapLink}>{PLAN_BOARD_COPY.openOnRoadmapMenuLabel}</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                disabled={!props.canMutateCard}
                onSelect={(e) => {
                  e.preventDefault();
                  void props.onEditTitle?.();
                }}
              >
                {props.onCommitTitleInline ? PLAN_BOARD_COPY.menuEditTitleDialogLabel : PLAN_BOARD_COPY.menuEditTitleLabel}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!props.canMutateCard}
                onSelect={(e) => {
                  e.preventDefault();
                  void props.onEditLane?.();
                }}
              >
                {props.laneInlineEnabled && props.onCommitLaneInline
                  ? PLAN_BOARD_COPY.menuEditLaneDialogLabel
                  : PLAN_BOARD_COPY.menuEditLaneLabel}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!props.canMutateCard}
                onSelect={(e) => {
                  e.preventDefault();
                  void props.onDeleteCard?.();
                }}
              >
                {PLAN_BOARD_COPY.menuDeleteCardLabel}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
