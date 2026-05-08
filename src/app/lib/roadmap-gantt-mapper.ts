import type { AuditTimelineDto } from '../data/api/orchestration-types';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { ROADMAP_GANTT_DAY_MS } from '../config/roadmap-gantt-view-preferences';
import { ORCHESTRATION_LANE_LABELS, type OrchestrationLaneId } from '../config/orchestration-roadmap-ui-copy.en';
import { timelineHorizonThirdBoundaries } from './time-bucket-normalization';

import { computeCpmSchedule, logCpmVersusPackCriticalPath, type RoadmapGanttCpmEdge } from './roadmap-gantt-cpm';
import {
  buildCriticalPathEdgeKeys,
  buildOutgoingIncoming,
  buildPriorityMap,
  transitivePredecessors,
  transitiveSuccessors,
} from './roadmap-gantt-graph-helpers';
import {
  CANONICAL_LANE_ORDER,
  dependencyKindFromRelation,
  estimateTaskWindow,
  isOrchestrationLaneId,
  MILESTONE_BAR_MS,
  taskConfidenceFromPack,
} from './roadmap-gantt-mapper-helpers';

export { computeCpmSchedule, type RoadmapGanttCpmEdge } from './roadmap-gantt-cpm';

export const ROADMAP_GANTT_MILESTONE_LANE_ID = '__roadmap_milestones__' as const;

export type RoadmapGanttLaneId = OrchestrationLaneId | typeof ROADMAP_GANTT_MILESTONE_LANE_ID;

export type DependencyKind = 'FS' | 'SS' | 'FF' | 'SF';

export type RoadmapGanttLane = {
  id: RoadmapGanttLaneId;
  title: string;
};

export type RoadmapGanttTaskKind = 'task' | 'milestone';

export type RoadmapGanttTaskConfidence = 'high' | 'medium' | 'low';

export type RoadmapGanttTask = {
  id: string;
  group: RoadmapGanttLaneId;
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
  kind: RoadmapGanttTaskKind;
  onCriticalPath: boolean;
  isOverdue: boolean;
  topPriorityBucket: '7d' | '30d' | null;
  confidence: RoadmapGanttTaskConfidence | null;
  /** CPM schedule fields (core tasks only); milestones use null. */
  earlyStartMs: number | null;
  earlyFinishMs: number | null;
  lateStartMs: number | null;
  lateFinishMs: number | null;
  totalFloatMs: number | null;
  freeFloatMs: number | null;
};

export type RoadmapGanttDependency = {
  id: string;
  from: string;
  to: string;
  kind: DependencyKind;
  strength: AuditTimelineDto['dependencies'][number]['relation'];
  blocking: boolean;
  crossLane: boolean;
  onCriticalPath: boolean;
};

export type RoadmapGanttMilestone = {
  id: string;
  label: string;
  date: number;
  unlocks: string[];
};

export type RoadmapGanttProjection = {
  lanes: RoadmapGanttLane[];
  tasks: RoadmapGanttTask[];
  dependencies: RoadmapGanttDependency[];
  defaultTimeStart: number;
  defaultTimeEnd: number;
  milestones: RoadmapGanttMilestone[];
  upstreamByTask: Map<string, ReadonlySet<string>>;
  downstreamByTask: Map<string, ReadonlySet<string>>;
};

export type BuildRoadmapGanttProjectionOpts = {
  pack?: GlcOrchestrationPackView | null;
  /** For deterministic tests (overdue, milestone dates). Defaults to `Date.now()`. */
  nowMs?: number;
};

