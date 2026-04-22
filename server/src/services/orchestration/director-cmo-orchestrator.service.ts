import { DIRECTOR_SUB_AGENTS, type DirectorSubAgentId } from '../../config/director-sub-agents.js';
import { routeCmoOperatingMode } from './director-cmo-router.service.js';
import { DIRECTOR_MODE_AGENT_DEPTHS, type DirectorOperatingMode } from '../../config/director-operating-modes.js';
import { DIRECTOR_CMO_ORCHESTRATOR_POLICY } from '../../config/director-cmo-orchestrator-policy.js';
import { SUB_AGENT_TOKEN_BUDGET_BY_DEPTH } from '../../config/director-orchestration-policy.js';
import { CmoAgent3Positioning } from '../../agents/sub/cmo/agent-3-positioning.js';
import { CmoAgent5ContentStrategy } from '../../agents/sub/cmo/agent-5-content-strategy.js';
import { CmoAgent9Traffic } from '../../agents/sub/cmo/agent-9-traffic.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import { CmoContentStrategyOutputSchema } from '../../schemas/sub-agents/cmo/content-strategy.js';
import { CmoPositioningOutputSchema } from '../../schemas/sub-agents/cmo/positioning.js';
import { CmoTrafficOutputSchema } from '../../schemas/sub-agents/cmo/traffic.js';
import { logger } from '../logger.js';
import { z } from 'zod';

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
  director_bundle: DirectorWaveBundle;
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
  const fallbackAgents = new Set<DirectorSubAgentId>();
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
      fallbackAgents.add(subAgentId);
    }
    agentOutputs[subAgentId] = {
      output: parsed,
      metadata: {
        depth,
        analysis_mode: fallbackAgents.has(subAgentId) ? 'deterministic_fallback' : 'researched',
        evidence_gap_reason: fallbackAgents.has(subAgentId)
          ? 'sub-agent runtime failed; deterministic fallback output used'
          : null,
        prompt_ref: runtime.promptRef,
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
    director_bundle: buildDirectorWaveBundle(agentOutputs, fallbackAgents),
  };
}

