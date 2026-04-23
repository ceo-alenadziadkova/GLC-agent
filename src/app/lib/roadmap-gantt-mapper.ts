import dayjs from 'dayjs';

import type { AuditTimelineDto } from '../data/api/audits-orchestration';
import { ORCHESTRATION_LANE_LABELS, type OrchestrationLaneId } from '../config/orchestration-roadmap-ui-copy.en';

export type DependencyKind = 'FS' | 'SS' | 'FF' | 'SF';

export type RoadmapGanttLane = {
  id: OrchestrationLaneId;
  title: string;
};

export type RoadmapGanttTask = {
  id: string;
  group: OrchestrationLaneId;
  title: string;
  start_time: number;
  end_time: number;
  owner: string;
  description: string;
  impact: string;
  status: 'planned' | 'in-progress' | 'done';
  deliverables: string[];
  dependencyIds: string[];
  isEstimated: boolean;
};

export type RoadmapGanttDependency = {
  id: string;
  from: string;
  to: string;
  kind: DependencyKind;
  strength: AuditTimelineDto['dependencies'][number]['relation'];
  blocking: boolean;
  crossLane: boolean;
};

export type RoadmapGanttProjection = {
  lanes: RoadmapGanttLane[];
  tasks: RoadmapGanttTask[];
  dependencies: RoadmapGanttDependency[];
  defaultTimeStart: number;
  defaultTimeEnd: number;
};

const DAY_MS = 86_400_000;

function dependencyKindFromRelation(
  relation: AuditTimelineDto['dependencies'][number]['relation'],
): DependencyKind {
  if (relation === 'direct_blocker') return 'FS';
  if (relation === 'strong') return 'FS';
  if (relation === 'medium') return 'SS';
  return 'FF';
}

function getBucketBoundaries(timeline: AuditTimelineDto): Array<{ start: number; end: number }> {
  const horizon = timeline.version.plan_horizon;
  const now = dayjs().startOf('day').valueOf();
  const fallbackStart = now;
  const fallbackEnd = dayjs().add(180, 'day').endOf('day').valueOf();

  const start = horizon?.start_date ? dayjs(horizon.start_date).startOf('day').valueOf() : fallbackStart;
  const end = horizon?.end_date ? dayjs(horizon.end_date).endOf('day').valueOf() : fallbackEnd;
  const safeStart = Number.isFinite(start) ? start : fallbackStart;
  const safeEnd = Number.isFinite(end) && end > safeStart ? end : fallbackEnd;
  const span = Math.max(safeEnd - safeStart, 3 * DAY_MS);
  const slice = Math.floor(span / 3);

  return [
    { start: safeStart, end: safeStart + slice },
    { start: safeStart + slice, end: safeStart + 2 * slice },
    { start: safeStart + 2 * slice, end: safeEnd },
  ];
}

function estimateTaskWindow(
  item: AuditTimelineDto['lanes'][number]['items'][number],
  buckets: Array<{ start: number; end: number }>,
): { start: number; end: number; isEstimated: boolean } {
  const bySeason =
    typeof item.season_index === 'number' && item.season_index >= 0 && item.season_index < buckets.length
      ? buckets[item.season_index]
      : null;
  if (bySeason) {
    return {
      start: bySeason.start,
      end: Math.max(bySeason.start + 7 * DAY_MS, bySeason.end),
      isEstimated: true,
    };
  }

  if (item.time_bucket === 'now') return { start: buckets[0]!.start, end: buckets[0]!.end, isEstimated: true };
  if (item.time_bucket === 'next') return { start: buckets[1]!.start, end: buckets[1]!.end, isEstimated: true };
  if (item.time_bucket === 'later') return { start: buckets[2]!.start, end: buckets[2]!.end, isEstimated: true };

  return { start: buckets[1]!.start, end: buckets[1]!.end, isEstimated: true };
}

function uniqueLaneOrder(timeline: AuditTimelineDto): OrchestrationLaneId[] {
  const ids = timeline.lanes.map((lane) => lane.lane_id);
  return Array.from(new Set(ids));
}

export function buildRoadmapGanttProjection(timeline: AuditTimelineDto): RoadmapGanttProjection {
  const buckets = getBucketBoundaries(timeline);
  const lanes: RoadmapGanttLane[] = uniqueLaneOrder(timeline).map((laneId) => ({
    id: laneId,
    title: ORCHESTRATION_LANE_LABELS[laneId],
  }));

  const dependencyByTaskId = new Map<string, string[]>();
  for (const dep of timeline.dependencies) {
    const list = dependencyByTaskId.get(dep.to) ?? [];
    list.push(dep.from);
    dependencyByTaskId.set(dep.to, list);
  }

  const tasks: RoadmapGanttTask[] = timeline.lanes.flatMap((lane) =>
    lane.items.map((item) => {
      const window = estimateTaskWindow(item, buckets);
      const whyRows = item.explain?.why ?? [];
      const owner =
        item.source?.startsWith('sub_agent:') === true
          ? item.source.slice('sub_agent:'.length)
          : item.source ?? item.domain;
      return {
        id: item.id,
        group: lane.lane_id,
        title: item.title,
        start_time: window.start,
        end_time: window.end,
        owner,
        description: item.explain?.how?.description ?? whyRows.join(' '),
        impact: item.explain?.impact?.label ?? 'unscored',
        status: item.time_bucket === 'now' ? 'in-progress' : 'planned',
        deliverables: whyRows,
        dependencyIds: dependencyByTaskId.get(item.id) ?? [],
        isEstimated: window.isEstimated,
      };
    }),
  );

  const dependencies: RoadmapGanttDependency[] = timeline.dependencies.map((dep) => ({
    id: `${dep.from}->${dep.to}`,
    from: dep.from,
    to: dep.to,
    kind: dependencyKindFromRelation(dep.relation),
    strength: dep.relation,
    blocking: dep.blocking,
    crossLane: dep.cross_lane,
  }));

  return {
    lanes,
    tasks,
    dependencies,
    defaultTimeStart: buckets[0]!.start,
    defaultTimeEnd: buckets[2]!.end,
  };
}
