import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';

import {
  computeOverviewWindowMetrics,
  type RoadmapGanttScrollMetrics,
} from '../lib/roadmap-gantt-overview-window';
import {
  computeRoadmapGanttViewportEnd,
} from '../lib/roadmap-gantt-viewport';
import { computeJumpToTodayScrollLeft } from '../lib/roadmap-gantt-jump-to-today';
import { computePointerScrollRatio } from '../lib/roadmap-gantt-overview-pointer';
import {
  roadmapGanttOverviewKeyboardStepPx,
  roadmapGanttOverviewPageStepPx,
  roadmapGanttToolbarScrollDeltaPx,
} from '../lib/roadmap-gantt-scroll-math';

type TimeScale = 'day' | 'month';
type DayRange = 30 | 60 | 90;

export type UseRoadmapGanttViewportArgs = {
  timeScale: TimeScale;
  dayRangeDays: DayRange;
  projection: { defaultTimeStart: number; defaultTimeEnd: number };
  /** Number of currently visible timeline tasks; used only to short-circuit overview keyboard nav. */
  timelineTasksLength: number;
  /** Group count from the data hook; used as a dep for the scroll-listener effect. */
  timelineGroupsLength: number;
  /** Item count from the data hook; used as a dep for the scroll-listener effect. */
  timelineItemsLength: number;
  /** Total range in ms used by jump-to-today; comes from the data hook (`useRoadmapGanttDependencySvgPaths`). */
  timelineRangeMs: number;
  /** Owned by the orchestrator so that both data hook (SVG freeze) and viewport hook (scroll behavior) can read it. */
  isOverviewDragging: boolean;
  setIsOverviewDragging: Dispatch<SetStateAction<boolean>>;
};

export type UseRoadmapGanttViewportResult = {
  refs: {
    timelineShellRef: RefObject<HTMLDivElement | null>;
    overviewTrackRef: RefObject<HTMLDivElement | null>;
  };
  state: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
  };
  derived: {
    isMonthScale: boolean;
    defaultViewportStart: number;
    defaultViewportEnd: number;
    overviewWindow: ReturnType<typeof computeOverviewWindowMetrics>;
  };
  handlers: {
    scrollTimelineByDirection: (direction: 'left' | 'right') => void;
    jumpTimelineRangeByDirection: (direction: 'previous' | 'next') => void;
    jumpTimelineToToday: () => void;
    scrollTimelineToRatio: (ratio: number) => void;
    handleOverviewKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleOverviewPointer: (clientX: number) => void;
    focusTaskBarEl: (taskId: string) => void;
  };
};

/**
 * Viewport-level state and handlers for the Roadmap Gantt: scale, scroll metrics,
 * scroll commands, overview pointer/keyboard, and `focusTaskBarEl` DOM helper.
 *
 * Internal: not exported from `useRoadmapGanttView` and not used outside of it.
 */
