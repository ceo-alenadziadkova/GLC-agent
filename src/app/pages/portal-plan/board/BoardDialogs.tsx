import type { ComponentProps } from 'react';
import { PlanBoardDialogs as PlanBoardDialogsRoot } from './plan-board-dialogs';

type RootProps = ComponentProps<typeof PlanBoardDialogsRoot>;
type BoardDialogsProps = {
  state: {
    deleteDialogOpen: RootProps['deleteDialogOpen'];
    boardSettingsOpen: RootProps['boardSettingsOpen'];
    ticketDetailsOpen: RootProps['ticketDetailsOpen'];
    patchPending: RootProps['patchPending'];
  };
  data: {
    auditId: RootProps['auditId'];
    columns: RootProps['columns'];
    selectedTicketCard: RootProps['selectedTicketCard'];
    canEditCardFields: RootProps['canEditCardFields'];
  };
  actions: {
    onDeleteDialogOpenChange: RootProps['onDeleteDialogOpenChange'];
    onConfirmDelete: RootProps['onConfirmDelete'];
    onBoardSettingsOpenChange: RootProps['onBoardSettingsOpenChange'];
    onTicketDetailsOpenChange: RootProps['onTicketDetailsOpenChange'];
    onSaveTicketDetails: RootProps['onSaveTicketDetails'];
  };
};

export function BoardDialogs(props: BoardDialogsProps) {
  return (
    <PlanBoardDialogsRoot
      deleteDialogOpen={props.state.deleteDialogOpen}
      onDeleteDialogOpenChange={props.actions.onDeleteDialogOpenChange}
      onConfirmDelete={props.actions.onConfirmDelete}
      boardSettingsOpen={props.state.boardSettingsOpen}
      onBoardSettingsOpenChange={props.actions.onBoardSettingsOpenChange}
      ticketDetailsOpen={props.state.ticketDetailsOpen}
      onTicketDetailsOpenChange={props.actions.onTicketDetailsOpenChange}
      auditId={props.data.auditId}
      columns={props.data.columns}
      selectedTicketCard={props.data.selectedTicketCard}
      canEditCardFields={props.data.canEditCardFields}
      patchPending={props.state.patchPending}
      onSaveTicketDetails={props.actions.onSaveTicketDetails}
    />
  );
}
