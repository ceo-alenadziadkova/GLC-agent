import type { IntakeQuestionStub } from '@glc/intake-core';
import { computeBranchUpstreamIds } from '../intake-branch-topology';

function longestBranchPathDepth(
  ids: string[],
  edgeList: { from: string; to: string }[],
): number {
  const depth = new Map<string, number>();
  for (const id of ids) depth.set(id, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edgeList) {
      const pd = depth.get(e.from) ?? 0;
      const next = pd + 1;
      const cur = depth.get(e.to) ?? 0;
      if (next > cur) {
        depth.set(e.to, next);
        changed = true;
      }
    }
  }
  let max = 0;
  for (const id of ids) max = Math.max(max, depth.get(id) ?? 0);
  return max;
}

export function computeBranchTopology(stubs: readonly IntakeQuestionStub[]): {
  edges: { from: string; to: string; condition?: string }[];
  maxDepth: number;
  rootCount: number;
  leafCount: number;
} {
  const ids = stubs.map(s => s.id);
  const idSet = new Set(ids);
  const downstream = new Map<string, string[]>();
  for (const id of ids) downstream.set(id, []);

  const edges: { from: string; to: string; condition?: string }[] = [];
  for (const stub of stubs) {
    const ups = computeBranchUpstreamIds(stub.id, stubs).filter(u => idSet.has(u));
    for (const from of ups) {
      edges.push({ from, to: stub.id, condition: stub.branchCondition });
      downstream.get(from)!.push(stub.id);
    }
  }

  const indegree = new Map<string, number>();
  for (const id of ids) indegree.set(id, computeBranchUpstreamIds(id, stubs).filter(u => idSet.has(u)).length);
  const roots = ids.filter(id => (indegree.get(id) ?? 0) === 0);
  const maxDepth = longestBranchPathDepth(
    ids,
    edges.map(({ from, to }) => ({ from, to })),
  );
  const leaves = ids.filter(id => (downstream.get(id) ?? []).length === 0);

  return {
    edges,
    maxDepth,
    rootCount: roots.length,
    leafCount: leaves.length,
  };
}

/**
 * Multiset keys for branch edges (`from` → `to` question ids) — same canon as Studio payload `branchEdges`.
 */
export function canonBranchEdgeKeySet(stubs: readonly IntakeQuestionStub[]): Set<string> {
  const { edges } = computeBranchTopology(stubs);
  return new Set(edges.map(e => `${e.from}\t${e.to}`));
}
