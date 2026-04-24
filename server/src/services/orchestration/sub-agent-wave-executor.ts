import type { DirectorSubAgentId } from '../../config/director-sub-agents.js';

export function buildExecutionWaves<TId extends DirectorSubAgentId>(
  selected: readonly TId[],
  dependenciesById: ReadonlyMap<TId, readonly TId[]>,
): TId[][] {
  const selectedSet = new Set(selected);
  const inDegree = new Map<TId, number>();
  const children = new Map<TId, TId[]>();
  for (const id of selected) {
    inDegree.set(id, 0);
    children.set(id, []);
  }
  for (const id of selected) {
    const deps = dependenciesById.get(id) ?? [];
    const filteredDeps = deps.filter((dep) => selectedSet.has(dep));
    inDegree.set(id, filteredDeps.length);
    for (const dep of filteredDeps) {
      const rows = children.get(dep) ?? [];
      rows.push(id);
      children.set(dep, rows);
    }
  }

  const waves: TId[][] = [];
  let frontier = selected.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const visited = new Set<TId>();
  while (frontier.length > 0) {
    waves.push(frontier);
    const next: TId[] = [];
    for (const id of frontier) {
      visited.add(id);
      for (const child of children.get(id) ?? []) {
        const remain = (inDegree.get(child) ?? 0) - 1;
        inDegree.set(child, remain);
        if (remain === 0) {
          next.push(child);
        }
      }
    }
    frontier = next;
  }

  for (const id of selected) {
    if (!visited.has(id)) {
      waves.push([id]);
    }
  }
  return waves;
}
