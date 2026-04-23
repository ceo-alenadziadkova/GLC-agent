import { SeoAuthorityTrustAgent } from '../../agents/sub/seo/authority-trust.js';
import { SeoContentIntentCoverageAgent } from '../../agents/sub/seo/content-intent-coverage.js';
import { SeoIaInternalLinksAgent } from '../../agents/sub/seo/ia-internal-links.js';
import { SeoLocalInternationalReadinessAgent } from '../../agents/sub/seo/local-international-readiness.js';
import { SeoMeasurementExperimentationAgent } from '../../agents/sub/seo/measurement-experimentation.js';
import { SeoSerpCtrLeversAgent } from '../../agents/sub/seo/serp-ctr-levers.js';
import { SeoTechnicalIndexabilityAgent } from '../../agents/sub/seo/technical-indexability.js';
import { SeoVisibilityBaselineAgent } from '../../agents/sub/seo/visibility-baseline.js';
import type { DirectorSubAgentBase } from '../../agents/director-sub-agent-base.js';
import { DIRECTOR_SUB_AGENTS } from '../../config/director-sub-agents.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { SeoAuthorityTrustOutputSchema } from '../../schemas/sub-agents/seo/authority-trust.js';
import { SeoContentIntentCoverageOutputSchema } from '../../schemas/sub-agents/seo/content-intent-coverage.js';
import { SeoIaInternalLinksOutputSchema } from '../../schemas/sub-agents/seo/ia-internal-links.js';
import { SeoLocalInternationalReadinessOutputSchema } from '../../schemas/sub-agents/seo/local-international-readiness.js';
import { SeoMeasurementExperimentationOutputSchema } from '../../schemas/sub-agents/seo/measurement-experimentation.js';
import { SeoSerpCtrLeversOutputSchema } from '../../schemas/sub-agents/seo/serp-ctr-levers.js';
import { SeoTechnicalIndexabilityOutputSchema } from '../../schemas/sub-agents/seo/technical-indexability.js';
import { SeoVisibilityBaselineOutputSchema } from '../../schemas/sub-agents/seo/visibility-baseline.js';
import { logger } from '../logger.js';
import { buildExecutionWaves } from './sub-agent-wave-executor.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * SEO deep-dive multi-agent wave based on SSOT instructions.
 */
export async function runSeoDirectorDeepDiveOrchestrator(input: {
  auditId: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
  requestedSubAgentIds?: string[];
}): Promise<DirectorWaveBundle> {
  const allIds = listSeoSubAgentIds();
  const allowed = new Set<string>(allIds);
  const requested = (input.requestedSubAgentIds ?? []).filter((id): id is SeoSubAgentId => allowed.has(id));
  const selected = requested.length > 0 ? expandSeoSelectionWithDependencies(requested) : [...allIds];
  const dependenciesById = buildDependencyMapSeo(selected);
  const waves = buildExecutionWaves(selected, dependenciesById);
  const runtimes = buildSeoAgentRuntime(input.auditId);
  const outputs = new Map<SeoSubAgentId, unknown>();
  const fallback = new Set<SeoSubAgentId>();

  for (const wave of waves) {
    await Promise.all(
      wave.map(async (id) => {
        const runtime = runtimes[id];
        if (!runtime) return;
        try {
          const parsed = await runtime.runSubAgent({
            context: buildSeoSubAgentContext(input.domainKey, input.goals, input.constraints),
            mode: 'standard',
            maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH.standard,
          });
          outputs.set(id, parsed);
        } catch (error) {
          logger.warn('director_seo_orchestrator.sub_agent_fallback_deterministic', {
            sub_agent_id: id,
            domain_key: input.domainKey,
            error: error instanceof Error ? error.message : String(error),
          });
          outputs.set(id, buildDeterministicSeoOutput(id, input));
          fallback.add(id);
        }
      }),
    );
  }

  return buildSeoBundle({
    selected,
    outputs,
    fallback,
    domainKey: input.domainKey,
    constraints: input.constraints,
  });
}

type SeoSubAgentId =
  | 'seo.visibility_baseline'
  | 'seo.technical_indexability'
  | 'seo.ia_internal_links'
  | 'seo.content_intent_coverage'
  | 'seo.serp_ctr_levers'
  | 'seo.authority_trust'
  | 'seo.local_international_readiness'
  | 'seo.measurement_experimentation';

function listSeoSubAgentIds(): SeoSubAgentId[] {
  return DIRECTOR_SUB_AGENTS.filter((row) => row.id.startsWith('seo.')).map((row) => row.id as SeoSubAgentId);
}

function buildSeoSubAgentContext(domainKey: string, goals: string[], constraints: string[]): string {
  return [`Domain: ${domainKey}`, `Goals: ${goals.join('; ') || 'n/a'}`, `Constraints: ${constraints.join('; ') || 'n/a'}`].join('\n');
}

function expandSeoSelectionWithDependencies(selected: SeoSubAgentId[]): SeoSubAgentId[] {
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const allowed = new Set<SeoSubAgentId>(listSeoSubAgentIds());
  const expanded: SeoSubAgentId[] = [];
  const seen = new Set<SeoSubAgentId>();
  const visit = (id: SeoSubAgentId) => {
    if (!allowed.has(id) || seen.has(id)) return;
    const node = byId.get(id);
    if (node) {
      for (const dep of node.depends_on) {
        if (allowed.has(dep as SeoSubAgentId)) visit(dep as SeoSubAgentId);
      }
    }
    if (seen.has(id)) return;
    seen.add(id);
    expanded.push(id);
  };
  for (const id of selected) visit(id);
  return expanded;
}

