import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';
import type { RoadmapGanttDependency, RoadmapGanttTask } from '../../lib/roadmap-gantt-mapper';

type TaskDetailsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: RoadmapGanttTask | null;
  dependencies: RoadmapGanttDependency[];
  taskTitleById: Map<string, string>;
};

export function TaskDetailsDrawer({ open, onOpenChange, task, dependencies, taskTitleById }: TaskDetailsDrawerProps) {
  const incomingDependencies = task
    ? dependencies.filter((dep) => dep.to === task.id)
    : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="max-w-xl">
        <DrawerHeader>
          <DrawerTitle>{task?.title ?? 'Task details'}</DrawerTitle>
          <DrawerDescription>
            {task?.description || 'No detailed description available yet for this task.'}
          </DrawerDescription>
        </DrawerHeader>
        {task ? (
          <div className="space-y-4 px-4 pb-4 text-sm">
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Owner</div>
              <div className="text-[var(--text-secondary)]">{task.owner}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Status</div>
              <div className="text-[var(--text-secondary)]">{task.status}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Impact</div>
              <div className="text-[var(--text-secondary)]">{task.impact}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Deliverables</div>
              <ul className="mt-2 list-disc pl-5 text-[var(--text-secondary)]">
                {task.deliverables.length === 0 ? <li>Not specified</li> : null}
                {task.deliverables.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Dependencies</div>
              <ul className="mt-2 list-disc pl-5 text-[var(--text-secondary)]">
                {incomingDependencies.length === 0 ? <li>No blocking dependencies</li> : null}
                {incomingDependencies.map((dep) => (
                  <li key={dep.id}>
                    {taskTitleById.get(dep.from) ?? dep.from} ({dep.kind}, {dep.strength})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
