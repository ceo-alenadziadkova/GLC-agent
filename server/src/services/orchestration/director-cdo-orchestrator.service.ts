import { z } from 'zod';

import { CdoAnalyticsTrackingAgent } from '../../agents/sub/cdo/analytics-tracking.js';
import { CdoBehavioralPsychologyAgent } from '../../agents/sub/cdo/behavioral-psychology.js';
import { CdoBenchmarkPatternsAgent } from '../../agents/sub/cdo/benchmark-patterns.js';
import { CdoCopyMicrocopyAgent } from '../../agents/sub/cdo/copy-microcopy.js';
import { CdoExperimentationAgent } from '../../agents/sub/cdo/experimentation.js';
import { CdoFrictionAgent } from '../../agents/sub/cdo/friction.js';
import { CdoFunnelArchitectAgent } from '../../agents/sub/cdo/funnel-architect.js';
import { CdoTrustCredibilityAgent } from '../../agents/sub/cdo/trust-credibility.js';
import { CdoUiConsistencyAgent } from '../../agents/sub/cdo/ui-consistency.js';
import { CdoUserIntentAgent } from '../../agents/sub/cdo/user-intent.js';
import { CdoValuePropositionAgent } from '../../agents/sub/cdo/value-proposition.js';
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
import { CdoAnalyticsTrackingOutputSchema } from '../../schemas/sub-agents/cdo/analytics-tracking.js';
import { CdoBehavioralPsychologyOutputSchema } from '../../schemas/sub-agents/cdo/behavioral-psychology.js';
import { CdoBenchmarkPatternsOutputSchema } from '../../schemas/sub-agents/cdo/benchmark-patterns.js';
import { CdoCopyMicrocopyOutputSchema } from '../../schemas/sub-agents/cdo/copy-microcopy.js';
import { CdoTrustCredibilityOutputSchema } from '../../schemas/sub-agents/cdo/trust-credibility.js';
import { CdoUiConsistencyOutputSchema } from '../../schemas/sub-agents/cdo/ui-consistency.js';
import { CdoUserIntentOutputSchema } from '../../schemas/sub-agents/cdo/user-intent.js';
import { CdoValuePropositionOutputSchema } from '../../schemas/sub-agents/cdo/value-proposition.js';
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
    'cdo.user_intent': new CdoUserIntentAgent(auditId),
    'cdo.funnel_architect': new CdoFunnelArchitectAgent(auditId),
    'cdo.value_proposition': new CdoValuePropositionAgent(auditId),
    'cdo.friction': new CdoFrictionAgent(auditId),
    'cdo.trust_credibility': new CdoTrustCredibilityAgent(auditId),
    'cdo.behavioral_psychology': new CdoBehavioralPsychologyAgent(auditId),
    'cdo.ui_consistency': new CdoUiConsistencyAgent(auditId),
    'cdo.copy_microcopy': new CdoCopyMicrocopyAgent(auditId),
    'cdo.experimentation': new CdoExperimentationAgent(auditId),
    'cdo.analytics_tracking': new CdoAnalyticsTrackingAgent(auditId),
    'cdo.benchmark_patterns': new CdoBenchmarkPatternsAgent(auditId),
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

  const appendCompactAction = (subAgentId: CdoMvpSubAgentId, summary: string, details: string[], dependencies: string[]) => {
    actions.push({
      id: `sub_agent:${subAgentId}:${input.domainKey}`,
      title: `${subAgentId.replace('cdo.', 'CDO ')} — ${summary.slice(0, 100)}`,
      description: details.slice(0, 3).join(' | ') || 'No details provided',
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies,
      evidence: {
        observed: details.slice(0, 2),
        derived: [],
        assumed: [],
        missing: input.fallbackAgents.has(subAgentId) ? ['analysis_mode: deterministic_fallback'] : [],
      },
    });
  };

  const userIntent = readCdoOutput(input.agentOutputs, 'cdo.user_intent', CdoUserIntentOutputSchema);
  if (userIntent) {
    appendCompactAction('cdo.user_intent', userIntent.jtbd_summary, userIntent.intent_signals, []);
  }
  const valueProp = readCdoOutput(input.agentOutputs, 'cdo.value_proposition', CdoValuePropositionOutputSchema);
  if (valueProp) {
    appendCompactAction(
      'cdo.value_proposition',
      valueProp.value_proposition_summary,
      [...valueProp.clarity_gaps, ...valueProp.hierarchy_actions],
      userIntent ? [`sub_agent:cdo.user_intent:${input.domainKey}`] : [],
    );
  }
  const trust = readCdoOutput(input.agentOutputs, 'cdo.trust_credibility', CdoTrustCredibilityOutputSchema);
  if (trust) {
    appendCompactAction(
      'cdo.trust_credibility',
      trust.trust_summary,
      [...trust.trust_gaps, ...trust.reassurance_interventions],
      friction ? [frictionId] : [],
    );
  }
  const behavioral = readCdoOutput(input.agentOutputs, 'cdo.behavioral_psychology', CdoBehavioralPsychologyOutputSchema);
  if (behavioral) {
    appendCompactAction(
      'cdo.behavioral_psychology',
      behavioral.behavioral_summary,
      [...behavioral.motivation_drivers, ...behavioral.resistance_factors],
      trust ? [`sub_agent:cdo.trust_credibility:${input.domainKey}`] : [],
    );
  }
  const ui = readCdoOutput(input.agentOutputs, 'cdo.ui_consistency', CdoUiConsistencyOutputSchema);
  if (ui) {
    appendCompactAction(
      'cdo.ui_consistency',
      ui.ui_consistency_summary,
      [...ui.hierarchy_issues, ...ui.pattern_breaks, ...ui.usability_actions],
      friction ? [frictionId] : [],
    );
  }
  const copy = readCdoOutput(input.agentOutputs, 'cdo.copy_microcopy', CdoCopyMicrocopyOutputSchema);
  if (copy) {
    appendCompactAction(
      'cdo.copy_microcopy',
      copy.copy_summary,
      [...copy.cta_gaps, ...copy.microcopy_fixes, ...copy.error_state_rewrites],
      ui ? [`sub_agent:cdo.ui_consistency:${input.domainKey}`] : [],
    );
  }
  const analytics = readCdoOutput(input.agentOutputs, 'cdo.analytics_tracking', CdoAnalyticsTrackingOutputSchema);
  if (analytics) {
    appendCompactAction(
      'cdo.analytics_tracking',
      analytics.analytics_summary,
      [...analytics.missing_events, ...analytics.funnel_gaps, ...analytics.metric_definitions],
      exp ? [`sub_agent:cdo.experimentation:${input.domainKey}:exp_1`] : [],
    );
  }
  const benchmark = readCdoOutput(input.agentOutputs, 'cdo.benchmark_patterns', CdoBenchmarkPatternsOutputSchema);
  if (benchmark) {
    appendCompactAction(
      'cdo.benchmark_patterns',
      benchmark.benchmark_summary,
      [...benchmark.applicable_patterns, ...benchmark.adaptation_notes, ...benchmark.guardrails],
      analytics ? [`sub_agent:cdo.analytics_tracking:${input.domainKey}`] : [],
    );
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
  if (subAgentId === 'cdo.user_intent') {
    return CdoUserIntentOutputSchema.parse({
      jtbd_summary: `Fallback JTBD summary for “${g0}” under “${c0}”.`,
      intent_signals: ['Needs a clear path to first value', 'Compares outcomes before commitment'],
      anxieties: ['Too many unclear steps', 'Low confidence in outcome'],
      analysis_mode: 'deterministic_fallback',
    });
  }
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
  if (subAgentId === 'cdo.value_proposition') {
    return CdoValuePropositionOutputSchema.parse({
      value_proposition_summary: `Fallback clarity map for “${g0}”.`,
      clarity_gaps: ['Hero outcome is vague', 'CTA does not explain immediate next step'],
      hierarchy_actions: ['Lead with one concrete user outcome', 'Align CTA wording with activation promise'],
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
  if (subAgentId === 'cdo.trust_credibility') {
    return CdoTrustCredibilityOutputSchema.parse({
      trust_summary: `Fallback trust gap map for “${g0}”.`,
      trust_gaps: ['Limited social proof near commitment trigger', 'Guarantees are hard to find before commitment'],
      reassurance_interventions: ['Add trust proof near primary CTA', 'Surface guarantee text before irreversible actions'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cdo.behavioral_psychology') {
    return CdoBehavioralPsychologyOutputSchema.parse({
      behavioral_summary: `Fallback behavioral levers for “${g0}”.`,
      motivation_drivers: ['Goal-gradient progress visibility', 'Clear immediate payoff framing'],
      resistance_factors: ['Decision fatigue from competing choices', 'Trust uncertainty near commitment'],
      ethical_guardrails: ['Progress indicators must be truthful', 'Avoid manipulative scarcity or fear framing'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cdo.ui_consistency') {
    return CdoUiConsistencyOutputSchema.parse({
      ui_consistency_summary: `Fallback UI consistency review for “${g0}”.`,
      hierarchy_issues: ['Primary and secondary actions have equal visual weight'],
      pattern_breaks: ['Validation timing differs between similar forms'],
      usability_actions: ['Create one dominant action hierarchy', 'Standardize inline validation behavior'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cdo.copy_microcopy') {
    return CdoCopyMicrocopyOutputSchema.parse({
      copy_summary: `Fallback microcopy fixes for “${g0}”.`,
      cta_gaps: ['Primary CTA does not communicate immediate outcome'],
      microcopy_fixes: ['Use outcome-first CTA wording with explicit next step'],
      error_state_rewrites: ['Pair each error with one concrete correction step'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cdo.analytics_tracking') {
    return CdoAnalyticsTrackingOutputSchema.parse({
      analytics_summary: `Fallback instrumentation plan for “${g0}”.`,
      missing_events: ['primary_cta_clicked', 'activation_completed'],
      funnel_gaps: ['No event marks transition from interest to intent'],
      metric_definitions: ['activation_rate = activation_completed / unique_visitors'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cdo.benchmark_patterns') {
    return CdoBenchmarkPatternsOutputSchema.parse({
      benchmark_summary: `Fallback pattern adaptation plan for “${g0}”.`,
      applicable_patterns: ['Single-primary-CTA hero pattern', 'Trust-near-commitment pattern'],
      adaptation_notes: ['Match examples to this product complexity and sales cycle'],
      guardrails: ['Reuse principles only; avoid copied visual identity'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId !== 'cdo.experimentation') {
    throw new Error(`Unsupported CDO sub-agent fallback id: ${subAgentId}`);
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
