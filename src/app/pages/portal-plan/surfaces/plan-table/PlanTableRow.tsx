import { memo, useEffect, useRef } from 'react';

import { Button } from '../../../../components/ui/button';
import { InlineEditableDate } from '../../../../components/glc/InlineEditableDate';
import { InlineEditableLanePicker, type InlineLaneOption } from '../../../../components/glc/InlineEditableLanePicker';
import { InlineEditableNumber } from '../../../../components/glc/InlineEditableNumber';
import { InlineEditableSelect } from '../../../../components/glc/InlineEditableSelect';
import { InlineEditableText } from '../../../../components/glc/InlineEditableText';
import { PLAN_BOARD_COPY } from '../../../../config/plan-board-copy.en';
import type { PlanBoardCardDto } from '../../../../data/api/audits-orchestration';
import { buildPlanBoardPrimaryMarkers, laneDisplayLabel, type PlanBoardCardMetrics } from '../../board/plan-board-card-helpers';

type PlanTableRowProps = {
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
};

function PlanTableRowBase(props: PlanTableRowProps) {
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
        <input type="checkbox" checked={props.selected} onChange={props.onToggleSelect} aria-label={`Select card ${displayTitle}`} />
      </td>
      <td className="px-3 py-2 align-top">
        {props.canMutateCard ? (
          <InlineEditableText
            value={displayTitle}
            ariaLabel={PLAN_BOARD_COPY.inlineTitleAriaLabel}
            onCommit={props.onCommitTitle}
            minLength={2}
            maxLength={200}
            className="font-medium"
          />
        ) : (
          <span className="font-medium">{displayTitle}</span>
        )}
      </td>
      <td className="px-3 py-2 align-top text-muted-foreground">
        {props.card.lane ? (
          props.canMutateCard ? (
            <InlineEditableLanePicker
              value={props.card.lane}
              options={props.laneSelectOptions}
              ariaLabel={PLAN_BOARD_COPY.inlineLaneAriaLabel}
              onCommit={(lane) => props.onCommitLane(lane)}
            />
          ) : (
            <span>{laneDisplayLabel(props.card.lane)}</span>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
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
                <InlineEditableDate value={props.metrics.dueDate} ariaLabel="Edit table due date" onCommit={(next) => props.onCommitDueDate(next)} />
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

export const PlanTableRow = memo(PlanTableRowBase);
