import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import type { DirectorSubAgentId } from '../../config/director-sub-agents.js';
import { SUB_AGENT_TOKEN_BUDGET_BY_DEPTH } from '../../config/director-orchestration-policy.js';
import { buildExecutionWaves } from './sub-agent-wave-executor.js';
import { logger } from '../logger.js';

type DepthLevel = 'min' | 'standard' | 'max' | 'deferred';

type AgentOutputMetadata = {
  depth: string;
  analysis_mode: string;
  prompt_ref: string;
  evidence_gap_reason?: string | null;
};

export type DirectorAgentOutputRow = { output: unknown; metadata: AgentOutputMetadata };

export function buildDependencyMapFromRegistry<TId extends DirectorSubAgentId>(
  selected: readonly TId[],
  dependenciesById: ReadonlyMap<DirectorSubAgentId, readonly DirectorSubAgentId[]>,
): Map<TId, TId[]> {
  const selectedSet = new Set(selected);
  const dependencies = new Map<TId, TId[]>();
  for (const id of selected) {
    const deps = (dependenciesById.get(id) ?? []).filter((dep): dep is TId => selectedSet.has(dep as TId));
    dependencies.set(id, deps);
  }
  return dependencies;
}

export function buildTopoOrderFromRegistry<TId extends DirectorSubAgentId>(
  selected: readonly TId[],
  dependenciesById: ReadonlyMap<DirectorSubAgentId, readonly DirectorSubAgentId[]>,
): TId[] {
  const selectedSet = new Set(selected);
  const done = new Set<TId>();
  const order: TId[] = [];

  const visit = (id: TId) => {
    if (!selectedSet.has(id) || done.has(id)) return;
    const deps = dependenciesById.get(id) ?? [];
    for (const dep of deps) {
      if (selectedSet.has(dep as TId)) {
        visit(dep as TId);
      }
    }
    if (done.has(id)) return;
    done.add(id);
    order.push(id);
  };

  for (const id of selected) {
    visit(id);
  }
  return order;
}

export function expandSelectionWithDependencies<TId extends DirectorSubAgentId>(args: {
  selected: readonly TId[];
  allowed: ReadonlySet<TId>;
  dependenciesById: ReadonlyMap<DirectorSubAgentId, readonly DirectorSubAgentId[]>;
  isApplicable?: (id: TId) => boolean;
}): TId[] {
  const expanded: TId[] = [];
  const seen = new Set<TId>();
  const visit = (id: TId) => {
    if (!args.allowed.has(id) || seen.has(id)) return;
    if (args.isApplicable && !args.isApplicable(id)) return;
    const deps = args.dependenciesById.get(id) ?? [];
    for (const dep of deps) {
      if (args.allowed.has(dep as TId)) {
        visit(dep as TId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of args.selected) {
    visit(id);
  }
  return expanded;
}

export async function executeDirectorSubAgentPipeline<TId extends DirectorSubAgentId, TMode extends string>(args: {
  selected: readonly TId[];
  dependenciesById: ReadonlyMap<TId, readonly TId[]>;
  runtimesById: Record<TId, DirectorSubAgentBase>;
  context: string;
  mode: TMode;
  getDepth: (id: TId) => DepthLevel;
  buildDeterministicOutput: (id: TId) => unknown;
  fallbackLogEvent: string;
  fallbackLogContext?: Record<string, unknown>;
  includeEvidenceGapReason?: boolean;
}): Promise<{
  runOrder: TId[];
  agentOutputs: Partial<Record<TId, DirectorAgentOutputRow>>;
  fallbackAgents: ReadonlySet<TId>;
}> {
  const runOrder = buildTopoOrderFromRegistry(args.selected, args.dependenciesById as ReadonlyMap<DirectorSubAgentId, readonly DirectorSubAgentId[]>);
  const runWaves = buildExecutionWaves(args.selected, args.dependenciesById);
  const agentOutputs: Partial<Record<TId, DirectorAgentOutputRow>> = {};
  const fallbackAgents = new Set<TId>();

  for (const wave of runWaves) {
    await Promise.all(
      wave.map(async (subAgentId) => {
        const runtime = args.runtimesById[subAgentId];
        const depth = args.getDepth(subAgentId);
        let parsed: unknown;
        try {
          parsed = await runtime.runSubAgent({
            context: args.context,
            mode: args.mode,
            maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth === 'deferred' ? 'min' : depth],
          });
        } catch (error) {
          logger.warn(args.fallbackLogEvent, {
            sub_agent_id: subAgentId,
            error: error instanceof Error ? error.message : String(error),
            ...(args.fallbackLogContext ?? {}),
          });
          try {
            parsed = runtime.outputSchema.parse(args.buildDeterministicOutput(subAgentId));
            fallbackAgents.add(subAgentId);
          } catch (fallbackError) {
            logger.error('director_sub_agent_pipeline.deterministic_fallback_failed', {
              sub_agent_id: subAgentId,
              error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
              ...(args.fallbackLogContext ?? {}),
            });
            agentOutputs[subAgentId] = {
              output: null,
              metadata: {
                depth,
                analysis_mode: 'deterministic_fallback_failed',
                prompt_ref: runtime.promptRef,
                evidence_gap_reason: args.includeEvidenceGapReason
                  ? 'sub-agent runtime failed; deterministic fallback also failed'
                  : undefined,
              },
            };
            return;
          }
        }
        const isFallback = fallbackAgents.has(subAgentId);
        agentOutputs[subAgentId] = {
          output: parsed,
          metadata: {
            depth,
            analysis_mode: isFallback ? 'deterministic_fallback' : 'researched',
            prompt_ref: runtime.promptRef,
            evidence_gap_reason: args.includeEvidenceGapReason
              ? isFallback
                ? 'sub-agent runtime failed; deterministic fallback output used'
                : null
              : undefined,
          },
        };
      }),
    );
  }

  return {
    runOrder,
    agentOutputs,
    fallbackAgents,
  };
}
