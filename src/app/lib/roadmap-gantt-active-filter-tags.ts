import { DEPENDENCY_KIND_LABEL } from './roadmap-gantt-dep-kind-labels';
import type {
  RoadmapGanttDependencyTypeFilter,
  RoadmapGanttDependencyView,
} from './roadmap-gantt-dependency-filters';

export type RoadmapGanttActiveFilterTagId =
  | 'depType'
  | 'blocked'
  | 'owner'
  | 'status'
  | 'lane'
  | 'depView'
  | 'cpOnly'
  | 'title';

export type RoadmapGanttActiveFilterTagDescriptor = {
  id: RoadmapGanttActiveFilterTagId;
  label: string;
};

export type RoadmapGanttActiveFilterTagsState = {
  dependencyTypeFilter: RoadmapGanttDependencyTypeFilter;
  blockedOnly: boolean;
  ownerFilter: string;
  statusFilter: 'all' | 'planned' | 'in-progress' | 'done';
  laneFilter: string;
  dependencyView: RoadmapGanttDependencyView;
  criticalPathOnly: boolean;
  titleQuery: string;
};

/**
 * Caller-supplied copy used to build labels for the active filter tags.
 * Keeps the helper pure and free from copy literals (project no-hardcode rule).
 */
export type RoadmapGanttActiveFilterTagsCopy = {
  dependencyPrefix: string;
  blockedOnlyLabel: string;
  ownerPrefix: string;
  statusPrefix: string;
  lanePrefix: string;
  dependencyViewPrefix: string;
  dependencyViewSelectedLabel: string;
  dependencyViewHideWeakLabel: string;
  criticalPathLabel: string;
  titleQueryPrefix: string;
};

export type RoadmapGanttActiveFilterTagsResult = {
  tags: RoadmapGanttActiveFilterTagDescriptor[];
  reason: string;
  hasActiveFilters: boolean;
  advancedFiltersCount: number;
};

/**
 * Compute active-filter chip descriptors and aggregate flags shown next to the toolbar.
 * Pure function: no React hooks, no side-effects.
 */
export function buildActiveFilterTags(args: {
  state: RoadmapGanttActiveFilterTagsState;
  lanes: readonly { id: string; title: string }[];
  copy: RoadmapGanttActiveFilterTagsCopy;
}): RoadmapGanttActiveFilterTagsResult {
  const { state, lanes, copy } = args;
  const trimmedQuery = state.titleQuery.trim();
  const tags: RoadmapGanttActiveFilterTagDescriptor[] = [];

  if (state.dependencyTypeFilter !== 'all') {
    tags.push({
      id: 'depType',
      label: `${copy.dependencyPrefix}${DEPENDENCY_KIND_LABEL[state.dependencyTypeFilter]}`,
    });
  }
  if (state.blockedOnly) {
    tags.push({ id: 'blocked', label: copy.blockedOnlyLabel });
  }
  if (state.ownerFilter !== 'all') {
    tags.push({ id: 'owner', label: `${copy.ownerPrefix}${state.ownerFilter}` });
  }
  if (state.statusFilter !== 'all') {
    tags.push({ id: 'status', label: `${copy.statusPrefix}${state.statusFilter}` });
  }
  if (state.laneFilter !== 'all') {
    const laneTitle = lanes.find((lane) => lane.id === state.laneFilter)?.title ?? state.laneFilter;
    tags.push({ id: 'lane', label: `${copy.lanePrefix}${laneTitle}` });
  }
  if (state.dependencyView !== 'all') {
    const depViewLabel =
      state.dependencyView === 'selected' ? copy.dependencyViewSelectedLabel : copy.dependencyViewHideWeakLabel;
    tags.push({ id: 'depView', label: `${copy.dependencyViewPrefix}${depViewLabel}` });
  }
  if (state.criticalPathOnly) {
    tags.push({ id: 'cpOnly', label: copy.criticalPathLabel });
  }
  if (trimmedQuery.length > 0) {
    tags.push({ id: 'title', label: `${copy.titleQueryPrefix}${trimmedQuery}` });
  }

  const hasActiveFilters =
    state.dependencyTypeFilter !== 'all' ||
    state.ownerFilter !== 'all' ||
    state.statusFilter !== 'all' ||
    state.laneFilter !== 'all' ||
    state.blockedOnly ||
    state.dependencyView !== 'all' ||
    state.criticalPathOnly ||
    trimmedQuery.length > 0;

  const advancedFiltersCount = [
    state.ownerFilter !== 'all',
    state.statusFilter !== 'all',
    state.laneFilter !== 'all',
    state.dependencyView !== 'all',
    state.criticalPathOnly,
    trimmedQuery.length > 0,
  ].filter(Boolean).length;

  const reason = tags.map((tag) => tag.label).join(' + ');

  return { tags, reason, hasActiveFilters, advancedFiltersCount };
}
