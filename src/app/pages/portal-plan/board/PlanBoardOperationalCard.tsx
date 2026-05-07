import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVerticalIcon, DotsThreeOutlineVerticalIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import type { PlanBoardCardDto, PlanBoardGetBody } from '../../../data/api/audits-orchestration';
import { InlineEditableLanePicker, type InlineLaneOption } from '../../../components/glc/InlineEditableLanePicker';
import { InlineEditableText } from '../../../components/glc/InlineEditableText';
import { laneDisplayLabel, manualCardNeedsPackAlignmentBanner } from './plan-board-card-helpers';
import { buildPlanBoardPrimaryMarkers } from './plan-board-card-helpers';

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
  domainLabel?: string | null;
  quickWin?: boolean;
  critical?: boolean;
  assignee?: string | null;
  dueDate?: string | null;
  dueState?: 'overdue' | 'due_soon' | 'due_later' | 'no_due';
  selected?: boolean;
  onToggleSelect?: () => void;
  canMutateCard?: boolean;
  onDeleteCard?: () => Promise<void>;
  manifestDraftRevisionPending?: boolean;
  priorityLevel?: 'low' | 'medium' | 'high' | 'urgent' | null;
  /** When set with `canMutateCard`, title uses inline commit. */
  onCommitTitleInline?: (title: string) => Promise<void>;
  /**
   * Lane change: second arg is optional owner hint for manifest-draft-from-board queue.
   */
  onCommitLaneInline?: (lane: string, ownerHint?: string) => Promise<void>;
  laneSelectOptions?: readonly InlineLaneOption[];
  /** When true, show menu + inline field to edit optional owner hint for manifest lane revisions. */
  manifestDraftLaneHintsEnabled?: boolean;
  onOpenTicketDetails?: () => void;
  onCommitPriorityInline?: (priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>;
  onCommitDueDateInline?: (dueDateIso: string) => Promise<void>;
  onQuickPromoteToNextUp?: () => Promise<void>;
}) {
  const focusLiRef = useRef<HTMLLIElement | null>(null);
  const [ownerHintExpanded, setOwnerHintExpanded] = useState(false);
  const [ownerHintDraft, setOwnerHintDraft] = useState('');

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

  const laneCommit = async (lane: string) => {
    await props.onCommitLaneInline?.(lane, ownerHintDraft.trim() !== '' ? ownerHintDraft.trim() : undefined);
  };

  const showLaneInline =
    Boolean(props.canMutateCard && props.onCommitLaneInline && props.laneSelectOptions?.length && props.card.lane);
  const showQuickPriority = Boolean(props.canMutateCard && props.onCommitPriorityInline);
  const showQuickDueDate = Boolean(props.canMutateCard && props.onCommitDueDateInline);
  const showQuickPromote = props.columnId === 'backlog' && Boolean(props.canMutateCard && props.onQuickPromoteToNextUp);
  const primaryMarkers = buildPlanBoardPrimaryMarkers({
    metrics: {
      domainKey: 'other',
      priorityLevel: props.priorityLevel ?? null,
      priorityBucket: props.priorityWindow ?? null,
      priorityReasonLabel: props.priorityReasonLabel ?? null,
      quickWin: Boolean(props.quickWin),
      critical: Boolean(props.critical),
      assignee: props.assignee ?? null,
      dueState: props.dueState ?? 'no_due',
      dueDate: props.dueDate ?? null,
    },
    laneLabel: laneDisplayLabel(props.card.lane) ?? null,
    domainLabel: props.domainLabel ?? null,
  });

  return (
    <li
      ref={mergedRef}
      style={style}
      data-plan-board-card-id={props.card.id}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          props.onOpenTicketDetails?.();
        }
      }}
      className={`bg-muted/40 border-border flex flex-col gap-2 rounded-md border px-2 py-2 ${
        props.isFocusTarget ? 'ring-muted ring-2 ring-offset-2 ring-offset-background' : ''
      } ${props.selected ? 'border-primary/60' : ''}`}
    >
      {props.onToggleSelect ? (
        <div className="flex justify-end">
          <label className="text-muted-foreground inline-flex items-center gap-1 text-[length:var(--text-2xs)]">
            <input
              type="checkbox"
              checked={Boolean(props.selected)}
              onChange={() => props.onToggleSelect?.()}
              aria-label={`Select card ${title}`}
            />
            Select
          </label>
        </div>
      ) : null}
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
              {showLaneInline ? (
                <InlineEditableLanePicker
                  value={props.card.lane}
                  options={props.laneSelectOptions!}
                  ariaLabel={PLAN_BOARD_COPY.inlineLaneAriaLabel}
                  onCommit={laneCommit}
                  disabled={props.dragLocked}
                />
              ) : (
                <span>{laneDisplayLabel(props.card.lane)}</span>
              )}
            </div>
          ) : null}

          {props.manifestDraftLaneHintsEnabled && props.canMutateCard && ownerHintExpanded ? (
            <div className="border-border bg-background space-y-2 rounded-md border p-2">
              <p className="text-foreground text-xs font-medium">{PLAN_BOARD_COPY.ownerHintInlineTitle}</p>
              <p className="text-muted-foreground text-[length:var(--text-2xs)] leading-snug">
                {PLAN_BOARD_COPY.ownerHintInlineDescription}
              </p>
              <div className="space-y-1">
                <Label htmlFor={`plan-board-owner-hint-${props.card.id}`} className="text-muted-foreground text-xs">
                  {PLAN_BOARD_COPY.manifestDraftOwnerHintLabel}
                </Label>
                <Input
                  id={`plan-board-owner-hint-${props.card.id}`}
                  value={ownerHintDraft}
                  onChange={e => setOwnerHintDraft(e.target.value)}
                  maxLength={200}
                  autoComplete="off"
                  className="h-8 text-xs"
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOwnerHintExpanded(false)}>
                {PLAN_BOARD_COPY.ownerHintInlineDone}
              </Button>
            </div>
          ) : null}

          {primaryMarkers.length > 0 ||
          props.priorityWindow != null ||
          props.priorityReasonLabel != null ||
          props.analysisDepth != null ||
          props.assignee != null ||
          props.dueDate != null ? (
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
              {props.assignee ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {`@${props.assignee}`}
                </span>
              ) : null}
              {props.dueDate ? (
                <span className="border-border text-muted-foreground rounded-sm border px-2 py-0.5 text-[length:var(--text-2xs)]">
                  {props.dueState === 'overdue' ? `Overdue ${props.dueDate}` : `Due ${props.dueDate}`}
                </span>
              ) : null}
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
          {showQuickPriority || showQuickDueDate ? (
            <div className="flex flex-wrap items-end gap-2">
              {showQuickPriority ? (
                <label className="text-muted-foreground flex items-center gap-1 text-[length:var(--text-2xs)]">
                  <span>Priority</span>
                  <select
                    value={props.priorityLevel ?? 'medium'}
                    className="h-7 rounded border border-[var(--border-default)] bg-[var(--surface-base)] px-1 text-[length:var(--text-2xs)]"
                    onChange={(e) =>
                      void props.onCommitPriorityInline?.(
                        e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                      )
                    }
                    disabled={props.dragLocked}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              ) : null}
              {showQuickDueDate ? (
                <label className="text-muted-foreground flex items-center gap-1 text-[length:var(--text-2xs)]">
                  <span>Due</span>
                  <Input
                    type="date"
                    className="h-7 w-[9rem] text-[length:var(--text-2xs)]"
                    value={props.dueDate ?? ''}
                    onChange={(e) => void props.onCommitDueDateInline?.(e.target.value)}
                    disabled={props.dragLocked}
                  />
                </label>
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
              {props.onOpenTicketDetails ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    props.onOpenTicketDetails?.();
                  }}
                >
                  Edit ticket
                </DropdownMenuItem>
              ) : null}
              {showQuickPromote ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    void props.onQuickPromoteToNextUp?.();
                  }}
                >
                  Pull to next up
                </DropdownMenuItem>
              ) : null}
              {props.manifestDraftLaneHintsEnabled && props.canMutateCard ? (
                <DropdownMenuItem
                  onSelect={() => {
                    setTimeout(() => setOwnerHintExpanded(true), 0);
                  }}
                >
                  {PLAN_BOARD_COPY.menuRevisionOwnerHint}
                </DropdownMenuItem>
              ) : null}
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
