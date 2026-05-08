import { Button } from '../../../../components/ui/button';
import { PLAN_WORKSPACE_UI_COPY } from '../../../../config/plan-workspace-ui-copy.en';
import { ORCHESTRATION_LANE_LABELS, type OrchestrationLaneId } from '../../../../config/orchestration-roadmap-ui-copy.en';

type PlanTableActiveLaneChipsProps = {
  laneFilterKeys: readonly string[];
  onClear: () => void;
};

export function PlanTableActiveLaneChips(props: PlanTableActiveLaneChipsProps) {
  if (props.laneFilterKeys.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
      <span className="text-muted-foreground text-xs">
        {PLAN_WORKSPACE_UI_COPY.laneFilterChipPrefix}{' '}
        {props.laneFilterKeys.map((k) => ORCHESTRATION_LANE_LABELS[k as OrchestrationLaneId] ?? k).join(', ')}
      </span>
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={props.onClear}>
        {PLAN_WORKSPACE_UI_COPY.laneFilterChipClear}
      </Button>
    </div>
  );
}
