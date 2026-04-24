import {
  CAO_MATERIALIZED_PROMPT_REFS,
  CDO_MATERIALIZED_PROMPT_REFS,
  CSO_MATERIALIZED_PROMPT_REFS,
  CTO_MATERIALIZED_PROMPT_REFS,
  SEO_MATERIALIZED_PROMPT_REFS,
} from '../../config/director-domain-materialized-prompt-refs.js';
import { DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES } from '../../config/director-orchestration-policy.js';
import type { CaoDeepDiveRoute } from './director-cao-router.service.js';
import type { CdoDeepDiveCase } from './director-cdo-router.service.js';
import type { CsoDeepDiveCase } from './director-cso-router.service.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

const s = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;

/**
 * Deterministic CDO deep wave from router case (MVP: funnel / friction / experimentation lanes).
 * No LLM — replaces generic stub when `FEATURE_DIRECTOR_CDO_SUB_AGENTS` is on.
 */
export function buildCdoMaterializedWaveBundle(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
  cdoCase: CdoDeepDiveCase;
}): DirectorWaveBundle {
  const caseLabel: Record<CdoDeepDiveCase, string> = {
    greenfield: 'Greenfield / launch funnel',
    optimization: 'Conversion optimization',
    expansion: 'Expansion & scale funnel',
  };
  const g0 = input.goals[0] ?? 'Stated goals';
  const c0 = input.constraints[0] ?? 'Constraints';
  const primaryId = `sub_agent:cdo.funnel_architect:${input.domainKey}`;
  const frictionId = `sub_agent:cdo.friction:${input.domainKey}`;
  const expId = `sub_agent:cdo.experimentation:${input.domainKey}`;
  return {
    zones: [input.domainKey, 'ux_conversion', `cdo_case:${input.cdoCase}`],
    bottlenecks: [`Funnel context: ${caseLabel[input.cdoCase]}`],
    risks: input.constraints.slice(0, 3),
    actions: [
      {
        id: primaryId,
        title: `Funnel architecture — ${caseLabel[input.cdoCase]}`,
        description: `Sequence stages and metrics for: ${g0}. Heuristic case: ${input.cdoCase}.`,
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [],
        evidence: {
          derived: [CDO_MATERIALIZED_PROMPT_REFS.funnel_architect],
          observed: input.goals.slice(0, 2),
          assumed: [c0],
        },
      },
      {
        id: frictionId,
        title: 'Friction & drop-off map',
        description: 'List top friction points across landing → activation; tie each to a measurable event.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [primaryId],
        evidence: {
          derived: [CDO_MATERIALIZED_PROMPT_REFS.friction],
          observed: input.constraints.slice(0, 2),
          assumed: [],
        },
      },
      {
        id: expId,
        title: 'Experiment backlog (A/B or sequential)',
        description: 'Prioritize 3 tests with success metrics and decision windows.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [frictionId],
        evidence: {
          derived: [CDO_MATERIALIZED_PROMPT_REFS.experimentation],
          observed: [],
          assumed: ['Deterministic CDO pass — review with product'],
        },
      },
    ],
  };
}

/**
 * CAO: Discovery process map, automation candidates, throughput synthesis (MVP zones).
 */
export function buildCaoMaterializedWaveBundle(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
  route: CaoDeepDiveRoute;
}): DirectorWaveBundle {
  const mapId = `sub_agent:cao.process_map:${input.domainKey}`;
  const autoId = `sub_agent:cao.automation_candidates:${input.domainKey}`;
  const thrId = `sub_agent:cao.throughput:${input.domainKey}`;
  return {
    zones: [input.domainKey, 'automation_processes', `cao_stage:${input.route.zone_stage}`],
    bottlenecks: [
      `Stage: ${input.route.zone_stage} · focus: ${input.route.zone_focus}`,
    ],
    risks: input.constraints.slice(0, 3),
    actions: [
      {
        id: mapId,
        title: `Process map — ${input.route.zone_stage}`,
        description: `Document critical paths and handoffs for: ${input.goals[0] ?? 'stated goals'}.`,
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [],
        evidence: {
          derived: [CAO_MATERIALIZED_PROMPT_REFS.process_map],
          observed: input.goals.slice(0, 2),
          assumed: input.constraints.slice(0, 2),
        },
      },
      {
        id: autoId,
        title: 'Automation candidates (ranked)',
        description: 'Candidate workflows for automation with expected cycle-time delta.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [mapId],
        evidence: {
          derived: [CAO_MATERIALIZED_PROMPT_REFS.automation_candidates],
          observed: [],
          assumed: ['Heuristic route — validate with operations'],
        },
      },
      {
        id: thrId,
        title: 'Throughput & WIP guardrails',
        description: 'Synthesis: constraints, SLAs, and top 3 throughput risks.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [autoId],
        evidence: {
          derived: [CAO_MATERIALIZED_PROMPT_REFS.throughput],
          observed: [],
          assumed: input.constraints.slice(0, 2),
        },
      },
    ],
  };
}

