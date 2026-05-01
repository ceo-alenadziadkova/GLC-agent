import type { RowComponentProps } from 'react-window';
import { List } from 'react-window';

import {
  ROADMAP_GANTT_DEPS_TABLE_ROW_HEIGHT_PX,
  ROADMAP_GANTT_DEPS_TABLE_VIRTUAL_VIEWPORT_MAX_PX,
  ROADMAP_GANTT_DEPS_TABLE_VIRTUALIZE_ROW_THRESHOLD,
} from '../../config/roadmap-gantt-view-preferences';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { DEPENDENCY_KIND_HINT, DEPENDENCY_KIND_LABEL } from '../../lib/roadmap-gantt-dep-kind-labels';
import type { RoadmapGanttDependency } from '../../lib/roadmap-gantt-mapper';

export type DependencyTableSortKey = 'from' | 'to' | 'type';

type DependencyVirtualRowExtras = {
  deps: readonly RoadmapGanttDependency[];
  taskTitleById: ReadonlyMap<string, string>;
  hoveredDependencyId: string | null;
  onHoveredDependencyChange: (id: string | null) => void;
};

export type DependencyVirtualRowProps = RowComponentProps<DependencyVirtualRowExtras>;

export function DependencyVirtualRow({
  ariaAttributes,
  index,
  style,
  deps,
  taskTitleById,
  hoveredDependencyId,
  onHoveredDependencyChange,
}: DependencyVirtualRowProps) {
  const dep = deps[index];
  if (!dep) return null;
  return (
    <div
      {...ariaAttributes}
      style={style}
      className={`grid grid-cols-[1fr_1fr_8rem] gap-2 border-border border-b px-2 py-1 text-sm last:border-b-0 ${
        hoveredDependencyId === dep.id ? 'bg-muted roadmap-deps-row-hovered' : ''
      }`}
      onMouseEnter={() => onHoveredDependencyChange(dep.id)}
      onMouseLeave={() => onHoveredDependencyChange(null)}
    >
      <div className="min-w-0 truncate">{taskTitleById.get(dep.from) ?? dep.from}</div>
      <div className="min-w-0 truncate">{taskTitleById.get(dep.to) ?? dep.to}</div>
      <div className="min-w-0">
        <span
          className="ml-0 inline-block rounded-full border border-border px-2 py-0.5 text-xs"
          title={DEPENDENCY_KIND_HINT[dep.kind]}
        >
          {DEPENDENCY_KIND_LABEL[dep.kind]}
        </span>
      </div>
    </div>
  );
}

export type RoadmapGanttDependencyTableProps = {
  sortedDeps: readonly RoadmapGanttDependency[];
  dependencySortKey: DependencyTableSortKey;
  dependencySortDirection: 'asc' | 'desc';
  onToggleDependencySort: (key: DependencyTableSortKey) => void;
  sortArrow: (key: DependencyTableSortKey) => string;
  taskTitleById: ReadonlyMap<string, string>;
  hoveredDependencyId: string | null;
  onHoveredDependencyChange: (id: string | null) => void;
  hasActiveFilters: boolean;
  onResetView: () => void;
};

