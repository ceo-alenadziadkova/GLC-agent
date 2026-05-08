import { memo } from 'react';

import { PLAN_BOARD_COPY } from '../../../../config/plan-board-copy.en';
import type { InlineLaneOption } from '../../../../components/glc/InlineEditableLanePicker';
import { PlanTableRow } from './PlanTableRow';
import type { PlanTableGroupRow } from './usePlanTableSurfaceModel';
import type { PlanBoardCardMetrics } from '../../board/plan-board-card-helpers';

type PlanTableGroupSectionProps = {
  group: PlanTableGroupRow;
  canMutateCard: boolean;
  laneSelectOptions: readonly InlineLaneOption[];
  metricsByCardId: ReadonlyMap<string, PlanBoardCardMetrics>;
  selectedCardIds: ReadonlySet<string>;
  isFocusTarget: (cardId: string) => boolean;
  onCommitTitle: (cardId: string, title: string) => Promise<void>;
  onCommitLane: (cardId: string, lane: string, ownerHint?: string) => Promise<void>;
  onCommitPriority: (cardId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>;
  onCommitDueDate: (cardId: string, dueDate: string) => Promise<void>;
  onCommitStoryPoints: (cardId: string, storyPoints: number | null) => Promise<void>;
  onOpenTicketDetails: (cardId: string) => void;
  onPromoteFromBacklog?: (cardId: string) => Promise<void>;
  onToggleSelect: (cardId: string) => void;
};

function PlanTableGroupSectionBase(props: PlanTableGroupSectionProps) {
  return (
    <section key={`${props.group.laneKey}-${props.group.columnId}`} className="space-y-2" aria-labelledby={`plan-table-${props.group.laneKey}-${props.group.columnId}`}>
      <h3 id={`plan-table-${props.group.laneKey}-${props.group.columnId}`} className="text-foreground text-sm font-semibold">
        {props.group.laneLabel} · {props.group.columnLabel}
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
            {props.group.cards.map((card) => {
              const metrics = props.metricsByCardId.get(card.id);
              if (!metrics) return null;
              return (
                <PlanTableRow
                  key={card.id}
                  card={card}
                  canMutateCard={props.canMutateCard}
                  laneSelectOptions={props.laneSelectOptions}
                  onCommitTitle={(title) => props.onCommitTitle(card.id, title)}
                  onCommitLane={(lane, hint) => props.onCommitLane(card.id, lane, hint)}
                  onCommitPriority={(priority) => props.onCommitPriority(card.id, priority)}
                  onCommitDueDate={(dueDate) => props.onCommitDueDate(card.id, dueDate)}
                  onCommitStoryPoints={(storyPoints) => props.onCommitStoryPoints(card.id, storyPoints)}
                  isFocusTarget={props.isFocusTarget(card.id)}
                  metrics={metrics}
                  selected={props.selectedCardIds.has(card.id)}
                  onOpenTicketDetails={() => props.onOpenTicketDetails(card.id)}
                  onPromoteFromBacklog={props.onPromoteFromBacklog ? () => props.onPromoteFromBacklog!(card.id) : undefined}
                  onToggleSelect={() => props.onToggleSelect(card.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const PlanTableGroupSection = memo(PlanTableGroupSectionBase);
