import { z } from 'zod';

import { CsoAttackSurfaceMapAgent } from '../../agents/sub/cso/attack-surface-map.js';
import { CsoCaseClassifierAgent } from '../../agents/sub/cso/case-classifier.js';
import { CsoComplianceMapAgent } from '../../agents/sub/cso/compliance-map.js';
import { CsoExploitabilityExposureAgent } from '../../agents/sub/cso/exploitability-exposure.js';
import { CsoIncidentReadinessAgent } from '../../agents/sub/cso/incident-readiness.js';
import { CsoMetricsFrameworkAgent } from '../../agents/sub/cso/metrics-framework.js';
import { CsoRiskScoringAgent } from '../../agents/sub/cso/risk-scoring.js';
import { CsoSdlcAccessGovernanceAgent } from '../../agents/sub/cso/sdlc-access-governance.js';
import { CsoThreatModelAgent } from '../../agents/sub/cso/threat-model.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { DIRECTOR_CSO_ORCHESTRATOR_POLICY } from '../../config/director-cso-orchestrator-policy.js';
import {
  DIRECTOR_CSO_CASE_AGENT_DEPTHS,
  listCsoSubAgentIds,
  type CsoDeepDiveCase,
  type CsoSubAgentId,
} from '../../config/director-cso-routing-policy.js';
import { DIRECTOR_SUB_AGENTS } from '../../config/director-sub-agents.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { CsoCaseClassifierOutputSchema } from '../../schemas/sub-agents/cso/case-classifier.js';
import { CsoComplianceMapOutputSchema } from '../../schemas/sub-agents/cso/compliance-map.js';
import { CsoAttackSurfaceMapOutputSchema } from '../../schemas/sub-agents/cso/attack-surface-map.js';
import { CsoExploitabilityExposureOutputSchema } from '../../schemas/sub-agents/cso/exploitability-exposure.js';
import { CsoIncidentReadinessOutputSchema } from '../../schemas/sub-agents/cso/incident-readiness.js';
import { CsoMetricsFrameworkOutputSchema } from '../../schemas/sub-agents/cso/metrics-framework.js';
import { CsoRiskScoringOutputSchema } from '../../schemas/sub-agents/cso/risk-scoring.js';
import { CsoSdlcAccessGovernanceOutputSchema } from '../../schemas/sub-agents/cso/sdlc-access-governance.js';
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
  selected_sub_agents: CsoSubAgentId[];
  run_order: CsoSubAgentId[];
  agent_outputs: Partial<
    Record<CsoSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
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
  const allowed = new Set<string>(listCsoSubAgentIds());
  const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CsoSubAgentId => allowed.has(id));
  const defaultSelection = listCsoSubAgentIds().filter(
    (id) => DIRECTOR_CSO_CASE_AGENT_DEPTHS[csoCase][id] !== 'deferred',
  );
  const selected: CsoSubAgentId[] = requested.length > 0 ? requested : defaultSelection;
  const effectiveSelection = expandCsoSelectionWithDependencies(
    selected.filter((id) => isCsoAgentApplicableForCase(id, csoCase)),
    csoCase,
  );
  const runOrder = buildTopoOrderCso(effectiveSelection);
  const dependencyMap = buildDependencyMapCso(effectiveSelection);
  const runWaves = buildExecutionWaves(effectiveSelection, dependencyMap);
  const agents = buildCsoAgentRuntime(args.auditId);
  const agentOutputs: Partial<
    Record<CsoSubAgentId, { output: unknown; metadata: { depth: string; analysis_mode: string; prompt_ref: string } }>
  > = {};
  const fallbackAgents = new Set<CsoSubAgentId>();

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

function buildTopoOrderCso(selected: CsoSubAgentId[]): CsoSubAgentId[] {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const done = new Set<CsoSubAgentId>();
  const order: CsoSubAgentId[] = [];

  const visit = (id: CsoSubAgentId) => {
    if (!selectedSet.has(id) || done.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (selectedSet.has(dep as CsoSubAgentId)) visit(dep as CsoSubAgentId);
      }
    }
    if (done.has(id)) return;
    done.add(id);
    order.push(id);
  };

  for (const id of selected) visit(id);
  return order;
}

