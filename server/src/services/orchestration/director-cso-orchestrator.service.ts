import { z } from 'zod';

import { CsoCaseClassifierAgent } from '../../agents/sub/cso/case-classifier.js';
import { CsoComplianceMapAgent } from '../../agents/sub/cso/compliance-map.js';
import { CsoThreatModelAgent } from '../../agents/sub/cso/threat-model.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { DIRECTOR_CSO_ORCHESTRATOR_POLICY } from '../../config/director-cso-orchestrator-policy.js';
import {
  DIRECTOR_CSO_CASE_AGENT_DEPTHS,
  listCsoMvpAgentIds,
  type CsoDeepDiveCase,
  type CsoMvpSubAgentId,
} from '../../config/director-cso-routing-policy.js';
import { DIRECTOR_SUB_AGENTS } from '../../config/director-sub-agents.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { CsoCaseClassifierOutputSchema } from '../../schemas/sub-agents/cso/case-classifier.js';
import { CsoComplianceMapOutputSchema } from '../../schemas/sub-agents/cso/compliance-map.js';
import { CsoThreatModelOutputSchema } from '../../schemas/sub-agents/cso/threat-model.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import { routeCsoDeepDiveCase } from './director-cso-router.service.js';
import { buildCsoMaterializedWaveBundle } from './director-domain-materialized-bundles.service.js';
import { buildExecutionWaves } from './sub-agent-wave-executor.js';
import { logger } from '../logger.js';

const s = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;

/**
 * CSO deep-dive: case routing + deterministic threat/compliance wave (MVP).
 */
