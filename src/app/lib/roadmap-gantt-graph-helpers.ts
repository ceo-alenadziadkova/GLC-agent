import type { AuditTimelineDto } from '../data/api/orchestration-types';

export function buildOutgoingIncoming(deps: ReadonlyArray<{ from: string; to: string }>): {
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

export function transitivePredecessors(id: string, incoming: Map<string, string[]>): Set<string> {
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

export function transitiveSuccessors(id: string, outgoing: Map<string, string[]>): Set<string> {
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

export function buildPriorityMap(timeline: AuditTimelineDto): Map<string, '7d' | '30d'> {
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

export function buildCriticalPathEdgeKeys(criticalPath: string[]): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < criticalPath.length - 1; i++) {
    keys.add(`${criticalPath[i]}->${criticalPath[i + 1]}`);
  }
  return keys;
}
