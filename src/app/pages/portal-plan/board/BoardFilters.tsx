import type { PlanCardMetricFilters } from '../../../lib/plan-cross-nav';
import { PlanBoardLaneFilterBar } from './plan-board-lane-filter-bar';
import { PlanBoardMetricFiltersBar } from './plan-board-metric-filters-bar';
import { PlanBoardBulkActionsBar } from './plan-board-bulk-actions-bar';

type BoardFiltersProps = {
  visibility: {
    boardOperationalVisible: boolean;
    showConsultantPlanTools: boolean;
  };
  filters: {
    laneFilterKeys: readonly string[];
    metricFilters: PlanCardMetricFilters;
    availableDomainFilters: ReadonlyArray<readonly [string, number]>;
    availableAssignees: readonly string[];
  };
  bulk: {
    selectedCount: number;
    columns: ReadonlyArray<{ id: string; title: string }>;
    dragLocked: boolean;
    busy: boolean;
    bulkPriority: 'low' | 'medium' | 'high' | 'urgent';
    bulkAssignee: string;
    bulkDueDate: string;
  };
  setters: {
    onSetBulkPriority: (value: 'low' | 'medium' | 'high' | 'urgent') => void;
    onSetBulkAssignee: (value: string) => void;
    onSetBulkDueDate: (value: string) => void;
  };
  actions: {
    onClearLaneFilters: () => void;
    onPatchFilters: (patch: Partial<PlanCardMetricFilters>) => void;
    onMoveAll: (columnId: string) => void;
    onApplyPriority: () => void;
    onApplyAssignee: () => void;
    onApplyDueDate: () => void;
    onClearSelected: () => void;
  };
};

export function BoardFilters(props: BoardFiltersProps) {
  const { visibility, filters, bulk, setters, actions } = props;

  if (!visibility.boardOperationalVisible || !visibility.showConsultantPlanTools) {
    return null;
  }

  return (
    <>
      <PlanBoardLaneFilterBar laneFilterKeys={filters.laneFilterKeys} onClear={actions.onClearLaneFilters} />
      <PlanBoardMetricFiltersBar
        metricFilters={filters.metricFilters}
        availableDomainFilters={filters.availableDomainFilters}
        availableAssignees={filters.availableAssignees}
        onPatchFilters={actions.onPatchFilters}
      />
      <PlanBoardBulkActionsBar
        selectedCount={bulk.selectedCount}
        columns={bulk.columns}
        dragLocked={bulk.dragLocked}
        busy={bulk.busy}
        bulkPriority={bulk.bulkPriority}
        bulkAssignee={bulk.bulkAssignee}
        bulkDueDate={bulk.bulkDueDate}
        onSetBulkPriority={setters.onSetBulkPriority}
        onSetBulkAssignee={setters.onSetBulkAssignee}
        onSetBulkDueDate={setters.onSetBulkDueDate}
        onMoveAll={actions.onMoveAll}
        onApplyPriority={actions.onApplyPriority}
        onApplyAssignee={actions.onApplyAssignee}
        onApplyDueDate={actions.onApplyDueDate}
        onClear={actions.onClearSelected}
      />
    </>
  );
}
