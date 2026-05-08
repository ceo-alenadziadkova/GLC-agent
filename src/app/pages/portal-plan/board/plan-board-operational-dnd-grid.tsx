import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from '@dnd-kit/core';

import type { PlanBoardCardDto } from '../../../data/api/audits-orchestration';
import { formatLaneDensityLine, isBacklogOperationalColumn, matchesPlanCardMetricFilters } from './plan-board-card-helpers';
import { BoardColumnShell } from './plan-board-column-shell';
import { PlanBoardBacklogPanel } from './plan-board-backlog-panel';
import { resolvePlanBoardWipLimit } from '../../../config/plan-board-workflow-policy';
import type { PlanCardMetricFilters } from '../../../lib/plan-cross-nav';
import { PlanBoardColumnCardsList } from './plan-board-column-cards-list';

type PlanBoardOperationalDndGridProps = {
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  draggingCardId: string | null;
  cardsById: ReadonlyMap<string, PlanBoardCardDto>;
  operationalColumnDescriptors: readonly { id: string; title: string }[];
  columnBuckets: Record<string, string[]>;
  laneFilterKeys: readonly string[];
  metricFilters: PlanCardMetricFilters;
  cardMetricsById: ReadonlyMap<
    string,
    {
      domainKey: string;
      priorityLevel: 'low' | 'medium' | 'high' | 'urgent' | null;
      priorityBucket: '7d' | '30d' | null;
      priorityReasonLabel: string | null;
      quickWin: boolean;
      critical: boolean;
      assignee: string | null;
      dueState: 'overdue' | 'due_soon' | 'due_later' | 'no_due';
      dueDate: string | null;
    }
  >;
  boardColumns: readonly { id: string; title: string }[] | undefined;
  showConsultantPlanTools: boolean;
  dragLocked: boolean;
  auditId: string;
  governanceReadOnly: boolean;
  orchestrationPackVersion: number;
  canEditCardFields: boolean;
  laneSelectOptions: readonly { value: string; label: string }[];
  manifestDraftLaneHintsEnabled: boolean;
  selectedCardIds: ReadonlySet<string>;
  focusToken: string | null;
  pendingManifestDraftCanonicalSet: ReadonlySet<string>;
  buildCardPresentation: (card: PlanBoardCardDto) => {
    openOnRoadmapHref: string | null;
    priorityWindow: '7d' | '30d' | null;
    priorityReasonLabel: string | null;
    analysisDepth: 'baseline' | 'deep' | null;
    domainLabel: string | null;
    quickWin: boolean;
    critical: boolean;
    assignee: string | null;
    dueDate: string | null;
    dueState: 'overdue' | 'due_soon' | 'due_later' | 'no_due';
    priorityLevel: 'low' | 'medium' | 'high' | 'urgent' | null;
  };
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onMoveViaMenu: (targetCol: string, cardId: string) => Promise<void>;
  onToggleSelect: (cardId: string) => void;
  onDeleteCard: (cardId: string) => Promise<void>;
  onOpenTicketDetails: (cardId: string) => void;
  onCommitTitle: (cardId: string, title: string) => Promise<void>;
  onCommitLane: (cardId: string, lane: string, ownerHint?: string) => Promise<void>;
  onCommitPriority: (cardId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>;
  onCommitDueDate: (cardId: string, dueDateIso: string) => Promise<void>;
  onQuickPromoteToNextUp: (cardId: string) => Promise<void>;
};

export function PlanBoardOperationalDndGrid(props: PlanBoardOperationalDndGridProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <DndContext
        sensors={props.sensors}
        collisionDetection={closestCorners}
        onDragStart={props.onDragStart}
        onDragEnd={props.onDragEnd}
      >
        <div className="flex min-w-min flex-nowrap gap-3">
          {props.operationalColumnDescriptors.map((col) => {
            const colId = col.id;
            const idsRaw = props.columnBuckets[colId] ?? [];
            const ids = idsRaw.filter((cid) => {
              const dto = props.cardsById.get(cid);
              if (!dto) return false;
              if (props.laneFilterKeys.length > 0) {
                const lk = dto.lane?.trim() ?? '';
                if (!props.laneFilterKeys.includes(lk)) return false;
              }
              const metrics = props.cardMetricsById.get(cid);
              if (!metrics) return true;
              return matchesPlanCardMetricFilters(metrics, props.metricFilters);
            });
            const laneMixCaption = formatLaneDensityLine(ids, new Map(props.cardsById));
            const backlog = isBacklogOperationalColumn(props.boardColumns ? [...props.boardColumns] : undefined, colId);
            const limit = resolvePlanBoardWipLimit(colId);
            const workflowHint =
              limit == null ? null : ids.length <= limit ? `WIP limit ${limit}` : `WIP ${ids.length}/${limit} (over limit)`;

            return (
              <PlanBoardBacklogPanel key={colId} isBacklog={backlog}>
                <BoardColumnShell columnId={colId} heading={col.title} laneMixCaption={laneMixCaption} workflowHint={workflowHint}>
                  <PlanBoardColumnCardsList
                    ids={ids}
                    cardsById={props.cardsById}
                    columnId={colId}
                    auditId={props.auditId}
                    canEditCardFields={props.canEditCardFields}
                    governanceReadOnly={props.governanceReadOnly}
                    showConsultantPlanTools={props.showConsultantPlanTools}
                    isBacklogColumn={backlog}
                    orchestrationPackVersion={props.orchestrationPackVersion}
                    dragLocked={props.dragLocked}
                    moveMenuColumns={props.operationalColumnDescriptors}
                    boardColumns={props.boardColumns}
                    laneSelectOptions={props.laneSelectOptions}
                    manifestDraftLaneHintsEnabled={props.manifestDraftLaneHintsEnabled}
                    selectedCardIds={props.selectedCardIds}
                    focusToken={props.focusToken}
                    pendingManifestDraftCanonicalSet={props.pendingManifestDraftCanonicalSet}
                    buildCardPresentation={props.buildCardPresentation}
                    onMoveViaMenu={props.onMoveViaMenu}
                    onToggleSelect={props.onToggleSelect}
                    onDeleteCard={props.onDeleteCard}
                    onOpenTicketDetails={props.onOpenTicketDetails}
                    onCommitTitle={props.onCommitTitle}
                    onCommitLane={props.onCommitLane}
                    onCommitPriority={props.onCommitPriority}
                    onCommitDueDate={props.onCommitDueDate}
                    onQuickPromoteToNextUp={props.onQuickPromoteToNextUp}
                  />
                </BoardColumnShell>
              </PlanBoardBacklogPanel>
            );
          })}
        </div>
        <DragOverlay>
          {props.draggingCardId ? (
            <div className="bg-card border-border rounded-md border px-4 py-2 shadow-md">
              {props.cardsById.get(props.draggingCardId)?.title ?? props.draggingCardId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
