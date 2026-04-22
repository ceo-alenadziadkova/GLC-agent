import { DIRECTOR_SUB_AGENTS, type DirectorSubAgentId } from '../../config/director-sub-agents.js';
import { routeCmoOperatingMode } from './director-cmo-router.service.js';
import { DIRECTOR_MODE_AGENT_DEPTHS, type DirectorOperatingMode } from '../../config/director-operating-modes.js';
import { DIRECTOR_CMO_ORCHESTRATOR_POLICY } from '../../config/director-cmo-orchestrator-policy.js';
import { SUB_AGENT_TOKEN_BUDGET_BY_DEPTH } from '../../config/director-orchestration-policy.js';
import { CmoAgent3Positioning } from '../../agents/sub/cmo/agent-3-positioning.js';
import { CmoAgent5ContentStrategy } from '../../agents/sub/cmo/agent-5-content-strategy.js';
import { CmoAgent9Traffic } from '../../agents/sub/cmo/agent-9-traffic.js';
import { logger } from '../logger.js';

export async function runCmoSubAgentOrchestrator(args: {
  auditId?: string;
  goals: string[];
  constraints: string[];
  requestedMode?: DirectorOperatingMode;
  requestedSubAgentIds?: string[];
}): Promise<{
  mode: DirectorOperatingMode;
  selected_sub_agents: DirectorSubAgentId[];
  run_order: DirectorSubAgentId[];
  agent_outputs: Partial<Record<DirectorSubAgentId, unknown>>;
  qa_block: {
    coherence: string;
    feasibility: string;
    top_3_actions: string[];
    risks: string[];
    measurement: string[];
  };
}> {
  const mode = routeCmoOperatingMode({
    goals: args.goals,
    constraints: args.constraints,
    requestedMode: args.requestedMode,
  });
  const allowed = DIRECTOR_SUB_AGENTS.map((a) => a.id);
  const selected =
    args.requestedSubAgentIds && args.requestedSubAgentIds.length > 0
      ? (args.requestedSubAgentIds.filter((id): id is DirectorSubAgentId => allowed.includes(id as DirectorSubAgentId)))
      : (allowed.filter((id) => DIRECTOR_MODE_AGENT_DEPTHS[mode][id] !== 'deferred') as DirectorSubAgentId[]);
  const runOrder = buildTopoOrder(selected);
  const agents = buildAgentRuntime(args.auditId ?? 'deep-dive');
  const agentOutputs: Partial<Record<DirectorSubAgentId, unknown>> = {};
  for (const subAgentId of runOrder) {
    const runtime = agents[subAgentId];
    const depth = DIRECTOR_MODE_AGENT_DEPTHS[mode][subAgentId];
    let parsed: unknown;
    try {
      parsed = await runtime.runSubAgent({
        context: buildSubAgentContext(args.goals, args.constraints),
        mode,
        maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth === 'deferred' ? 'min' : depth],
      });
    } catch (error) {
      logger.warn('director_cmo_orchestrator.sub_agent_fallback_deterministic', {
        sub_agent_id: subAgentId,
        error: error instanceof Error ? error.message : String(error),
      });
      const fallbackOutput = buildDeterministicOutput({
        subAgentId,
        goals: args.goals,
        constraints: args.constraints,
        depth,
      });
      parsed = runtime.outputSchema.parse(fallbackOutput);
    }
    agentOutputs[subAgentId] = {
      output: parsed,
      metadata: {
        depth,
        prompt_ref: runtime.buildInstructions('context', mode),
      },
    };
  }
  return {
    mode,
    selected_sub_agents: selected,
    run_order: runOrder,
    agent_outputs: agentOutputs,
    qa_block: {
      coherence: DIRECTOR_CMO_ORCHESTRATOR_POLICY.qaBlock.coherence,
      feasibility: DIRECTOR_CMO_ORCHESTRATOR_POLICY.qaBlock.feasibility,
      top_3_actions: args.goals.slice(0, 3),
      risks: args.constraints.slice(0, 3),
      measurement: [...DIRECTOR_CMO_ORCHESTRATOR_POLICY.qaBlock.measurement],
    },
  };
}

function buildSubAgentContext(goals: string[], constraints: string[]): string {
  return [
    `Goals: ${goals.join('; ') || 'n/a'}`,
    `Constraints: ${constraints.join('; ') || 'n/a'}`,
  ].join('\n');
}

function buildTopoOrder(selected: DirectorSubAgentId[]): DirectorSubAgentId[] {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const visited = new Set<DirectorSubAgentId>();
  const order: DirectorSubAgentId[] = [];

  const visit = (id: DirectorSubAgentId) => {
    if (!selectedSet.has(id) || visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (!node) return;
    for (const dep of node.depends_on) visit(dep);
    order.push(id);
  };

  for (const id of selected) visit(id);
  return order;
}

function buildAgentRuntime(auditId: string): Record<DirectorSubAgentId, CmoAgent3Positioning | CmoAgent5ContentStrategy | CmoAgent9Traffic> {
  return {
    'cmo.agent_3_positioning': new CmoAgent3Positioning(auditId),
    'cmo.agent_5_content_strategy': new CmoAgent5ContentStrategy(auditId),
    'cmo.agent_9_traffic': new CmoAgent9Traffic(auditId),
  };
}

function buildDeterministicOutput(args: {
  subAgentId: DirectorSubAgentId;
  goals: string[];
  constraints: string[];
  depth: 'min' | 'standard' | 'max' | 'deferred';
}): unknown {
  const primaryGoal = args.goals[0] ?? DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.primaryGoal;
  const primaryConstraint =
    args.constraints[0] ?? DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.primaryConstraint;
  if (args.subAgentId === 'cmo.agent_3_positioning') {
    return {
      core_problem: primaryGoal,
      unique_mechanism: `Mode-${args.depth} narrative framing`,
      differentiation_axes: [...DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.differentiationAxes],
      anti_positioning: primaryConstraint,
      target_niche: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.targetNiche,
      category_strategy: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.categoryStrategy,
      positioning_statement: `We help teams achieve "${primaryGoal}" while respecting "${primaryConstraint}".`,
    };
  }
  if (args.subAgentId === 'cmo.agent_5_content_strategy') {
    return {
      ideas: Array.from({ length: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.contentIdeasMinCount }, (_, index) => ({
        title: `Content idea ${index + 1}`,
        content_goal: primaryGoal,
        awareness_stage: index % 3 === 0 ? 'problem-aware' : index % 3 === 1 ? 'solution-aware' : 'decision-ready',
        format: index % 2 === 0 ? 'article' : 'video',
        strategic_note: `Connects to constraint: ${primaryConstraint}`,
      })),
    };
  }
  return {
    hypotheses: Array.from({ length: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.trafficHypothesesMinCount }, (_, index) => ({
      channel: index % 2 === 0 ? 'organic_search' : 'linkedin',
      mechanism: `Acquisition hypothesis ${index + 1}`,
      expected_outcome: primaryGoal,
      difficulty: index % 3 === 0 ? 'low' : index % 3 === 1 ? 'medium' : 'high',
      cost: index % 2 === 0 ? 'low' : 'medium',
      time_to_first_results: index % 2 === 0 ? '2-4 weeks' : '4-8 weeks',
      dependencies: [`dependency_${index + 1}`],
      priority_score: Math.max(1, 100 - index * 3),
    })),
  };
}
