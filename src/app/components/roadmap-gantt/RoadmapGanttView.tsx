import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import Timeline, {
  TimelineHeaders,
  DateHeader,
  SidebarHeader,
  TimelineMarkers,
  TodayMarker,
  type TimelineGroupBase,
  type TimelineItemBase,
} from 'react-calendar-timeline';
import 'react-calendar-timeline/style.css';
import './RoadmapGanttView.css';
import dayjs from 'dayjs';

import type { RoadmapGanttProjection } from '../../lib/roadmap-gantt-mapper';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type GanttTaskItem = TimelineItemBase<number> & {
  id: string;
  group: string;
  title: string;
  className: string;
  status: 'planned' | 'in-progress' | 'done';
};

type RoadmapGanttViewProps = {
  projection: RoadmapGanttProjection;
  strategyHref: string;
};

const ROADMAP_TIMELINE_SCALE_STORAGE_KEY = 'roadmap-gantt-time-scale';
const ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY = 'roadmap-gantt-day-range';
const ROADMAP_TIMELINE_DENSITY_STORAGE_KEY = 'roadmap-gantt-density';
const ROADMAP_SEARCH_PARAM_SCALE = 'scale';
const ROADMAP_SEARCH_PARAM_DAY_RANGE = 'range';
const ROADMAP_SEARCH_PARAM_DENSITY = 'density';
const ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE = 'depType';
const ROADMAP_SEARCH_PARAM_OWNER = 'owner';
const ROADMAP_SEARCH_PARAM_STATUS = 'status';
const ROADMAP_SEARCH_PARAM_LANE = 'lane';
const ROADMAP_SEARCH_PARAM_BLOCKED = 'blocked';
const ROADMAP_SEARCH_PARAM_DEP_VIEW = 'depView';
const ROADMAP_SEARCH_PARAM_SORT_KEY = 'depSort';
const ROADMAP_SEARCH_PARAM_SORT_DIR = 'depDir';
const ROADMAP_SEARCH_PARAM_TASK = 'task';
const ROADMAP_SEARCH_PARAM_PANEL = 'panel';
const ROADMAP_SEARCH_PARAM_DEP_TAB = 'depTab';

function readStoredScale(): 'day' | 'month' {
  if (typeof window === 'undefined') return 'day';
  const value = window.localStorage.getItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY);
  return value === 'month' ? 'month' : 'day';
}

function readStoredDayRange(): 30 | 60 | 90 {
  if (typeof window === 'undefined') return 60;
  const value = window.localStorage.getItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY);
  if (value === '30') return 30;
  if (value === '90') return 90;
  return 60;
}

function readStoredDensity(): 'compact' | 'comfortable' {
  if (typeof window === 'undefined') return 'comfortable';
  const value = window.localStorage.getItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY);
  return value === 'compact' ? 'compact' : 'comfortable';
}

function readScaleFromSearchParams(searchParams: URLSearchParams): 'day' | 'month' {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_SCALE);
  if (value === 'month') return 'month';
  if (value === 'day') return 'day';
  return readStoredScale();
}

function readDayRangeFromSearchParams(searchParams: URLSearchParams): 30 | 60 | 90 {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DAY_RANGE);
  if (value === '30') return 30;
  if (value === '90') return 90;
  if (value === '60') return 60;
  return readStoredDayRange();
}

function readDensityFromSearchParams(searchParams: URLSearchParams): 'compact' | 'comfortable' {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DENSITY);
  if (value === 'compact' || value === 'comfortable') return value;
  return readStoredDensity();
}

function readDependencyTypeFromSearchParams(searchParams: URLSearchParams): 'all' | 'FS' | 'SS' | 'FF' | 'SF' {
  const value = searchParams.get(ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE);
  if (value === 'FS' || value === 'SS' || value === 'FF' || value === 'SF') return value;
  return 'all';
}

const DEPENDENCY_KIND_LABEL: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'Finish -> Start',
  SS: 'Start -> Start',
  FF: 'Finish -> Finish',
  SF: 'Start -> Finish',
};
const DEPENDENCY_KIND_SHORT_LABEL: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'FS',
  SS: 'SS',
  FF: 'FF',
  SF: 'SF',
};

const DEPENDENCY_KIND_HINT: Record<'FS' | 'SS' | 'FF' | 'SF', string> = {
  FS: 'Task B starts after Task A is completed.',
  SS: 'Task B starts after Task A starts.',
  FF: 'Task B finishes after Task A is completed.',
  SF: 'Task B finishes after Task A starts.',
};
const DEPENDENCY_KIND_ORDER: Array<'FS' | 'SS' | 'FF' | 'SF'> = ['FS', 'SS', 'FF', 'SF'];