export function useRoadmapGanttViewport(args: UseRoadmapGanttViewportArgs): UseRoadmapGanttViewportResult {
  const {
    timeScale,
    dayRangeDays,
    projection,
    timelineTasksLength,
    timelineGroupsLength,
    timelineItemsLength,
    timelineRangeMs,
    isOverviewDragging,
  } = args;

  const timelineShellRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLElement | null>(null);
  const overviewTrackRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState<RoadmapGanttScrollMetrics>({
    left: 0,
    max: 0,
    clientWidth: 0,
  });
  /** Coalesce rapid scroll/wheel updates so overview positioning does not rerender entire Gantt each event. */
  const scrollMetricsRafRef = useRef<number | null>(null);
  const pendingScrollMetricsRef = useRef<RoadmapGanttScrollMetrics | null>(null);

  // ---------- Scroll listener + RAF coalescing ----------
  useEffect(() => {
    const root = timelineShellRef.current;
    if (!root) return;
    const scrollNode = root.querySelector('.rct-scroll') as HTMLElement | null;
    if (!scrollNode) return;
    timelineScrollRef.current = scrollNode;

    const flushScrollMetrics = () => {
      scrollMetricsRafRef.current = null;
      const next = pendingScrollMetricsRef.current;
      if (next) setScrollMetrics(next);
    };

    const updateScrollState = () => {
      const maxScroll = scrollNode.scrollWidth - scrollNode.clientWidth;
      const left = scrollNode.scrollLeft;
      setCanScrollLeft(left > 2);
      setCanScrollRight(maxScroll - left > 2);
      pendingScrollMetricsRef.current = {
        left,
        max: Math.max(maxScroll, 1),
        clientWidth: Math.max(scrollNode.clientWidth, 1),
      };
      if (scrollMetricsRafRef.current === null) {
        scrollMetricsRafRef.current = window.requestAnimationFrame(flushScrollMetrics);
      }
    };

    updateScrollState();
    scrollNode.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      if (scrollMetricsRafRef.current !== null) {
        window.cancelAnimationFrame(scrollMetricsRafRef.current);
        scrollMetricsRafRef.current = null;
      }
      pendingScrollMetricsRef.current = null;
      scrollNode.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      if (timelineScrollRef.current === scrollNode) {
        timelineScrollRef.current = null;
      }
    };
    // Recompute when tasks/lanes change in the parent (groups.length / items.length flow through the parent rerender).
  }, [
    projection.defaultTimeEnd,
    projection.defaultTimeStart,
    timelineGroupsLength,
    timelineItemsLength,
  ]);

  const overviewWindow = useMemo(() => computeOverviewWindowMetrics(scrollMetrics), [scrollMetrics]);

  // ---------- Viewport range ----------
  const isMonthScale = timeScale === 'month';
  const defaultViewportStart = projection.defaultTimeStart;
  const defaultViewportEnd = useMemo(
    () =>
      computeRoadmapGanttViewportEnd({
        defaultTimeStart: projection.defaultTimeStart,
        defaultTimeEnd: projection.defaultTimeEnd,
        isMonthScale,
        dayRangeDays,
      }),
    [dayRangeDays, isMonthScale, projection.defaultTimeEnd, projection.defaultTimeStart],
  );

  // ---------- Scroll commands ----------
  const scrollTimelineByDirection = useCallback((direction: 'left' | 'right') => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const amount = roadmapGanttToolbarScrollDeltaPx(scrollNode.clientWidth);
    const delta = direction === 'left' ? -amount : amount;
    scrollNode.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const jumpTimelineRangeByDirection = useCallback(
    (direction: 'previous' | 'next') => {
      scrollTimelineByDirection(direction === 'previous' ? 'left' : 'right');
    },
    [scrollTimelineByDirection],
  );

  const jumpTimelineToToday = useCallback(() => {
    const scrollNode = timelineScrollRef.current;
    if (!scrollNode) return;
    const left = computeJumpToTodayScrollLeft({
      now: Date.now(),
      defaultStart: projection.defaultTimeStart,
      rangeMs: timelineRangeMs,
      scrollWidth: scrollNode.scrollWidth,
      clientWidth: scrollNode.clientWidth,
    });
    scrollNode.scrollTo({ left, behavior: 'smooth' });
  }, [projection.defaultTimeStart, timelineRangeMs]);

  const scrollTimelineToRatio = useCallback(
    (ratio: number) => {
      const scrollNode = timelineScrollRef.current;
      if (!scrollNode) return;
      const clamped = Math.min(Math.max(ratio, 0), 1);
      const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
      scrollNode.scrollTo({ left: maxScroll * clamped, behavior: isOverviewDragging ? 'auto' : 'smooth' });
    },
    [isOverviewDragging],
  );

  const handleOverviewKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (timelineTasksLength === 0) return;
      const scrollNode = timelineScrollRef.current;
      if (!scrollNode) return;
      const maxScroll = Math.max(scrollNode.scrollWidth - scrollNode.clientWidth, 0);
      const step = roadmapGanttOverviewKeyboardStepPx(scrollNode.clientWidth);
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollNode.scrollBy({ left: -step, behavior: 'smooth' });
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNode.scrollBy({ left: step, behavior: 'smooth' });
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        scrollNode.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        scrollNode.scrollTo({ left: maxScroll, behavior: 'smooth' });
        return;
      }
      const pageStep = roadmapGanttOverviewPageStepPx(scrollNode.clientWidth, step);
      if (event.key === 'PageDown') {
        event.preventDefault();
        scrollNode.scrollBy({ left: pageStep, behavior: 'smooth' });
        return;
      }
      if (event.key === 'PageUp') {
        event.preventDefault();
        scrollNode.scrollBy({ left: -pageStep, behavior: 'smooth' });
      }
    },
    [timelineTasksLength],
  );

  const handleOverviewPointer = useCallback(
    (clientX: number) => {
      const track = overviewTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = computePointerScrollRatio({ clientX, rect: { left: rect.left, width: rect.width } });
      if (ratio == null) return;
      scrollTimelineToRatio(ratio);
    },
    [scrollTimelineToRatio],
  );

  const focusTaskBarEl = useCallback((taskId: string) => {
    window.requestAnimationFrame(() => {
      const outer = timelineShellRef.current;
      if (!outer) return;
      const node = outer.querySelector(`[data-roadmap-task-id="${CSS.escape(taskId)}"]`) as HTMLElement | null;
      node?.focus({ preventScroll: false });
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }, []);

  return {
    refs: { timelineShellRef, overviewTrackRef },
    state: { canScrollLeft, canScrollRight },
    derived: { isMonthScale, defaultViewportStart, defaultViewportEnd, overviewWindow },
    handlers: {
      scrollTimelineByDirection,
      jumpTimelineRangeByDirection,
      jumpTimelineToToday,
      scrollTimelineToRatio,
      handleOverviewKeyDown,
      handleOverviewPointer,
      focusTaskBarEl,
    },
  };
}
