import dayjs from 'dayjs';

import {
  ORCHESTRATION_UI_COPY,
  formatRoadmapGanttUnlocksCopy,
} from '../../config/orchestration-roadmap-ui-copy.en';
import type { RoadmapGanttDependency, RoadmapGanttTask } from '../../lib/roadmap-gantt-mapper';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';

type TaskDetailsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: RoadmapGanttTask | null;
  dependencies: RoadmapGanttDependency[];
  taskTitleById: Map<string, string>;
  downstreamTaskCount: number;
};

export function TaskDetailsDrawer({
  open,
  onOpenChange,
  task,
  dependencies,
  taskTitleById,
  downstreamTaskCount,
}: TaskDetailsDrawerProps) {
  const incomingDependencies = task ? dependencies.filter((dep) => dep.to === task.id) : [];
  const isBlocked = incomingDependencies.some((dep) => dep.blocking);

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
            <div className="flex flex-wrap gap-2">
              {task.onCriticalPath ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathBadge}
                </span>
              ) : null}
              {task.isOverdue ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-score-1">
                  {ORCHESTRATION_UI_COPY.roadmapGanttOverdueBadge}
                </span>
              ) : null}
              {task.topPriorityBucket === '7d' ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttTopPriority7dBadge}
                </span>
              ) : null}
              {task.topPriorityBucket === '30d' ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttTopPriority30dBadge}
                </span>
              ) : null}
            </div>
            {task.isOverdue ? (
              <p className="text-xs ds-text-tertiary">
                {ORCHESTRATION_UI_COPY.roadmapGanttOverdueEndedPrefix} {dayjs(task.end_time).format('YYYY-MM-DD')}.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Summary</div>
                <div className="mt-1 text-[var(--text-primary)]">
                  {isBlocked ? 'Blocked task' : 'Ready to execute'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Next action</div>
                <div className="mt-1 text-[var(--text-primary)]">
                  {isBlocked ? 'Unblock upstream dependency' : 'Move to next milestone'}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.roadmapGanttUnlocksLabel}</div>
              <div className="mt-1 text-[var(--text-secondary)]">{formatRoadmapGanttUnlocksCopy(downstreamTaskCount)}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Owner</div>
              <div className="text-[var(--text-secondary)]">{task.owner || '—'}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Status</div>
              <div className="text-[var(--text-secondary)]">{task.status}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Risk</div>
              <div className="text-[var(--text-secondary)]">{isBlocked ? 'High (blocked)' : 'Normal'}</div>
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
              <div className="font-medium text-[var(--text-primary)]">Blocking dependencies</div>
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
