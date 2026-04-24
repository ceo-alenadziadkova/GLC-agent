import { describe, expect, it } from 'vitest';

import {
  ORCHESTRATION_DOMAIN_CONFLICT_RULES,
  resolveOrchestrationDomainConflictRule,
} from '../config/orchestration-domain-conflict-policy.js';

describe('orchestration-domain-conflict-policy', () => {
  it('resolves known pairs regardless of argument order', () => {
    const a = resolveOrchestrationDomainConflictRule('marketing_utp', 'tech_infrastructure');
    const b = resolveOrchestrationDomainConflictRule('tech_infrastructure', 'marketing_utp');
    expect(a?.id).toBe('growth_vs_tech');
    expect(b?.id).toBe('growth_vs_tech');
  });

  it('returns null for same domain or unrelated pair', () => {
    expect(resolveOrchestrationDomainConflictRule('seo_digital', 'seo_digital')).toBeNull();
    expect(resolveOrchestrationDomainConflictRule('seo_digital', 'automation_processes')).toBeNull();
  });

  it('keeps every rule as a two-domain pair', () => {
    for (const rule of ORCHESTRATION_DOMAIN_CONFLICT_RULES) {
      expect(rule.domains.length).toBe(2);
      expect(rule.domains[0]).not.toBe(rule.domains[1]);
    }
  });
});
