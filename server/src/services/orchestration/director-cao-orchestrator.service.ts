import { z } from 'zod';

import { CaoAutomationCandidatesAgent } from '../../agents/sub/cao/automation-candidates.js';
import { CaoProcessMapAgent } from '../../agents/sub/cao/process-map.js';
import { CaoThroughputAgent } from '../../agents/sub/cao/throughput.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { DIRECTOR_CAO_ORCHESTRATOR_POLICY } from '../../config/director-cao-orchestrator-policy.js';
import {
  DIRECTOR_CAO_ACCESS_AGENT_DEPTHS,
  listCaoMvpAgentIds,
  routeCaoAccessLevel,
  type CaoMvpSubAgentId,
  type CaoZoneStage,
} from '../../config/director-cao-routing-policy.js';
import { DIRECTOR_SUB_AGENTS } from '../../config/director-sub-agents.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { CaoAutomationCandidatesOutputSchema } from '../../schemas/sub-agents/cao/automation-candidates.js';
import { CaoProcessMapOutputSchema } from '../../schemas/sub-agents/cao/process-map.js';
import { CaoThroughputOutputSchema } from '../../schemas/sub-agents/cao/throughput.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import { routeCaoDeepDive } from './director-cao-router.service.js';
import { buildCaoMaterializedWaveBundle } from './director-domain-materialized-bundles.service.js';
import { buildExecutionWaves } from './sub-agent-wave-executor.js';
import { logger } from '../logger.js';

const s = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;

/**
 * CAO deep-dive: two-stage heuristics + deterministic MVP zone wave.
 */
export function runCaoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const route = routeCaoDeepDive({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cao_orchestrator.run', {
    domain_key: input.domainKey,
    cao_zone_stage: route.zone_stage,
    cao_zone_focus: route.zone_focus,
  });
  return buildCaoMaterializedWaveBundle({
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
    route,
  });
}

