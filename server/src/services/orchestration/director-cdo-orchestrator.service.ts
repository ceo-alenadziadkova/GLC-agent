import { z } from 'zod';

import { CdoExperimentationAgent } from '../../agents/sub/cdo/experimentation.js';
import { CdoFrictionAgent } from '../../agents/sub/cdo/friction.js';
import { CdoFunnelArchitectAgent } from '../../agents/sub/cdo/funnel-architect.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { DIRECTOR_CDO_ORCHESTRATOR_POLICY } from '../../config/director-cdo-orchestrator-policy.js';
import {
  DIRECTOR_CDO_ACCESS_AGENT_DEPTHS,
  listCdoMvpAgentIds,
  routeCdoAccessLevel,
  type CdoAccessLevel,
  type CdoMvpSubAgentId,
} from '../../config/director-cdo-routing-policy.js';
import { DIRECTOR_SUB_AGENTS } from '../../config/director-sub-agents.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { CdoExperimentationOutputSchema } from '../../schemas/sub-agents/cdo/experimentation.js';
import { CdoFrictionOutputSchema } from '../../schemas/sub-agents/cdo/friction.js';
import { CdoFunnelArchitectOutputSchema } from '../../schemas/sub-agents/cdo/funnel-architect.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import { routeCdoDeepDiveCase } from './director-cdo-router.service.js';
import { buildCdoMaterializedWaveBundle } from './director-domain-materialized-bundles.service.js';
import { buildExecutionWaves } from './sub-agent-wave-executor.js';
import { logger } from '../logger.js';

const s = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;

/**
 * CDO deep-dive: router case + deterministic multi-action wave (MVP). Used for stub domains and fallback.
 */
export function runCdoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const cdoCase = routeCdoDeepDiveCase({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cdo_orchestrator.run_stub', { domain_key: input.domainKey, cdo_case: cdoCase });
  return buildCdoMaterializedWaveBundle({
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
    cdoCase,
  });
}

export async function runCdoSubAgentOrchestrator(args: {
  auditId: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
  requestedSubAgentIds?: string[];
}): Promise<{
  access: CdoAccessLevel;
  selected_sub_agents: CdoMvpSubAgentId[];
  run_order: CdoMvpSubAgentId[];
  agent_outputs: Partial<
    Record<CdoMvpSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
  >;
  qa_block: {
    coherence: string;
    feasibility: string;
    top_3_actions: string[];
    risks: string[];
    measurement: string[];
  };
  director_bundle: DirectorWaveBundle;
}> {
  const access = routeCdoAccessLevel({ goals: args.goals, constraints: args.constraints });
  const allowed = new Set<string>(listCdoMvpAgentIds());
  const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CdoMvpSubAgentId => allowed.has(id));
  const defaultSelection = listCdoMvpAgentIds().filter(
    (id) => DIRECTOR_CDO_ACCESS_AGENT_DEPTHS[access][id] !== 'deferred',
  );
  const selected: CdoMvpSubAgentId[] = requested.length > 0 ? requested : defaultSelection;
  const effectiveSelection = expandCdoSelectionWithDependencies(selected);
  const runOrder = buildTopoOrderCdo(effectiveSelection);
  const dependencyMap = buildDependencyMapCdo(effectiveSelection);
  const runWaves = buildExecutionWaves(effectiveSelection, dependencyMap);
  const agents = buildCdoAgentRuntime(args.auditId);
  const agentOutputs: Partial<
    Record<CdoMvpSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
  > = {};
  const fallbackAgents = new Set<CdoMvpSubAgentId>();

  for (const wave of runWaves) {
    await Promise.all(
      wave.map(async (subAgentId) => {
        const runtime = agents[subAgentId];
        const depth = DIRECTOR_CDO_ACCESS_AGENT_DEPTHS[access][subAgentId];
        let parsed: unknown;
        try {
          parsed = await runtime.runSubAgent({
            context: buildCdoSubAgentContext(args.goals, args.constraints, access, args.domainKey),
            mode: access,
            maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth === 'deferred' ? 'min' : depth],
          });
        } catch (error) {
          logger.warn('director_cdo_orchestrator.sub_agent_fallback_deterministic', {
            sub_agent_id: subAgentId,
            error: error instanceof Error ? error.message : String(error),
          });
          parsed = runtime.outputSchema.parse(buildDeterministicCdoOutput(subAgentId, args.goals, args.constraints));
          fallbackAgents.add(subAgentId);
        }
        agentOutputs[subAgentId] = {
          output: parsed,
          metadata: {
            depth,
            analysis_mode: fallbackAgents.has(subAgentId) ? 'deterministic_fallback' : 'researched',
            prompt_ref: runtime.promptRef,
          },
        };
      }),
    );
  }

  return {
    access,
    selected_sub_agents: effectiveSelection,
    run_order: runOrder,
    agent_outputs: agentOutputs,
    qa_block: {
      coherence: DIRECTOR_CDO_ORCHESTRATOR_POLICY.qaBlock.coherence,
      feasibility: DIRECTOR_CDO_ORCHESTRATOR_POLICY.qaBlock.feasibility,
      top_3_actions: args.goals.slice(0, 3),
      risks: args.constraints.slice(0, 3),
      measurement: [...DIRECTOR_CDO_ORCHESTRATOR_POLICY.qaBlock.measurement],
    },
    director_bundle: buildDirectorCdoWaveBundle({
      agentOutputs,
      fallbackAgents,
      domainKey: args.domainKey,
      goals: args.goals,
      constraints: args.constraints,
      access,
    }),
  };
}

