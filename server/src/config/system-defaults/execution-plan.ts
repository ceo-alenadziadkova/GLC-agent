export const SYSTEM_DEFAULTS_EXECUTION_PLAN = {
  proMaxDomains: 3,
  proMinDomains: 2,
  defaultStarterDomain: 'tech_infrastructure',
  defaultProDomains: ['tech_infrastructure', 'security_compliance'] as const,
} as const;
