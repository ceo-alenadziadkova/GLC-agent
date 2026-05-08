import { Button } from '../../../../components/ui/button';
import type { PlanCardMetricFilters } from '../../../../lib/plan-cross-nav';

type PlanTableMetricFiltersBarProps = {
  metricFilters: PlanCardMetricFilters;
  backlogOnly: boolean;
  availableDomainFilters: ReadonlyArray<readonly [string, number]>;
  availableAssignees: readonly string[];
  onToggleBacklogOnly: () => void;
  onPatchFilters: (patch: Partial<PlanCardMetricFilters>) => void;
};

export function PlanTableMetricFiltersBar(props: PlanTableMetricFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter table cards by domain"
        className="border-border bg-background h-8 rounded-md border px-2 text-xs"
        value={props.metricFilters.domain}
        onChange={(e) => props.onPatchFilters({ domain: e.target.value || 'all' })}
      >
        <option value="all">All domains</option>
        {props.availableDomainFilters.map(([key, count]) => (
          <option key={key} value={key}>
            {`${key.replaceAll('_', ' ')} (${count})`}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant={props.metricFilters.criticalOnly ? 'default' : 'outline'}
        size="sm"
        className="h-8 text-xs"
        onClick={() => props.onPatchFilters({ criticalOnly: !props.metricFilters.criticalOnly })}
      >
        Critical only
      </Button>
      <Button
        type="button"
        variant={props.metricFilters.quickOnly ? 'default' : 'outline'}
        size="sm"
        className="h-8 text-xs"
        onClick={() => props.onPatchFilters({ quickOnly: !props.metricFilters.quickOnly })}
      >
        Quick wins
      </Button>
      <Button type="button" variant={props.backlogOnly ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={props.onToggleBacklogOnly}>
        Backlog only
      </Button>
      <select
        aria-label="Filter table cards by priority window"
        className="border-border bg-background h-8 rounded-md border px-2 text-xs"
        value={props.metricFilters.priority}
        onChange={(e) => props.onPatchFilters({ priority: e.target.value as 'all' | '7d' | '30d' })}
      >
        <option value="all">All priorities</option>
        <option value="7d">Top 7d</option>
        <option value="30d">Top 30d</option>
      </select>
      <select
        aria-label="Filter table cards by assignee"
        className="border-border bg-background h-8 rounded-md border px-2 text-xs"
        value={props.metricFilters.assignee}
        onChange={(e) => props.onPatchFilters({ assignee: e.target.value || 'all' })}
      >
        <option value="all">All assignees</option>
        {props.availableAssignees.map((assignee) => (
          <option key={assignee} value={assignee}>
            {assignee}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter table cards by due state"
        className="border-border bg-background h-8 rounded-md border px-2 text-xs"
        value={props.metricFilters.dueState}
        onChange={(e) => props.onPatchFilters({ dueState: e.target.value as 'all' | 'overdue' | 'due_soon' | 'no_due' })}
      >
        <option value="all">All due states</option>
        <option value="overdue">Overdue</option>
        <option value="due_soon">Due soon (7d)</option>
        <option value="no_due">No due date</option>
      </select>
    </div>
  );
}
