import { DIRECTOR_SUB_AGENTS, type DirectorSubAgentId } from '../../config/director-sub-agents.js';
import { routeCmoOperatingMode } from './director-cmo-router.service.js';
import { DIRECTOR_MODE_AGENT_DEPTHS, type DirectorOperatingMode } from '../../config/director-operating-modes.js';
import { DIRECTOR_CMO_ORCHESTRATOR_POLICY } from '../../config/director-cmo-orchestrator-policy.js';
import { SUB_AGENT_TOKEN_BUDGET_BY_DEPTH } from '../../config/director-orchestration-policy.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { CmoAgent1Market } from '../../agents/sub/cmo/agent-1-market.js';
import { CmoAgent2AwarenessLadder } from '../../agents/sub/cmo/agent-2-awareness-ladder.js';
import { CmoAgent3Positioning } from '../../agents/sub/cmo/agent-3-positioning.js';
import { CmoAgent4Voice } from '../../agents/sub/cmo/agent-4-voice.js';
import { CmoAgent5ContentStrategy } from '../../agents/sub/cmo/agent-5-content-strategy.js';
import { CmoAgent6Viral } from '../../agents/sub/cmo/agent-6-viral.js';
import { CmoAgent7Storytelling } from '../../agents/sub/cmo/agent-7-storytelling.js';
import { CmoAgent8ReadyPosts } from '../../agents/sub/cmo/agent-8-ready-posts.js';
import { CmoAgent9Traffic } from '../../agents/sub/cmo/agent-9-traffic.js';
import { CmoAgent10Distribution } from '../../agents/sub/cmo/agent-10-distribution.js';
import { CmoAgent11FounderBrand } from '../../agents/sub/cmo/agent-11-founder-brand.js';
import { CmoAgent12GrowthLoops } from '../../agents/sub/cmo/agent-12-growth-loops.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import { CmoAwarenessLadderOutputSchema } from '../../schemas/sub-agents/cmo/awareness-ladder.js';
import { CmoContentStrategyOutputSchema } from '../../schemas/sub-agents/cmo/content-strategy.js';
import { CmoDistributionOutputSchema } from '../../schemas/sub-agents/cmo/distribution.js';
import { CmoFounderBrandOutputSchema } from '../../schemas/sub-agents/cmo/founder-brand.js';
import { CmoGrowthLoopsOutputSchema } from '../../schemas/sub-agents/cmo/growth-loops.js';
import { CmoMarketOutputSchema } from '../../schemas/sub-agents/cmo/market.js';
import { CmoPositioningOutputSchema } from '../../schemas/sub-agents/cmo/positioning.js';
import { CmoReadyPostsOutputSchema } from '../../schemas/sub-agents/cmo/ready-posts.js';
import { CmoStorytellingOutputSchema } from '../../schemas/sub-agents/cmo/storytelling.js';
import { CmoTrafficOutputSchema } from '../../schemas/sub-agents/cmo/traffic.js';
import { CmoViralOutputSchema } from '../../schemas/sub-agents/cmo/viral.js';
import { CmoVoiceOutputSchema } from '../../schemas/sub-agents/cmo/voice.js';
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
  const wExtra = DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.content;
  const m1 = readOutput<'cmo.agent_1_market', z.infer<typeof CmoMarketOutputSchema>>(agentOutputs, 'cmo.agent_1_market');
  if (m1) {
    actions.push({
      id: 'sub_agent:cmo.agent_1_market:thesis',
      title: m1.market_thesis.slice(0, 140),
      description: m1.competitor_alternatives.map((a) => `${a.name}: ${a.differentiator}`).join(' | '),
      impact: wExtra.impact,
      effort: wExtra.effort,
      risk: wExtra.risk,
      urgency: wExtra.urgency,
      confidence: wExtra.confidence,
      dependencies: [],
      evidence: {
        observed: m1.competitor_alternatives.map((a) => a.name),
        derived: m1.market_risks,
        assumed: m1.open_questions,
        missing: fallbackAgents.has('cmo.agent_1_market')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }
  const m2 = readOutput<'cmo.agent_2_awareness_ladder', z.infer<typeof CmoAwarenessLadderOutputSchema>>(
    agentOutputs,
    'cmo.agent_2_awareness_ladder',
  );
  if (m2) {
    const top = m2.ladder[0];
    if (top) {
      actions.push({
        id: 'sub_agent:cmo.agent_2_awareness_ladder:top',
        title: `Awareness: ${top.stage}`,
        description: top.insight,
        impact: wExtra.impact,
        effort: wExtra.effort,
        risk: wExtra.risk,
        urgency: wExtra.urgency,
        confidence: wExtra.confidence,
        dependencies: [],
        evidence: {
          observed: m2.ladder.map((r) => r.stage),
          derived: [top.next_best_message],
          assumed: [],
          missing: fallbackAgents.has('cmo.agent_2_awareness_ladder')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }
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

  const voice = readOutput<'cmo.agent_4_voice', z.infer<typeof CmoVoiceOutputSchema>>(agentOutputs, 'cmo.agent_4_voice');
  if (voice) {
    actions.push({
      id: 'sub_agent:cmo.agent_4_voice:principles',
      title: `Voice: ${voice.tone_label}`,
      description: voice.voice_principles.join(' · '),
      impact: wExtra.impact,
      effort: wExtra.effort,
      risk: wExtra.risk,
      urgency: wExtra.urgency,
      confidence: wExtra.confidence,
      dependencies: ['sub_agent:cmo.agent_3_positioning:positioning_statement'],
      evidence: {
        observed: voice.voice_principles,
        derived: voice.vocabulary_do,
        assumed: voice.forbidden_phrases,
        missing: fallbackAgents.has('cmo.agent_4_voice')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const viral = readOutput<'cmo.agent_6_viral', z.infer<typeof CmoViralOutputSchema>>(agentOutputs, 'cmo.agent_6_viral');
  if (viral) {
    for (const [index, c] of viral.concepts.slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent).entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_6_viral:concept_${index + 1}`,
        title: c.title,
        description: `${c.hook_pattern} | ${c.target_stage}`,
        impact: wExtra.impact,
        effort: wExtra.effort,
        risk: wExtra.risk,
        urgency: wExtra.urgency,
        confidence: wExtra.confidence,
        dependencies: ['sub_agent:cmo.agent_3_positioning:positioning_statement'],
        evidence: {
          observed: [],
          derived: [c.hook_pattern],
          assumed: [`confidence: ${String(c.confidence_score)}`],
          missing: fallbackAgents.has('cmo.agent_6_viral')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }

  const story = readOutput<'cmo.agent_7_storytelling', z.infer<typeof CmoStorytellingOutputSchema>>(
    agentOutputs,
    'cmo.agent_7_storytelling',
  );
  if (story) {
    for (const [index, f] of story.frameworks
      .slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent)
      .entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_7_storytelling:framework_${index + 1}`,
        title: f.name,
        description: f.when_to_use,
        impact: wExtra.impact,
        effort: wExtra.effort,
        risk: wExtra.risk,
        urgency: wExtra.urgency,
        confidence: wExtra.confidence,
        dependencies: ['sub_agent:cmo.agent_3_positioning:positioning_statement'],
        evidence: {
          observed: [],
          derived: [f.example_hook],
          assumed: [],
          missing: fallbackAgents.has('cmo.agent_7_storytelling')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }

  const ready = readOutput<'cmo.agent_8_ready_posts', z.infer<typeof CmoReadyPostsOutputSchema>>(
    agentOutputs,
    'cmo.agent_8_ready_posts',
  );
  if (ready) {
    for (const [index, p] of ready.posts
      .slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent)
      .entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_8_ready_posts:post_${index + 1}`,
        title: p.title,
        description: `${p.channel} | ${p.cta}`,
        impact: wExtra.impact,
        effort: wExtra.effort,
        risk: wExtra.risk,
        urgency: wExtra.urgency,
        confidence: wExtra.confidence,
        dependencies: ['sub_agent:cmo.agent_5_content_strategy:idea_1'],
        evidence: {
          observed: [p.channel],
          derived: [p.body_outline],
          assumed: [],
          missing: fallbackAgents.has('cmo.agent_8_ready_posts')
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

  const dist = readOutput<'cmo.agent_10_distribution', z.infer<typeof CmoDistributionOutputSchema>>(
    agentOutputs,
    'cmo.agent_10_distribution',
  );
  if (dist) {
    for (const [index, row] of dist.system_map
      .slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent)
      .entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_10_distribution:row_${index + 1}`,
        title: `${row.channel} — ${row.role}`,
        description: `Priority ${row.priority_score}`,
        impact: wExtra.impact,
        effort: wExtra.effort,
        risk: wExtra.risk,
        urgency: wExtra.urgency,
        confidence: wExtra.confidence,
        dependencies: ['sub_agent:cmo.agent_9_traffic:hypothesis_1'],
        evidence: {
          observed: [row.channel],
          derived: [row.role],
          assumed: [],
          missing: fallbackAgents.has('cmo.agent_10_distribution')
            ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
            : [],
        },
      });
    }
  }

  const founder = readOutput<'cmo.agent_11_founder_brand', z.infer<typeof CmoFounderBrandOutputSchema>>(
    agentOutputs,
    'cmo.agent_11_founder_brand',
  );
  if (founder) {
    actions.push({
      id: 'sub_agent:cmo.agent_11_founder_brand:pillars',
      title: `Founder narrative (${founder.narrative_pillars[0] ?? 'pillar'})`,
      description: founder.visibility_tactics.join(' | '),
      impact: wExtra.impact,
      effort: wExtra.effort,
      risk: wExtra.risk,
      urgency: wExtra.urgency,
      confidence: wExtra.confidence,
      dependencies: [],
      evidence: {
        observed: founder.narrative_pillars,
        derived: founder.visibility_tactics,
        assumed: founder.proof_assets,
        missing: fallbackAgents.has('cmo.agent_11_founder_brand')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const loops = readOutput<'cmo.agent_12_growth_loops', z.infer<typeof CmoGrowthLoopsOutputSchema>>(
    agentOutputs,
    'cmo.agent_12_growth_loops',
  );
  if (loops) {
    for (const [index, loop] of loops.loops
      .slice(0, DIRECTOR_CMO_ORCHESTRATOR_POLICY.actionMaterialization.maxActionsPerSubAgent)
      .entries()) {
      actions.push({
        id: `sub_agent:cmo.agent_12_growth_loops:loop_${index + 1}`,
        title: loop.name,
        description: `${loop.loop_type} — ${loop.compounding_action}`,
        impact: wExtra.impact,
        effort: wExtra.effort,
        risk: wExtra.risk,
        urgency: wExtra.urgency,
        confidence: wExtra.confidence,
        dependencies: ['sub_agent:cmo.agent_9_traffic:hypothesis_1'],
        evidence: {
          observed: [loop.north_star_metric],
          derived: [loop.compounding_action],
          assumed: [],
          missing: fallbackAgents.has('cmo.agent_12_growth_loops')
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
  const done = new Set<DirectorSubAgentId>();
  const order: DirectorSubAgentId[] = [];

  const visit = (id: DirectorSubAgentId) => {
    if (!selectedSet.has(id) || done.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (selectedSet.has(dep)) visit(dep);
      }
    }
    if (done.has(id)) return;
    done.add(id);
    order.push(id);
  };

  for (const id of selected) visit(id);
  return order;
}

function buildAgentRuntime(auditId: string): Record<DirectorSubAgentId, DirectorSubAgentBase> {
  return {
    'cmo.agent_1_market': new CmoAgent1Market(auditId),
    'cmo.agent_2_awareness_ladder': new CmoAgent2AwarenessLadder(auditId),
    'cmo.agent_3_positioning': new CmoAgent3Positioning(auditId),
    'cmo.agent_4_voice': new CmoAgent4Voice(auditId),
    'cmo.agent_5_content_strategy': new CmoAgent5ContentStrategy(auditId),
    'cmo.agent_6_viral': new CmoAgent6Viral(auditId),
    'cmo.agent_7_storytelling': new CmoAgent7Storytelling(auditId),
    'cmo.agent_8_ready_posts': new CmoAgent8ReadyPosts(auditId),
    'cmo.agent_9_traffic': new CmoAgent9Traffic(auditId),
    'cmo.agent_10_distribution': new CmoAgent10Distribution(auditId),
    'cmo.agent_11_founder_brand': new CmoAgent11FounderBrand(auditId),
    'cmo.agent_12_growth_loops': new CmoAgent12GrowthLoops(auditId),
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
  if (args.subAgentId === 'cmo.agent_1_market') {
    return {
      market_thesis: `Address “${primaryGoal}” in the current market, while navigating “${primaryConstraint}”.`,
      competitor_alternatives: [
        { name: 'Status quo (manual or fragmented tools)', differentiator: 'Lacks a unified audit-to-roadmap spine for this ICP' },
        { name: 'Generic marketing suites', differentiator: 'Not structured around the execution plan the buyer already approved' },
      ],
      market_risks: ['Win/loss and attribution evidence not attached in this run'],
      open_questions: ['Which 2–3 named alternatives are consistently evaluated in this buying motion?'],
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_2_awareness_ladder') {
    return {
      ladder: [
        { stage: 'unaware', insight: `What problem space matters for “${primaryGoal}”?`, next_best_message: 'Name the business outcome, not the feature.' },
        { stage: 'problem_aware', insight: 'Buyer recognizes pain but not a crisp evaluation frame.', next_best_message: 'Contrast status quo cost vs measurable upside.' },
        { stage: 'solution_aware', insight: 'Buyer is comparing options; risk is “nice demo, unclear rollout”.', next_best_message: 'Prove sequencing and proof density.' },
        { stage: 'most_aware', insight: 'Buyer needs de-risking and a concrete next step.', next_best_message: 'Offer a bounded pilot with success criteria.' },
      ],
      analysis_mode: 'deterministic_fallback',
    };
  }
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
  if (args.subAgentId === 'cmo.agent_4_voice') {
    return {
      tone_label: 'Credible, direct, outcome-oriented',
      voice_principles: [
        'Lead with the customer’s metric and time horizon',
        'Name trade-offs explicitly; avoid superlatives',
        'Falsifiable claims; flag missing evidence',
        'ICP-tight language; avoid “everyone” positioning',
        'Respect the stated execution constraint in every CTA',
      ],
      forbidden_phrases: ['revolutionary', 'world-class', 'next-gen', 'cutting-edge', 'unique'],
      vocabulary_do: ['pipeline', 'proof', 'trade-off', 'next step', 'measurement'],
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
  if (args.subAgentId === 'cmo.agent_6_viral') {
    return {
      concepts: Array.from({ length: 5 }, (_, index) => ({
        title: `Attention concept ${index + 1} for: ${primaryGoal}`,
        hook_pattern: 'Before/after with an explicit metric and time window',
        target_stage: awarenessStages[index % awarenessStages.length],
        confidence_score: 0.28,
      })),
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_7_storytelling') {
    return {
      frameworks: [
        {
          name: 'Customer hero arc',
          when_to_use: 'You have a credible before/after with measurable change',
          example_hook: 'From a fragmented funnel review to a single execution spine in 30 days',
        },
        {
          name: 'Contrast / enemy',
          when_to_use: 'Status quo is expensive or risky in a way buyers already feel',
          example_hook: 'Tool sprawl vs one audit spine the team can actually ship against',
        },
      ],
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_8_ready_posts') {
    return {
      posts: [
        {
          title: `How we support “${primaryGoal}” without blowing up the stack`,
          channel: 'linkedin',
          body_outline: 'Hook with outcome → 3 proof bullets (honest) → CTA to a fit check',
          cta: 'Book a 20-minute fit conversation',
        },
        {
          title: 'The constraint nobody labels (but buyers feel)',
          channel: 'email',
          body_outline: `Name “${primaryConstraint}” as the drag → show path → CTA to pilot`,
          cta: 'Get the 2-week pilot outline',
        },
      ],
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_9_traffic') {
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
  if (args.subAgentId === 'cmo.agent_10_distribution') {
    return {
      system_map: [
        { channel: 'linkedin', role: 'Founder/operator POV and ICP-matched follow-ups', priority_score: 8 },
        { channel: 'email', role: 'Nurture with proof and rollout clarity', priority_score: 6 },
      ],
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_11_founder_brand') {
    return {
      narrative_pillars: ['Clarity of outcome', 'Engineering truth over hype', 'Customer-led proof'],
      visibility_tactics: ['Short-form “what changed, what stayed risky”', 'One flagship story with named constraints'],
      proof_assets: ['Add customer consents and metrics when available; placeholders only in fallback'],
      analysis_mode: 'deterministic_fallback',
    };
  }
  if (args.subAgentId === 'cmo.agent_12_growth_loops') {
    return {
      loops: [
        {
          name: 'Audit → roadmap pack → next-step execution',
          loop_type: 'activation',
          compounding_action: 'Refresh roadmap + intake quarterly to prevent drift',
          north_star_metric: 'qualified_opportunities_created',
        },
        {
          name: 'Content → pipeline signal',
          loop_type: 'acquisition',
          compounding_action: 'Double down on hooks that show pipeline lift, not vanity reach',
          north_star_metric: 'qualified_pipeline_rate',
        },
      ],
      analysis_mode: 'deterministic_fallback',
    };
  }
  throw new Error(`buildDeterministicOutput: unknown sub-agent ${args.subAgentId}`);
}