const CSO_CASE_LABEL: Record<CsoDeepDiveCase, string> = {
  A_zero_knowledge: 'Zero external knowledge — policy-first',
  B_regulated: 'Regulated industry — control mapping',
  C_data_heavy: 'Data-heavy — lineage & access',
  D_incident: 'Incident / recovery posture',
};

/**
 * CSO: Case classification, threat model, compliance map (MVP).
 */
export function buildCsoMaterializedWaveBundle(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
  csoCase: CsoDeepDiveCase;
}): DirectorWaveBundle {
  const cls = `sub_agent:cso.case_classifier:${input.domainKey}`;
  const tm = `sub_agent:cso.threat_model:${input.domainKey}`;
  const cm = `sub_agent:cso.compliance_map:${input.domainKey}`;
  return {
    zones: [input.domainKey, 'security_compliance', `cso_case:${input.csoCase}`],
    bottlenecks: [CSO_CASE_LABEL[input.csoCase]],
    risks: input.constraints.slice(0, 3),
    actions: [
      {
        id: cls,
        title: 'Case & scope lock',
        description: CSO_CASE_LABEL[input.csoCase],
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [],
        evidence: {
          derived: [CSO_MATERIALIZED_PROMPT_REFS.case_classifier],
          observed: input.goals.slice(0, 2),
          assumed: input.constraints.slice(0, 2),
        },
      },
      {
        id: tm,
        title: 'Threat model (abridged)',
        description: 'Assets, actors, and top failure modes given stated goals and constraints.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [cls],
        evidence: {
          derived: [CSO_MATERIALIZED_PROMPT_REFS.threat_model],
          observed: [],
          assumed: ['Deterministic CSO pass — no external crawl'],
        },
      },
      {
        id: cm,
        title: 'Compliance / control map',
        description: 'Map obligations to controls and evidence gaps; prioritize by blast radius.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [tm],
        evidence: {
          derived: [CSO_MATERIALIZED_PROMPT_REFS.compliance_map],
          observed: [],
          assumed: [CSO_CASE_LABEL[input.csoCase]],
        },
      },
    ],
  };
}

/**
 * CTO: deterministic infra/readiness stub for `tech_infrastructure` deep-dive (no LLM).
 */
export function buildCtoMaterializedWaveBundle(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const primaryId = `sub_agent:cto.readiness:${input.domainKey}`;
  return {
    zones: [input.domainKey, 'tech_infrastructure'],
    bottlenecks: ['Reliability, delivery cadence, and technical debt hotspots (heuristic stub)'],
    risks: input.constraints.slice(0, 3),
    actions: [
      {
        id: primaryId,
        title: 'Infrastructure & delivery readiness',
        description: `Prioritize foundations for: ${input.goals[0] ?? 'stated goals'}. Validate SLAs, environments, and release risk.`,
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [],
        evidence: {
          derived: [CTO_MATERIALIZED_PROMPT_REFS.readiness],
          observed: input.goals.slice(0, 2),
          assumed: input.constraints.slice(0, 2),
        },
      },
    ],
  };
}

/**
 * SEO: deterministic visibility stub for `seo_digital` deep-dive (no LLM).
 */
export function buildSeoMaterializedWaveBundle(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const primaryId = `sub_agent:seo.visibility:${input.domainKey}`;
  return {
    zones: [input.domainKey, 'seo_digital'],
    bottlenecks: ['Discoverability, crawl/index health, and on-page intent match (heuristic stub)'],
    risks: input.constraints.slice(0, 3),
    actions: [
      {
        id: primaryId,
        title: 'SEO & digital visibility layer',
        description: `Clarify measurable SEO outcomes for: ${input.goals[0] ?? 'stated goals'}. Focus on technical + content signals without inventing rankings.`,
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [],
        evidence: {
          derived: [SEO_MATERIALIZED_PROMPT_REFS.visibility],
          observed: input.goals.slice(0, 2),
          assumed: input.constraints.slice(0, 2),
        },
      },
    ],
  };
}
