import dayjs from 'dayjs';

import type { AuditTimelineDto } from '../data/api/audits-orchestration';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { ROADMAP_GANTT_DAY_MS } from '../config/roadmap-gantt-view-preferences';
import { ORCHESTRATION_LANE_LABELS, type OrchestrationLaneId } from '../config/orchestration-roadmap-ui-copy.en';
import { estimatedTimelineItemWindowWithinThirds, timelineHorizonThirdBoundaries } from './time-bucket-normalization';

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

const MILESTONE_BAR_MS = 60_000;
const CANONICAL_LANE_ORDER = Object.keys(ORCHESTRATION_LANE_LABELS) as OrchestrationLaneId[];

function taskConfidenceFromPack(pack: GlcOrchestrationPackView | null, itemId: string): RoadmapGanttTaskConfidence | null {
  const raw = pack?.confidence_map?.node_confidence?.[itemId];
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return null;
}

function dependencyKindFromRelation(
  relation: AuditTimelineDto['dependencies'][number]['relation'],
): DependencyKind {
  if (relation === 'direct_blocker') return 'FS';
  if (relation === 'strong') return 'FS';
  if (relation === 'medium') return 'SS';
  return 'FF';
}

function estimateTaskWindow(
  item: AuditTimelineDto['lanes'][number]['items'][number],
  buckets: Array<{ start: number; end: number }>,
): { start: number; end: number; isEstimated: boolean } {
  return estimatedTimelineItemWindowWithinThirds(item, buckets);
}

function isOrchestrationLaneId(value: string): value is OrchestrationLaneId {
  return value in ORCHESTRATION_LANE_LABELS;
}

function buildOutgoingIncoming(deps: ReadonlyArray<{ from: string; to: string }>): {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
} {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const { from, to } of deps) {
    const outs = outgoing.get(from) ?? [];
    outs.push(to);
    outgoing.set(from, outs);
    const ins = incoming.get(to) ?? [];
    ins.push(from);
    incoming.set(to, ins);
  }
  return { outgoing, incoming };
}

function transitivePredecessors(id: string, incoming: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const stack = [...(incoming.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (result.has(cur)) continue;
    result.add(cur);
    for (const pred of incoming.get(cur) ?? []) stack.push(pred);
  }
  return result;
}

function transitiveSuccessors(id: string, outgoing: Map<string, string[]>): Set<string> {
  const result = new Set<string>();
  const stack = [...(outgoing.get(id) ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (result.has(cur)) continue;
    result.add(cur);
    for (const next of outgoing.get(cur) ?? []) stack.push(next);
  }
  return result;
}

function buildPriorityMap(timeline: AuditTimelineDto): Map<string, '7d' | '30d'> {
  const map = new Map<string, '7d' | '30d'>();
  if (timeline.top_priorities?.length) {
    for (const row of timeline.top_priorities) {
      map.set(row.action_id, row.bucket);
    }
    return map;
  }
  for (const id of timeline.top_7d ?? []) map.set(id, '7d');
  for (const id of timeline.top_30d ?? []) {
    if (!map.has(id)) map.set(id, '30d');
  }
  return map;
}

function buildCriticalPathEdgeKeys(criticalPath: string[]): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < criticalPath.length - 1; i++) {
    keys.add(`${criticalPath[i]}->${criticalPath[i + 1]}`);
  }
  return keys;
}

const CPM_FLOAT_WARN_EPS_MS = 60_000;

export type RoadmapGanttCpmEdge = { from: string; to: string; kind: DependencyKind };

/** Forward/backward CPM on core tasks; returns null if the dependency subgraph has a cycle. */
export function computeCpmSchedule(
  coreTasks: ReadonlyArray<Pick<RoadmapGanttTask, 'id' | 'start_time' | 'end_time'>>,
  dependencies: ReadonlyArray<RoadmapGanttCpmEdge>,
): Map<
  string,
  {
    earlyStartMs: number;
    earlyFinishMs: number;
    lateStartMs: number;
    lateFinishMs: number;
    totalFloatMs: number;
    freeFloatMs: number;
  }
