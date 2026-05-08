import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';

export type RoadmapGanttEmptyStateProps = {
  hasActiveFilters: boolean;
  activeFilterReason: string;
  onResetView: () => void;
};

/**
 * Empty-state card for the Timeline panel: rendered when there are no tasks to show.
 * Distinguishes "filtered to nothing" from "no data" and offers a reset CTA.
 */
export function RoadmapGanttEmptyState(props: RoadmapGanttEmptyStateProps) {
  const { hasActiveFilters, activeFilterReason, onResetView } = props;

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-muted p-4 text-sm ds-text-secondary">
      {hasActiveFilters ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 max-w-prose">
            {ORCHESTRATION_UI_COPY.roadmapEmptyFilteredBodyPrefix}{' '}
            {ORCHESTRATION_UI_COPY.roadmapGanttEmptyFilteredActiveReasonPrefix}{' '}
            {activeFilterReason || ORCHESTRATION_UI_COPY.roadmapGanttFilterLogicFallback}.{' '}
            {ORCHESTRATION_UI_COPY.roadmapEmptyFilteredBodySuffix}
          </p>
          <button
            type="button"
            onClick={onResetView}
            className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium ds-text-primary hover:bg-muted"
          >
            {ORCHESTRATION_UI_COPY.roadmapGanttClearAllFilters}
          </button>
        </div>
      ) : (
        ORCHESTRATION_UI_COPY.roadmapEmptyNoTasksBody
      )}
    </div>
  );
}