export function RoadmapGanttView({ projection, strategyHref }: RoadmapGanttViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get(ROADMAP_SEARCH_PARAM_TASK));
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [hoveredDependencyId, setHoveredDependencyId] = useState<string | null>(null);
  const [timeScale, setTimeScale] = useState<'day' | 'month'>(() => readScaleFromSearchParams(searchParams));
  const [dayRangeDays, setDayRangeDays] = useState<30 | 60 | 90>(() => readDayRangeFromSearchParams(searchParams));
  const [dependencyTypeFilter, setDependencyTypeFilter] = useState<'all' | 'FS' | 'SS' | 'FF' | 'SF'>(() =>
    readDependencyTypeFromSearchParams(searchParams),
  );
  const [densityMode, setDensityMode] = useState<'compact' | 'comfortable'>(() => readDensityFromSearchParams(searchParams));
  const [ownerFilter, setOwnerFilter] = useState<string>(() => searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'in-progress' | 'done'>(() => {
    const value = searchParams.get(ROADMAP_SEARCH_PARAM_STATUS);
    return value === 'planned' || value === 'in-progress' || value === 'done' ? value : 'all';
  });
  const [laneFilter, setLaneFilter] = useState<string>(() => searchParams.get(ROADMAP_SEARCH_PARAM_LANE) ?? 'all');
  const [blockedOnly, setBlockedOnly] = useState<boolean>(() => searchParams.get(ROADMAP_SEARCH_PARAM_BLOCKED) === '1');
  const [dependencyView, setDependencyView] = useState<'all' | 'selected' | 'hide-weak'>(() => {
    const value = searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW);
    return value === 'selected' || value === 'hide-weak' ? value : 'all';
  });
  const [dependencySort, setDependencySort] = useState<{ key: 'from' | 'to' | 'type'; direction: 'asc' | 'desc' }>({
    key: searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY) === 'to' ? 'to' : searchParams.get(ROADMAP_SEARCH_PARAM_SORT_KEY) === 'type' ? 'type' : 'from',
    direction: searchParams.get(ROADMAP_SEARCH_PARAM_SORT_DIR) === 'desc' ? 'desc' : 'asc',
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState<{ left: number; max: number; clientWidth: number }>({
    left: 0,
    max: 0,
    clientWidth: 0,
  });
  const [isOverviewDragging, setIsOverviewDragging] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(() => {
    return (
      searchParams.get(ROADMAP_SEARCH_PARAM_OWNER) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_STATUS) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_LANE) != null ||
      searchParams.get(ROADMAP_SEARCH_PARAM_DEP_VIEW) != null
    );
  });
  const [activePanel, setActivePanel] = useState<'timeline' | 'dependencies'>(() =>
    searchParams.get(ROADMAP_SEARCH_PARAM_PANEL) === 'dependencies' ? 'dependencies' : 'timeline',
  );
  const [dependenciesTab, setDependenciesTab] = useState<'graph' | 'table'>(() =>
    searchParams.get(ROADMAP_SEARCH_PARAM_DEP_TAB) === 'table' ? 'table' : 'graph',
  );
  const [showRestoredViewNotice, setShowRestoredViewNotice] = useState<boolean>(() => {
    const hasScaleQuery = searchParams.get(ROADMAP_SEARCH_PARAM_SCALE) != null;
    const hasRangeQuery = searchParams.get(ROADMAP_SEARCH_PARAM_DAY_RANGE) != null;
    const hasDensityQuery = searchParams.get(ROADMAP_SEARCH_PARAM_DENSITY) != null;
    if (hasScaleQuery || hasRangeQuery || hasDensityQuery) return false;
    const hasStoredScale = typeof window !== 'undefined' && window.localStorage.getItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY) != null;
    const hasStoredRange = typeof window !== 'undefined' && window.localStorage.getItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY) != null;
    const hasStoredDensity = typeof window !== 'undefined' && window.localStorage.getItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY) != null;
    return hasStoredScale || hasStoredRange || hasStoredDensity;
  });
  const timelineShellRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLElement | null>(null);
  const overviewTrackRef = useRef<HTMLDivElement | null>(null);

  const blockedTaskIds = useMemo(() => {
    const taskIds = new Set<string>();
    for (const dep of projection.dependencies) {
      if (!dep.blocking) continue;
      taskIds.add(dep.to);
      taskIds.add(dep.from);
    }
    return taskIds;
  }, [projection.dependencies]);

  const filteredTasks = useMemo(() => {
    return projection.tasks.filter((task) => {
      if (ownerFilter !== 'all' && task.owner !== ownerFilter) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (laneFilter !== 'all' && task.group !== laneFilter) return false;
      if (blockedOnly && !blockedTaskIds.has(task.id)) return false;
      return true;
    });
  }, [blockedOnly, blockedTaskIds, laneFilter, ownerFilter, projection.tasks, statusFilter]);

  const filteredTaskIds = useMemo(() => new Set(filteredTasks.map((task) => task.id)), [filteredTasks]);

  const groups: TimelineGroupBase[] = useMemo(() => {
    const availableLaneIds = new Set(filteredTasks.map((task) => task.group));
    return projection.lanes
      .filter((lane) => availableLaneIds.has(lane.id))
      .map((lane) => ({ id: lane.id, title: lane.title }));
  }, [filteredTasks, projection.lanes]);

  const items: GanttTaskItem[] = useMemo(
    () =>
      filteredTasks.map((task) => ({
        id: task.id,
        group: task.group,
        title: task.title,
        start_time: task.start_time,
        end_time: task.end_time,
        canMove: false,
        canResize: false,
        canChangeGroup: false,
        status: task.status,
        className: [
          task.isEstimated ? 'roadmap-gantt-item-estimated' : 'roadmap-gantt-item-solid',
          `roadmap-gantt-item-status-${task.status}`,
        ].join(' '),
      })),
    [filteredTasks],
  );

  const selectedTask = useMemo(
    () => projection.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [projection.tasks, selectedTaskId],
  );
  const focusedTask = useMemo(
    () => filteredTasks.find((task) => task.id === focusedTaskId) ?? null,
    [filteredTasks, focusedTaskId],
  );

  const taskTitleById = useMemo(() => new Map(projection.tasks.map((task) => [task.id, task.title] as const)), [projection.tasks]);
  const taskById = useMemo(
    () => new Map(filteredTasks.map((task) => [task.id, task] as const)),
    [filteredTasks],
  );
  const laneIndexById = useMemo(() => new Map(groups.map((lane, index) => [String(lane.id), index] as const)), [groups]);
  const laneHeight = 54;
  const timelineRange = Math.max(projection.defaultTimeEnd - projection.defaultTimeStart, 1);
  const dependencyCanvasHeight = Math.max(groups.length * laneHeight + 24, 120);
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
  const visibleDependencies = useMemo(() => {
    return projection.dependencies.filter((dep) => {
      if (!filteredTaskIds.has(dep.from) || !filteredTaskIds.has(dep.to)) return false;
      if (dependencyTypeFilter !== 'all' && dep.kind !== dependencyTypeFilter) return false;
      if (blockedOnly && !dep.blocking) return false;
      if (dependencyView === 'selected') {
        if (!selectedTaskId) return false;
        if (dep.from !== selectedTaskId && dep.to !== selectedTaskId) return false;
      }
      if (dependencyView === 'hide-weak' && dep.strength === 'weak') return false;
      return true;
    });
  }, [blockedOnly, dependencyTypeFilter, dependencyView, filteredTaskIds, projection.dependencies, selectedTaskId]);
  const overviewTasks = filteredTasks.length > 0 ? filteredTasks : projection.tasks;
  const hasScrollableTimeline = scrollMetrics.max > 2 && scrollMetrics.clientWidth > 0;
  const overviewWindowWidth = hasScrollableTimeline
    ? Math.min((scrollMetrics.clientWidth / Math.max(scrollMetrics.max + scrollMetrics.clientWidth, 1)) * 100, 100)
    : 100;
  const overviewWindowLeft = hasScrollableTimeline
    ? Math.min((scrollMetrics.left / Math.max(scrollMetrics.max + scrollMetrics.clientWidth, 1)) * 100, 100)
    : 0;
  const sortedVisibleDependencies = useMemo(() => {
    const list = [...visibleDependencies];
    list.sort((a, b) => {
      const fromA = taskTitleById.get(a.from) ?? a.from;
      const fromB = taskTitleById.get(b.from) ?? b.from;
      const toA = taskTitleById.get(a.to) ?? a.to;
      const toB = taskTitleById.get(b.to) ?? b.to;
      const typeA = DEPENDENCY_KIND_LABEL[a.kind];
      const typeB = DEPENDENCY_KIND_LABEL[b.kind];

      const compareText = (x: string, y: string) => x.localeCompare(y, undefined, { sensitivity: 'base' });
      const compareId = a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
      const fromCmp = compareText(fromA, fromB);
      const toCmp = compareText(toA, toB);
      const typeCmp = compareText(typeA, typeB);

      let primary = 0;
      let secondary = 0;
      let tertiary = 0;
      if (dependencySort.key === 'from') {
        primary = fromCmp;
        secondary = toCmp;
        tertiary = typeCmp;
      }
      if (dependencySort.key === 'to') {
        primary = toCmp;
        secondary = fromCmp;
        tertiary = typeCmp;
      }
      if (dependencySort.key === 'type') {
        primary = typeCmp;
        secondary = fromCmp;
        tertiary = toCmp;
      }

      const ordered = primary || secondary || tertiary || compareId;
      return dependencySort.direction === 'asc' ? ordered : -ordered;
    });
    return list;
  }, [visibleDependencies, taskTitleById, dependencySort]);
  const hoveredDependency = useMemo(
    () => visibleDependencies.find((dep) => dep.id === hoveredDependencyId) ?? null,
    [visibleDependencies, hoveredDependencyId],
  );
  const highlightedTaskIds = useMemo(() => {
    if (!hoveredDependency) return new Set<string>();
    return new Set<string>([hoveredDependency.from, hoveredDependency.to]);
  }, [hoveredDependency]);

  useEffect(() => {
    const root = timelineShellRef.current;
    if (!root) return;
    const scrollNode = root.querySelector('.rct-scroll') as HTMLElement | null;
    if (!scrollNode) return;
    timelineScrollRef.current = scrollNode;

    const updateScrollState = () => {
      const maxScroll = scrollNode.scrollWidth - scrollNode.clientWidth;
      setCanScrollLeft(scrollNode.scrollLeft > 2);
      setCanScrollRight(maxScroll - scrollNode.scrollLeft > 2);
      setScrollMetrics({
        left: scrollNode.scrollLeft,
        max: Math.max(maxScroll, 1),
        clientWidth: Math.max(scrollNode.clientWidth, 1),
      });
    };

    updateScrollState();
    scrollNode.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      scrollNode.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      if (timelineScrollRef.current === scrollNode) {
        timelineScrollRef.current = null;
      }
    };
  }, [groups.length, items.length, projection.defaultTimeEnd, projection.defaultTimeStart]);

  useEffect(() => {
    if (filteredTasks.length === 0) {
      setFocusedTaskId(null);
      return;
    }
    if (focusedTaskId == null || !filteredTasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(filteredTasks[0]!.id);
    }
  }, [filteredTasks, focusedTaskId]);

  useEffect(() => {
    if (selectedTaskId && !projection.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [projection.tasks, selectedTaskId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_SCALE_STORAGE_KEY, timeScale);
  }, [timeScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_DAY_RANGE_STORAGE_KEY, String(dayRangeDays));
  }, [dayRangeDays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ROADMAP_TIMELINE_DENSITY_STORAGE_KEY, densityMode);
  }, [densityMode]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(ROADMAP_SEARCH_PARAM_SCALE, timeScale);
        if (timeScale === 'day') {
          next.set(ROADMAP_SEARCH_PARAM_DAY_RANGE, String(dayRangeDays));
        } else {
          next.delete(ROADMAP_SEARCH_PARAM_DAY_RANGE);
        }
        next.set(ROADMAP_SEARCH_PARAM_DENSITY, densityMode);
        next.set(ROADMAP_SEARCH_PARAM_DEPENDENCY_TYPE, dependencyTypeFilter);
        if (ownerFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_OWNER, ownerFilter);
        else next.delete(ROADMAP_SEARCH_PARAM_OWNER);
        if (statusFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_STATUS, statusFilter);
        else next.delete(ROADMAP_SEARCH_PARAM_STATUS);
        if (laneFilter !== 'all') next.set(ROADMAP_SEARCH_PARAM_LANE, laneFilter);
        else next.delete(ROADMAP_SEARCH_PARAM_LANE);
        if (blockedOnly) next.set(ROADMAP_SEARCH_PARAM_BLOCKED, '1');
        else next.delete(ROADMAP_SEARCH_PARAM_BLOCKED);
        if (dependencyView !== 'all') next.set(ROADMAP_SEARCH_PARAM_DEP_VIEW, dependencyView);
        else next.delete(ROADMAP_SEARCH_PARAM_DEP_VIEW);
        next.set(ROADMAP_SEARCH_PARAM_SORT_KEY, dependencySort.key);
        next.set(ROADMAP_SEARCH_PARAM_SORT_DIR, dependencySort.direction);
        if (selectedTaskId) next.set(ROADMAP_SEARCH_PARAM_TASK, selectedTaskId);
        else next.delete(ROADMAP_SEARCH_PARAM_TASK);
        next.set(ROADMAP_SEARCH_PARAM_PANEL, activePanel);
        if (activePanel === 'dependencies') {
          next.set(ROADMAP_SEARCH_PARAM_DEP_TAB, dependenciesTab);
        } else {
          next.delete(ROADMAP_SEARCH_PARAM_DEP_TAB);
        }
        if (next.toString() === prev.toString()) return prev;
        return next;
      },
      { replace: true },
    );
  }, [
    blockedOnly,
    dayRangeDays,
    densityMode,
    dependencySort.direction,
    dependencySort.key,
    dependencyTypeFilter,
    dependencyView,
    laneFilter,
    ownerFilter,
    activePanel,
    dependenciesTab,
    selectedTaskId,
    setSearchParams,
    statusFilter,
    timeScale,
  ]);

  const pickNearestTaskForTime = (targetTs: number) => {
    if (filteredTasks.length === 0) return null;
    const sorted = [...filteredTasks].sort((a, b) => {
      const aInside = a.start_time <= targetTs && targetTs <= a.end_time;
      const bInside = b.start_time <= targetTs && targetTs <= b.end_time;
      if (aInside && !bInside) return -1;
      if (!aInside && bInside) return 1;
      const aDistance = Math.min(Math.abs(a.start_time - targetTs), Math.abs(a.end_time - targetTs));
      const bDistance = Math.min(Math.abs(b.start_time - targetTs), Math.abs(b.end_time - targetTs));
      return aDistance - bDistance;
    });
    return sorted[0] ?? null;
  };

  const handleTimelineGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === '?') {
      event.preventDefault();
      setShowAdvancedControls(true);
      return;
    }
    if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      setActivePanel('timeline');
      return;
    }
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault();
      setActivePanel('dependencies');
      return;
    }
    if (event.key.toLowerCase() === 'g') {
      event.preventDefault();
      setDependenciesTab('graph');
      return;
    }
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      setDependenciesTab('table');
      return;
    }
    if (event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setShowAdvancedControls((prev) => !prev);
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      resetView();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
    const anchorTask = focusedTask ?? filteredTasks[0] ?? null;
    if (!anchorTask) return;

    const DAY = 24 * 60 * 60 * 1000;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedTaskId(anchorTask.id);
      return;
    }

    let delta = 0;
    if (event.key === 'ArrowLeft') delta = -DAY;
    if (event.key === 'ArrowRight') delta = DAY;
    if (event.key === 'ArrowUp') delta = -7 * DAY;
    if (event.key === 'ArrowDown') delta = 7 * DAY;
    if (delta === 0) return;

    event.preventDefault();
    const anchorTime = Math.floor((anchorTask.start_time + anchorTask.end_time) / 2);
    const nextTask = pickNearestTaskForTime(anchorTime + delta);
    if (nextTask) {
      setFocusedTaskId(nextTask.id);
    }
  };

  const toggleDependencySort = (key: 'from' | 'to' | 'type') => {
    setDependencySort((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortArrow = (key: 'from' | 'to' | 'type') => {
    if (dependencySort.key !== key) return '';
    return dependencySort.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const scrollTimelineByDirection = (direction: 'left' | 'right') => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const amount = Math.max(Math.floor(scrollNode.clientWidth * 0.72), 240);
    const delta = direction === 'left' ? -amount : amount;
    scrollNode.scrollBy({ left: delta, behavior: 'smooth' });
  };
  const jumpTimelineRangeByDirection = (direction: 'previous' | 'next') => {
    scrollTimelineByDirection(direction === 'previous' ? 'left' : 'right');
  };

  const jumpTimelineToToday = () => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const now = Date.now();
    const ratio = (now - projection.defaultTimeStart) / timelineRange;
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
    const target = Math.floor(maxScroll * clampedRatio - scrollNode.clientWidth / 2);
    scrollNode.scrollTo({ left: Math.min(Math.max(target, 0), maxScroll), behavior: 'smooth' });
  };
  const scrollTimelineToRatio = (ratio: number) => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
    scrollNode.scrollTo({ left: maxScroll * clamped, behavior: isOverviewDragging ? 'auto' : 'smooth' });
  };

  const handleOverviewPointer = (clientX: number) => {
    const track = overviewTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    scrollTimelineToRatio(ratio);
  };

  const ownerOptions = useMemo(() => {
    return Array.from(new Set(projection.tasks.map((task) => task.owner))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [projection.tasks]);

  const hasActiveFilters =
    dependencyTypeFilter !== 'all' ||
    ownerFilter !== 'all' ||
    statusFilter !== 'all' ||
    laneFilter !== 'all' ||
    blockedOnly ||
    dependencyView !== 'all';
  const advancedFiltersCount = [ownerFilter !== 'all', statusFilter !== 'all', laneFilter !== 'all', dependencyView !== 'all'].filter(Boolean).length;
  const activeFilterTags = useMemo(() => {
    const tags: Array<{ id: string; label: string; clear: () => void }> = [];
    if (dependencyTypeFilter !== 'all') {
      tags.push({
        id: 'depType',
        label: `Dependency: ${DEPENDENCY_KIND_LABEL[dependencyTypeFilter]}`,
        clear: () => setDependencyTypeFilter('all'),
      });
    }
    if (blockedOnly) tags.push({ id: 'blocked', label: 'Blocked only', clear: () => setBlockedOnly(false) });
    if (ownerFilter !== 'all') tags.push({ id: 'owner', label: `Owner: ${ownerFilter}`, clear: () => setOwnerFilter('all') });
    if (statusFilter !== 'all') tags.push({ id: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') });
    if (laneFilter !== 'all') {
      const laneTitle = projection.lanes.find((lane) => lane.id === laneFilter)?.title ?? laneFilter;
      tags.push({ id: 'lane', label: `Lane: ${laneTitle}`, clear: () => setLaneFilter('all') });
    }
    if (dependencyView !== 'all') {
      const depViewLabel = dependencyView === 'selected' ? 'selected task' : 'hide weak';
      tags.push({ id: 'depView', label: `Dependency view: ${depViewLabel}`, clear: () => setDependencyView('all') });
    }
    return tags;
  }, [blockedOnly, dependencyTypeFilter, dependencyView, laneFilter, ownerFilter, projection.lanes, statusFilter]);
  const activeFilterReason = activeFilterTags.map((tag) => tag.label).join(' + ');

  const resetView = () => {
    setDependencyTypeFilter('all');
    setOwnerFilter('all');
    setStatusFilter('all');
    setLaneFilter('all');
    setBlockedOnly(false);
    setDependencyView('all');
    setDependencySort({ key: 'from', direction: 'asc' });
    setSelectedTaskId(null);
    setFocusedTaskId(filteredTasks[0]?.id ?? null);
    setActivePanel('timeline');
    setDependenciesTab('graph');
    setShowAdvancedControls(false);
    setShowRestoredViewNotice(false);
  };
  const applyPresetBlocked = () => {
    setTimeScale('day');
    setDayRangeDays(30);
    setDependencyTypeFilter('all');
    setBlockedOnly(true);
    setDependencyView('hide-weak');
    setStatusFilter('all');
    setShowAdvancedControls(true);
  };
  const applyPresetExecution = () => {
    setTimeScale('day');
    setDayRangeDays(60);
    setDependencyTypeFilter('FS');
    setBlockedOnly(false);
    setDependencyView('all');
    setStatusFilter('in-progress');
    setShowAdvancedControls(true);
  };

  const isMonthScale = timeScale === 'month';
  const defaultViewportStart = projection.defaultTimeStart;
  const defaultViewportEnd = useMemo(() => {
    if (isMonthScale) return projection.defaultTimeEnd;
    const dayViewEnd = dayjs(projection.defaultTimeStart).add(dayRangeDays, 'day').endOf('day').valueOf();
    return Math.min(dayViewEnd, projection.defaultTimeEnd);
  }, [dayRangeDays, isMonthScale, projection.defaultTimeEnd, projection.defaultTimeStart]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-2 shadow-[var(--shadow-xs)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePanel('timeline')}
            aria-pressed={activePanel === 'timeline'}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activePanel === 'timeline'
                ? 'bg-[var(--surface-raised)] ds-text-primary'
                : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
            ].join(' ')}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('dependencies')}
            aria-pressed={activePanel === 'dependencies'}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activePanel === 'dependencies'
                ? 'bg-[var(--surface-raised)] ds-text-primary'
                : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
            ].join(' ')}
          >
            Dependencies
          </button>
        </div>
      </div>
      {activePanel === 'timeline' ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-4 shadow-[var(--shadow-xs)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold ds-text-primary">Roadmap timeline</h3>
            <p className="mt-1 text-xs ds-text-tertiary">Multi-lane schedule with dependency context and keyboard control.</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium ds-text-secondary">
            {`Lanes ${projection.lanes.length} · Tasks ${projection.tasks.length}`}
          </div>
        </div>
        <div className="roadmap-controls-bar mb-3 space-y-2">
          {showRestoredViewNotice ? (
            <div className="roadmap-restore-notice">
              <span>View restored from your previous session.</span>
              <button
                type="button"
                onClick={() => {
                  setTimeScale('day');
                  setDayRangeDays(60);
                  setDensityMode('comfortable');
                  setShowRestoredViewNotice(false);
                }}
                className="underline underline-offset-2"
              >
                Use default view
              </button>
              <button type="button" onClick={() => setShowRestoredViewNotice(false)} className="underline underline-offset-2">
                Dismiss
              </button>
            </div>
          ) : null}
          <div className="roadmap-controls-section">
            <div className="roadmap-controls-section-title">View</div>
            <label htmlFor="densityMode" className="text-xs font-medium ds-text-primary">
              Density
            </label>
            <select
              id="densityMode"
              value={densityMode}
              onChange={(event) => setDensityMode(event.target.value as 'compact' | 'comfortable')}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
            <div className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] p-1" role="group" aria-label="Timeline scale">
            <button
              type="button"
              onClick={() => setTimeScale('day')}
              aria-pressed={!isMonthScale}
              className={[
                'rounded px-2 py-1 text-xs transition-colors',
                !isMonthScale ? 'bg-[var(--surface-raised)] ds-text-primary' : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
              ].join(' ')}
            >
              Days
            </button>
            <button
              type="button"
              onClick={() => setTimeScale('month')}
              aria-pressed={isMonthScale}
              className={[
                'rounded px-2 py-1 text-xs transition-colors',
                isMonthScale ? 'bg-[var(--surface-raised)] ds-text-primary' : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
              ].join(' ')}
            >
              Months
            </button>
            </div>
            {!isMonthScale ? (
              <div className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] p-1" role="group" aria-label="Day horizon">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDayRangeDays(days as 30 | 60 | 90)}
                    aria-pressed={dayRangeDays === days}
                    className={[
                      'rounded px-2 py-1 text-xs transition-colors',
                      dayRangeDays === days ? 'bg-[var(--surface-raised)] ds-text-primary' : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
                    ].join(' ')}
                    title={`Show approximately ${days} days`}
                  >
                    {`${days}d`}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={jumpTimelineToToday}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]"
              title="Jump timeline to today"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => jumpTimelineRangeByDirection('previous')}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]"
              title="Scroll to previous date range"
              aria-label="Previous range"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => jumpTimelineRangeByDirection('next')}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]"
              title="Scroll to next date range"
              aria-label="Next range"
            >
              Next
            </button>
          </div>
          <div className="roadmap-controls-section">
            <div className="roadmap-controls-section-title">Filters</div>
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
              <option value="FS">{`${DEPENDENCY_KIND_SHORT_LABEL.FS} (Finish -> Start)`}</option>
              <option value="SS">{`${DEPENDENCY_KIND_SHORT_LABEL.SS} (Start -> Start)`}</option>
              <option value="FF">{`${DEPENDENCY_KIND_SHORT_LABEL.FF} (Finish -> Finish)`}</option>
              <option value="SF">{`${DEPENDENCY_KIND_SHORT_LABEL.SF} (Start -> Finish)`}</option>
            </select>
            <label className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary">
              <input type="checkbox" checked={blockedOnly} onChange={(event) => setBlockedOnly(event.target.checked)} />
              Blocked only
            </label>
            <button type="button" onClick={applyPresetBlocked} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]">
              Preset: Blocked 30d
            </button>
            <button type="button" onClick={applyPresetExecution} className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]">
              Preset: Execution
            </button>
          </div>
          <div className="roadmap-controls-section roadmap-controls-section-actions">
            <div className="roadmap-controls-section-title">Actions</div>
            <button
              type="button"
              onClick={() => setShowAdvancedControls((prev) => !prev)}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]"
              aria-expanded={showAdvancedControls}
            >
              {`Advanced${advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}`}
            </button>
            <button
              type="button"
              onClick={resetView}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]"
            >
              Reset view
            </button>
            <span className="text-xs ds-text-tertiary">Reset clears filters, panel, and selected task.</span>
          </div>
          <div className="roadmap-controls-metrics text-xs ds-text-tertiary">
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 font-medium ds-text-secondary">
              {`Lanes ${groups.length}`}
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 font-medium ds-text-secondary">
              {`Tasks ${filteredTasks.length}`}
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 font-medium ds-text-secondary">
              {`Dependencies ${visibleDependencies.length}`}
            </span>
            <TooltipProvider delayDuration={180}>
              {DEPENDENCY_KIND_ORDER.map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--surface-base)] px-2 py-1">
                  <span className="roadmap-dep-kind-dot h-2 w-2 rounded-full" data-kind={kind} />
                  {DEPENDENCY_KIND_LABEL[kind]}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="roadmap-kind-help" aria-label={`${kind} definition`}>
                        ?
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      className="border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-xs font-normal leading-relaxed text-[var(--text-primary)] shadow-lg [&>svg]:hidden"
                    >
                      {DEPENDENCY_KIND_HINT[kind]}
                    </TooltipContent>
                  </Tooltip>
                </span>
              ))}
            </TooltipProvider>
          </div>
        </div>
        {showAdvancedControls ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-2">
            <label htmlFor="ownerFilter" className="text-xs font-medium ds-text-primary">
              Owner
            </label>
            <select
              id="ownerFilter"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs"
            >
              <option value="all">All owners</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
            <label htmlFor="statusFilter" className="text-xs font-medium ds-text-primary">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'planned' | 'in-progress' | 'done')}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <label htmlFor="laneFilter" className="text-xs font-medium ds-text-primary">
              Lane
            </label>
            <select
              id="laneFilter"
              value={laneFilter}
              onChange={(event) => setLaneFilter(event.target.value)}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs"
            >
              <option value="all">All lanes</option>
              {projection.lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.title}
                </option>
              ))}
            </select>
            <label htmlFor="dependencyView" className="text-xs font-medium ds-text-primary">
              Dependency view
            </label>
            <select
              id="dependencyView"
              value={dependencyView}
              onChange={(event) => setDependencyView(event.target.value as 'all' | 'selected' | 'hide-weak')}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs"
            >
              <option value="all">All</option>
              <option value="selected">Selected task only</option>
              <option value="hide-weak">Hide weak</option>
            </select>
          </div>
        ) : null}
        {hasActiveFilters ? (
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs ds-text-secondary">
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-1">Filtered view</span>
              {activeFilterTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={tag.clear}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 ds-text-secondary hover:bg-[var(--surface-raised)]"
                  title={`Clear ${tag.label}`}
                >
                  <span>{tag.label}</span>
                  <span aria-hidden>×</span>
                </button>
              ))}
              <button type="button" onClick={resetView} className="underline underline-offset-2">
                Clear all filters
              </button>
            </div>
            <p className="text-xs ds-text-tertiary">Current filter logic: {activeFilterReason}</p>
          </div>
        ) : null}
        {filteredTasks.length > 0 ? (
        <div className="roadmap-grid-area">
          <div
            className="roadmap-grid-scroll-controls"
            aria-label="Timeline horizontal controls"
            data-empty={filteredTasks.length === 0 ? 'true' : 'false'}
          >
            <button
              type="button"
              className="roadmap-scroll-button"
              onClick={() => scrollTimelineByDirection('left')}
              aria-label="Scroll timeline left"
              disabled={filteredTasks.length === 0 || !canScrollLeft}
            >
              ←
            </button>
            <button
              type="button"
              className="roadmap-scroll-button"
              onClick={() => scrollTimelineByDirection('right')}
              aria-label="Scroll timeline right"
              disabled={filteredTasks.length === 0 || !canScrollRight}
            >
              →
            </button>
          </div>
          <p className="roadmap-grid-hint" aria-live="polite">
            Use arrows to move focus, Enter to open, T for Timeline, D for Dependencies, G/B for Graph/Table, A for Advanced, R to reset.
          </p>
          {filteredTasks.length === 0 ? (
            <div className="roadmap-overview-strip roadmap-overview-strip-empty" role="presentation" data-empty="true">
              <span className="roadmap-overview-empty-label">No tasks in current filters</span>
            </div>
          ) : (
            <div
              ref={overviewTrackRef}
              className="roadmap-overview-strip"
              role="presentation"
              data-empty="false"
              onMouseDown={(event) => {
                setIsOverviewDragging(true);
                handleOverviewPointer(event.clientX);
              }}
              onMouseMove={(event) => {
                if ((event.buttons & 1) !== 1) return;
                handleOverviewPointer(event.clientX);
              }}
              onMouseUp={() => setIsOverviewDragging(false)}
              onMouseLeave={() => setIsOverviewDragging(false)}
            >
              {overviewTasks.map((task) => {
                const left = mapX(task.start_time);
                const width = Math.max(mapX(task.end_time) - left, 0.8);
                return (
                  <span
                    key={`${task.id}-overview`}
                    className="roadmap-overview-task"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })}
              <span
                className="roadmap-overview-window"
                style={{
                  width: `${overviewWindowWidth}%`,
                  left: `${overviewWindowLeft}%`,
                }}
              />
            </div>
          )}
          <div
            ref={timelineShellRef}
            className={[
              'roadmap-gantt-shell',
              densityMode === 'compact' ? 'roadmap-gantt-shell-compact' : 'roadmap-gantt-shell-comfortable',
              canScrollLeft ? 'roadmap-gantt-shell-can-scroll-left' : '',
              canScrollRight ? 'roadmap-gantt-shell-can-scroll-right' : '',
            ].join(' ')}
            tabIndex={0}
            role="grid"
            aria-label="Roadmap timeline keyboard grid"
            data-testid="roadmap-timeline-grid"
            onKeyDown={handleTimelineGridKeyDown}
          >
            <Timeline<GanttTaskItem, TimelineGroupBase>
            key={`roadmap-timeline-${timeScale}-${dayRangeDays}`}
            groups={groups}
            items={items.map((item) => ({
              ...item,
              className: [
                item.className,
                highlightedTaskIds.has(item.id) ? 'roadmap-gantt-item-highlighted' : '',
                focusedTaskId === item.id ? 'roadmap-gantt-item-focused' : '',
              ]
                .filter(Boolean)
                .join(' '),
            }))}
            defaultTimeStart={defaultViewportStart}
            defaultTimeEnd={defaultViewportEnd}
            lineHeight={52}
            itemHeightRatio={0.72}
            sidebarWidth={220}
            rightSidebarWidth={0}
            canMove={false}
            canResize={false}
            stackItems
            minZoom={3 * 24 * 60 * 60 * 1000}
            maxZoom={isMonthScale ? 3 * 366 * 24 * 60 * 60 * 1000 : 366 * 24 * 60 * 60 * 1000}
            verticalLineClassNamesForTime={(start) => {
              const date = dayjs(start);
              const classes = ['roadmap-day-divider'];
              if (date.day() === 1) classes.push('roadmap-week-divider');
              if (date.date() === 1) classes.push('roadmap-month-divider');
              if (date.isSame(dayjs(), 'day')) classes.push('roadmap-today-divider');
              return classes;
            }}
            onItemSelect={(itemId) => {
              const id = String(itemId);
              setSelectedTaskId(id);
              setFocusedTaskId(id);
            }}
            onItemClick={(itemId) => {
              const id = String(itemId);
              setSelectedTaskId(id);
              setFocusedTaskId(id);
            }}
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
          >
            <TimelineHeaders className="roadmap-time-headers">
              <SidebarHeader>
                {({ getRootProps }) => (
                  <div {...getRootProps()} className="roadmap-sidebar-header">
                    Workstream
                  </div>
                )}
              </SidebarHeader>
              <DateHeader
                className="roadmap-month-header"
                unit={isMonthScale ? 'year' : 'month'}
                labelFormat={isMonthScale ? 'YYYY' : 'MMMM YYYY'}
              />
              <DateHeader
                className="roadmap-day-header"
                unit={isMonthScale ? 'month' : 'day'}
                labelFormat={isMonthScale ? 'MMM' : 'D'}
              />
            </TimelineHeaders>
            <TimelineMarkers>
              <TodayMarker>
                {({ styles }) => (
                  <div style={styles} className="roadmap-today-marker-line" aria-hidden>
                    <span className="roadmap-today-marker-nub" />
                  </div>
                )}
              </TodayMarker>
            </TimelineMarkers>
            </Timeline>
          </div>
        </div>
        ) : null}
        {filteredTasks.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--surface-raised)] p-4 text-sm ds-text-secondary">
            {hasActiveFilters
              ? `No tasks match current filters. Current combination: ${activeFilterReason || 'active filters'}.`
              : 'No tasks available for this roadmap yet.'}
          </div>
        ) : null}
      </div>
      ) : null}
      {activePanel === 'dependencies' ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-4 shadow-[var(--shadow-xs)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold ds-text-primary">Dependencies</h3>
              <p className="mt-1 text-xs ds-text-tertiary">
                Graph helps investigate flows, table helps audit exact pairs and types.
              </p>
            </div>
            <button
              type="button"
              onClick={resetView}
              className="rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1 text-xs ds-text-primary hover:bg-[var(--surface-raised)]"
            >
              Reset view
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDependenciesTab('graph')}
              aria-pressed={dependenciesTab === 'graph'}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                dependenciesTab === 'graph'
                  ? 'bg-[var(--surface-raised)] ds-text-primary'
                  : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
              ].join(' ')}
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => setDependenciesTab('table')}
              aria-pressed={dependenciesTab === 'table'}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                dependenciesTab === 'table'
                  ? 'bg-[var(--surface-raised)] ds-text-primary'
                  : 'ds-text-secondary hover:bg-[var(--surface-raised)]',
              ].join(' ')}
            >
              Table
            </button>
            <span className="ml-auto rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-1 text-xs ds-text-secondary">
              {`Dependencies ${visibleDependencies.length}`}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs ds-text-secondary">
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1">
              {dependenciesTab === 'graph'
                ? 'Graph mode: investigate flow and bottlenecks'
                : 'Table mode: audit exact dependency pairs'}
            </span>
            {dependenciesTab === 'table' ? (
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-2 py-1">
                {`Sorted by ${dependencySort.key} (${dependencySort.direction})`}
              </span>
            ) : null}
          </div>
          <div className="mb-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
            <p className="text-xs ds-text-secondary">
              Missing links in the dependency matrix?
            </p>
            <Link
              to={strategyHref}
              className="roadmap-deps-cta mt-1 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-1"
            >
              <span aria-hidden>+</span>
              Build strategy to populate this dependency map
            </Link>
          </div>
          {dependenciesTab === 'graph' ? (
            <div>
              <h4 className="text-sm font-semibold ds-text-primary">Dependency graph</h4>
              <p className="mt-1 text-xs ds-text-tertiary">
                FS means the target task starts after the source task finishes. Other types follow the same initial letters.
              </p>
              <div className="mt-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-base)] p-2">
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
                </div>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-2">
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
                  {projection.lanes.filter((lane) => groups.some((group) => group.id === lane.id)).map((lane) => {
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
                        strokeDasharray={dep.strength === 'weak' ? '2 2' : undefined}
                        markerEnd="url(#arrowHead)"
                        className={`cursor-pointer roadmap-dependency-arrow ${isHovered ? 'roadmap-dependency-arrow-hovered' : ''}`}
                        onClick={() => {
                          setSelectedTaskId(dep.to);
                          setFocusedTaskId(dep.to);
                        }}
                        onMouseEnter={() => setHoveredDependencyId(dep.id)}
                        onMouseLeave={() => setHoveredDependencyId(null)}
                      >
                        <title>{`${fromTitle} -> ${toTitle} (${DEPENDENCY_KIND_LABEL[dep.kind]})`}</title>
                      </path>
                    );
                  })}
                </svg>
              </div>
              {hoveredDependency ? (
                <p className="mt-2 text-xs ds-text-secondary">
                  {`${taskTitleById.get(hoveredDependency.from) ?? hoveredDependency.from} -> ${
                    taskTitleById.get(hoveredDependency.to) ?? hoveredDependency.to
                  } · ${DEPENDENCY_KIND_LABEL[hoveredDependency.kind]} · ${hoveredDependency.strength}`}
                </p>
              ) : null}
            </div>
          ) : null}
          {dependenciesTab === 'table' ? (
            <div>
              <h4 className="text-sm font-semibold ds-text-primary">Dependency table</h4>
              <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[var(--border-default)]">
                <table className="roadmap-deps-table w-full text-sm">
            <thead>
              <tr>
                <th scope="col" aria-sort={dependencySort.key === 'from' ? (dependencySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => toggleDependencySort('from')}>
                    {`From${sortArrow('from')}`}
                  </button>
                </th>
                <th scope="col" aria-sort={dependencySort.key === 'to' ? (dependencySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => toggleDependencySort('to')}>
                    {`To${sortArrow('to')}`}
                  </button>
                </th>
                <th scope="col" aria-sort={dependencySort.key === 'type' ? (dependencySort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="roadmap-deps-sort-btn" onClick={() => toggleDependencySort('type')}>
                    {`Type${sortArrow('type')}`}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVisibleDependencies.length === 0 ? (
                <tr>
                  <td colSpan={3} className="roadmap-deps-table-empty">
                    {hasActiveFilters ? (
                      <button type="button" onClick={resetView} className="roadmap-deps-empty-action">
                        No dependencies match current filters. Clear filters.
                      </button>
                    ) : (
                      'No dependencies available yet.'
                    )}
                  </td>
                </tr>
              ) : null}
              {sortedVisibleDependencies.map((dep) => (
                <tr
                  key={dep.id}
                  onMouseEnter={() => setHoveredDependencyId(dep.id)}
                  onMouseLeave={() => setHoveredDependencyId(null)}
                  className={hoveredDependencyId === dep.id ? 'roadmap-deps-row-hovered' : ''}
                >
                  <td>{taskTitleById.get(dep.from) ?? dep.from}</td>
                  <td>{taskTitleById.get(dep.to) ?? dep.to}</td>
                  <td>
                    <span
                      className="ml-0 rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs"
                      title={DEPENDENCY_KIND_HINT[dep.kind]}
                    >
                      {DEPENDENCY_KIND_LABEL[dep.kind]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
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
