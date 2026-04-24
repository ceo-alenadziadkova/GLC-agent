import type { DomainKey } from '@glc/intake-core';
import type { GlcDirectorOrchestrationSlice } from '../../schemas/glc-director-orchestration-slice.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
  OrchestrationInputQuality,
} from '../../types/orchestration/index.js';
import type { DirectorInputParseStatus } from './extract-glc-director-slice-from-raw-data.js';
import { mapStrategyInitiativesToActionNodes } from './map-strategy-initiative-to-action-node.js';
import { mergeOrchestrationActionInputs } from './merge-orchestration-action-inputs.js';
import { applyOrchestrationActionNodeNormalizationPipeline } from './normalize-orchestration-action-nodes-pipeline.js';
import type { StrategyInitiative } from '../../schemas/domain-output.js';

export type ActionSourceId = 'strategy' | 'director';

export interface ActionSourceContext {
  initiatives: StrategyInitiative[];
  selectedDomains: readonly DomainKey[];
  directorSlicesByDomain: ReadonlyMap<DomainKey, GlcDirectorOrchestrationSlice | null | undefined>;
  directorInputStatusByDomain: ReadonlyMap<DomainKey, DirectorInputParseStatus | undefined>;
}

export interface ActionSourceResult {
  id: ActionSourceId;
  nodes: OrchestrationActionNode[];
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
  input_quality?: OrchestrationInputQuality;
}

export interface ActionSource {
  id: ActionSourceId;
  collect(
    ctx: ActionSourceContext,
    prev: ReadonlyMap<ActionSourceId, ActionSourceResult>,
  ): ActionSourceResult;
}

const strategySource: ActionSource = {
  id: 'strategy',
  collect(ctx) {
    const mapped = mapStrategyInitiativesToActionNodes(ctx.initiatives);
    return {
      id: 'strategy',
      nodes: mapped.nodes,
      conflicts_resolved: mapped.conflicts_resolved,
    };
  },
};

const directorSource: ActionSource = {
  id: 'director',
  collect(ctx, prev) {
    const strategy = prev.get('strategy');
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategy?.nodes ?? [],
      slicesByDomain: ctx.directorSlicesByDomain,
      selectedDomains: ctx.selectedDomains,
      inputStatusByDomain: ctx.directorInputStatusByDomain,
    });
    return {
      id: 'director',
      nodes: merged.nodes,
      conflicts_resolved: merged.conflicts_resolved,
      input_quality: merged.input_quality,
    };
  },
};

export const ORCHESTRATION_ACTION_SOURCE_CHAIN: readonly ActionSource[] = [strategySource, directorSource] as const;

export function collectOrchestrationActionInputs(
  ctx: ActionSourceContext,
  chain: readonly ActionSource[] = ORCHESTRATION_ACTION_SOURCE_CHAIN,
): {
  strategy: ActionSourceResult;
  director: ActionSourceResult & { input_quality: OrchestrationInputQuality };
  combined_nodes: OrchestrationActionNode[];
  combined_conflicts_resolved: OrchestrationConflictResolvedEntry[];
} {
  const byId = new Map<ActionSourceId, ActionSourceResult>();
  for (const source of chain) {
    byId.set(source.id, source.collect(ctx, byId));
  }

  const strategy = byId.get('strategy');
  const director = byId.get('director');
  if (!strategy || !director || !director.input_quality) {
    throw new Error('Orchestration action source chain is misconfigured');
  }

  const normalized = applyOrchestrationActionNodeNormalizationPipeline(director.nodes);
  const directorNormalized = {
    ...director,
    nodes: normalized.nodes,
    conflicts_resolved: [...director.conflicts_resolved, ...normalized.conflicts_resolved],
    input_quality: director.input_quality,
  };

  return {
    strategy,
    director: directorNormalized,
    combined_nodes: normalized.nodes,
    combined_conflicts_resolved: [
      ...strategy.conflicts_resolved,
      ...directorNormalized.conflicts_resolved,
    ],
  };
}
