import { useMemo, useState } from 'react';
import Timeline, { type TimelineGroupBase, type TimelineItemBase } from 'react-calendar-timeline';
import 'react-calendar-timeline/style.css';
import './RoadmapGanttView.css';

import type { RoadmapGanttProjection } from '../../lib/roadmap-gantt-mapper';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';

type GanttTaskItem = TimelineItemBase<number> & {
  id: string;
  group: string;
  title: string;
  className: string;
};

type RoadmapGanttViewProps = {
  projection: RoadmapGanttProjection;
};

const DEPENDENCY_KIND_LABEL: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'Finish -> Start',
  SS: 'Start -> Start',
  FF: 'Finish -> Finish',
  SF: 'Start -> Finish',
};

const DEPENDENCY_KIND_HINT: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'Task B starts after Task A is completed.',
  SS: 'Task B starts after Task A starts.',
  FF: 'Task B finishes after Task A is completed.',
  SF: 'Task B finishes after Task A starts.',
};

export function RoadmapGanttView({ projection }: RoadmapGanttViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<string | null>(null);
  const [dependencyTypeFilter, setDependencyTypeFilter] = useState<'all' | 'FS' | 'SS' | 'FF' | 'SF'>('all');

  const groups: TimelineGroupBase[] = useMemo(
    () => projection.lanes.map((lane) => ({ id: lane.id, title: lane.title })),
    [projection.lanes],
  );

  const items: GanttTaskItem[] = useMemo(
    () =>
      projection.tasks.map((task) => ({
        id: task.id,
        group: task.group,
        title: task.title,
        start_time: task.start_time,
        end_time: task.end_time,
        canMove: false,
        canResize: false,
        canChangeGroup: false,
        className: task.isEstimated ? 'roadmap-gantt-item-estimated' : 'roadmap-gantt-item-solid',
      })),
    [projection.tasks],
  );

  const selectedTask = useMemo(
    () => projection.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [projection.tasks, selectedTaskId],
  );

  const taskTitleById = useMemo(
    () => new Map(projection.tasks.map((task) => [task.id, task.title] as const)),
    [projection.tasks],
  );
  const taskById = useMemo(
    () => new Map(projection.tasks.map((task) => [task.id, task] as const)),
    [projection.tasks],
  );
  const laneIndexById = useMemo(
    () => new Map(projection.lanes.map((lane, index) => [lane.id, index] as const)),
    [projection.lanes],
  );
  const laneHeight = 54;
  const timelineRange = Math.max(projection.defaultTimeEnd - projection.defaultTimeStart, 1);
  const dependencyCanvasHeight = Math.max(projection.lanes.length * laneHeight + 24, 120);
  const mapX = (ts: number) => ((ts - projection.defaultTimeStart) / timelineRange) * 100;
  const mapY = (laneId: string) => (laneIndexById.get(laneId) ?? 0) * laneHeight + laneHeight * 0.5 + 12;
  const pathForDependency = (fromId: string, toId: string, kind: string): string | null => {
    const from = taskById.get(fromId);
    const to = taskById.get(toId);
    if (!from || !to) return null;
    const startX = kind === 'SS' || kind === 'SF' ? mapX(from.start_time) : mapX(from.end_time);
    const endX = kind === 'SS' || kind === 'FS' ? mapX(to.start_time) : mapX(to.end_time);
    const y1 = mapY(from.group);
    const y2 = mapY(to.group);
    const controlX = startX + (endX - startX) * 0.4;
    return `M ${startX} ${y1} C ${controlX} ${y1}, ${controlX} ${y2}, ${endX} ${y2}`;
  };
  const strokeForKind = (kind: string): string => {
    if (kind === 'FS') return 'var(--score-5)';
    if (kind === 'SS') return 'var(--glc-blue)';
    if (kind === 'FF') return 'var(--score-3)';
    return 'var(--text-tertiary)';
  };
  const visibleDependencies = useMemo(
    () =>
      projection.dependencies.filter((dep) => dependencyTypeFilter === 'all' || dep.kind === dependencyTypeFilter),
    [projection.dependencies, dependencyTypeFilter],
  );
  const hoveredDependency = useMemo(
    () => visibleDependencies.find((dep) => dep.id === hoveredDependencyId) ?? null,
    [visibleDependencies, hoveredDependencyId],
  );
  const highlightedTaskIds = useMemo(() => {
    if (!hoveredDependency) return new Set<string>();
    return new Set<string>([hoveredDependency.from, hoveredDependency.to]);
  }, [hoveredDependency]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-b from-[var(--surface-raised)] to-[var(--surface-base)] p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold ds-text-primary">Roadmap timeline</h3>
            <p className="mt-1 text-xs ds-text-tertiary">
              Multi-lane schedule with highlighted dependency context.
            </p>
          </div>
          <div className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-1 text-xs font-medium ds-text-secondary">
            {`Lanes ${projection.lanes.length} · Tasks ${projection.tasks.length}`}
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="dependencyTypeFilter" className="text-xs font-medium ds-text-primary">
            Dependency type
          </label>
          <select
            id="dependencyTypeFilter"
            value={dependencyTypeFilter}
            onChange={(event) => setDependencyTypeFilter(event.target.value as 'all' | 'FS' | 'SS' | 'FF' | 'SF')}
            className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs"
          >
            <option value="all">All dependency types</option>
            <option value="FS">Finish -&gt; Start</option>
            <option value="SS">Start -&gt; Start</option>
            <option value="FF">Finish -&gt; Finish</option>
            <option value="SF">Start -&gt; Finish</option>
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs ds-text-tertiary">
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 font-medium ds-text-secondary">
              {`Showing ${visibleDependencies.length} dependencies`}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--surface-base)] px-2 py-1"
              title={DEPENDENCY_KIND_HINT.FS}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--score-5)' }} />
              {DEPENDENCY_KIND_LABEL.FS}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--surface-base)] px-2 py-1"
              title={DEPENDENCY_KIND_HINT.SS}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--glc-blue)' }} />
              {DEPENDENCY_KIND_LABEL.SS}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--surface-base)] px-2 py-1"
              title={DEPENDENCY_KIND_HINT.FF}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--score-3)' }} />
              {DEPENDENCY_KIND_LABEL.FF}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--surface-base)] px-2 py-1"
              title={DEPENDENCY_KIND_HINT.SF}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)' }} />
              {DEPENDENCY_KIND_LABEL.SF}
            </span>
          </div>
        </div>
        <div className="roadmap-gantt-shell">
          <Timeline<GanttTaskItem, TimelineGroupBase>
            groups={groups}
            items={items.map((item) => ({
              ...item,
              className: highlightedTaskIds.has(item.id)
                ? `${item.className} roadmap-gantt-item-highlighted`
                : item.className,
            }))}
            defaultTimeStart={projection.defaultTimeStart}
            defaultTimeEnd={projection.defaultTimeEnd}
            lineHeight={52}
            itemHeightRatio={0.72}
            sidebarWidth={220}
            rightSidebarWidth={0}
            canMove={false}
            canResize={false}
            stackItems
            onItemSelect={(itemId) => setSelectedTaskId(String(itemId))}
            onItemClick={(itemId) => setSelectedTaskId(String(itemId))}
            keys={{
              groupIdKey: 'id',
              groupTitleKey: 'title',
              groupRightTitleKey: 'rightTitle',
              groupLabelKey: 'title',
              itemIdKey: 'id',
              itemTitleKey: 'title',
              itemDivTitleKey: 'title',
              itemGroupKey: 'group',
              itemTimeStartKey: 'start_time',
              itemTimeEndKey: 'end_time',
            }}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-b from-[var(--surface-raised)] to-[var(--surface-base)] p-4 shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-semibold ds-text-primary">Dependency arrows (time-grid)</h3>
        <p className="mt-1 text-xs ds-text-tertiary">
          Colored links are rendered by dependency type: FS, SS, FF, SF.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-2">
          <svg
            width="100%"
            height={dependencyCanvasHeight}
            viewBox={`0 0 100 ${dependencyCanvasHeight}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Roadmap dependency arrow map"
          >
            <defs>
              <marker id="arrowHead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
              </marker>
            </defs>
            {projection.lanes.map((lane) => {
              const y = mapY(lane.id);
              return (
                <g key={lane.id}>
                  <line x1={0} y1={y} x2={100} y2={y} stroke="var(--border-default)" strokeDasharray="2 2" />
                </g>
              );
            })}
            {visibleDependencies.map((dep) => {
              const path = pathForDependency(dep.from, dep.to, dep.kind);
              if (!path) return null;
              const fromTitle = taskTitleById.get(dep.from) ?? dep.from;
              const toTitle = taskTitleById.get(dep.to) ?? dep.to;
              const isHovered = hoveredDependencyId === dep.id;
              return (
                <path
                  key={dep.id}
                  d={path}
                  fill="none"
                  stroke={strokeForKind(dep.kind)}
                  strokeWidth={isHovered ? 2 : 1.2}
                  markerEnd="url(#arrowHead)"
                  style={{ color: strokeForKind(dep.kind) }}
                  className={`cursor-pointer roadmap-dependency-arrow ${isHovered ? 'roadmap-dependency-arrow-hovered' : ''}`}
                  onClick={() => setSelectedTaskId(dep.to)}
                  onMouseEnter={() => setHoveredDependencyId(dep.id)}
                  onMouseLeave={() => setHoveredDependencyId(null)}
                >
                  <title>{`${fromTitle} -> ${toTitle} (${DEPENDENCY_KIND_LABEL[dep.kind]})`}</title>
                </path>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-b from-[var(--surface-raised)] to-[var(--surface-base)] p-4 shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-semibold ds-text-primary">Dependencies map</h3>
        <ul className="mt-3 list-none space-y-2 text-sm ds-text-secondary">
          {visibleDependencies.length === 0 ? <li>No dependencies for selected type</li> : null}
          {visibleDependencies.map((dep) => (
            <li
              key={dep.id}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2"
            >
              {(taskTitleById.get(dep.from) ?? dep.from) + ' -> ' + (taskTitleById.get(dep.to) ?? dep.to)}
              <span
                className="ml-2 rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs"
                title={DEPENDENCY_KIND_HINT[dep.kind]}
              >
                {DEPENDENCY_KIND_LABEL[dep.kind]}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <TaskDetailsDrawer
        open={selectedTask != null}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        task={selectedTask}
        dependencies={projection.dependencies}
        taskTitleById={taskTitleById}
      />
    </section>
  );
}