export function runCsoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const csoCase = routeCsoDeepDiveCase({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cso_orchestrator.run', { domain_key: input.domainKey, cso_case: csoCase });
  return buildCsoMaterializedWaveBundle({
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
    csoCase,
  });
}

export async function runCsoSubAgentOrchestrator(args: {
  auditId: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
  requestedSubAgentIds?: string[];
}): Promise<{
  cso_case: CsoDeepDiveCase;
  selected_sub_agents: CsoMvpSubAgentId[];
  run_order: CsoMvpSubAgentId[];
  agent_outputs: Partial<
    Record<CsoMvpSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
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
  const csoCase = routeCsoDeepDiveCase({ goals: args.goals, constraints: args.constraints });
  const allowed = new Set<string>(listCsoMvpAgentIds());
  const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CsoMvpSubAgentId => allowed.has(id));
  const defaultSelection = listCsoMvpAgentIds().filter(
    (id) => DIRECTOR_CSO_CASE_AGENT_DEPTHS[csoCase][id] !== 'deferred',
  );
  const selected: CsoMvpSubAgentId[] = requested.length > 0 ? requested : defaultSelection;
  const effectiveSelection = expandCsoSelectionWithDependencies(selected);
  const runOrder = buildTopoOrderCso(effectiveSelection);
  const dependencyMap = buildDependencyMapCso(effectiveSelection);
  const runWaves = buildExecutionWaves(effectiveSelection, dependencyMap);
  const agents = buildCsoAgentRuntime(args.auditId);
  const agentOutputs: Partial<
    Record<CsoMvpSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
  > = {};
  const fallbackAgents = new Set<CsoMvpSubAgentId>();

  for (const wave of runWaves) {
    await Promise.all(
      wave.map(async (subAgentId) => {
        const runtime = agents[subAgentId];
        const depth = DIRECTOR_CSO_CASE_AGENT_DEPTHS[csoCase][subAgentId];
        let parsed: unknown;
        try {
          parsed = await runtime.runSubAgent({
            context: buildCsoSubAgentContext(args.goals, args.constraints, csoCase, args.domainKey),
            mode: csoCase,
            maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth === 'deferred' ? 'min' : depth],
          });
        } catch (error) {
          logger.warn('director_cso_orchestrator.sub_agent_fallback_deterministic', {
            sub_agent_id: subAgentId,
            error: error instanceof Error ? error.message : String(error),
          });
          parsed = runtime.outputSchema.parse(
            buildDeterministicCsoOutput(subAgentId, args.goals, args.constraints, csoCase),
          );
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
    cso_case: csoCase,
    selected_sub_agents: effectiveSelection,
    run_order: runOrder,
    agent_outputs: agentOutputs,
    qa_block: {
      coherence: DIRECTOR_CSO_ORCHESTRATOR_POLICY.qaBlock.coherence,
      feasibility: DIRECTOR_CSO_ORCHESTRATOR_POLICY.qaBlock.feasibility,
      top_3_actions: args.goals.slice(0, 3),
      risks: args.constraints.slice(0, 3),
      measurement: [...DIRECTOR_CSO_ORCHESTRATOR_POLICY.qaBlock.measurement],
    },
    director_bundle: buildDirectorCsoWaveBundle({
      agentOutputs,
      fallbackAgents,
      domainKey: args.domainKey,
      goals: args.goals,
      constraints: args.constraints,
      csoCase,
    }),
  };
}

function buildCsoSubAgentContext(
  goals: string[],
  constraints: string[],
  csoCase: CsoDeepDiveCase,
  domainKey: string,
): string {
  return [
    `Domain: ${domainKey}`,
    `CSO case: ${csoCase}`,
    `Goals: ${goals.join('; ') || 'n/a'}`,
    `Constraints: ${constraints.join('; ') || 'n/a'}`,
  ].join('\n');
}

function buildTopoOrderCso(selected: CsoMvpSubAgentId[]): CsoMvpSubAgentId[] {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const done = new Set<CsoMvpSubAgentId>();
  const order: CsoMvpSubAgentId[] = [];

  const visit = (id: CsoMvpSubAgentId) => {
    if (!selectedSet.has(id) || done.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (selectedSet.has(dep as CsoMvpSubAgentId)) visit(dep as CsoMvpSubAgentId);
      }
    }
    if (done.has(id)) return;
    done.add(id);
    order.push(id);
  };

  for (const id of selected) visit(id);
  return order;
}

function expandCsoSelectionWithDependencies(selected: CsoMvpSubAgentId[]): CsoMvpSubAgentId[] {
  const allowed = new Set<CsoMvpSubAgentId>(listCsoMvpAgentIds());
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const expanded: CsoMvpSubAgentId[] = [];
  const seen = new Set<CsoMvpSubAgentId>();
  const visit = (id: CsoMvpSubAgentId) => {
    if (!allowed.has(id) || seen.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (allowed.has(dep as CsoMvpSubAgentId)) visit(dep as CsoMvpSubAgentId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of selected) visit(id);
  return expanded;
}

function buildDependencyMapCso(selected: CsoMvpSubAgentId[]): Map<CsoMvpSubAgentId, CsoMvpSubAgentId[]> {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const dependencies = new Map<CsoMvpSubAgentId, CsoMvpSubAgentId[]>();
  for (const id of selected) {
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => selectedSet.has(dep as CsoMvpSubAgentId));
    dependencies.set(id, deps as CsoMvpSubAgentId[]);
  }
  return dependencies;
}

function buildCsoAgentRuntime(auditId: string): Record<CsoMvpSubAgentId, DirectorSubAgentBase> {
  return {
    'cso.case_classifier': new CsoCaseClassifierAgent(auditId),
    'cso.threat_model': new CsoThreatModelAgent(auditId),
    'cso.compliance_map': new CsoComplianceMapAgent(auditId),
  };
}

function readCsoOutput<T extends CsoMvpSubAgentId, TOut>(
  outputs: Partial<Record<CsoMvpSubAgentId, { output?: unknown }>>,
  id: T,
  schema: z.ZodSchema<TOut>,
): TOut | null {
  const row = outputs[id];
  const raw = row?.output;
  if (raw == null) return null;
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function buildDirectorCsoWaveBundle(input: {
  agentOutputs: Partial<Record<CsoMvpSubAgentId, { output?: unknown }>>;
  fallbackAgents: ReadonlySet<CsoMvpSubAgentId>;
  domainKey: string;
  goals: string[];
  constraints: string[];
  csoCase: CsoDeepDiveCase;
}): DirectorWaveBundle {
  const actions: DirectorWaveBundle['actions'] = [];
  const clsId = `sub_agent:cso.case_classifier:${input.domainKey}`;
  const tmId = `sub_agent:cso.threat_model:${input.domainKey}`;
  const cmId = `sub_agent:cso.compliance_map:${input.domainKey}`;

  const cls = readCsoOutput(input.agentOutputs, 'cso.case_classifier', CsoCaseClassifierOutputSchema);
  if (cls) {
    actions.push({
      id: clsId,
      title: `Case & scope — ${cls.case_label}`,
      description: cls.scope_notes.slice(0, 200),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [],
      evidence: {
        observed: input.goals.slice(0, 2),
        derived: [cls.case_label],
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cso.case_classifier')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const tm = readCsoOutput(input.agentOutputs, 'cso.threat_model', CsoThreatModelOutputSchema);
  if (tm) {
    actions.push({
      id: tmId,
      title: `Threat model — ${tm.threat_summary.slice(0, 100)}`,
      description: tm.top_threats.map((t) => `${t.vector} (${t.impact})`).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: cls ? [clsId] : [],
      evidence: {
        derived: tm.top_threats.map((t) => t.vector),
        observed: [],
        assumed: [],
        missing: input.fallbackAgents.has('cso.threat_model')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const cm = readCsoOutput(input.agentOutputs, 'cso.compliance_map', CsoComplianceMapOutputSchema);
  if (cm) {
    actions.push({
      id: cmId,
      title: `Compliance map — ${cm.compliance_summary.slice(0, 100)}`,
      description: cm.control_priorities.slice(0, 5).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: tm ? [tmId] : cls ? [clsId] : [],
      evidence: {
        derived: cm.control_priorities,
        observed: [],
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cso.compliance_map')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  if (actions.length === 0) {
    return runCsoDirectorDeepDiveOrchestrator({
      domainKey: input.domainKey,
      goals: input.goals,
      constraints: input.constraints,
    });
  }

  return {
    zones: [input.domainKey, 'security_compliance', `cso_case:${input.csoCase}`],
    bottlenecks: [`CSO case: ${input.csoCase}`],
    risks: input.constraints.slice(0, 3),
    actions,
  };
}

function buildDeterministicCsoOutput(
  subAgentId: CsoMvpSubAgentId,
  goals: string[],
  constraints: string[],
  csoCase: CsoDeepDiveCase,
): unknown {
  const g0 = goals[0] ?? 'Primary goal';
  if (subAgentId === 'cso.case_classifier') {
    return CsoCaseClassifierOutputSchema.parse({
      case_label: csoCase,
      scope_notes: `Deterministic scope lock for “${g0}” under router case ${csoCase}.`,
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.threat_model') {
    return CsoThreatModelOutputSchema.parse({
      threat_summary: `Heuristic threat posture for “${g0}” (${csoCase}).`,
      top_threats: [
        { vector: 'Misconfiguration exposure', impact: 'medium until validated' },
        { vector: 'Third-party dependency', impact: 'context-dependent' },
      ],
      analysis_mode: 'deterministic_fallback',
    });
  }
  return CsoComplianceMapOutputSchema.parse({
    compliance_summary: `Control priorities aligned to ${csoCase} heuristics.`,
    control_priorities: ['Identity & access reviews', 'Logging retention', 'Vendor due diligence'],
    analysis_mode: 'deterministic_fallback',
  });
}