export function RoadmapGanttDependencyTable({
  sortedDeps,
  dependencySortKey,
  dependencySortDirection,
  onToggleDependencySort,
  sortArrow,
  taskTitleById,
  hoveredDependencyId,
  onHoveredDependencyChange,
  hasActiveFilters,
  onResetView,
}: RoadmapGanttDependencyTableProps) {
  const sortAria = (k: DependencyTableSortKey) =>
    dependencySortKey === k ? (dependencySortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  if (sortedDeps.length === 0) {
    return (
      <>
        <h4 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.roadmapGanttDepsTableHeading}</h4>
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-border">
          <table className="roadmap-deps-table w-full text-sm">
            <thead>
              <tr>
                <th scope="col" aria-sort={sortAria('from')}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => onToggleDependencySort('from')}>
                    {`From${sortArrow('from')}`}
                  </button>
                </th>
                <th scope="col" aria-sort={sortAria('to')}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => onToggleDependencySort('to')}>
                    {`To${sortArrow('to')}`}
                  </button>
                </th>
                <th scope="col" aria-sort={sortAria('type')}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => onToggleDependencySort('type')}>
                    {`Type${sortArrow('type')}`}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="roadmap-deps-table-empty">
                  {hasActiveFilters ? (
                    <button type="button" onClick={onResetView} className="roadmap-deps-empty-action">
                      {ORCHESTRATION_UI_COPY.roadmapGanttDepsTableEmptyFilteredCta}
                    </button>
                  ) : (
                    ORCHESTRATION_UI_COPY.roadmapGanttDepsTableEmptyPlain
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }

  const useVirtualList = sortedDeps.length > ROADMAP_GANTT_DEPS_TABLE_VIRTUALIZE_ROW_THRESHOLD;

  const listHeight = Math.min(
    ROADMAP_GANTT_DEPS_TABLE_VIRTUAL_VIEWPORT_MAX_PX,
    sortedDeps.length * ROADMAP_GANTT_DEPS_TABLE_ROW_HEIGHT_PX,
  );

  return (
    <>
      <h4 className="text-sm font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.roadmapGanttDepsTableHeading}</h4>
      <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-border">
        {useVirtualList ? (
          <div className="w-full px-2 py-2" role="table" aria-label={ORCHESTRATION_UI_COPY.roadmapGanttDepsVirtualTableAria}>
            <div className="grid grid-cols-[1fr_1fr_8rem] gap-2 border-border border-b px-2 pb-2 text-xs font-semibold uppercase tracking-wide ds-text-secondary">
              <div className="min-w-0">{ORCHESTRATION_UI_COPY.roadmapGanttDepsColFrom}</div>
              <div className="min-w-0">{ORCHESTRATION_UI_COPY.roadmapGanttDepsColTo}</div>
              <div className="min-w-0">{ORCHESTRATION_UI_COPY.roadmapGanttDepsColType}</div>
            </div>
            <div className="text-sm">
              <List<DependencyVirtualRowExtras>
                rowHeight={ROADMAP_GANTT_DEPS_TABLE_ROW_HEIGHT_PX}
                rowCount={sortedDeps.length}
                rowProps={{
                  deps: sortedDeps,
                  taskTitleById,
                  hoveredDependencyId,
                  onHoveredDependencyChange,
                }}
                rowComponent={DependencyVirtualRow}
                style={{
                  height: listHeight,
                  width: '100%',
                }}
                defaultHeight={listHeight}
              />
            </div>
          </div>
        ) : (
          <table className="roadmap-deps-table w-full text-sm">
            <thead>
              <tr>
                <th scope="col" aria-sort={sortAria('from')}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => onToggleDependencySort('from')}>
                    {`From${sortArrow('from')}`}
                  </button>
                </th>
                <th scope="col" aria-sort={sortAria('to')}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => onToggleDependencySort('to')}>
                    {`To${sortArrow('to')}`}
                  </button>
                </th>
                <th scope="col" aria-sort={sortAria('type')}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => onToggleDependencySort('type')}>
                    {`Type${sortArrow('type')}`}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDeps.map((dep) => (
                <tr
                  key={dep.id}
                  onMouseEnter={() => onHoveredDependencyChange(dep.id)}
                  onMouseLeave={() => onHoveredDependencyChange(null)}
                  className={hoveredDependencyId === dep.id ? 'roadmap-deps-row-hovered' : ''}
                >
                  <td>{taskTitleById.get(dep.from) ?? dep.from}</td>
                  <td>{taskTitleById.get(dep.to) ?? dep.to}</td>
                  <td>
                    <span
                      className="ml-0 rounded-full border border-border px-2 py-0.5 text-xs"
                      title={DEPENDENCY_KIND_HINT[dep.kind]}
                    >
                      {DEPENDENCY_KIND_LABEL[dep.kind]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
