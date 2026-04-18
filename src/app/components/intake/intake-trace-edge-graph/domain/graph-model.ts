import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';

import { computeBranchUpstreamIds } from '../../intake-trace-branch-links';
import type { GraphModel } from '../types';

export function buildGraphModel(ids: string[]): GraphModel {
  const idSet = new Set(ids);
  const upstreamById = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  const downstreamById = new Map<string, string[]>();

  for (const id of ids) {
    const upstream = computeBranchUpstreamIds(id, QUESTION_BANK_V1_STUBS).filter(upstreamId => idSet.has(upstreamId));
    upstreamById.set(id, upstream);
    indegree.set(id, upstream.length);
    if (!downstreamById.has(id)) downstreamById.set(id, []);
  }

  for (const [to, upstream] of upstreamById.entries()) {
    for (const from of upstream) {
      const downstream = downstreamById.get(from) ?? [];
      downstream.push(to);
      downstreamById.set(from, downstream);
    }
  }

  const edges = [...upstreamById.entries()].flatMap(([to, upstream]) =>
    upstream.map(from => ({
      from,
      to,
    })),
  );

  const roots = ids.filter(id => (indegree.get(id) ?? 0) === 0).sort((a, b) => a.localeCompare(b));
  const layerById = new Map<string, number>();
  for (const id of roots) layerById.set(id, 0);

  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const currentLayer = layerById.get(current) ?? 0;
    const children = (downstreamById.get(current) ?? []).sort((a, b) => a.localeCompare(b));
    for (const child of children) {
      const nextLayer = Math.max(layerById.get(child) ?? 0, currentLayer + 1);
      layerById.set(child, nextLayer);
      indegree.set(child, (indegree.get(child) ?? 0) - 1);
      if ((indegree.get(child) ?? 0) === 0) queue.push(child);
    }
  }

  const maxKnownLayer = Math.max(0, ...layerById.values());
  for (const id of ids) {
    if (!layerById.has(id)) layerById.set(id, maxKnownLayer + 1);
  }

  const groups = new Map<number, string[]>();
  for (const id of ids) {
    const layer = layerById.get(id) ?? 0;
    const current = groups.get(layer) ?? [];
    current.push(id);
    groups.set(layer, current);
  }

  const layers = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, values]) => values.sort((a, b) => a.localeCompare(b)));

  return { edges, layers, upstreamById, downstreamById };
}

