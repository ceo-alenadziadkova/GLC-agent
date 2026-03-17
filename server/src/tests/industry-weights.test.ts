/**
 * Smoke tests: calculateWeightedScore() and getDomainWeight()
 *
 * Verifies industry weight application and the weighted overall score
 * calculation that drives the main audit score.
 */
import { describe, it, expect } from 'vitest';
import { getDomainWeight, calculateWeightedScore } from '../config/industry-weights.js';

// ─── getDomainWeight ───────────────────────────────────────────────────────

describe('getDomainWeight', () => {
  it('returns 1.0 for unknown industry', () => {
    expect(getDomainWeight('unknown_industry', 'tech_infrastructure')).toBe(1.0);
  });

  it('returns 1.0 for null industry', () => {
    expect(getDomainWeight(null, 'security_compliance')).toBe(1.0);
  });

  it('returns 1.0 for domain not specified in industry map', () => {
    // hospitality doesn't have security_compliance weight
    expect(getDomainWeight('hospitality', 'security_compliance')).toBe(1.0);
  });

  it('healthcare: security_compliance = 1.6 (highest weight)', () => {
    expect(getDomainWeight('healthcare', 'security_compliance')).toBe(1.6);
  });

  it('healthcare: ux_conversion = 1.3', () => {
    expect(getDomainWeight('healthcare', 'ux_conversion')).toBe(1.3);
  });

  it('healthcare: tech_infrastructure = 1.2', () => {
    expect(getDomainWeight('healthcare', 'tech_infrastructure')).toBe(1.2);
  });

  it('hospitality: ux_conversion = 1.5', () => {
    expect(getDomainWeight('hospitality', 'ux_conversion')).toBe(1.5);
  });

  it('normalization: "Healthcare" → matches "healthcare"', () => {
    // getDomainWeight lowercases and replaces spaces/& with _
    expect(getDomainWeight('Healthcare', 'security_compliance')).toBe(1.6);
  });
});

// ─── calculateWeightedScore ───────────────────────────────────────────────

describe('calculateWeightedScore', () => {
  it('returns 0 for empty domain list', () => {
    expect(calculateWeightedScore([], 'healthcare')).toBe(0);
  });

  it('returns exact score for single domain (no weighting effect on single item)', () => {
    const result = calculateWeightedScore(
      [{ domain_key: 'security_compliance', score: 4 }],
      'healthcare'
    );
    // 4 * 1.6 / 1.6 = 4.0
    expect(result).toBe(4.0);
  });

  it('uniform scores with null industry → simple average', () => {
    const scores = [
      { domain_key: 'tech_infrastructure' as const, score: 3 },
      { domain_key: 'security_compliance' as const, score: 3 },
      { domain_key: 'seo_digital' as const, score: 3 },
    ];
    // All weights = 1.0 → average = 3.0
    expect(calculateWeightedScore(scores, null)).toBe(3.0);
  });

  it('healthcare Son Espases scenario: weighted score ≈ 2.2', () => {
    // From the demo seed: all 6 domains, healthcare weights
    const scores = [
      { domain_key: 'tech_infrastructure' as const, score: 2 },
      { domain_key: 'security_compliance' as const, score: 3 },
      { domain_key: 'seo_digital' as const, score: 2 },
      { domain_key: 'ux_conversion' as const, score: 2 },
      { domain_key: 'marketing_utp' as const, score: 2 },
      { domain_key: 'automation_processes' as const, score: 2 },
    ];
    const result = calculateWeightedScore(scores, 'healthcare');
    // Manual calc: (2*1.2 + 3*1.6 + 2*1.0 + 2*1.3 + 2*1.0 + 2*1.1) / (1.2+1.6+1.0+1.3+1.0+1.1)
    //           = (2.4 + 4.8 + 2.0 + 2.6 + 2.0 + 2.2) / 7.2
    //           = 16.0 / 7.2 ≈ 2.22 → rounds to 2.2
    expect(result).toBe(2.2);
  });

  it('high-security domain scores higher in healthcare than hospitality', () => {
    const scores = [
      { domain_key: 'security_compliance' as const, score: 5 },
      { domain_key: 'ux_conversion' as const, score: 2 },
    ];
    const healthcareScore = calculateWeightedScore(scores, 'healthcare');
    const hospitalityScore = calculateWeightedScore(scores, 'hospitality');
    // healthcare weights security more (1.6 vs 1.0) → should pull score higher
    expect(healthcareScore).toBeGreaterThan(hospitalityScore);
  });

  it('rounds result to 1 decimal place', () => {
    const scores = [
      { domain_key: 'tech_infrastructure' as const, score: 1 },
      { domain_key: 'security_compliance' as const, score: 2 },
      { domain_key: 'seo_digital' as const, score: 3 },
    ];
    const result = calculateWeightedScore(scores, null);
    const decimalPart = String(result).split('.')[1]?.length ?? 0;
    expect(decimalPart).toBeLessThanOrEqual(1);
  });
});
