import { describe, expect, it } from 'vitest';

import {
  ROADMAP_GANTT_OVERVIEW_KEY_STEP_MIN_PX,
  ROADMAP_GANTT_TIMELINE_SCROLL_MIN_PX,
} from '../../config/roadmap-gantt-view-preferences';
import {
  roadmapGanttOverviewKeyboardStepPx,
  roadmapGanttOverviewPageStepPx,
  roadmapGanttToolbarScrollDeltaPx,
} from '../roadmap-gantt-scroll-math';

describe('roadmapGanttToolbarScrollDeltaPx', () => {
  it('uses viewport ratio for wide clients and minimum for narrow', () => {
    expect(roadmapGanttToolbarScrollDeltaPx(1000)).toBe(Math.max(Math.floor(1000 * 0.72), ROADMAP_GANTT_TIMELINE_SCROLL_MIN_PX));
    expect(roadmapGanttToolbarScrollDeltaPx(100)).toBe(ROADMAP_GANTT_TIMELINE_SCROLL_MIN_PX);
  });
});

describe('roadmapGanttOverviewKeyboardStepPx', () => {
  it('clamps to minimum on tiny viewports', () => {
    expect(roadmapGanttOverviewKeyboardStepPx(400)).toBeGreaterThanOrEqual(ROADMAP_GANTT_OVERVIEW_KEY_STEP_MIN_PX);
    expect(roadmapGanttOverviewKeyboardStepPx(200)).toBe(ROADMAP_GANTT_OVERVIEW_KEY_STEP_MIN_PX);
  });
});

describe('roadmapGanttOverviewPageStepPx', () => {
  it('is at least the arrow step', () => {
    const step = 120;
    expect(roadmapGanttOverviewPageStepPx(800, step)).toBeGreaterThanOrEqual(step);
  });
});
