import { describe, expect, it } from 'vitest';
import { executionPlanToPhases } from '../types/audit.js';
import { defaultExecutionPlanForMode, normalizeExecutionPlan } from '../services/execution-plan.js';

describe('execution-plan', () => {
  it('builds full coverage plan from default mode mapping', () => {
    const plan = defaultExecutionPlanForMode('full');
    expect(plan.selected_domains).toHaveLength(6);
    expect(plan.include_strategy).toBe(true);
    expect(executionPlanToPhases(plan)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('normalizes starter package to single domain and no strategy', () => {
    const plan = normalizeExecutionPlan(
      {
        selected_domains: ['tech_infrastructure', 'seo_digital'],
        coverage_package: 'starter',
        source: 'user_selected',
      },
      'full',
    );
    expect(plan.selected_domains).toEqual(['tech_infrastructure']);
    expect(plan.include_strategy).toBe(false);
    expect(plan.depth).toBe('light');
  });

  it('keeps pro package bounded to three domains', () => {
    const plan = normalizeExecutionPlan(
      {
        selected_domains: [
          'tech_infrastructure',
          'security_compliance',
          'seo_digital',
          'ux_conversion',
        ],
        coverage_package: 'pro',
        depth: 'standard',
        source: 'user_selected',
      },
      'full',
    );
    expect(plan.selected_domains).toEqual([
      'tech_infrastructure',
      'security_compliance',
      'seo_digital',
    ]);
    expect(executionPlanToPhases(plan)).toEqual([0, 1, 2, 3, 7]);
  });

  it('normalizes pro package to at least two domains', () => {
    const plan = normalizeExecutionPlan(
      {
        selected_domains: ['seo_digital'],
        coverage_package: 'pro',
        source: 'user_selected',
      },
      'full',
    );
    expect(plan.selected_domains).toEqual(['tech_infrastructure', 'security_compliance']);
    expect(plan.include_strategy).toBe(true);
  });

  it('forces starter strategy off even when requested', () => {
    const plan = normalizeExecutionPlan(
      {
        selected_domains: ['security_compliance'],
        coverage_package: 'starter',
        include_strategy: true,
        source: 'user_selected',
      },
      'full',
    );
    expect(plan.selected_domains).toEqual(['security_compliance']);
    expect(plan.include_strategy).toBe(false);
  });

  it('runs only explicitly selected pro domains', () => {
    const plan = normalizeExecutionPlan(
      {
        selected_domains: ['ux_conversion', 'seo_digital'],
        coverage_package: 'pro',
        depth: 'standard',
        source: 'user_selected',
      },
      'full',
    );
    expect(plan.selected_domains).toEqual(['seo_digital', 'ux_conversion']);
    expect(executionPlanToPhases(plan)).toEqual([0, 3, 4, 7]);
    expect(executionPlanToPhases(plan)).not.toContain(1);
    expect(executionPlanToPhases(plan)).not.toContain(2);
    expect(executionPlanToPhases(plan)).not.toContain(5);
    expect(executionPlanToPhases(plan)).not.toContain(6);
  });
});
