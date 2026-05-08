import { describe, it, expect } from 'vitest';
import type { AuditExecutionPlan } from '../types/audit/execution-plan.js';
import { executionPlanToPhases, reviewPhasesForExecutionPlan } from './audit-phase-policy.js';

function plan(partial: Partial<AuditExecutionPlan>): AuditExecutionPlan {
  return {
    selected_domains: partial.selected_domains ?? [],
    depth: partial.depth ?? 'standard',
    source: partial.source ?? 'user_selected',
    coverage_package: partial.coverage_package,
    include_strategy: partial.include_strategy,
    recommended_domains: partial.recommended_domains ?? [],
  };
}

describe('reviewPhasesForExecutionPlan — partial coverage', () => {
  it('gates after highest selected auto-phase (Tech + Automation + Strategy)', () => {
    const p = plan({
      selected_domains: ['tech_infrastructure', 'automation_processes'],
      coverage_package: 'pro',
      include_strategy: true,
    });
    expect(executionPlanToPhases(p)).toEqual([0, 1, 6, 7]);
    expect(reviewPhasesForExecutionPlan(p)).toEqual([0, 1, 7]);
  });

  it('full auto wing keeps gate after phase 4', () => {
    const domains: AuditExecutionPlan['selected_domains'] = [
      'tech_infrastructure',
      'security_compliance',
      'seo_digital',
      'ux_conversion',
      'marketing_utp',
      'automation_processes',
    ];
    const p = plan({ selected_domains: domains, coverage_package: 'complete', include_strategy: true });
    expect(reviewPhasesForExecutionPlan(p)).toContain(4);
    expect(reviewPhasesForExecutionPlan(p)).toContain(7);
  });

  it('starter single UX domain gates after UX phase', () => {
    const p = plan({
      selected_domains: ['ux_conversion'],
      coverage_package: 'starter',
      include_strategy: false,
    });
    expect(reviewPhasesForExecutionPlan(p)).toEqual([0, 4]);
  });
});