function buildDirectorWaveBundle(
  agentOutputs: Partial<Record<DirectorSubAgentId, unknown>>,
  fallbackAgents: ReadonlySet<DirectorSubAgentId>,
): DirectorWaveBundle {
  const actions: DirectorWaveBundle['actions'] = [];
  const positioning = readOutput<'cmo.agent_3_positioning', z.infer<typeof CmoPositioningOutputSchema>>(
    agentOutputs,
    'cmo.agent_3_positioning',
  );
  if (positioning) {
    const weighting = DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.positioning;
    actions.push({
      id: 'sub_agent:cmo.agent_3_positioning:positioning_statement',
      title: positioning.positioning_statement,
      description: `${positioning.core_problem} | ${positioning.unique_mechanism}`,
      impact: weighting.impact,
      effort: weighting.effort,
      risk: weighting.risk,
      urgency: weighting.urgency,
      confidence: weighting.confidence,
      dependencies: [],
      evidence: {
        observed: [positioning.target_niche],
        derived: positioning.differentiation_axes,
        assumed: [positioning.anti_positioning],
        missing: fallbackAgents.has('cmo.agent_3_positioning')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const content = readOutput<'cmo.agent_5_content_strategy', z.infer<typeof CmoContentStrategyOutputSchema>>(
    agentOutputs,
    'cmo.agent_5_content_strategy',
  );
  if (content) {
    const weighting = DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.content;
    for (const [index, idea] of content.ideas
      .slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent)
      .entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_5_content_strategy:idea_${index + 1}`,
        title: idea.title,
        description: `${idea.content_goal} | ${idea.awareness_stage} | ${idea.format}`,
        impact: weighting.impact,
        effort: weighting.effort,
        risk: weighting.risk,
        urgency: weighting.urgency,
        confidence: weighting.confidence,
        dependencies: ['sub_agent:cmo.agent_3_positioning:positioning_statement'],
        evidence: {
          observed: [],
          derived: [idea.strategic_note],
          assumed: [],
          missing: fallbackAgents.has('cmo.agent_5_content_strategy')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }

  const traffic = readOutput<'cmo.agent_9_traffic', z.infer<typeof CmoTrafficOutputSchema>>(
    agentOutputs,
    'cmo.agent_9_traffic',
  );
  if (traffic) {
    const weighting = DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.traffic;
    for (const [index, hypothesis] of traffic.hypotheses
      .slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent)
      .entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_9_traffic:hypothesis_${index + 1}`,
        title: `${hypothesis.channel}: ${hypothesis.mechanism}`,
        description: hypothesis.expected_outcome,
        impact: weighting.impact,
        effort: weighting.effort,
        risk: weighting.risk,
        urgency: weighting.urgency,
        confidence: weighting.confidence,
        dependencies: ['sub_agent:cmo.agent_5_content_strategy:idea_1'],
        evidence: {
          observed: [],
          derived: [hypothesis.expected_outcome],
          assumed: hypothesis.dependencies,
          missing: fallbackAgents.has('cmo.agent_9_traffic')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }
  return {
    actions,
    bottlenecks: [],
    risks: [],
    zones: ['marketing_utp'],
  };
}

function readOutput<TAgentId extends DirectorSubAgentId, TOutput>(
  outputs: Partial<Record<DirectorSubAgentId, unknown>>,
  id: TAgentId,
): TOutput | null {
  const row = outputs[id] as { output?: TOutput } | undefined;
  return row?.output ?? null;
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
  const goalNarrative = `Achieve goal: ${primaryGoal} with measurable business impact`;
  const constraintNarrative = `Respect constraint: ${primaryConstraint} while keeping momentum`;
  const contentGoals = ['education', 'authority', 'engagement', 'credibility', 'conversion'] as const;
  const awarenessStages = [
    'unaware',
    'problem_aware',
    'solution_aware',
    'product_aware',
    'most_aware',
  ] as const;
  const difficultyLevels = ['low', 'medium', 'high'] as const;
  const costLevels = ['free', 'low', 'medium', 'high'] as const;
  const resultTimes = ['days', 'weeks', 'months'] as const;
  if (args.subAgentId === 'cmo.agent_3_positioning') {
    return {
      core_problem: goalNarrative,
      unique_mechanism: `Mode-${args.depth} narrative framing`,
      differentiation_axes: [...DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.differentiationAxes],
      anti_positioning: constraintNarrative,
      target_niche: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.targetNiche,
      category_strategy: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.categoryStrategy,
      positioning_statement: `We help teams achieve "${primaryGoal}" while respecting "${primaryConstraint}".`,
      confidence_score: 0.35,
      evidence_basis: ['Fallback synthesis from provided goals and constraints only'],
      assumptions: ['No validated market or customer interview evidence attached'],
      open_questions: ['Which segment has proven conversion data for this positioning angle?'],
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_5_content_strategy') {
    return {
      ideas: Array.from({ length: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.contentIdeasMinCount }, (_, index) => ({
        title: `Content idea ${index + 1}`,
        content_goal: contentGoals[index % contentGoals.length],
        awareness_stage: awarenessStages[index % awarenessStages.length],
        format: index % 2 === 0 ? 'article' : 'video',
        strategic_note: `Connects to constraint: ${primaryConstraint} and advances goal execution with concrete positioning support.`,
        evidence_type: 'assumed',
        confidence_score: 0.3,
        assumptions: ['No channel-level historical performance attached in this run'],
        open_questions: ['Which audience segment shows strongest response to this angle?'],
        validation_next_step: 'Validate this idea against recent funnel and audience behavior data.',
        analysis_mode: 'deterministic_fallback',
      })),
    };
  }
  return {
    hypotheses: Array.from({ length: DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.trafficHypothesesMinCount }, (_, index) => ({
      channel: index % 2 === 0 ? 'organic_search' : 'linkedin',
      mechanism: `Acquisition hypothesis ${index + 1}`,
      expected_outcome: `Expected outcome: ${primaryGoal} with an attributable pipeline signal`,
      difficulty: difficultyLevels[index % difficultyLevels.length],
      cost: costLevels[index % costLevels.length],
      time_to_first_results: resultTimes[index % resultTimes.length],
      dependencies: [`dependency_${index + 1}`],
      priority_score: 10 - (index % 10),
      evidence_type: 'assumed',
      confidence_score: 0.3,
      assumptions: ['No validated attribution baseline attached in this run'],
      validation_next_step: 'Run a bounded experiment and compare uplift against baseline.',
      expected_outcome_metric: 'qualified_pipeline_rate',
      analysis_mode: 'deterministic_fallback',
    })),
  };
}
