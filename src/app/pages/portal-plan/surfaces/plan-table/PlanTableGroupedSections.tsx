import { isBacklogOperationalColumn } from '../../board/plan-board-card-helpers';
import { PlanTableGroupSection } from './PlanTableGroupSection';
import type { PlanTableGroupRow } from './usePlanTableSurfaceModel';
import type { InlineLaneOption } from '../../../../components/glc/InlineEditableLanePicker';
import type { PlanBoardCardMetrics } from '../../board/plan-board-card-helpers';

type PlanTableGroupedSectionsProps = {
  pending: boolean;
  groups: readonly PlanTableGroupRow[];
  loadingText: string;
  emptyText: string;
  canMutateCard: boolean;
  laneSelectOptions: readonly InlineLaneOption[];
  boardColumns: readonly { id: string; title: string }[] | undefined;
  metricsByCardId: ReadonlyMap<string, PlanBoardCardMetrics>;
  selectedCardIds: ReadonlySet<string>;
  isFocusTarget: (cardId: string) => boolean;
  onCommitTitle: (cardId: string, title: string) => Promise<void>;
  onCommitLane: (cardId: string, lane: string, ownerHint?: string) => Promise<void>;
  onCommitPriority: (cardId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>;
  onCommitDueDate: (cardId: string, dueDate: string) => Promise<void>;
  onCommitStoryPoints: (cardId: string, storyPoints: number | null) => Promise<void>;
  onOpenTicketDetails: (cardId: string) => void;
  onPromoteFromBacklog: (cardId: string) => Promise<void>;
  onToggleSelect: (cardId: string) => void;
};

export function PlanTableGroupedSections(props: PlanTableGroupedSectionsProps) {
  if (props.pending) {
    return <p className="text-muted-foreground text-sm">{props.loadingText}</p>;
  }
  if (props.groups.length === 0) {
    return <p className="text-muted-foreground text-sm">{props.emptyText}</p>;
  }

  return (
    <>
      {props.groups.map((group) => (
        <PlanTableGroupSection
          key={`${group.laneKey}-${group.columnId}`}
          group={group}
          canMutateCard={props.canMutateCard}
          laneSelectOptions={props.laneSelectOptions}
          metricsByCardId={props.metricsByCardId}
          selectedCardIds={props.selectedCardIds}
          isFocusTarget={props.isFocusTarget}
          onCommitTitle={props.onCommitTitle}
          onCommitLane={props.onCommitLane}
          onCommitPriority={props.onCommitPriority}
          onCommitDueDate={props.onCommitDueDate}
          onCommitStoryPoints={props.onCommitStoryPoints}
          onOpenTicketDetails={props.onOpenTicketDetails}
          onPromoteFromBacklog={
            isBacklogOperationalColumn(props.boardColumns ? [...props.boardColumns] : undefined, group.columnId) &&
            props.canMutateCard
              ? props.onPromoteFromBacklog
              : undefined
          }
          onToggleSelect={props.onToggleSelect}
        />
      ))}
    </>
  );
}
