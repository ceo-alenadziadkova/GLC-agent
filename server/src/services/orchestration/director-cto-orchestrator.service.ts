import { CtoArchitectureRiskModelAgent } from '../../agents/sub/cto/architecture-risk-model.js';
import { CtoDataPlatformResilienceAgent } from '../../agents/sub/cto/data-platform-resilience.js';
import { CtoDeliveryReleaseSafetyAgent } from '../../agents/sub/cto/delivery-release-safety.js';
import { CtoObservabilityIncidentAgent } from '../../agents/sub/cto/observability-incident.js';
import { CtoReadinessBaselineAgent } from '../../agents/sub/cto/readiness-baseline.js';
import { CtoReliabilityRuntimeAgent } from '../../agents/sub/cto/reliability-runtime.js';
import { CtoRoadmapTradeoffsAgent } from '../../agents/sub/cto/roadmap-tradeoffs.js';
import { CtoSecuritySupplyChainAgent } from '../../agents/sub/cto/security-supply-chain.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { DIRECTOR_SUB_AGENTS } from '../../config/director-sub-agents.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { CtoArchitectureRiskModelOutputSchema } from '../../schemas/sub-agents/cto/architecture-risk-model.js';
import { CtoDataPlatformResilienceOutputSchema } from '../../schemas/sub-agents/cto/data-platform-resilience.js';
import { CtoDeliveryReleaseSafetyOutputSchema } from '../../schemas/sub-agents/cto/delivery-release-safety.js';
import { CtoObservabilityIncidentOutputSchema } from '../../schemas/sub-agents/cto/observability-incident.js';
import { CtoReadinessBaselineOutputSchema } from '../../schemas/sub-agents/cto/readiness-baseline.js';
import { CtoReliabilityRuntimeOutputSchema } from '../../schemas/sub-agents/cto/reliability-runtime.js';
import { CtoRoadmapTradeoffsOutputSchema } from '../../schemas/sub-agents/cto/roadmap-tradeoffs.js';
import { CtoSecuritySupplyChainOutputSchema } from '../../schemas/sub-agents/cto/security-supply-chain.js';
import { buildExecutionWaves } from './sub-agent-wave-executor.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CTO deep-dive multi-agent wave based on SSOT instructions.
 */
export async function runCtoDirectorDeepDiveOrchestrator(input: {
  auditId: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
  requestedSubAgentIds?: string[];
}): Promise<DirectorWaveBundle> {
  const allIds = listCtoSubAgentIds();
  const allowed = new Set<string>(allIds);
  const requested = (input.requestedSubAgentIds ?? []).filter((id): id is CtoSubAgentId => allowed.has(id));
  const selected = requested.length > 0 ? expandCtoSelectionWithDependencies(requested) : [...allIds];
  const dependenciesById = buildDependencyMapCto(selected);
  const waves = buildExecutionWaves(selected, dependenciesById);
  const runtimes = buildCtoAgentRuntime(input.auditId);
  const outputs = new Map<CtoSubAgentId, unknown>();
  const fallback = new Set<CtoSubAgentId>();

  for (const wave of waves) {
    await Promise.all(
      wave.map(async (id) => {
        const runtime = runtimes[id];
        if (!runtime) return;
        try {
          const parsed = await runtime.runSubAgent({
            context: buildCtoSubAgentContext(input.domainKey, input.goals, input.constraints),
            mode: 'standard',
            maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH.standard,
          });
          outputs.set(id, parsed);
        } catch (error) {
          logger.warn('director_cto_orchestrator.sub_agent_fallback_deterministic', {
            sub_agent_id: id,
            domain_key: input.domainKey,
            error: error instanceof Error ? error.message : String(error),
          });
          outputs.set(id, buildDeterministicCtoOutput(id, input));
          fallback.add(id);
        }
      }),
    );
  }

  return buildCtoBundle({
    selected,
    outputs,
    fallback,
    domainKey: input.domainKey,
    constraints: input.constraints,
  });
}

type CtoSubAgentId =
  | 'cto.readiness_baseline'
  | 'cto.architecture_risk_model'
  | 'cto.reliability_runtime'
  | 'cto.observability_incident'
  | 'cto.delivery_release_safety'
  | 'cto.security_supply_chain'
  | 'cto.data_platform_resilience'
  | 'cto.roadmap_tradeoffs';

function listCtoSubAgentIds(): CtoSubAgentId[] {
  return DIRECTOR_SUB_AGENTS.filter((row) => row.id.startsWith('cto.')).map((row) => row.id as CtoSubAgentId);
}

function buildCtoSubAgentContext(domainKey: string, goals: string[], constraints: string[]): string {
  return [`Domain: ${domainKey}`, `Goals: ${goals.join('; ') || 'n/a'}`, `Constraints: ${constraints.join('; ') || 'n/a'}`].join('\n');
}

