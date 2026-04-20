import { describe, expect, it } from 'vitest';
import { ORCHESTRATION_COMMERCIAL_POLICY } from '../config/orchestration-commercial-policy.js';
import { buildOrchestrationCommercialOffer } from '../services/orchestration/orchestration-commercial-offer.service.js';

describe('buildOrchestrationCommercialOffer', () => {
  it('returns waiting-list driven offers and recalculated preview when accepted', () => {
    const result = buildOrchestrationCommercialOffer({
      executionPlan: {
        selected_domains: ['seo_digital'],
        recommended_domains: ['marketing_utp'],
      },
      request: {
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      },
    });
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.recalculated_preview).not.toBeNull();
    expect(result.accepted_pack_result).toBeNull();
  });

  it('does not recalculate when accepted domain is already in selected coverage', () => {
    const result = buildOrchestrationCommercialOffer({
      executionPlan: {
        selected_domains: ['seo_digital', 'marketing_utp'],
        recommended_domains: ['marketing_utp'],
      },
      request: {
        selected_domains: ['seo_digital', 'marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        accept_domain: 'marketing_utp',
      },
    });
    expect(result.accepted_domain).toBe('marketing_utp');
    expect(result.recalculated_preview).toBeNull();
  });

  it('respects max suggested domains cap and formats value messages', () => {
    const result = buildOrchestrationCommercialOffer({
      executionPlan: {
        selected_domains: ['seo_digital'],
        recommended_domains: ['marketing_utp', 'ux_conversion', 'security_compliance', 'tech_infrastructure'],
      },
      request: {
        selected_domains: ['seo_digital'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    expect(result.offers.length).toBeLessThanOrEqual(ORCHESTRATION_COMMERCIAL_POLICY.maxSuggestedDomains);
    for (const offer of result.offers) {
      expect(offer.value_message.length).toBeGreaterThan(0);
      expect(offer.estimated_incremental_effort_weeks).toBe(ORCHESTRATION_COMMERCIAL_POLICY.defaultIncrementalEffortWeeks);
    }
  });
});