export function buildRoadmapGanttProjection(
  timeline: AuditTimelineDto,
  opts?: BuildRoadmapGanttProjectionOpts,
): RoadmapGanttProjection {
  const pack = opts?.pack ?? null;
  const nowMs = opts?.nowMs ?? Date.now();
  const buckets = timelineHorizonThirdBoundaries(timeline, { nowMs });
  const defaultTimeStart = buckets[0]!.start;
  const defaultTimeEnd = buckets[2]!.end;

  const dependencyByTaskId = new Map<string, string[]>();
  for (const dep of timeline.dependencies) {
    const list = dependencyByTaskId.get(dep.to) ?? [];
    list.push(dep.from);
    dependencyByTaskId.set(dep.to, list);
  }

  const priorityMap = buildPriorityMap(timeline);
  const criticalPathIds = pack?.critical_path ?? [];
  const criticalPathSet = new Set(criticalPathIds);
  const criticalPathEdgeKeys = criticalPathIds.length ? buildCriticalPathEdgeKeys(criticalPathIds) : new Set<string>();

  const coreTasksWithoutCpm = timeline.lanes.flatMap((lane) =>
    lane.items.map((item) => {
      const window = estimateTaskWindow(item, buckets);
      const whyRows = item.explain?.why ?? [];
      const owner =
        item.source?.startsWith('sub_agent:') === true
          ? item.source.slice('sub_agent:'.length)
          : item.source ?? item.domain;
      const status: RoadmapGanttTask['status'] = item.time_bucket === 'now' ? 'in-progress' : 'planned';
      const onCriticalPath = criticalPathSet.has(item.id);
      /** Timeline items do not carry completion yet; any ended window counts as overdue. */
      const isOverdue = window.end < nowMs;
      const topPriorityBucket = priorityMap.get(item.id) ?? null;
      const confidence = taskConfidenceFromPack(pack, item.id);
      return {
        id: item.id,
        group: lane.lane_id,
        title: item.title,
        start_time: window.start,
        end_time: window.end,
        owner,
        description: item.explain?.how?.description ?? whyRows.join(' '),
        impact: item.explain?.impact?.label ?? 'unscored',
        status,
        deliverables: whyRows,
        dependencyIds: dependencyByTaskId.get(item.id) ?? [],
        isEstimated: window.isEstimated,
        kind: 'task' as const,
        onCriticalPath,
        isOverdue,
        topPriorityBucket,
        confidence,
      };
    }),
  );

  const coreIdSetForCpm = new Set(coreTasksWithoutCpm.map((t) => t.id));
  const cpmEdges: RoadmapGanttCpmEdge[] = timeline.dependencies
    .filter((d) => coreIdSetForCpm.has(d.from) && coreIdSetForCpm.has(d.to))
    .map((d) => ({
      from: d.from,
      to: d.to,
      kind: dependencyKindFromRelation(d.relation),
    }));
  const cpmMap = computeCpmSchedule(coreTasksWithoutCpm, cpmEdges);
  const dependencyEdgeKeys = new Set(cpmEdges.map((edge) => `${edge.from}->${edge.to}`));
  logCpmVersusPackCriticalPath(pack, cpmMap, dependencyEdgeKeys);

  const nullCpm = {
    earlyStartMs: null,
    earlyFinishMs: null,
    lateStartMs: null,
    lateFinishMs: null,
    totalFloatMs: null,
    freeFloatMs: null,
  } as const;

  const coreTasks: RoadmapGanttTask[] = coreTasksWithoutCpm.map((t) => {
    const row = cpmMap?.get(t.id);
    if (!row) {
      return { ...t, ...nullCpm };
    }
    return {
      ...t,
      earlyStartMs: row.earlyStartMs,
      earlyFinishMs: row.earlyFinishMs,
      lateStartMs: row.lateStartMs,
      lateFinishMs: row.lateFinishMs,
      totalFloatMs: row.totalFloatMs,
      freeFloatMs: row.freeFloatMs,
    };
  });

  const milestonesMeta: RoadmapGanttMilestone[] = (timeline.milestones ?? []).map((m) => {
    const raw = defaultTimeStart + Math.max(0, m.target_window_days) * ROADMAP_GANTT_DAY_MS;
    const date = Math.min(Math.max(raw, defaultTimeStart), defaultTimeEnd);
    return {
      id: m.id,
      label: m.label,
      date,
      unlocks: m.unlocks ?? [],
    };
  });

  const milestoneTasks: RoadmapGanttTask[] = milestonesMeta.map((m) => ({
    id: `milestone:${m.id}`,
    group: ROADMAP_GANTT_MILESTONE_LANE_ID,
    title: m.label,
    start_time: m.date,
    end_time: m.date + MILESTONE_BAR_MS,
    owner: '',
    description: '',
    impact: '',
    status: 'planned',
    deliverables: [],
    dependencyIds: [],
    isEstimated: true,
    kind: 'milestone',
    onCriticalPath: false,
    isOverdue: false,
    topPriorityBucket: null,
    confidence: null,
    ...nullCpm,
  }));

  const tasks: RoadmapGanttTask[] = [...milestoneTasks, ...coreTasks];

  const laneIdsWithTasks = new Set<OrchestrationLaneId>();
  for (const task of coreTasks) {
    if (isOrchestrationLaneId(task.group)) {
      laneIdsWithTasks.add(task.group);
    }
  }

  const orchestrationLanes: RoadmapGanttLane[] = CANONICAL_LANE_ORDER.filter((laneId) => laneIdsWithTasks.has(laneId)).map(
    (laneId) => ({
      id: laneId,
      title: ORCHESTRATION_LANE_LABELS[laneId],
    }),
  );

  const lanes: RoadmapGanttLane[] =
    milestonesMeta.length > 0
      ? [
          {
            id: ROADMAP_GANTT_MILESTONE_LANE_ID,
            /** Resolved in RoadmapGanttView via ORCHESTRATION_UI_COPY (mapper stays copy-free). */
            title: '',
          },
          ...orchestrationLanes,
        ]
      : orchestrationLanes;

  const dependencies: RoadmapGanttDependency[] = timeline.dependencies.map((dep) => {
    const id = `${dep.from}->${dep.to}`;
    return {
      id,
      from: dep.from,
      to: dep.to,
      kind: dependencyKindFromRelation(dep.relation),
      strength: dep.relation,
      blocking: dep.blocking,
      crossLane: dep.cross_lane,
      onCriticalPath: criticalPathEdgeKeys.has(id),
    };
  });

  const coreTaskIds = coreTasks.map((t) => t.id);
  const { outgoing, incoming } = buildOutgoingIncoming(timeline.dependencies);
  const upstreamByTask = new Map<string, ReadonlySet<string>>();
  const downstreamByTask = new Map<string, ReadonlySet<string>>();
  for (const id of coreTaskIds) {
    upstreamByTask.set(id, transitivePredecessors(id, incoming));
    downstreamByTask.set(id, transitiveSuccessors(id, outgoing));
  }

  return {
    lanes,
    tasks,
    dependencies,
    defaultTimeStart,
    defaultTimeEnd,
    milestones: milestonesMeta,
    upstreamByTask,
    downstreamByTask,
  };
}
