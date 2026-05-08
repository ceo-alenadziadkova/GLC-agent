import { Button } from '../../../../components/ui/button';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

type PlanTableBulkActionsBarProps = {
  selectedCount: number;
  columns: readonly { id: string; title: string }[];
  patchBusy: boolean;
  batchBusy: boolean;
  bulkPriority: Priority;
  bulkAssignee: string;
  bulkDueDate: string;
  onSetBulkPriority: (value: Priority) => void;
  onSetBulkAssignee: (value: string) => void;
  onSetBulkDueDate: (value: string) => void;
  onMoveAll: (columnId: string) => void;
  onApplyPriority: () => void;
  onApplyAssignee: () => void;
  onApplyDueDate: () => void;
  onClear: () => void;
};

export function PlanTableBulkActionsBar(props: PlanTableBulkActionsBarProps) {
  if (props.selectedCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-2">
      <span className="text-xs text-muted-foreground">{`${props.selectedCount} selected`}</span>
      {props.columns.map((col) => (
        <Button
          key={col.id}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => props.onMoveAll(col.id)}
          disabled={props.patchBusy || props.batchBusy}
        >
          {`Move to ${col.title}`}
        </Button>
      ))}
      <select
        aria-label="Bulk set priority"
        className="border-border bg-background h-7 rounded-md border px-2 text-xs"
        value={props.bulkPriority}
        onChange={(e) => props.onSetBulkPriority(e.target.value as Priority)}
      >
        <option value="low">Priority low</option>
        <option value="medium">Priority medium</option>
        <option value="high">Priority high</option>
        <option value="urgent">Priority urgent</option>
      </select>
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={props.onApplyPriority} disabled={props.batchBusy}>
        Apply priority
      </Button>
      <input
        aria-label="Bulk assignee"
        className="border-border bg-background h-7 rounded-md border px-2 text-xs"
        value={props.bulkAssignee}
        onChange={(e) => props.onSetBulkAssignee(e.target.value)}
        placeholder="Assignee"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={props.onApplyAssignee}
        disabled={props.batchBusy || props.bulkAssignee.trim() === ''}
      >
        Apply assignee
      </Button>
      <input
        aria-label="Bulk due date"
        type="date"
        className="border-border bg-background h-7 rounded-md border px-2 text-xs"
        value={props.bulkDueDate}
        onChange={(e) => props.onSetBulkDueDate(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={props.onApplyDueDate}
        disabled={props.batchBusy || props.bulkDueDate === ''}
      >
        Apply due
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={props.onClear}>
        Clear
      </Button>
    </div>
  );
}