function expandCsoSelectionWithDependencies(selected: CsoSubAgentId[], csoCase: CsoDeepDiveCase): CsoSubAgentId[] {
  const allowed = new Set<CsoSubAgentId>(listCsoSubAgentIds());
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const expanded: CsoSubAgentId[] = [];
  const seen = new Set<CsoSubAgentId>();
  const visit = (id: CsoSubAgentId) => {
    if (!allowed.has(id) || seen.has(id)) return;
    if (!isCsoAgentApplicableForCase(id, csoCase)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (allowed.has(dep as CsoSubAgentId)) visit(dep as CsoSubAgentId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of selected) visit(id);
  return expanded;
}

function buildDependencyMapCso(selected: CsoSubAgentId[]): Map<CsoSubAgentId, CsoSubAgentId[]> {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const dependencies = new Map<CsoSubAgentId, CsoSubAgentId[]>();
  for (const id of selected) {
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => selectedSet.has(dep as CsoSubAgentId));
    dependencies.set(id, deps as CsoSubAgentId[]);
  }
  return dependencies;
}

function buildCsoAgentRuntime(auditId: string): Record<CsoSubAgentId, DirectorSubAgentBase> {
  return {
    'cso.case_classifier': new CsoCaseClassifierAgent(auditId),
    'cso.threat_model': new CsoThreatModelAgent(auditId),
    'cso.compliance_map': new CsoComplianceMapAgent(auditId),
    'cso.attack_surface_map': new CsoAttackSurfaceMapAgent(auditId),
    'cso.risk_scoring': new CsoRiskScoringAgent(auditId),
    'cso.exploitability_exposure': new CsoExploitabilityExposureAgent(auditId),
    'cso.metrics_framework': new CsoMetricsFrameworkAgent(auditId),
    'cso.incident_readiness': new CsoIncidentReadinessAgent(auditId),
    'cso.sdlc_access_governance': new CsoSdlcAccessGovernanceAgent(auditId),
  };
}

function readCsoOutput<T extends CsoSubAgentId, TOut>(
  outputs: Partial<Record<CsoSubAgentId, { output?: unknown }>>,
  id: T,
  schema: z.ZodSchema<TOut>,
): TOut | null {
  const row = outputs[id];
  const raw = row?.output;
  if (raw == null) return null;
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function isCsoAgentApplicableForCase(id: CsoSubAgentId, csoCase: CsoDeepDiveCase): boolean {
  const row = DIRECTOR_SUB_AGENTS.find((agent) => agent.id === id);
  if (!row?.applicable_cases?.length) return true;
  return row.applicable_cases.includes(csoCase);
}

function buildDirectorCsoWaveBundle(input: {
  agentOutputs: Partial<Record<CsoSubAgentId, { output?: unknown }>>;
  fallbackAgents: ReadonlySet<CsoSubAgentId>;
  domainKey: string;
  goals: string[];
  constraints: string[];
  csoCase: CsoDeepDiveCase;
}): DirectorWaveBundle {
  const actions: DirectorWaveBundle['actions'] = [];
  const clsId = `sub_agent:cso.case_classifier:${input.domainKey}`;
  const tmId = `sub_agent:cso.threat_model:${input.domainKey}`;
  const cmId = `sub_agent:cso.compliance_map:${input.domainKey}`;
  const asmId = `sub_agent:cso.attack_surface_map:${input.domainKey}`;
  const rsId = `sub_agent:cso.risk_scoring:${input.domainKey}`;
  const eeId = `sub_agent:cso.exploitability_exposure:${input.domainKey}`;
  const mfId = `sub_agent:cso.metrics_framework:${input.domainKey}`;
  const irId = `sub_agent:cso.incident_readiness:${input.domainKey}`;
  const sdlcId = `sub_agent:cso.sdlc_access_governance:${input.domainKey}`;

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

  const asm = readCsoOutput(input.agentOutputs, 'cso.attack_surface_map', CsoAttackSurfaceMapOutputSchema);
  if (asm) {
    actions.push({
      id: asmId,
      title: `Attack surface — ${asm.attack_surface_summary.slice(0, 100)}`,
      description: asm.exposure_points.slice(0, 5).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: cls ? [clsId] : [],
      evidence: {
        derived: asm.exposure_points,
        observed: [],
        assumed: [],
        missing: input.fallbackAgents.has('cso.attack_surface_map')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const rs = readCsoOutput(input.agentOutputs, 'cso.risk_scoring', CsoRiskScoringOutputSchema);
  if (rs) {
    actions.push({
      id: rsId,
      title: `Risk scoring — ${rs.risk_scoring_summary.slice(0, 100)}`,
      description: rs.top_risks
        .map((risk) => `${risk.risk} (L${risk.likelihood}/I${risk.impact}=${risk.risk_score})`)
        .join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [tm && tmId, asm && asmId, cm && cmId].filter(Boolean) as string[],
      evidence: {
        derived: rs.top_risks.map((risk) => risk.risk),
        observed: [],
        assumed: [],
        missing: input.fallbackAgents.has('cso.risk_scoring')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const ee = readCsoOutput(
    input.agentOutputs,
    'cso.exploitability_exposure',
    CsoExploitabilityExposureOutputSchema,
  );
  if (ee) {
    actions.push({
      id: eeId,
      title: `Exploitability/exposure — ${ee.exploitability_exposure_summary.slice(0, 100)}`,
      description: ee.exploitation_paths
        .map((item) => `${item.vector} (${item.exploitability}/${item.exposure})`)
        .join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [tm && tmId, asm && asmId].filter(Boolean) as string[],
      evidence: {
        derived: ee.exploitation_paths.map((item) => item.vector),
        observed: [],
        assumed: [],
        missing: input.fallbackAgents.has('cso.exploitability_exposure')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const mf = readCsoOutput(input.agentOutputs, 'cso.metrics_framework', CsoMetricsFrameworkOutputSchema);
  if (mf) {
    actions.push({
      id: mfId,
      title: `Metrics framework — ${mf.metrics_framework_summary.slice(0, 100)}`,
      description: [...mf.security_kpis, ...mf.compliance_kpis].slice(0, 6).join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [cm && cmId, rs && rsId].filter(Boolean) as string[],
      evidence: {
        derived: [...mf.security_kpis, ...mf.compliance_kpis],
        observed: [],
        assumed: [],
        missing: input.fallbackAgents.has('cso.metrics_framework')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const ir = readCsoOutput(input.agentOutputs, 'cso.incident_readiness', CsoIncidentReadinessOutputSchema);
  if (ir) {
    actions.push({
      id: irId,
      title: `Incident readiness — ${ir.incident_readiness_summary.slice(0, 100)}`,
      description: [...ir.detection_response_gaps.slice(0, 3), ...ir.continuity_actions.slice(0, 2)].join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [tm && tmId, ee && eeId].filter(Boolean) as string[],
      evidence: {
        derived: [...ir.detection_response_gaps, ...ir.continuity_actions],
        observed: [],
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cso.incident_readiness')
          ? ['analysis_mode: deterministic_fallback', 'origin: sub-agent runtime failure']
          : [],
      },
    });
  }

  const sdlc = readCsoOutput(
    input.agentOutputs,
    'cso.sdlc_access_governance',
    CsoSdlcAccessGovernanceOutputSchema,
  );
  if (sdlc) {
    actions.push({
      id: sdlcId,
      title: `SDLC & access governance — ${sdlc.sdlc_access_governance_summary.slice(0, 100)}`,
      description: [...sdlc.sdlc_control_gaps.slice(0, 3), ...sdlc.access_governance_priorities.slice(0, 2)].join(' | '),
      impact: s.impact,
      effort: s.effort,
      risk: s.risk,
      urgency: s.urgency,
      confidence: s.confidence,
      dependencies: [mf && mfId, ir && irId].filter(Boolean) as string[],
      evidence: {
        derived: [...sdlc.sdlc_control_gaps, ...sdlc.access_governance_priorities],
        observed: [],
        assumed: input.constraints.slice(0, 2),
        missing: input.fallbackAgents.has('cso.sdlc_access_governance')
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
  subAgentId: CsoSubAgentId,
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
  if (subAgentId === 'cso.compliance_map') {
    return CsoComplianceMapOutputSchema.parse({
      compliance_summary: `Control priorities aligned to ${csoCase} heuristics.`,
      control_priorities: ['Identity & access reviews', 'Logging retention', 'Vendor due diligence'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.attack_surface_map') {
    return CsoAttackSurfaceMapOutputSchema.parse({
      attack_surface_summary: `Heuristic attack surface for “${g0}” in ${csoCase}.`,
      exposure_points: ['Public web endpoints', 'Authentication boundary'],
      monitoring_blind_spots: ['Privileged action audit trail', 'Third-party API inventory'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.risk_scoring') {
    return CsoRiskScoringOutputSchema.parse({
      risk_scoring_summary: `Heuristic risk ranking for ${csoCase}.`,
      top_risks: [
        { risk: 'External surface misconfiguration', likelihood: 4, impact: 4, risk_score: 16 },
        { risk: 'Control drift in operations', likelihood: 3, impact: 4, risk_score: 12 },
      ],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.exploitability_exposure') {
    return CsoExploitabilityExposureOutputSchema.parse({
      exploitability_exposure_summary: `Exploitability baselines for ${csoCase} under limited evidence.`,
      exploitation_paths: [
        { vector: 'Public endpoint gaps', exploitability: 'moderate', exposure: 'public' },
        { vector: 'Privileged console misuse', exploitability: 'hard', exposure: 'authenticated' },
      ],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.metrics_framework') {
    return CsoMetricsFrameworkOutputSchema.parse({
      metrics_framework_summary: `Baseline KPI frame for ${csoCase}.`,
      security_kpis: ['Critical patch SLA', 'Mean time to detect'],
      compliance_kpis: ['Control evidence completeness', 'Vendor review coverage'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.incident_readiness') {
    return CsoIncidentReadinessOutputSchema.parse({
      incident_readiness_summary: `Readiness baseline for incident-oriented response in ${csoCase}.`,
      detection_response_gaps: ['Alert triage ownership gap', 'Escalation path not tested'],
      continuity_actions: ['Assign incident roles', 'Run communication drill'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  if (subAgentId === 'cso.sdlc_access_governance') {
    return CsoSdlcAccessGovernanceOutputSchema.parse({
      sdlc_access_governance_summary: `SDLC and access governance baseline for ${csoCase}.`,
      sdlc_control_gaps: ['Release gate hardening needed', 'Secrets rotation cadence missing'],
      access_governance_priorities: ['Least-privilege reviews', 'Quarterly recertification'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  return CsoComplianceMapOutputSchema.parse({
    compliance_summary: `Control priorities aligned to ${csoCase} heuristics (fallback default).`,
    control_priorities: ['Identity & access reviews'],
    analysis_mode: 'deterministic_fallback',
  });
}
