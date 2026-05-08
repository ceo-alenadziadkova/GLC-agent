import { useMemo } from 'react';

import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import {
  type RoadmapGanttActiveFilterTagDescriptor,
  type RoadmapGanttActiveFilterTagId,
} from '../lib/roadmap-gantt-active-filter-tags';
import { buildFocusedTaskLiveRegionSig } from '../lib/roadmap-gantt-focused-task-signature';
import { buildFocusedTaskAnnouncementMessage } from '../lib/roadmap-gantt-view-model';
import {
  type RoadmapGanttDependencyTypeFilter,
  type RoadmapGanttDependencyView,
} from '../lib/roadmap-gantt-dependency-filters';
import type { RoadmapGanttTask } from '../lib/roadmap-gantt-mapper';

type StatusFilter = 'all' | 'planned' | 'in-progress' | 'done';

export type RoadmapGanttSelectorsActiveFilterTag = {
  id: RoadmapGanttActiveFilterTagId;
  label: string;
  clear: () => void;
};

export type UseRoadmapGanttSelectorsArgs = {
  focusedTaskId: string | null;
  projectionTasks: ReadonlyArray<RoadmapGanttTask>;
  projectionLanes: ReadonlyArray<{ id: string; title: string }>;
  rawActiveFilterTags: ReadonlyArray<RoadmapGanttActiveFilterTagDescriptor>;
  /**
   * Setters used to build the per-tag `clear` callbacks. Captured into a stable map keyed
   * by tag id so the orchestrator does not need to construct callback factories itself.
   */
  filterClearSetters: {
    setDependencyTypeFilter: (value: RoadmapGanttDependencyTypeFilter) => void;
    setBlockedOnly: (value: boolean) => void;
    setOwnerFilter: (value: string) => void;
    setStatusFilter: (value: StatusFilter) => void;
    setLaneFilter: (value: string) => void;
    setDependencyView: (value: RoadmapGanttDependencyView) => void;
    setCriticalPathOnly: (value: boolean) => void;
    setTitleQuery: (value: string) => void;
  };
};

export type UseRoadmapGanttSelectorsResult = {
  /** Stable signature for the focused task, used as a `useEffect` dependency by the orchestrator. */
  focusedTaskLiveRegionSig: string;
  /** Pre-built announcement message; orchestrator writes it into `setGridNavAnnouncement`. */
  focusedTaskAnnouncement: string;
  /** Per-tag clear callbacks keyed by tag id. */
  tagClearById: Record<RoadmapGanttActiveFilterTagId, () => void>;
  /** Raw filter-tag descriptors merged with `clear` callbacks for direct UI consumption. */
  activeFilterTags: ReadonlyArray<RoadmapGanttSelectorsActiveFilterTag>;
};

/**
 * Memoized derivations sourced by the Roadmap Gantt orchestrator: focused-task live-region
 * signature/message and active filter tags merged with their clear callbacks.
 *
 * Internal: not exported from `useRoadmapGanttView` and not used outside of it.
 */
export function useRoadmapGanttSelectors(
  args: UseRoadmapGanttSelectorsArgs,
): UseRoadmapGanttSelectorsResult {
  const {
    focusedTaskId,
    projectionTasks,
    projectionLanes,
    rawActiveFilterTags,
    filterClearSetters,
  } = args;

  const focusedTask = useMemo(
    () => projectionTasks.find((task) => task.id === focusedTaskId) ?? null,
    [focusedTaskId, projectionTasks],
  );

  const focusedTaskLiveRegionSig = useMemo(
    () => buildFocusedTaskLiveRegionSig(focusedTask),
    [focusedTask],
  );

  const focusedTaskAnnouncement = useMemo(
    () =>
      buildFocusedTaskAnnouncementMessage(focusedTask, projectionLanes, {
        template: ORCHESTRATION_UI_COPY.roadmapGanttKeyboardFocusAnnouncement,
      }),
    [focusedTask, projectionLanes],
  );

  const tagClearById = useMemo<Record<RoadmapGanttActiveFilterTagId, () => void>>(
    () => ({
      depType: () => filterClearSetters.setDependencyTypeFilter('all'),
      blocked: () => filterClearSetters.setBlockedOnly(false),
      owner: () => filterClearSetters.setOwnerFilter('all'),
      status: () => filterClearSetters.setStatusFilter('all'),
      lane: () => filterClearSetters.setLaneFilter('all'),
      depView: () => filterClearSetters.setDependencyView('all'),
      cpOnly: () => filterClearSetters.setCriticalPathOnly(false),
      title: () => filterClearSetters.setTitleQuery(''),
    }),
    [filterClearSetters],
  );

  const activeFilterTags = useMemo<ReadonlyArray<RoadmapGanttSelectorsActiveFilterTag>>(
    () => rawActiveFilterTags.map((tag) => ({ ...tag, clear: tagClearById[tag.id] })),
    [rawActiveFilterTags, tagClearById],
  );

  return {
    focusedTaskLiveRegionSig,
    focusedTaskAnnouncement,
    tagClearById,
    activeFilterTags,
  };
}
