/**
 * New audit wizard — coverage domain labels and industry → domain recommendations (static front policy).
 */

import type { AuditCoveragePackage, AuditDepth, DomainKey } from '../data/auditTypes';

export const NEW_AUDIT_ALL_COVERAGE_DOMAINS: DomainKey[] = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
];

export const NEW_AUDIT_COVERAGE_DOMAIN_LABELS: Record<DomainKey, string> = {
  tech_infrastructure: 'Tech Infrastructure',
  security_compliance: 'Security & Compliance',
  seo_digital: 'SEO & Digital',
  ux_conversion: 'UX & Conversion',
  marketing_utp: 'Marketing & Positioning',
  automation_processes: 'Automation & Processes',
};

export const NEW_AUDIT_INDUSTRY_DOMAIN_RECOMMENDATIONS: Record<string, DomainKey[]> = {
  'E-commerce': ['ux_conversion', 'seo_digital', 'automation_processes'],
  Hospitality: ['ux_conversion', 'marketing_utp', 'seo_digital'],
  Healthcare: ['security_compliance', 'tech_infrastructure', 'ux_conversion'],
  'SaaS / Technology': ['tech_infrastructure', 'security_compliance', 'automation_processes'],
  'Professional Services': ['marketing_utp', 'ux_conversion', 'automation_processes'],
};

/** Fallback recommended domains when industry is missing / unknown. */
export const NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS: DomainKey[] = ['tech_infrastructure', 'ux_conversion'];

/** Fallback selected domain when Starter package has no prior user selection. */
export const NEW_AUDIT_STARTER_FALLBACK_DOMAIN: DomainKey = 'tech_infrastructure';

/** Default Pro package baseline when no domains were selected yet. */
export const NEW_AUDIT_PRO_FALLBACK_SELECTION: DomainKey[] = [
  'tech_infrastructure',
  'security_compliance',
];

export const NEW_AUDIT_COVERAGE_DOMAIN_COUNT_HINT: Record<AuditCoveragePackage, string> = {
  starter: '1 domain',
  pro: '2-3 domains',
  complete: 'All domains',
};

export const NEW_AUDIT_COVERAGE_PACKAGE_DEPTH: Record<AuditCoveragePackage, AuditDepth> = {
  starter: 'light',
  pro: 'standard',
  complete: 'deep',
};

export const NEW_AUDIT_COVERAGE_SELECTION_LIMITS: Record<AuditCoveragePackage, { min: number; max: number }> = {
  starter: { min: 1, max: 1 },
  pro: { min: 2, max: 3 },
  complete: {
    min: NEW_AUDIT_ALL_COVERAGE_DOMAINS.length,
    max: NEW_AUDIT_ALL_COVERAGE_DOMAINS.length,
  },
};