function buildCdoSubAgentContext(
  goals: string[],
  constraints: string[],
  access: CdoAccessLevel,
  domainKey: string,
): string {
  return [
    `Domain: ${domainKey}`,
    `Access level: ${access}`,
    `Goals: ${goals.join('; ') || 'n/a'}`,
    `Constraints: ${constraints.join('; ') || 'n/a'}`,
  ].join('\n');
}

function buildTopoOrderCdo(selected: CdoMvpSubAgentId[]): CdoMvpSubAgentId[] {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const done = new Set<CdoMvpSubAgentId>();
  const order: CdoMvpSubAgentId[] = [];

  const visit = (id: CdoMvpSubAgentId) => {
    if (!selectedSet.has(id) || done.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (selectedSet.has(dep as CdoMvpSubAgentId)) visit(dep as CdoMvpSubAgentId);
      }
    }
    if (done.has(id)) return;
    done.add(id);
    order.push(id);
  };

  for (const id of selected) visit(id);
  return order;
}

function expandCdoSelectionWithDependencies(selected: CdoMvpSubAgentId[]): CdoMvpSubAgentId[] {
  const allowed = new Set<CdoMvpSubAgentId>(listCdoMvpAgentIds());
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const expanded: CdoMvpSubAgentId[] = [];
  const seen = new Set<CdoMvpSubAgentId>();
  const visit = (id: CdoMvpSubAgentId) => {
    if (!allowed.has(id) || seen.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (allowed.has(dep as CdoMvpSubAgentId)) visit(dep as CdoMvpSubAgentId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of selected) visit(id);
  return expanded;
}

function buildDependencyMapCdo(selected: CdoMvpSubAgentId[]): Map<CdoMvpSubAgentId, CdoMvpSubAgentId[]> {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const dependencies = new Map<CdoMvpSubAgentId, CdoMvpSubAgentId[]>();
  for (const id of selected) {
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => selectedSet.has(dep as CdoMvpSubAgentId));
    dependencies.set(id, deps as CdoMvpSubAgentId[]);
  }
  return dependencies;
}

function buildCdoAgentRuntime(auditId: string): Record<CdoMvpSubAgentId, DirectorSubAgentBase> {
  return {
    'cdo.funnel_architect': new CdoFunnelArchitectAgent(auditId),
    'cdo.friction': new CdoFrictionAgent(auditId),
    'cdo.experimentation': new CdoExperimentationAgent(auditId),
  };
}

function readCdoOutput<T extends CdoMvpSubAgentId, TOut>(
  outputs: Partial<Record<CdoMvpSubAgentId, { output?: unknown }>>,
  id: T,
  schema: z.ZodSchema<TOut>,
): TOut | null {
  const row = outputs[id];
  const raw = row?.output;
  if (raw == null) return null;
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function buildDirectorCdoWaveBundle(input: {
  agentOutputs: Partial<Record<CdoMvpSubAgentId, { output?: unknown }>>;
  fallbackAgents: ReadonlySet<CdoMvpSubAgentId>;
  domainKey: string;
  goals: string[];
  constraints: string[];
  access: CdoAccessLevel;
}): DirectorWaveBundle {
  const actions: DirectorWaveBundle['actions'] = [];
  const funnelId = `sub_agent:cdo.funnel_architect:${input.domainKey}`;
  const frictionId = `sub_agent:cdo.friction:${input.domainKey}`;

  const funnel = readCdoOutput(input.agentOutputs, 'cdo.funnel_architect', CdoFunnelArchitectOutputSchema);
  if (funnel) {
    actions.push({
      id: funnelId,
      title: `Funnel architecture — ${funnel.funnel_summary.slice(0, 120)}`,
      description: funnel.stages.map((st) => `${st.name}: ${st.primary_metric}`).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [],
      solution_options: [
        'Option A — Fast UX: remove one step and add a single primary CTA per screen.',
        'Option B — Structural: rebuild the stage sequence with explicit entry metrics.',
        'Option C — Product: ship a guided activation path tied to one north-star event.',
      ],
      evidence: {
        observed: input.goals.slice(0, 2),
        derived: funnel.stages.map((st) => st.conversion_event),
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cdo.funnel_architect')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const friction = readCdoOutput(input.agentOutputs, 'cdo.friction', CdoFrictionOutputSchema);
  if (friction) {
    actions.push({
      id: frictionId,
      title: `Friction map — ${friction.friction_summary.slice(0, 100)}`,
      description: friction.friction_points.map((p) => `${p.label} (${p.severity})`).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: funnel ? [funnelId] : [],
      solution_options: [
        'Option A — Quick wins: fix copy, validation, and empty states on top drop-off steps.',
        'Option B — Flow redesign: consolidate decision vacuum screens into one decision point.',
        'Option C — Instrumentation: add events to validate each friction hypothesis before redesign.',
      ],
      evidence: {
        observed: friction.friction_points.map((p) => p.label),
        derived: friction.friction_points.map((p) => p.signal),
        assumed: [],
        missing: input.fallbackAgents.has('cdo.friction')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const exp = readCdoOutput(input.agentOutputs, 'cdo.experimentation', CdoExperimentationOutputSchema);
  if (exp) {
    for (const [index, ex] of exp.experiments.slice(0, 3).entries()) {
      actions.push({
        id: `sub_agent:cdo.experimentation:${input.domainKey}:exp_${index + 1}`,
        title: ex.hypothesis.slice(0, 120),
        description: `${ex.success_metric} · ${ex.decision_window_days}d window · cost ${ex.implementation_cost}`,
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: friction ? [frictionId] : funnel ? [funnelId] : [],
        solution_options: [
          'Option A — Sequential A/B on one step.',
          'Option B — Multivariate on messaging only.',
          'Option C — Time-boxed pilot with manual measurement.',
        ],
        evidence: {
          derived: [exp.experiment_backlog_summary],
          observed: [],
          assumed: [],
          missing: input.fallbackAgents.has('cdo.experimentation')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }

  if (actions.length === 0) {
    return runCdoDirectorDeepDiveOrchestrator({
      domainKey: input.domainKey,
      goals: input.goals,
      constraints: input.constraints,
    });
  }

  return {
    zones: [input.domainKey, 'ux_conversion'],
    bottlenecks: [`CDO access: ${input.access}`],
    risks: input.constraints.slice(0, 3),
    actions,
  };
}

function buildDeterministicCdoOutput(
  subAgentId: CdoMvpSubAgentId,
  goals: string[],
  constraints: string[],
): unknown {
  const g0 = goals[0] ?? 'Primary goal';
  const c0 = constraints[0] ?? 'Primary constraint';
  if (subAgentId === 'cdo.funnel_architect') {
    return CdoFunnelArchitectOutputSchema.parse({
      funnel_summary: `Deterministic funnel outline for “${g0}” while respecting “${c0}”.`,
      stages: [
        { name: 'Land', primary_metric: 'landing_to_scroll', conversion_event: 'scroll_depth_50' },
        { name: 'Activate', primary_metric: 'signup_rate', conversion_event: 'account_created' },
      ],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cdo.friction') {
    return CdoFrictionOutputSchema.parse({
      friction_summary: `Heuristic friction map for “${g0}” under “${c0}”.`,
      friction_points: [
        { label: 'Decision vacuum', signal: 'multiple competing CTAs without hierarchy', severity: 'high' },
        { label: 'Trust gap', signal: 'missing reassurance near pricing or signup', severity: 'medium' },
      ],
      analysis_mode: 'deterministic_fallback',
    });
  }
  return CdoExperimentationOutputSchema.parse({
    experiment_backlog_summary: 'Prioritized tests with explicit metrics and windows (fallback).',
    experiments: [
      {
        hypothesis: `Removing one redundant step increases activation for “${g0}”.`,
        success_metric: 'activation_rate',
        decision_window_days: 21,
        implementation_cost: 'low',
      },
      {
        hypothesis: 'Stronger proof near CTA reduces drop-off on the pricing screen.',
        success_metric: 'checkout_start_rate',
        decision_window_days: 30,
        implementation_cost: 'medium',
      },
    ],
    analysis_mode: 'deterministic_fallback',
  });
}
