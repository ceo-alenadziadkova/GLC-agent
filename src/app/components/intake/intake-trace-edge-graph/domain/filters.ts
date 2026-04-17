import { collectAncestors, collectDescendants, collectDescendantsDepth } from './graph-traversal';
import { sectionKey } from './node-status';
import type { Edge } from '../types';

interface VisibleNodeSetInput {
  ids: string[];
  pathOnlyMode: boolean;
  pathSet: Set<string>;
  collapsedRoots: Set<string>;
  pinnedFocusId: string | null;
  focusId: string;
  selectedIds: Set<string>;
  upstreamById: Map<string, string[]>;
  downstreamById: Map<string, string[]>;
  downstreamDepth: number;
  collapsedSections: Set<string>;
  searchQuery: string;
  resolveLabel: (id: string) => string;
}

export function collectCollapsedHidden(
  collapsedRoots: Set<string>,
  downstreamById: Map<string, string[]>,
): Set<string> {
  const hidden = new Set<string>();
  for (const rootId of collapsedRoots) {
    const descendants = collectDescendants(rootId, downstreamById);
    for (const id of descendants) {
      if (id !== rootId) hidden.add(id);
    }
  }
  return hidden;
}

export function deriveVisibleNodeSet(input: VisibleNodeSetInput): Set<string> {
  const base = new Set(input.ids);

  if (input.pathOnlyMode) {
    for (const id of [...base]) {
      if (!input.pathSet.has(id)) base.delete(id);
    }
  }

  const collapsedHidden = collectCollapsedHidden(input.collapsedRoots, input.downstreamById);
  for (const id of collapsedHidden) base.delete(id);

  const activeFocus = input.pinnedFocusId ?? input.focusId;
  if (input.selectedIds.size > 0) {
    const allowed = new Set<string>();
    for (const selectedId of input.selectedIds) {
      for (const id of collectAncestors(selectedId, input.upstreamById)) allowed.add(id);
      for (const id of collectDescendantsDepth(selectedId, input.downstreamById, input.downstreamDepth)) {
        allowed.add(id);
      }
    }
    for (const id of [...base]) {
      if (!allowed.has(id)) base.delete(id);
    }
  } else if (activeFocus) {
    const allowed = new Set<string>([
      ...collectAncestors(activeFocus, input.upstreamById),
      ...collectDescendantsDepth(activeFocus, input.downstreamById, input.downstreamDepth),
    ]);
    for (const id of [...base]) {
      if (!allowed.has(id)) base.delete(id);
    }
  }

  for (const id of [...base]) {
    if (input.collapsedSections.has(sectionKey(id))) base.delete(id);
  }

  const normalizedQuery = input.searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    for (const id of [...base]) {
      const label = input.resolveLabel(id).toLowerCase();
      if (!id.toLowerCase().includes(normalizedQuery) && !label.includes(normalizedQuery)) base.delete(id);
    }
  }

  return base;
}

export function deriveVisibleEdges(edges: Edge[], visibleNodeSet: Set<string>): Edge[] {
  return edges.filter(edge => visibleNodeSet.has(edge.from) && visibleNodeSet.has(edge.to));
}

export function deriveVisibleLayers(layers: string[][], visibleNodeSet: Set<string>, ids: string[]): string[][] {
  const nextLayers = layers
    .map(layerIds => layerIds.filter(id => visibleNodeSet.has(id)))
    .filter(layerIds => layerIds.length > 0);
  return nextLayers.length > 0 ? nextLayers : [ids.slice(0, 1)];
}

export function buildSections(ids: string[]): Array<[string, number]> {
  const groups = new Map<string, number>();
  for (const id of ids) {
    const key = sectionKey(id);
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

