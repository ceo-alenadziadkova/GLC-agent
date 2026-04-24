import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';

function reorderBySelection(ids: string[], selected: Set<string>): string[] {
  if (selected.size === 0) return ids;
  const selectedItems: string[] = [];
  const rest: string[] = [];
  for (const id of ids) {
    if (selected.has(id)) selectedItems.push(id);
    else rest.push(id);
  }
  return [...selectedItems, ...rest];
}

export function applySelectedActionHint(pack: GlcOrchestrationPack, selectedActionIds: string[]): GlcOrchestrationPack {
  const selected = new Set(selectedActionIds);
  if (selected.size === 0) return pack;
  return {
    ...pack,
    critical_path: reorderBySelection(pack.critical_path, selected),
    top_7d: pack.top_7d ? reorderBySelection(pack.top_7d, selected) : pack.top_7d,
    top_30d: pack.top_30d ? reorderBySelection(pack.top_30d, selected) : pack.top_30d,
    top_actions: pack.top_actions
      ? {
          top_actions_7d: reorderBySelection(pack.top_actions.top_actions_7d, selected),
          top_actions_30d: reorderBySelection(pack.top_actions.top_actions_30d, selected),
        }
      : pack.top_actions,
    lanes: Object.fromEntries(
      Object.entries(pack.lanes).map(([laneId, nodeIds]) => [laneId, reorderBySelection(nodeIds, selected)]),
    ) as GlcOrchestrationPack['lanes'],
  };
}
