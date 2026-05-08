import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PlanBoardColumnPolicySheet } from './plan-board-column-policy-sheet';
import { PlanTicketDetailsPanel, type PlanTicketDetailsDraft } from '../PlanTicketDetailsPanel';
import type { PlanBoardGetBody } from '../../../data/api/orchestration-types';

type PlanBoardDialogsProps = {
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  boardSettingsOpen: boolean;
  onBoardSettingsOpenChange: (open: boolean) => void;
  ticketDetailsOpen: boolean;
  onTicketDetailsOpenChange: (open: boolean) => void;
  auditId: string;
  columns: PlanBoardGetBody['columns'] | undefined;
  selectedTicketCard: PlanBoardGetBody['cards'][number] | null;
  canEditCardFields: boolean;
  patchPending: boolean;
  onSaveTicketDetails: (cardId: string, draft: PlanTicketDetailsDraft) => Promise<void>;
};

export function PlanBoardDialogs(props: PlanBoardDialogsProps) {
  return (
    <>
      <AlertDialog open={props.deleteDialogOpen} onOpenChange={props.onDeleteDialogOpenChange}>
        <AlertDialogContent className="border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{PLAN_BOARD_COPY.cardDeleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{PLAN_BOARD_COPY.cardDeleteDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{PLAN_BOARD_COPY.cardDeleteConfirmCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                props.onConfirmDelete();
              }}
            >
              {PLAN_BOARD_COPY.cardDeleteConfirmCta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanBoardColumnPolicySheet
        auditId={props.auditId}
        open={props.boardSettingsOpen}
        onOpenChange={props.onBoardSettingsOpenChange}
        columns={props.columns}
      />
      <PlanTicketDetailsPanel
        auditId={props.auditId}
        open={props.ticketDetailsOpen}
        onOpenChange={props.onTicketDetailsOpenChange}
        card={props.selectedTicketCard}
        canMutateCard={props.canEditCardFields}
        columnOptions={props.columns ?? []}
        busy={props.patchPending}
        onSave={props.onSaveTicketDetails}
      />
    </>
  );
}
