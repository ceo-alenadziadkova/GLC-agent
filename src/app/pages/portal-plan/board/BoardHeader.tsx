import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PlanBoardOperationalHeader } from './plan-board-operational-header';

type BoardHeaderProps = {
  state: {
    showConsultantPlanTools: boolean;
    columnPolicyEditable: boolean;
    draggingCardId: string | null;
  };
  actions: {
    onOpenBoardSettings: () => void;
  };
};

export function BoardHeader(props: BoardHeaderProps) {
  const { state, actions } = props;

  return (
    <>
      <PlanBoardOperationalHeader
        showConsultantPlanTools={state.showConsultantPlanTools}
        columnPolicyEditable={state.columnPolicyEditable}
        onOpenBoardSettings={actions.onOpenBoardSettings}
      />
      {state.draggingCardId ? (
        <span className="sr-only" aria-live="polite">{`${PLAN_BOARD_COPY.draggingLiveMessage}: ${state.draggingCardId}`}</span>
      ) : null}
    </>
  );
}
