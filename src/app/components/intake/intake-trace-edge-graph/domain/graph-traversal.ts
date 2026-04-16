export function collectAncestors(startId: string, upstreamById: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const parentId of upstreamById.get(current) ?? []) stack.push(parentId);
  }
  return seen;
}

export function collectDescendants(startId: string, downstreamById: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const childId of downstreamById.get(current) ?? []) stack.push(childId);
  }
  return seen;
}

export function collectDescendantsDepth(
  startId: string,
  downstreamById: Map<string, string[]>,
  depth: number,
): Set<string> {
  const seen = new Set<string>([startId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= depth) continue;
    for (const childId of downstreamById.get(current.id) ?? []) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      queue.push({ id: childId, depth: current.depth + 1 });
    }
  }
  return seen;
}

