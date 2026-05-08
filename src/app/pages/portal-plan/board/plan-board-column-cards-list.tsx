import type { PlanBoardCardDto } from '../../../data/api/orchestration-types';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PlanManualCardCreateForm } from '../PlanManualCardCreateForm';
import { PlanBoardOperationalCard } from './PlanBoardOperationalCard';

type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
type DueState = 'overdue' | 'due_soon' | 'due_later' | 'no_due';

type PlanBoardColumnCardsListProps = {
  ids: readonly string[];
  cardsById: ReadonlyMap<string, PlanBoardCardDto>;
  columnId: string;
  auditId: string;
  canEditCardFields: boolean;
  governanceReadOnly: boolean;
  showConsultantPlanTools: boolean;
  isBacklogColumn: boolean;
  orchestrationPackVersion: number;
  dragLocked: boolean;
  moveMenuColumns: readonly { id: string; title: string }[];
  boardColumns: readonly { id: string; title: string }[] | undefined;
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
    dueState: DueState;
    priorityLevel: PriorityLevel | null;
  };
  onMoveViaMenu: (targetCol: string, cardId: string) => Promise<void>;
  onToggleSelect: (cardId: string) => void;
  onDeleteCard: (cardId: string) => Promise<void>;
  onOpenTicketDetails: (cardId: string) => void;
  onCommitTitle: (cardId: string, title: string) => Promise<void>;
  onCommitLane: (cardId: string, lane: string, ownerHint?: string) => Promise<void>;
  onCommitPriority: (cardId: string, priority: PriorityLevel) => Promise<void>;
  onCommitDueDate: (cardId: string, dueDateIso: string) => Promise<void>;
  onQuickPromoteToNextUp: (cardId: string) => Promise<void>;
};

export function PlanBoardColumnCardsList(props: PlanBoardColumnCardsListProps) {
  return (
    <>
      {props.isBacklogColumn && props.showConsultantPlanTools ? (
        <li className="border-border list-none rounded-md border border-dashed px-3 py-2">
          <PlanManualCardCreateForm
            auditId={props.auditId}
            orchestrationPackVersion={props.orchestrationPackVersion}
            disabled={props.governanceReadOnly}
          />
        </li>
      ) : null}
      {props.ids.length === 0 && !(props.isBacklogColumn && props.showConsultantPlanTools) ? (
        <li className="text-muted-foreground text-xs">{PLAN_BOARD_COPY.operationalEmptyPlaceholder}</li>
      ) : null}
      {props.ids.map((id) => {
        const dto = props.cardsById.get(id);
        if (!dto) {
          return (
            <li key={id} className="text-muted-foreground text-xs">
              Missing card view
            </li>
          );
        }
        const view = props.buildCardPresentation(dto);
        return (
          <PlanBoardOperationalCard
            key={id}
            card={dto}
            columnId={props.columnId}
            dragLocked={props.dragLocked}
            expectedPackVersion={props.orchestrationPackVersion}
            moveMenuColumns={props.moveMenuColumns}
            boardColumns={props.boardColumns ? [...props.boardColumns] : undefined}
            openOnRoadmapHref={view.openOnRoadmapHref}
            onMoveViaMenu={(target) => props.onMoveViaMenu(target, dto.id)}
            priorityWindow={view.priorityWindow}
            priorityReasonLabel={view.priorityReasonLabel}
            analysisDepth={view.analysisDepth}
            domainLabel={view.domainLabel}
            quickWin={view.quickWin}
            critical={view.critical}
            assignee={view.assignee}
            dueDate={view.dueDate}
            dueState={view.dueState}
            priorityLevel={view.priorityLevel}
            selected={props.selectedCardIds.has(dto.id)}
            onToggleSelect={() => props.onToggleSelect(dto.id)}
            canMutateCard={props.canEditCardFields}
            onCommitTitleInline={(title) => props.onCommitTitle(dto.id, title)}
            onCommitLaneInline={
              props.showConsultantPlanTools && !props.governanceReadOnly
                ? (lane, hint) => props.onCommitLane(dto.id, lane, hint)
                : undefined
            }
            laneSelectOptions={props.laneSelectOptions}
            manifestDraftLaneHintsEnabled={props.manifestDraftLaneHintsEnabled}
            onDeleteCard={() => props.onDeleteCard(dto.id)}
            onOpenTicketDetails={() => props.onOpenTicketDetails(dto.id)}
            onCommitPriorityInline={(priority) => props.onCommitPriority(dto.id, priority)}
            onCommitDueDateInline={(dueDateIso) => props.onCommitDueDate(dto.id, dueDateIso)}
            onQuickPromoteToNextUp={() => props.onQuickPromoteToNextUp(dto.id)}
            isFocusTarget={
              props.focusToken != null &&
              (dto.canonical_node_key === props.focusToken ||
                dto.id === props.focusToken ||
                (dto.pack_graph_node_id != null && dto.pack_graph_node_id === props.focusToken))
            }
            manifestDraftRevisionPending={
              dto.canonical_node_key != null && props.pendingManifestDraftCanonicalSet.has(dto.canonical_node_key)
            }
          />
        );
      })}
    </>
  );
}
