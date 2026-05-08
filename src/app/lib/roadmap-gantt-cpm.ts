import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

import { devWarn } from './dev-only-console';

const CPM_FLOAT_WARN_EPS_MS = 60_000;
const cpmFloatWarnedKeys = new Set<string>();
const cpmMissingCriticalEdgeWarnedKeys = new Set<string>();

function isRoadmapGanttCpmWarningEnabled(): boolean {
  const raw = String(import.meta.env.VITE_ROADMAP_GANTT_DEBUG_CPM_WARN ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export type RoadmapGanttCpmEdge = {
  from: string;
  to: string;
  kind: 'FS' | 'SS' | 'FF' | 'SF';
};

/** Forward/backward CPM on core tasks; returns null if the dependency subgraph has a cycle. */
export function computeCpmSchedule(
  coreTasks: ReadonlyArray<Pick<{ id: string; start_time: number; end_time: number }, 'id' | 'start_time' | 'end_time'>>,
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

export function logCpmVersusPackCriticalPath(
  pack: GlcOrchestrationPackView | null,
  cpm: Map<
    string,
    { totalFloatMs: number }
  > | null,
  dependencyEdgeKeys: ReadonlySet<string>,
): void {
  if (!cpm || !pack?.critical_path?.length) return;
  if (!import.meta.env.DEV) return;
  if (!isRoadmapGanttCpmWarningEnabled()) return;
  for (let idx = 0; idx < pack.critical_path.length; idx++) {
    const id = pack.critical_path[idx]!;
    const prev = idx > 0 ? pack.critical_path[idx - 1] : null;
    const next = idx < pack.critical_path.length - 1 ? pack.critical_path[idx + 1] : null;
    const hasAdjacentPathEdge =
      (prev != null && dependencyEdgeKeys.has(`${prev}->${id}`)) ||
      (next != null && dependencyEdgeKeys.has(`${id}->${next}`));
    if (!hasAdjacentPathEdge) {
      const missingEdgeKey = `${prev ?? 'START'}->${id}->${next ?? 'END'}`;
      if (!cpmMissingCriticalEdgeWarnedKeys.has(missingEdgeKey)) {
        cpmMissingCriticalEdgeWarnedKeys.add(missingEdgeKey);
        devWarn(`[roadmap-gantt][critical-path-edge-missing-in-timeline]`, {
          nodeId: id,
          prevCriticalNodeId: prev,
          nextCriticalNodeId: next,
        });
      }
      continue;
    }

    const row = cpm.get(id);
    if (row != null && row.totalFloatMs > CPM_FLOAT_WARN_EPS_MS) {
      const warnKey = `${id}:${row.totalFloatMs}`;
      if (cpmFloatWarnedKeys.has(warnKey)) continue;
      cpmFloatWarnedKeys.add(warnKey);
      console.warn(`[roadmap-gantt] CPM total float exceeds epsilon for server critical_path node`, {
        nodeId: id,
        totalFloatMs: row.totalFloatMs,
      });
    }
  }
}
