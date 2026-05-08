import { Button } from '../../../components/ui/button';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';

type PlanBoardOperationalHeaderProps = {
  showConsultantPlanTools: boolean;
  columnPolicyEditable: boolean;
  onOpenBoardSettings: () => void;
};

export function PlanBoardOperationalHeader(props: PlanBoardOperationalHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 id="plan-board-operational-heading" className="text-foreground text-lg font-semibold tracking-tight">
          {PLAN_BOARD_COPY.operationalSectionTitle}
        </h2>
        <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.operationalSectionSubtitle}</p>
      </div>
      {APP_FEATURE_FLAGS.planBoardCustomColumnsEnabled &&
      props.showConsultantPlanTools &&
      props.columnPolicyEditable ? (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={props.onOpenBoardSettings}>
          {PLAN_BOARD_COPY.boardSettingsTrigger}
        </Button>
      ) : null}
    </div>
  );
}
