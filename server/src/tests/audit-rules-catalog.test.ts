/**
 * Audit YAML drift guard: evaluator wiring + ADR category weight budget (30/30/20/20).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getAuditRules, getAuditRulesCatalogVersion, resetAuditRulesCache } from '../snapshot/audit/parse-audit-rules.js';
import { SNAPSHOT_AUDIT_EVALUATOR_NAMES } from '../snapshot/audit/evaluators.js';

const CATEGORY_TARGETS = {
  ux_clarity: 30,
  conversion_readiness: 30,
  ai_readiness: 20,
  technical_basics: 20,
} as const;

describe('audit rules catalog (YAML)', () => {
  beforeEach(() => {
    resetAuditRulesCache();
  });

  it('exposes catalog version matching packaged rules file', () => {
    expect(getAuditRulesCatalogVersion()).toBe(4);
  });

  it('ships the full ADR-style 36-rule grid', () => {
    expect(getAuditRules()).toHaveLength(36);
  });

  it('registers every evaluator referenced in YAML', () => {
    const rules = getAuditRules();
    const names = new Set(SNAPSHOT_AUDIT_EVALUATOR_NAMES);
    for (const r of rules) {
      expect(names.has(r.evaluator), `evaluator not in registry: ${r.evaluator}`).toBe(true);
    }
  });

  it('sums maxPoints per category to ADR 30/30/20/20', () => {
    const rules = getAuditRules();
    const sums = {
      ux_clarity: 0,
      conversion_readiness: 0,
      ai_readiness: 0,
      technical_basics: 0,
    };
    for (const r of rules) {
      sums[r.category] += r.maxPoints;
    }
    expect(sums.ux_clarity).toBe(CATEGORY_TARGETS.ux_clarity);
    expect(sums.conversion_readiness).toBe(CATEGORY_TARGETS.conversion_readiness);
    expect(sums.ai_readiness).toBe(CATEGORY_TARGETS.ai_readiness);
    expect(sums.technical_basics).toBe(CATEGORY_TARGETS.technical_basics);
  });
});
