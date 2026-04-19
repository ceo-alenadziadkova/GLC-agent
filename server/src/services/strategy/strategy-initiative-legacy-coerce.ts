import type { DomainKey } from '@glc/intake-core';
import { DOMAIN_KEYS } from '@glc/intake-core';
import type { z } from 'zod';

import {
  STRATEGY_LEGACY_COERCE_DEFAULTS,
  STRATEGY_INITIATIVE_DOMAIN_KEYS,
  STRATEGY_INITIATIVE_LIMITS,
  type StrategyCompanyStage,
  type StrategyInitiativeDomainKey,
} from '../../config/strategy-initiative-policy.js';
import { StrategyInitiativeSchema } from '../../schemas/domain-output.js';
import type { StrategyBriefConstraintSnapshot } from './strategy-brief-constraint-snapshot.js';

export type StrategyInitiativeV2 = z.infer<typeof StrategyInitiativeSchema>;

const AUDIT_DOMAIN_KEYS = new Set<string>(DOMAIN_KEYS);
const INITIATIVE_DOMAIN_SET = new Set<string>(STRATEGY_INITIATIVE_DOMAIN_KEYS);

function impactToPriority(impact: 'high' | 'medium' | 'low'): StrategyInitiativeV2['priority'] {
  if (impact === 'high') return 'high';
  if (impact === 'low') return 'low';
  return 'medium';
}

function pickDomainFromText(title: string, description: string): StrategyInitiativeDomainKey {
  const t = `${title} ${description}`.toLowerCase();
  if (/(seo|search|organic|serp)/i.test(t)) return 'seo_digital';
  if (/(security|compliance|gdpr|ssl|headers)/i.test(t)) return 'security_compliance';
  if (/(ux|conversion|cta|landing|checkout|funnel)/i.test(t)) return 'ux_conversion';
  if (/(market|brand|content|ads|campaign|messaging)/i.test(t)) return 'marketing_utp';
  if (/(automation|workflow|crm|zapier|integration|api)/i.test(t)) return 'automation_processes';
  if (/(infra|hosting|cdn|performance|stack|tech|devops)/i.test(t)) return 'tech_infrastructure';
  return STRATEGY_LEGACY_COERCE_DEFAULTS.domain;
}

function evidenceDomainKey(initiativeDomain: StrategyInitiativeDomainKey): DomainKey {
  if (AUDIT_DOMAIN_KEYS.has(initiativeDomain)) return initiativeDomain as DomainKey;
  return 'tech_infrastructure';
}

/**
 * Upgrades a legacy initiative record (pre v2 schema) into the v2 shape for API/UI.
 */
export function coerceLegacyStrategyInitiative(
  raw: Record<string, unknown>,
  brief: StrategyBriefConstraintSnapshot,
): StrategyInitiativeV2 {
  const L = STRATEGY_INITIATIVE_LIMITS;
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, L.idMaxLength)
      : `legacy-${Math.random().toString(36).slice(2, 10)}`;
  const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
  const title =
    rawTitle.length >= L.titleMinLength
      ? rawTitle.slice(0, L.titleMaxLength)
      : 'Initiative'.slice(0, L.titleMaxLength);
  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim().slice(0, L.descriptionMaxLength)
      : '—';
  const impact = raw.impact === 'high' || raw.impact === 'low' || raw.impact === 'medium' ? raw.impact : 'medium';
  const effort = raw.effort === 'high' || raw.effort === 'low' || raw.effort === 'medium' ? raw.effort : 'medium';
  const deps = Array.isArray(raw.dependencies)
    ? raw.dependencies
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map(d => d.trim().slice(0, L.idMaxLength))
        .slice(0, L.dependenciesMax)
    : undefined;

  const domain: StrategyInitiativeDomainKey =
    typeof raw.domain === 'string' && INITIATIVE_DOMAIN_SET.has(raw.domain)
      ? (raw.domain as StrategyInitiativeDomainKey)
      : pickDomainFromText(title, description);

  const stage: StrategyCompanyStage =
    raw.stage === 'idea' ||
    raw.stage === 'mvp' ||
    raw.stage === 'growth' ||
    raw.stage === 'scale' ||
    raw.stage === 'stabilization'
      ? raw.stage
      : brief.company_stage;

  const coerced = {
    id,
    title,
    description,
    domain,
    stage,
    priority: impactToPriority(impact),
    impact,
    effort,
    confidence: STRATEGY_LEGACY_COERCE_DEFAULTS.confidence,
    context: {
      signals: [description.slice(0, L.bulletMaxLength)],
    },
    outcome: {
      description: `Address gaps described in: ${title}`.slice(0, L.outcomeDescriptionMaxLength),
    },
    scope: {
      includes: [title.slice(0, L.bulletMaxLength)],
      excludes: ['Unscoped work outside this initiative'.slice(0, L.bulletMaxLength)],
    },
    execution_paths: [
      {
        type: 'fast' as const,
        description: 'Pragmatic first iteration using existing tools and a minimal change set.'.slice(
          0,
          L.pathDescriptionMaxLength,
        ),
        time_estimate: '1–2 weeks'.slice(0, L.pathTimeEstimateMaxLength),
        tools: [] as string[],
      },
      {
        type: 'balanced' as const,
        description: 'Structured rollout with validation checkpoints.'.slice(0, L.pathDescriptionMaxLength),
        time_estimate: '3–6 weeks'.slice(0, L.pathTimeEstimateMaxLength),
      },
    ],
    dependencies: deps,
    decision: {
      why_this: [`Derived from audit roadmap item: ${title}`.slice(0, L.bulletMaxLength)],
      if_skipped: ['Underlying gaps may persist and compound downstream work.'.slice(0, L.bulletMaxLength)],
    },
    evidence: {
      sources: [
        {
          domain_key: evidenceDomainKey(domain),
          signal: title.slice(0, L.bulletMaxLength),
        },
      ],
    },
  };

  const parsed = StrategyInitiativeSchema.safeParse(coerced);
  if (parsed.success) return parsed.data;

  return StrategyInitiativeSchema.parse({
    id,
    title,
    description,
    domain: STRATEGY_LEGACY_COERCE_DEFAULTS.domain,
    stage: brief.company_stage,
    priority: STRATEGY_LEGACY_COERCE_DEFAULTS.priority,
    impact: 'medium',
    effort: 'medium',
    confidence: STRATEGY_LEGACY_COERCE_DEFAULTS.confidence,
    context: { signals: [description.slice(0, L.bulletMaxLength)] },
    outcome: { description: title.slice(0, L.outcomeDescriptionMaxLength) },
    scope: {
      includes: [title.slice(0, L.bulletMaxLength)],
      excludes: ['Out of scope: undecided follow-on work'.slice(0, L.bulletMaxLength)],
    },
    execution_paths: [
      {
        type: 'fast',
        description: 'Incremental improvements with existing stack.',
        time_estimate: '2 weeks',
      },
    ],
    decision: {
      why_this: ['Recovered from legacy roadmap record with incomplete fields.'],
    },
    evidence: { sources: [{ domain_key: 'tech_infrastructure', signal: title.slice(0, L.bulletMaxLength) }] },
  });
}
