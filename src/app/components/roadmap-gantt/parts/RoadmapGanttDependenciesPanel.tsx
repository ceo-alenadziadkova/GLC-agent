import { Link } from 'react-router';

import './RoadmapGanttDependenciesPanel.css';
import { ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD } from '../../../config/roadmap-gantt-view-preferences';
import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { DEPENDENCY_KIND_LABEL } from '../../../lib/roadmap-gantt-dep-kind-labels';
import type { RoadmapGanttProjection } from '../../../lib/roadmap-gantt-mapper';
import { RoadmapGanttDependencyGraphSvg } from '../RoadmapGanttDependencyGraphSvg';
import { RoadmapGanttDependencyTable } from '../RoadmapGanttDependencyTable';
import { strokeForDependencySeg } from '../lib/task-stroke-color';
import type { UseRoadmapGanttViewResult } from '../../../hooks/useRoadmapGanttView';

export type RoadmapGanttDependenciesPanelProps = {
  ctl: UseRoadmapGanttViewResult;
  projection: RoadmapGanttProjection;
  strategyHref: string;
};

/**
 * Dependencies panel: graph/table tabs, missing-link CTA and the legend.
 * Edge colour and chain dimming are computed via pure helpers.
 */
export function RoadmapGanttDependenciesPanel(props: RoadmapGanttDependenciesPanelProps) {
  const { ctl, projection, strategyHref } = props;
  const { state, setters, derived, ids, handlers } = ctl;

  return (
    <div
      id={ids.mainPanelDependenciesId}
      role="tabpanel"
      aria-labelledby={ids.mainTabDependenciesId}
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold ds-text-primary">
            {ORCHESTRATION_UI_COPY.roadmapGanttDependenciesPanelTitle}
          </h3>
          <p className="mt-1 text-xs ds-text-tertiary">{ORCHESTRATION_UI_COPY.roadmapDepsPanelIntro}</p>
        </div>
        <button
          type="button"
          onClick={handlers.resetView}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs ds-text-primary hover:bg-muted"
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttResetViewCta}
        </button>
      </div>
      <div
        className="mb-3 flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label={ORCHESTRATION_UI_COPY.roadmapGanttDepsViewTablistAriaLabel}
      >
        <button
          type="button"
          role="tab"
          id={ids.depsTabGraphId}
          aria-selected={state.dependenciesTab === 'graph'}
          aria-controls={ids.depsPanelGraphId}
          tabIndex={state.dependenciesTab === 'graph' ? 0 : -1}
          onClick={() => setters.setDependenciesTab('graph')}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            state.dependenciesTab === 'graph' ? 'bg-muted ds-text-primary' : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttDepsGraphTabLabel}
        </button>
        <button
          type="button"
          role="tab"
          id={ids.depsTabTableId}
          aria-selected={state.dependenciesTab === 'table'}
          aria-controls={ids.depsPanelTableId}
          tabIndex={state.dependenciesTab === 'table' ? 0 : -1}
          onClick={() => setters.setDependenciesTab('table')}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            state.dependenciesTab === 'table' ? 'bg-muted ds-text-primary' : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttDepsTableTabLabel}
        </button>
        <span className="ml-auto rounded-full border border-border bg-muted px-2 py-1 text-xs ds-text-secondary">
          {`Dependencies ${derived.visibleDependencies.length}`}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs ds-text-secondary">
        <span className="rounded-full border border-border bg-card px-2 py-1">
          {state.dependenciesTab === 'graph'
            ? ORCHESTRATION_UI_COPY.roadmapGanttDepsModeGraphHint
            : ORCHESTRATION_UI_COPY.roadmapGanttDepsModeTableHint}
        </span>
        {state.dependenciesTab === 'table' ? (
          <span className="rounded-full border border-border bg-card px-2 py-1">
            {`Sorted by ${state.dependencySort.key} (${state.dependencySort.direction})`}
          </span>
        ) : null}
      </div>
      <div className="mb-3 rounded-lg border border-border bg-muted p-3">
        <p className="text-xs ds-text-secondary">{ORCHESTRATION_UI_COPY.roadmapGanttDepsMissingLinksHint}</p>
        <Link
          to={strategyHref}
          className="roadmap-deps-cta mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"
        >
          <span aria-hidden>+</span>
          {ORCHESTRATION_UI_COPY.roadmapGanttDepsBuildStrategyLinkCta}
        </Link>
      </div>
      <div
        id={ids.depsPanelGraphId}
        role="tabpanel"
        aria-labelledby={ids.depsTabGraphId}
        hidden={state.dependenciesTab !== 'graph'}
      >
        {state.dependenciesTab === 'graph' ? (
          <div>
            <h4 className="text-sm font-semibold ds-text-primary">Dependency graph</h4>
            <p className="mt-1 text-xs ds-text-tertiary">
              FS means the target task starts after the source task finishes. Other types follow the same initial letters.
            </p>
            <div className="mt-2 rounded-md border border-border bg-card p-2">
              <div className="roadmap-dependency-legend">
                <span className="roadmap-legend-item">
                  <span className="roadmap-legend-line roadmap-legend-line-fs" />
                  FS (Finish -&gt; Start)
                </span>
                <span className="roadmap-legend-item">
                  <span className="roadmap-legend-line roadmap-legend-line-ss" />
                  SS (Start -&gt; Start)
                </span>
                <span className="roadmap-legend-item">
                  <span className="roadmap-legend-line roadmap-legend-line-ff" />
                  FF (Finish -&gt; Finish)
                </span>
                <span className="roadmap-legend-item">
                  <span className="roadmap-legend-line roadmap-legend-line-sf" />
                  SF (Start -&gt; Finish)
                </span>
                <span className="roadmap-legend-item">
                  <span className="roadmap-legend-line roadmap-legend-line-weak" />
                  Weak relation (dashed)
                </span>
                <span className="roadmap-legend-item">
                  <span className="roadmap-legend-line roadmap-legend-line-cross-lane" />
                  {ORCHESTRATION_UI_COPY.roadmapGanttCrossLaneLabel}
                </span>
              </div>
            </div>
            <RoadmapGanttDependencyGraphSvg
              groups={derived.groups}
              projectionLanes={projection.lanes}
              visibleDependencies={derived.visibleDependencies}
              dependencySvgPathsByDepId={derived.dependencySvgPathsByDepId}
              dependencyCanvasHeight={derived.dependencyCanvasHeight}
              mapY={derived.mapY}
              isHeavyTaskLoad={derived.isHeavyTaskLoad}
              filteredTasksCount={derived.timelineTasks.length}
              heavyTaskThreshold={ROADMAP_GANTT_HEAVY_TASK_COUNT_THRESHOLD}
              taskTitleById={derived.taskTitleById}
              hoveredDependencyId={state.hoveredDependencyId}
              onHoveredDependencyChange={setters.setHoveredDependencyId}
              onSelectTask={handlers.selectTask}
              strokeForDependencySeg={strokeForDependencySeg}
              dependencyChainShouldDim={derived.dependencyChainShouldDim}
            />
            {derived.hoveredDependency ? (
              <p className="mt-2 text-xs ds-text-secondary">
                {`${derived.taskTitleById.get(derived.hoveredDependency.from) ?? derived.hoveredDependency.from} -> ${
                  derived.taskTitleById.get(derived.hoveredDependency.to) ?? derived.hoveredDependency.to
                } · ${DEPENDENCY_KIND_LABEL[derived.hoveredDependency.kind]} · ${derived.hoveredDependency.strength}`}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        id={ids.depsPanelTableId}
        role="tabpanel"
        aria-labelledby={ids.depsTabTableId}
        hidden={state.dependenciesTab !== 'table'}
      >
        {state.dependenciesTab === 'table' ? (
          <RoadmapGanttDependencyTable
            sortedDeps={derived.sortedVisibleDependencies}
            dependencySortKey={state.dependencySort.key}
            dependencySortDirection={state.dependencySort.direction}
            onToggleDependencySort={handlers.toggleDependencySort}
            sortArrow={handlers.sortArrow}
            taskTitleById={derived.taskTitleById}
            hoveredDependencyId={state.hoveredDependencyId}
            onHoveredDependencyChange={setters.setHoveredDependencyId}
            hasActiveFilters={derived.hasActiveFilters}
            onResetView={handlers.resetView}
          />
        ) : null}
      </div>
    </div>
  );
}