export async function runCaoSubAgentOrchestrator(args: {
  auditId: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
  requestedSubAgentIds?: string[];
}): Promise<{
  zone_stage: CaoZoneStage;
  selected_sub_agents: CaoMvpSubAgentId[];
  run_order: CaoMvpSubAgentId[];
  agent_outputs: Partial<
    Record<CaoMvpSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
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
  const route = routeCaoDeepDive({ goals: args.goals, constraints: args.constraints });
  const access = routeCaoAccessLevel(route.zone_stage);
  const allowed = new Set<string>(listCaoMvpAgentIds());
  const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CaoMvpSubAgentId => allowed.has(id));
  const defaultSelection = listCaoMvpAgentIds().filter(
    (id) => DIRECTOR_CAO_ACCESS_AGENT_DEPTHS[access][id] !== 'deferred',
  );
  const selected: CaoMvpSubAgentId[] = requested.length > 0 ? requested : defaultSelection;
  const effectiveSelection = expandCaoSelectionWithDependencies(selected);
  const runOrder = buildTopoOrderCao(effectiveSelection);
  const dependencyMap = buildDependencyMapCao(effectiveSelection);
  const runWaves = buildExecutionWaves(effectiveSelection, dependencyMap);
  const agents = buildCaoAgentRuntime(args.auditId);
  const agentOutputs: Partial<
    Record<CaoMvpSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
  > = {};
  const fallbackAgents = new Set<CaoMvpSubAgentId>();

  for (const wave of runWaves) {
    await Promise.all(
      wave.map(async (subAgentId) => {
        const runtime = agents[subAgentId];
        const depth = DIRECTOR_CAO_ACCESS_AGENT_DEPTHS[access][subAgentId];
        let parsed: unknown;
        try {
          parsed = await runtime.runSubAgent({
            context: buildCaoSubAgentContext(args.goals, args.constraints, route, args.domainKey),
            mode: access,
            maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth === 'deferred' ? 'min' : depth],
          });
        } catch (error) {
          logger.warn('director_cao_orchestrator.sub_agent_fallback_deterministic', {
            sub_agent_id: subAgentId,
            error: error instanceof Error ? error.message : String(error),
          });
          parsed = runtime.outputSchema.parse(buildDeterministicCaoOutput(subAgentId, args.goals, args.constraints));
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
    zone_stage: access,
    selected_sub_agents: effectiveSelection,
    run_order: runOrder,
    agent_outputs: agentOutputs,
    qa_block: {
      coherence: DIRECTOR_CAO_ORCHESTRATOR_POLICY.qaBlock.coherence,
      feasibility: DIRECTOR_CAO_ORCHESTRATOR_POLICY.qaBlock.feasibility,
      top_3_actions: args.goals.slice(0, 3),
      risks: args.constraints.slice(0, 3),
      measurement: [...DIRECTOR_CAO_ORCHESTRATOR_POLICY.qaBlock.measurement],
    },
    director_bundle: buildDirectorCaoWaveBundle({
      agentOutputs,
      fallbackAgents,
      domainKey: args.domainKey,
      goals: args.goals,
      constraints: args.constraints,
      route,
    }),
  };
}

function buildCaoSubAgentContext(
  goals: string[],
  constraints: string[],
  route: { zone_stage: string; zone_focus: string },
  domainKey: string,
): string {
  return [
    `Domain: ${domainKey}`,
    `CAO zone_stage: ${route.zone_stage}`,
    `CAO zone_focus: ${route.zone_focus}`,
    `Goals: ${goals.join('; ') || 'n/a'}`,
    `Constraints: ${constraints.join('; ') || 'n/a'}`,
  ].join('\n');
}

function buildTopoOrderCao(selected: CaoMvpSubAgentId[]): CaoMvpSubAgentId[] {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const done = new Set<CaoMvpSubAgentId>();
  const order: CaoMvpSubAgentId[] = [];

  const visit = (id: CaoMvpSubAgentId) => {
    if (!selectedSet.has(id) || done.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (selectedSet.has(dep as CaoMvpSubAgentId)) visit(dep as CaoMvpSubAgentId);
      }
    }
    if (done.has(id)) return;
    done.add(id);
    order.push(id);
  };

  for (const id of selected) visit(id);
  return order;
}

function expandCaoSelectionWithDependencies(selected: CaoMvpSubAgentId[]): CaoMvpSubAgentId[] {
  const allowed = new Set<CaoMvpSubAgentId>(listCaoMvpAgentIds());
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const expanded: CaoMvpSubAgentId[] = [];
  const seen = new Set<CaoMvpSubAgentId>();
  const visit = (id: CaoMvpSubAgentId) => {
    if (!allowed.has(id) || seen.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (allowed.has(dep as CaoMvpSubAgentId)) visit(dep as CaoMvpSubAgentId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of selected) visit(id);
  return expanded;
}

function buildDependencyMapCao(selected: CaoMvpSubAgentId[]): Map<CaoMvpSubAgentId, CaoMvpSubAgentId[]> {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const dependencies = new Map<CaoMvpSubAgentId, CaoMvpSubAgentId[]>();
  for (const id of selected) {
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => selectedSet.has(dep as CaoMvpSubAgentId));
    dependencies.set(id, deps as CaoMvpSubAgentId[]);
  }
  return dependencies;
}

function buildCaoAgentRuntime(auditId: string): Record<CaoMvpSubAgentId, DirectorSubAgentBase> {
  return {
    'cao.process_map': new CaoProcessMapAgent(auditId),
    'cao.automation_candidates': new CaoAutomationCandidatesAgent(auditId),
    'cao.throughput': new CaoThroughputAgent(auditId),
  };
}

function readCaoOutput<T extends CaoMvpSubAgentId, TOut>(
  outputs: Partial<Record<CaoMvpSubAgentId, { output?: unknown }>>,
  id: T,
  schema: z.ZodSchema<TOut>,
): TOut | null {
  const row = outputs[id];
  const raw = row?.output;
  if (raw == null) return null;
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function buildDirectorCaoWaveBundle(input: {
  agentOutputs: Partial<Record<CaoMvpSubAgentId, { output?: unknown }>>;
  fallbackAgents: ReadonlySet<CaoMvpSubAgentId>;
  domainKey: string;
  goals: string[];
  constraints: string[];
  route: { zone_stage: string; zone_focus: string };
}): DirectorWaveBundle {
  const actions: DirectorWaveBundle['actions'] = [];
  const mapId = `sub_agent:cao.process_map:${input.domainKey}`;
  const autoId = `sub_agent:cao.automation_candidates:${input.domainKey}`;
  const thrId = `sub_agent:cao.throughput:${input.domainKey}`;

  const map = readCaoOutput(input.agentOutputs, 'cao.process_map', CaoProcessMapOutputSchema);
  if (map) {
    actions.push({
      id: mapId,
      title: `Process map — ${map.process_map_summary.slice(0, 120)}`,
      description: map.critical_paths.map((p) => `${p.name} (${p.owner} → ${p.handoff_to})`).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [],
      evidence: {
        observed: input.goals.slice(0, 2),
        derived: map.critical_paths.map((p) => p.name),
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cao.process_map')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const auto = readCaoOutput(input.agentOutputs, 'cao.automation_candidates', CaoAutomationCandidatesOutputSchema);
  if (auto) {
    actions.push({
      id: autoId,
      title: 'Automation candidates (ranked)',
      description: auto.candidate_rankings.map((c) => `${c.title}: ${c.expected_delta}`).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: map ? [mapId] : [],
      evidence: {
        derived: auto.candidate_rankings.map((c) => c.rationale.slice(0, 80)),
        observed: [],
        assumed: [],
        missing: input.fallbackAgents.has('cao.automation_candidates')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const thr = readCaoOutput(input.agentOutputs, 'cao.throughput', CaoThroughputOutputSchema);
  if (thr) {
    actions.push({
      id: thrId,
      title: 'Throughput & WIP guardrails',
      description: thr.throughput_risks.slice(0, 3).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: auto ? [autoId] : map ? [mapId] : [],
      evidence: {
        derived: thr.wip_guardrails,
        observed: [],
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cao.throughput')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  if (actions.length === 0) {
    return runCaoDirectorDeepDiveOrchestrator({
      domainKey: input.domainKey,
      goals: input.goals,
      constraints: input.constraints,
    });
  }

  return {
    zones: [input.domainKey, 'automation_processes', `cao_stage:${input.route.zone_stage}`],
    bottlenecks: [`Stage: ${input.route.zone_stage} · focus: ${input.route.zone_focus}`],
    risks: input.constraints.slice(0, 3),
    actions,
  };
}

function buildDeterministicCaoOutput(
  subAgentId: CaoMvpSubAgentId,
  goals: string[],
  constraints: string[],
): unknown {
  const g0 = goals[0] ?? 'Primary goal';
  const c0 = constraints[0] ?? 'Primary constraint';
  if (subAgentId === 'cao.process_map') {
    return CaoProcessMapOutputSchema.parse({
      process_map_summary: `Deterministic process outline for “${g0}” with constraint “${c0}”.`,
      critical_paths: [{ name: 'Intake → triage', owner: 'Ops', handoff_to: 'Delivery' }],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.automation_candidates') {
    return CaoAutomationCandidatesOutputSchema.parse({
      candidate_rankings: [
        {
          title: 'Triage automation',
          rationale: 'Reduce manual routing for stated goals.',
          expected_delta: '−30% handle time',
        },
      ],
      analysis_mode: 'deterministic_fallback',
    });
  }
  return CaoThroughputOutputSchema.parse({
    throughput_risks: ['WIP limits unclear for cross-team handoffs'],
    wip_guardrails: ['Cap parallel initiatives at three per squad'],
    analysis_mode: 'deterministic_fallback',
  });
}
