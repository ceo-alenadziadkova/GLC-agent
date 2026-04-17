/**
 * Longest path length from root along structure edges to any target id (BFS-style relaxation).
 */
export function longestStructurePathToTargets(
  rootId: string,
  edgeList: { source: string; target: string }[],
  targetIds: Set<string>,
): number {
  const depth = new Map<string, number>();
  depth.set(rootId, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edgeList) {
      const pd = depth.get(e.source);
      if (pd === undefined) continue;
      const next = pd + 1;
      const cur = depth.get(e.target);
      if (cur === undefined || next > cur) {
        depth.set(e.target, next);
        changed = true;
      }
    }
  }
  let max = 0;
  for (const id of targetIds) max = Math.max(max, depth.get(id) ?? 0);
  return max;
}
