import { describe, expect, it } from 'vitest';

import { buildGanttTimelineGroups } from '../build-timeline-groups';
import type { RoadmapGanttLane, RoadmapGanttTask } from '../../../../lib/roadmap-gantt-mapper';
import { ROADMAP_GANTT_MILESTONE_LANE_ID } from '../../../../lib/roadmap-gantt-mapper';

function task(id: string, group: RoadmapGanttTask['group']): RoadmapGanttTask {
  return {
    id,
    group,
    title: id,
    start_time: 0,
    end_time: 1000,
    owner: '',
    description: '',
    impact: '',
    status: 'planned',
    deliverables: [],
    dependencyIds: [],
    isEstimated: false,
    kind: 'task',
    onCriticalPath: false,
    isOverdue: false,
    topPriorityBucket: null,
    confidence: null,
    earlyStartMs: null,
    earlyFinishMs: null,
    lateStartMs: null,
    lateFinishMs: null,
    totalFloatMs: null,
    freeFloatMs: null,
  };
}

describe('buildGanttTimelineGroups', () => {
  const lanes: RoadmapGanttLane[] = [
    { id: 'tech_delivery', title: 'Technology' },
    { id: 'marketing_narrative', title: 'Marketing' },
    { id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: '' },
  ];

  it('drops lanes that have no visible tasks', () => {
    const groups = buildGanttTimelineGroups({
      projectionLanes: lanes,
      timelineTasks: [task('t1', 'tech_delivery')],
      milestoneLaneTitle: 'Milestones',
    });
    expect(groups.map((g) => g.id)).toEqual(['tech_delivery']);
  });

  it('replaces milestone lane title with the supplied label', () => {
    const groups = buildGanttTimelineGroups({
      projectionLanes: lanes,
      timelineTasks: [task('m1', ROADMAP_GANTT_MILESTONE_LANE_ID)],
      milestoneLaneTitle: 'Key milestones',
    });
    expect(groups).toEqual([{ id: ROADMAP_GANTT_MILESTONE_LANE_ID, title: 'Key milestones' }]);
  });

  it('preserves lane order from projection.lanes', () => {
    const groups = buildGanttTimelineGroups({
      projectionLanes: lanes,
      timelineTasks: [
        task('t1', 'tech_delivery'),
        task('t2', 'marketing_narrative'),
        task('m1', ROADMAP_GANTT_MILESTONE_LANE_ID),
      ],
      milestoneLaneTitle: 'Milestones',
    });
    expect(groups.map((g) => g.id)).toEqual([
      'tech_delivery',
      'marketing_narrative',
      ROADMAP_GANTT_MILESTONE_LANE_ID,
    ]);
  });
});