function buildDependencyMapSeo(selected: SeoSubAgentId[]): Map<SeoSubAgentId, SeoSubAgentId[]> {
  const selectedSet = new Set(selected);
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((item) => [item.id, item] as const));
  const dependencies = new Map<SeoSubAgentId, SeoSubAgentId[]>();
  for (const id of selected) {
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => selectedSet.has(dep as SeoSubAgentId));
    dependencies.set(id, deps as SeoSubAgentId[]);
  }
  return dependencies;
}

function buildSeoAgentRuntime(auditId: string): Record<SeoSubAgentId, DirectorSubAgentBase> {
  return {
    'seo.visibility_baseline': new SeoVisibilityBaselineAgent(auditId),
    'seo.technical_indexability': new SeoTechnicalIndexabilityAgent(auditId),
    'seo.ia_internal_links': new SeoIaInternalLinksAgent(auditId),
    'seo.content_intent_coverage': new SeoContentIntentCoverageAgent(auditId),
    'seo.serp_ctr_levers': new SeoSerpCtrLeversAgent(auditId),
    'seo.authority_trust': new SeoAuthorityTrustAgent(auditId),
    'seo.local_international_readiness': new SeoLocalInternationalReadinessAgent(auditId),
    'seo.measurement_experimentation': new SeoMeasurementExperimentationAgent(auditId),
  };
}

function buildDeterministicSeoOutput(id: SeoSubAgentId, input: { domainKey: string; goals: string[]; constraints: string[] }): unknown {
  const goal = input.goals[0] ?? 'organic growth';
  const constraint = input.constraints[0] ?? 'signal uncertainty';
  switch (id) {
    case 'seo.visibility_baseline':
      return SeoVisibilityBaselineOutputSchema.parse({
        visibility_baseline_summary: `Deterministic visibility baseline for ${input.domainKey}.`,
        structural_constraints: ['query coverage uncertainty', 'SERP share unknown'],
        missing_evidence: [goal],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.technical_indexability':
      return SeoTechnicalIndexabilityOutputSchema.parse({
        technical_indexability_summary: 'Deterministic indexability pass.',
        indexability_blockers: ['crawl path friction', 'canonicals need audit'],
        remediation_priorities: ['normalize crawl directives and sitemap freshness'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.content_intent_coverage':
      return SeoContentIntentCoverageOutputSchema.parse({
        content_intent_summary: 'Deterministic intent-coverage pass.',
        intent_gaps: ['comparison intent', 'problem-aware educational intent'],
        opportunity_clusters: ['map existing pages to intent clusters'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.ia_internal_links':
      return SeoIaInternalLinksOutputSchema.parse({
        ia_linking_summary: 'Deterministic IA and internal-linking pass.',
        discoverability_gaps: ['important pages too deep in click path', 'weak cluster-to-cluster navigation'],
        linking_actions: ['connect core pages with contextual links'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.serp_ctr_levers':
      return SeoSerpCtrLeversOutputSchema.parse({
        serp_ctr_summary: 'Deterministic SERP CTR pass.',
        ctr_levers: ['snippet quality inconsistency', 'weak title-intent matching'],
        snippet_tests: ['optimize title-description pairings for high intent'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.authority_trust':
      return SeoAuthorityTrustOutputSchema.parse({
        authority_trust_summary: `Deterministic authority and trust pass under ${constraint}.`,
        trust_gaps: ['insufficient external trust signals', 'limited source citation consistency'],
        credibility_actions: ['publish trust artifacts for high-value pages'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.local_international_readiness':
      return SeoLocalInternationalReadinessOutputSchema.parse({
        local_international_summary: 'Deterministic local/international readiness pass.',
        readiness_gaps: ['hreflang governance unclear', 'locale content parity gaps'],
        expansion_prerequisites: ['define locale ownership and QA checkpoints'],
        analysis_mode: 'deterministic_fallback',
      });
    case 'seo.measurement_experimentation':
      return SeoMeasurementExperimentationOutputSchema.parse({
        measurement_experimentation_summary: `Deterministic experimentation plan for ${goal}.`,
        kpi_tree: ['missing controlled baselines', 'attribution depth unknown'],
        experiment_backlog: ['define hypothesis and holdout policy for major changes'],
        analysis_mode: 'deterministic_fallback',
      });
  }
}

function buildSeoBundle(input: {
  selected: SeoSubAgentId[];
  outputs: Map<SeoSubAgentId, unknown>;
  fallback: ReadonlySet<SeoSubAgentId>;
  domainKey: string;
  constraints: string[];
}): DirectorWaveBundle {
  const score = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;
  const byId = new Map(DIRECTOR_SUB_AGENTS.map((row) => [row.id, row] as const));
  const actions = input.selected.map((id) => {
    const raw = input.outputs.get(id);
    const node = byId.get(id);
    const deps = (node?.depends_on ?? []).filter((dep) => input.selected.includes(dep as SeoSubAgentId));
    const summary = readSummary(raw);
    const detail = readDetailList(raw).slice(0, 3).join(' | ') || 'No additional details';
    return {
      id: `sub_agent:${id}:${input.domainKey}`,
      title: `${id.replace('seo.', 'SEO ')} — ${summary.slice(0, 90)}`,
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
    zones: [input.domainKey, 'seo_digital'],
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
