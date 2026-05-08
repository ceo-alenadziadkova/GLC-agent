import type { TimelineGroupBase } from 'react-calendar-timeline';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { DEPENDENCY_KIND_LABEL } from '../../lib/roadmap-gantt-dep-kind-labels';
import type { RoadmapGanttDependency, RoadmapGanttProjection } from '../../lib/roadmap-gantt-mapper';

export type RoadmapGanttDependencyGraphSvgProps = {
  groups: TimelineGroupBase[];
  projectionLanes: RoadmapGanttProjection['lanes'];
  visibleDependencies: RoadmapGanttDependency[];
  dependencySvgPathsByDepId: ReadonlyMap<string, string>;
  dependencyCanvasHeight: number;
  mapY: (laneId: string) => number;
  isHeavyTaskLoad: boolean;
  filteredTasksCount: number;
  heavyTaskThreshold: number;
  taskTitleById: ReadonlyMap<string, string>;
  hoveredDependencyId: string | null;
  onHoveredDependencyChange: (id: string | null) => void;
  onSelectTask: (taskId: string) => void;
  strokeForDependencySeg: (dep: RoadmapGanttDependency) => string;
  dependencyChainShouldDim: (dep: RoadmapGanttDependency) => boolean;
};

export function RoadmapGanttDependencyGraphSvg({
  groups,
  projectionLanes,
  visibleDependencies,
  dependencySvgPathsByDepId,
  dependencyCanvasHeight,
  mapY,
  isHeavyTaskLoad,
  filteredTasksCount,
  heavyTaskThreshold,
  taskTitleById,
  hoveredDependencyId,
  onHoveredDependencyChange,
  onSelectTask,
  strokeForDependencySeg,
  dependencyChainShouldDim,
}: RoadmapGanttDependencyGraphSvgProps) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted p-2">
      {isHeavyTaskLoad ? (
        <p className="m-0 mb-2 text-xs ds-text-secondary" role="status">
          {ORCHESTRATION_UI_COPY.roadmapGanttHeavyTaskLoadGraphNotice.replace('{count}', String(filteredTasksCount)).replace(
            '{threshold}',
            String(heavyTaskThreshold),
          )}
        </p>
      ) : null}
      <svg
        width="100%"
        height={dependencyCanvasHeight}
        viewBox={`0 0 100 ${dependencyCanvasHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ORCHESTRATION_UI_COPY.roadmapGanttDependencyGraphSvgAriaLabel}
      >
        <defs>
          <marker id="arrowHead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
          </marker>
        </defs>
        {projectionLanes
          .filter((lane) => groups.some((group) => group.id === lane.id))
          .map((lane) => {
            const y = mapY(lane.id);
            return (
              <g key={lane.id}>
                <line x1={0} y1={y} x2={100} y2={y} className="text-border" stroke="currentColor" strokeDasharray="2 2" />
              </g>
            );
          })}
        {visibleDependencies.map((dep) => {
          const path = dependencySvgPathsByDepId.get(dep.id);
          if (!path) return null;
          const fromTitle = taskTitleById.get(dep.from) ?? dep.from;
          const toTitle = taskTitleById.get(dep.to) ?? dep.to;
          const isHovered = hoveredDependencyId === dep.id;
          const chainDimmed = dependencyChainShouldDim(dep);
          return (
            <path
              key={dep.id}
              d={path}
              fill="none"
              stroke={strokeForDependencySeg(dep)}
              strokeWidth={isHovered ? 2 : dep.crossLane || dep.onCriticalPath ? 1.9 : 1.2}
              strokeDasharray={dep.strength === 'weak' ? '2 2' : undefined}
              markerEnd="url(#arrowHead)"
              className={[
                'cursor-pointer roadmap-dependency-arrow',
                dep.crossLane ? 'roadmap-dependency-arrow-cross-lane' : '',
                dep.onCriticalPath ? 'roadmap-dependency-arrow-critical' : '',
                chainDimmed ? 'roadmap-dependency-arrow-dimmed' : '',
                isHovered ? 'roadmap-dependency-arrow-hovered' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                onSelectTask(dep.to);
              }}
              onMouseEnter={() => onHoveredDependencyChange(dep.id)}
              onMouseLeave={() => onHoveredDependencyChange(null)}
            >
              <title>{`${fromTitle} -> ${toTitle} (${DEPENDENCY_KIND_LABEL[dep.kind]})`}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}
