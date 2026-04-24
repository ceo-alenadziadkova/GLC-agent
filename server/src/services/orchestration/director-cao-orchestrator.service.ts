import { CaoAdoptionRolloutGovernanceAgent } from '../../agents/sub/cao/adoption-rollout-governance.js';
import { CaoAiOpsGuardrailsAgent } from '../../agents/sub/cao/ai-ops-guardrails.js';
import { CaoAutomationCandidatesAgent } from '../../agents/sub/cao/automation-candidates.js';
import { CaoBillingQuoteAutomationAgent } from '../../agents/sub/cao/billing-quote-automation.js';
import { CaoBuildVsBuyAgent } from '../../agents/sub/cao/build-vs-buy.js';
import { CaoDataQualityGatesAgent } from '../../agents/sub/cao/data-quality-gates.js';
import { CaoFollowupNotificationsAgent } from '../../agents/sub/cao/followup-notifications.js';
import { CaoIntegrationsHandoffsAgent } from '../../agents/sub/cao/integrations-handoffs.js';
import { CaoProcessMapAgent } from '../../agents/sub/cao/process-map.js';
import { CaoSlaTargetsAgent } from '../../agents/sub/cao/sla-targets.js';
import { CaoSopGovernanceAgent } from '../../agents/sub/cao/sop-governance.js';
import { CaoSynthesisBundleAgent } from '../../agents/sub/cao/synthesis-bundle.js';
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
import { CaoBillingQuoteAutomationOutputSchema } from '../../schemas/sub-agents/cao/billing-quote-automation.js';
import { CaoBuildVsBuyOutputSchema } from '../../schemas/sub-agents/cao/build-vs-buy.js';
import { CaoDataQualityGatesOutputSchema } from '../../schemas/sub-agents/cao/data-quality-gates.js';
import { CaoFollowupNotificationsOutputSchema } from '../../schemas/sub-agents/cao/followup-notifications.js';
import { CaoIntegrationsHandoffsOutputSchema } from '../../schemas/sub-agents/cao/integrations-handoffs.js';
import { CaoProcessMapOutputSchema } from '../../schemas/sub-agents/cao/process-map.js';
import { CaoSlaTargetsOutputSchema } from '../../schemas/sub-agents/cao/sla-targets.js';
import { CaoSopGovernanceOutputSchema } from '../../schemas/sub-agents/cao/sop-governance.js';
import { CaoSynthesisBundleOutputSchema } from '../../schemas/sub-agents/cao/synthesis-bundle.js';
import { CaoThroughputOutputSchema } from '../../schemas/sub-agents/cao/throughput.js';
import { CaoAdoptionRolloutGovernanceOutputSchema } from '../../schemas/sub-agents/cao/adoption-rollout-governance.js';
import { CaoAiOpsGuardrailsOutputSchema } from '../../schemas/sub-agents/cao/ai-ops-guardrails.js';
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
    'cao.sop_governance': new CaoSopGovernanceAgent(auditId),
    'cao.sla_targets': new CaoSlaTargetsAgent(auditId),
    'cao.data_quality_gates': new CaoDataQualityGatesAgent(auditId),
    'cao.adoption_rollout_governance': new CaoAdoptionRolloutGovernanceAgent(auditId),
    'cao.automation_candidates': new CaoAutomationCandidatesAgent(auditId),
    'cao.integrations_handoffs': new CaoIntegrationsHandoffsAgent(auditId),
    'cao.followup_notifications': new CaoFollowupNotificationsAgent(auditId),
    'cao.billing_quote_automation': new CaoBillingQuoteAutomationAgent(auditId),
    'cao.ai_ops_guardrails': new CaoAiOpsGuardrailsAgent(auditId),
    'cao.throughput': new CaoThroughputAgent(auditId),
    'cao.build_vs_buy': new CaoBuildVsBuyAgent(auditId),
    'cao.synthesis_bundle': new CaoSynthesisBundleAgent(auditId),
  };
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
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((row) => [row.id, row] as const));
  const activeIds = listCaoMvpAgentIds().filter((id) => input.agentOutputs[id] != null);
  for (const id of activeIds) {
    const descriptor = byId.get(id);
    if (!descriptor) continue;
    const actionId = `sub_agent:${id}:${input.domainKey}`;
    const dependencyIds = descriptor.depends_on
      .filter((dep): dep is CaoMvpSubAgentId => (listCaoMvpAgentIds() as readonly string[]).includes(dep))
      .filter((dep) => input.agentOutputs[dep] != null)
      .map((dep) => `sub_agent:${dep}:${input.domainKey}`);
    const output = input.agentOutputs[id]?.output;
    const fallbackMissing = input.fallbackAgents.has(id)
      ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
      : [];
    const titleDescription = formatCaoActionText(id, output);
    actions.push({
      id: actionId,
      title: titleDescription.title,
      description: titleDescription.description,
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: dependencyIds,
      evidence: {
        observed: id === 'cao.process_map' ? input.goals.slice(0, 2) : [],
        derived: titleDescription.derived,
        assumed: input.constraints.slice(0, 2),
        missing: fallbackMissing,
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
  if (subAgentId === 'cao.sop_governance') {
    return CaoSopGovernanceOutputSchema.parse({
      sop_governance_summary: `SOP governance baseline for “${g0}” under “${c0}”.`,
      approval_controls: ['Define approval owner by workflow', 'Set escalation path for blocked approvals'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.sla_targets') {
    return CaoSlaTargetsOutputSchema.parse({
      sla_targets_summary: `SLA draft for “${g0}” constrained by “${c0}”.`,
      response_targets: ['Initial response within 4 business hours', 'Handoff completion within 1 business day'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.data_quality_gates') {
    return CaoDataQualityGatesOutputSchema.parse({
      data_quality_summary: `Data-readiness checks for “${g0}” with “${c0}”.`,
      quality_gates: ['Require mandatory intake fields', 'Reject records without owner assignment'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.adoption_rollout_governance') {
    return CaoAdoptionRolloutGovernanceOutputSchema.parse({
      adoption_governance_summary: `Rollout governance frame for “${g0}”.`,
      rollout_controls: ['Pilot with one team before global rollout', 'Require rollback owner for each rollout step'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.integrations_handoffs') {
    return CaoIntegrationsHandoffsOutputSchema.parse({
      integrations_handoffs_summary: `Integration and handoff dependency baseline for “${g0}”.`,
      handoff_dependencies: ['CRM to delivery sync checkpoint', 'Billing status backfill before fulfillment'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.followup_notifications') {
    return CaoFollowupNotificationsOutputSchema.parse({
      followup_automation_summary: `Follow-up automation baseline for “${g0}”.`,
      notification_flows: ['Reminder after 24h inactivity', 'Escalation to owner after second SLA miss'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.billing_quote_automation') {
    return CaoBillingQuoteAutomationOutputSchema.parse({
      billing_automation_summary: `Billing and quote automation baseline for “${g0}”.`,
      billing_workflows: ['Auto-create quote draft from approved scope', 'Flag invoice exceptions for manual review'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.ai_ops_guardrails') {
    return CaoAiOpsGuardrailsOutputSchema.parse({
      ai_ops_summary: `AI-assisted ops guardrails for “${g0}”.`,
      guardrails: ['Require human approval for customer-facing messages', 'Log all AI decisions with trace IDs'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.build_vs_buy') {
    return CaoBuildVsBuyOutputSchema.parse({
      build_vs_buy_summary: `Build-vs-buy baseline for “${g0}”.`,
      decision_criteria: ['Time-to-first-value', 'Exception-handling flexibility', 'Operational support burden'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cao.synthesis_bundle') {
    return CaoSynthesisBundleOutputSchema.parse({
      synthesis_summary: `Program synthesis for “${g0}” with “${c0}”.`,
      top_3_actions: ['Lock process owners', 'Pilot top automation candidate', 'Add KPI and risk tracking'],
      dependency_highlights: ['Automation rollout depends on data quality gates', 'SLA tracking depends on handoff instrumentation'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  return CaoThroughputOutputSchema.parse({
    throughput_risks: ['WIP limits unclear for cross-team handoffs'],
    wip_guardrails: ['Cap parallel initiatives at three per squad'],
    analysis_mode: 'deterministic_fallback',
  });
}

function formatCaoActionText(
  id: CaoMvpSubAgentId,
  output: unknown,
): { title: string; description: string; derived: string[] } {
  if (id === 'cao.process_map') {
    const parsed = CaoProcessMapOutputSchema.safeParse(output);
    if (parsed.success) {
      return {
        title: `Process map — ${parsed.data.process_map_summary.slice(0, 120)}`,
        description: parsed.data.critical_paths.map((p) => `${p.name} (${p.owner} -> ${p.handoff_to})`).join(' | '),
        derived: parsed.data.critical_paths.map((p) => p.name),
      };
    }
  }
  if (id === 'cao.automation_candidates') {
    const parsed = CaoAutomationCandidatesOutputSchema.safeParse(output);
    if (parsed.success) {
      return {
        title: 'Automation candidates (ranked)',
        description: parsed.data.candidate_rankings.map((c) => `${c.title}: ${c.expected_delta}`).join(' | '),
        derived: parsed.data.candidate_rankings.map((c) => c.rationale.slice(0, 80)),
      };
    }
  }
  if (id === 'cao.throughput') {
    const parsed = CaoThroughputOutputSchema.safeParse(output);
    if (parsed.success) {
      return {
        title: 'Throughput and reliability guardrails',
        description: parsed.data.throughput_risks.slice(0, 3).join(' | '),
        derived: parsed.data.wip_guardrails,
      };
    }
  }
  const text = JSON.stringify(output ?? {}).slice(0, 160);
  return {
    title: id.replace('cao.', 'CAO — ').replaceAll('_', ' '),
    description: text.length > 0 ? text : 'No parsed output available',
    derived: text.length > 0 ? [text] : [],
  };
}
