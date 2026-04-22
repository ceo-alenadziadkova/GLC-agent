import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';
import {
  filterMissingDomainsForExecutionPlan,
  unansweredPrimaryBankIdsForCoverageDomains,
} from '../core/intake-readiness-execution-scope.js';
import { evaluateIntakeReadinessEnvelope } from '../core/intake-readiness-envelope.js';

describe('intake-readiness-execution-scope', () => {
  it('keeps recon in scoped missing domains regardless of selected_domains', () => {
    expect(
      filterMissingDomainsForExecutionPlan({
        missingForReport: ['recon', 'ux_conversion'],
        executionSelectedDomains: ['tech_infrastructure'],
        executionIncludeStrategy: false,
      }),
    ).toEqual(['recon']);
  });

  it('includes strategy slice only when executionIncludeStrategy is true', () => {
    expect(
      filterMissingDomainsForExecutionPlan({
        missingForReport: ['strategy', 'ux_conversion'],
        executionSelectedDomains: ['ux_conversion'],
        executionIncludeStrategy: false,
      }),
    ).toEqual(['ux_conversion']);
    expect(
      filterMissingDomainsForExecutionPlan({
        missingForReport: ['strategy'],
        executionSelectedDomains: [],
        executionIncludeStrategy: true,
      }),
    ).toEqual(['strategy']);
  });

  it('lists unanswered bank ids whose primary feed intersects the domain set', () => {
    const tuple = currentIntakeVersionTuple();
    const responses: Record<string, unknown> = {};
    const plan = buildIntakePlan({
      responses,
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: tuple,
    });
    const ids = unansweredPrimaryBankIdsForCoverageDomains({
      domains: ['ux_conversion'],
      slaVisibleBankIds: plan.slaVisibleBankIds,
      responses,
    });
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => plan.slaVisibleBankIds.includes(id))).toBe(true);
  });

  it('adds execution_plan_coverage_scope_active trace when scope inputs are active', () => {
    const tuple = currentIntakeVersionTuple();
    const responses: Record<string, unknown> = {
      a2: 'Healthcare',
      a5: 'multi_page_website',
      a1: 'https://hotel.example',
      a6: 'Yes',
      a10: ['One-time services (projects, consulting)'],
      b1: 'Boutique hotel groups',
      f1: ['Too much manual work and operational overload'],
      f2: ['Website performance and technology (speed, stability, technical health)'],
      d2: 'Managing team tasks and handoffs',
      d_closing_flow: ['I send a quote or price manually'],
    };
    const env = evaluateIntakeReadinessEnvelope({
      responses,
      slaProductMode: 'express',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: tuple,
      enforcementPoint: 'pipeline_start',
      applyExecutionPlanCoverageScope: true,
      executionSelectedDomains: ['tech_infrastructure'],
      executionIncludeStrategy: false,
      executionCoveragePackage: 'pro',
    });
    expect(env.trace.some(t => t.code === 'execution_plan_coverage_scope_active')).toBe(true);
  });
});
