export const AUDIT_DOMAIN_ORDER = [
  'recon',
  'tech-infrastructure',
  'security',
  'seo',
  'ux',
  'marketing',
  'automation',
  'strategy',
] as const;

export type AuditDomainId = (typeof AUDIT_DOMAIN_ORDER)[number];