function expandCtoSelectionWithDependencies(selected: CtoSubAgentId[]): CtoSubAgentId[] {
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const allowed = new Set<CtoSubAgentId>(listCtoSubAgentIds());
  const expanded: CtoSubAgentId[] = [];
  const seen = new Set<CtoSubAgentId>();
  const visit = (id: CtoSubAgentId) => {
    if (!allowed.has(id) || seen.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (allowed.has(dep as CtoSubAgentId)) visit(dep as CtoSubAgentId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of selected) visit(id);
  return expanded;
}

function buildDependencyMapCto(selected: CtoSubAgentId[]): Map<CtoSubAgentId, CtoSubAgentId[]> {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const dependencies = new Map<CtoSubAgentId, CtoSubAgentId[]>();
  for (const id of selected) {
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => selectedSet.has(dep as CtoSubAgentId));
    dependencies.set(id, deps as CtoSubAgentId[]);
  }
  return dependencies;
}

function buildCtoAgentRuntime(auditId: string): Record<CtoSubAgentId, DirectorSubAgentBase> {
  return {
    'cto.readiness_baseline': new CtoReadinessBaselineAgent(auditId),
    'cto.architecture_risk_model': new CtoArchitectureRiskModelAgent(auditId),
    'cto.reliability_runtime': new CtoReliabilityRuntimeAgent(auditId),
    'cto.observability_incident': new CtoObservabilityIncidentAgent(auditId),
    'cto.delivery_release_safety': new CtoDeliveryReleaseSafetyAgent(auditId),
    'cto.security_supply_chain': new CtoSecuritySupplyChainAgent(auditId),
    'cto.data_platform_resilience': new CtoDataPlatformResilienceAgent(auditId),
    'cto.roadmap_tradeoffs': new CtoRoadmapTradeoffsAgent(auditId),
  };
}

function buildDeterministicCtoOutput(id: CtoSubAgentId, input: { domainKey: string; goals: string[]; constraints: string[] }): unknown {
  const goal = input.goals[0] ?? 'delivery reliability';
  const constraint = input.constraints[0] ?? 'resource constraints';
  switch (id) {
    case 'cto.readiness_baseline':
      return CtoReadinessBaselineOutputSchema.parse({
        readiness_summary: `Deterministic baseline for ${input.domainKey} focused on ${goal}.`,
        fragility_zones: ['build', 'deploy', 'runtime'],
        top_unknowns: [constraint],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.architecture_risk_model':
      return CtoArchitectureRiskModelOutputSchema.parse({
        architecture_risk_summary: `Deterministic architecture risk model under ${constraint}.`,
        critical_risks: ['single point of failure', 'implicit service coupling'],
        coupling_hotspots: ['shared runtime dependencies'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.reliability_runtime':
      return CtoReliabilityRuntimeOutputSchema.parse({
        runtime_reliability_summary: 'Deterministic runtime reliability pass.',
        reliability_gaps: ['retry policy inconsistency', 'timeout budget mismatch'],
        guardrails: ['define global timeout classes', 'add backpressure controls'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.observability_incident':
      return CtoObservabilityIncidentOutputSchema.parse({
        observability_summary: 'Deterministic observability readiness pass.',
        telemetry_gaps: ['missing actionable alerts', 'insufficient trace correlation'],
        incident_readiness_actions: ['define incident runbook entry criteria'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.delivery_release_safety':
      return CtoDeliveryReleaseSafetyOutputSchema.parse({
        release_safety_summary: 'Deterministic release safety pass.',
        release_risks: ['rollback path unclear', 'deploy checks incomplete'],
        rollback_controls: ['enforce pre-deploy checklist'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.security_supply_chain':
      return CtoSecuritySupplyChainOutputSchema.parse({
        supply_chain_summary: 'Deterministic supply-chain control pass.',
        security_gaps: ['dependency provenance gaps', 'secrets hygiene inconsistency'],
        security_controls: ['pin critical dependencies with review policy'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.data_platform_resilience':
      return CtoDataPlatformResilienceOutputSchema.parse({
        data_resilience_summary: 'Deterministic data resilience pass.',
        resilience_risks: ['backup restore uncertainty', 'migration rollback gaps'],
        recovery_priorities: ['validate restore drills quarterly'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'cto.roadmap_tradeoffs':
      return CtoRoadmapTradeoffsOutputSchema.parse({
        tradeoff_summary: `Deterministic trade-off synthesis for ${goal}.`,
        decision_tradeoffs: ['speed vs reliability', 'scope vs confidence'],
        critical_path_checkpoints: ['complete baseline controls before scale'],
        analysis_mode: 'deterministic_fallback',
      });
  }
}

function buildCtoBundle(input: {
  selected: CtoSubAgentId[];
  outputs: Map<CtoSubAgentId, unknown>;
  fallback: ReadonlySet<CtoSubAgentId>;
  domainKey: string;
  constraints: string[];
}): DirectorWaveBundle {
  const score = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((row) => [row.id, row] as const));
  const actions = input.selected.map((id) => {
    const raw = input.outputs.get(id);
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => input.selected.includes(dep as CtoSubAgentId));
    const summary = readSummary(raw);
    const detail = readDetailList(raw).slice(0, 3).join(' | ') || 'No additional details';
    return {
      id: `sub_agent:${id}:${input.domainKey}`,
      title: `${id.replace('cto.', 'CTO ')} — ${summary.slice(0, 90)}`,
      description: detail,
      impact: score.impact,
      effort: score.effort,
      risk: score.risk,
      urgency: score.urgency,
      confidence: score.confidence,
      dependencies: deps.map((dep) => `sub_agent:${dep}:${input.domainKey}`),
      evidence: {
        missing: input.fallback.has(id) ? ['analysis_mode: deterministic_fallback'] : [],
      },
    };
  });
  return {
    zones: [input.domainKey, 'tech_infrastructure'],
    bottlenecks: input.constraints.slice(0, 3),
    risks: input.constraints.slice(0, 3),
    actions,
  };
}

function readSummary(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const key = Object.keys(obj).find((k) => k.endsWith('_summary'));
    if (key && typeof obj[key] === 'string') return obj[key] as string;
  }
  return 'Director synthesis';
}

function readDetailList(raw: unknown): string[] {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const key = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (key && Array.isArray(obj[key])) {
      return (obj[key] as unknown[]).filter((x): x is string => typeof x === 'string');
    }
  }
  return [];
}