> | null {
  const taskById = new Map(coreTasks.map((t) => [t.id, t]));
  const ids = new Set(coreTasks.map((t) => t.id));
  if (ids.size === 0) return new Map();

  const incoming: Map<string, RoadmapGanttCpmEdge[]> = new Map();
  const outgoing: Map<string, RoadmapGanttCpmEdge[]> = new Map();
  for (const id of ids) {
    incoming.set(id, []);
    outgoing.set(id, []);
  }

  for (const d of dependencies) {
    if (!ids.has(d.from) || !ids.has(d.to)) continue;
    incoming.get(d.to)!.push(d);
    outgoing.get(d.from)!.push(d);
  }

  const indegree = new Map<string, number>();
  for (const id of ids) indegree.set(id, 0);
  for (const d of dependencies) {
    if (!ids.has(d.from) || !ids.has(d.to)) continue;
    indegree.set(d.to, (indegree.get(d.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const id of ids) {
    if ((indegree.get(id) ?? 0) === 0) queue.push(id);
  }

  const topo: string[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    topo.push(u);
    for (const { to } of outgoing.get(u) ?? []) {
      const next = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, next);
      if (next === 0) queue.push(to);
    }
  }

  if (topo.length !== ids.size) return null;

  const dur = (id: string): number => {
    const t = taskById.get(id)!;
    return Math.max(1, t.end_time - t.start_time);
  };

  const ES = new Map<string, number>();
  const EF = new Map<string, number>();

  for (const id of topo) {
    const task = taskById.get(id)!;
    let es = task.start_time;
    for (const predEdge of incoming.get(id) ?? []) {
      const pred = predEdge.from;
      const predEs = ES.get(pred)!;
      const predEf = EF.get(pred)!;
      const dj = dur(id);
      switch (predEdge.kind) {
        case 'FS':
          es = Math.max(es, predEf);
          break;
        case 'SS':
          es = Math.max(es, predEs);
          break;
        case 'FF':
          es = Math.max(es, predEf - dj);
          break;
        case 'SF':
          es = Math.max(es, predEs - dj);
          break;
        default:
          es = Math.max(es, predEf);
      }
    }
    ES.set(id, es);
    EF.set(id, es + dur(id));
  }

  const projectEnd = Math.max(...[...ids].map((id) => EF.get(id)!));

  const LF = new Map<string, number>();
  const LS = new Map<string, number>();
  for (const id of ids) LF.set(id, projectEnd);

  for (let idx = topo.length - 1; idx >= 0; idx--) {
    const j = topo[idx]!;
    const lsj = LF.get(j)! - dur(j);
    LS.set(j, lsj);
    const lfj = LF.get(j)!;
    for (const predEdge of incoming.get(j) ?? []) {
      const i = predEdge.from;
      const di = dur(i);
      switch (predEdge.kind) {
        case 'FS':
          LF.set(i, Math.min(LF.get(i)!, lsj));
          break;
        case 'SS':
          LF.set(i, Math.min(LF.get(i)!, lsj + di));
          break;
        case 'FF':
          LF.set(i, Math.min(LF.get(i)!, lfj));
          break;
        case 'SF':
          LF.set(i, Math.min(LF.get(i)!, lfj + di));
          break;
        default:
          LF.set(i, Math.min(LF.get(i)!, lsj));
      }
    }
  }

  for (const id of ids) {
    LS.set(id, LF.get(id)! - dur(id));
  }

  const totalFloat = new Map<string, number>();
  for (const id of ids) {
    totalFloat.set(id, Math.max(0, LS.get(id)! - ES.get(id)!));
  }

  const freeFloat = new Map<string, number>();
  for (const id of ids) {
    const outs = outgoing.get(id) ?? [];
    const tf = totalFloat.get(id)!;
    if (outs.length === 0) {
      freeFloat.set(id, tf);
      continue;
    }
    const esi = ES.get(id)!;
    const efi = EF.get(id)!;
    let minSlack = Infinity;
    for (const edge of outs) {
      const j = edge.to;
      const esj = ES.get(j)!;
      const efj = EF.get(j)!;
      let slack = Infinity;
      switch (edge.kind) {
        case 'FS':
          slack = esj - efi;
          break;
        case 'SS':
          slack = esj - esi;
          break;
        case 'FF':
          slack = efj - efi;
          break;
        case 'SF':
          slack = efj - esi;
          break;
        default:
          slack = esj - efi;
      }
      minSlack = Math.min(minSlack, slack);
    }
    freeFloat.set(id, Math.max(0, Math.min(minSlack === Infinity ? tf : minSlack, tf)));
  }

  const result = new Map<
    string,
    {
      earlyStartMs: number;
      earlyFinishMs: number;
      lateStartMs: number;
      lateFinishMs: number;
      totalFloatMs: number;
      freeFloatMs: number;
    }
  >();
  for (const id of ids) {
    result.set(id, {
      earlyStartMs: ES.get(id)!,
      earlyFinishMs: EF.get(id)!,
      lateStartMs: LS.get(id)!,
      lateFinishMs: LF.get(id)!,
      totalFloatMs: totalFloat.get(id)!,
      freeFloatMs: freeFloat.get(id)!,
    });
  }
  return result;
}

function logCpmVersusPackCriticalPath(
  pack: GlcOrchestrationPackView | null,
  cpm: Map<
    string,
    { totalFloatMs: number }
  > | null,
): void {
  if (!cpm || !pack?.critical_path?.length) return;
  if (!import.meta.env.DEV) return;
  for (const id of pack.critical_path) {
    const row = cpm.get(id);
    if (row != null && row.totalFloatMs > CPM_FLOAT_WARN_EPS_MS) {
      // eslint-disable-next-line no-console -- intentional diagnostics
      console.warn(`[roadmap-gantt] CPM total float exceeds epsilon for server critical_path node`, {
        nodeId: id,
        totalFloatMs: row.totalFloatMs,
      });
    }
  }
}

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
  logCpmVersusPackCriticalPath(pack, cpmMap);

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
