/**
 * Phase profiles — extended profile assembly and high-risk signal heuristics.
 * See docs/adrs/ADR-PHASE-PROFILES.md
 */

import { describe, it, expect } from 'vitest';
import { DOMAIN_KEYS, type DomainKey } from '../types/audit.js';
import {
  EXTENDED_PHASE_PROFILES,
  getExtendedPhaseProfile,
  matchesHighRiskSignal,
} from '../config/phase-profiles.js';
import { CONFIDENCE_WEIGHTS_BY_PHASE } from '../config/phase-confidence-weights.js';

describe('phase-profiles', () => {
  it('exposes one extended profile per domain key with aligned confidence weights', () => {
    for (const key of DOMAIN_KEYS) {
      const profile = EXTENDED_PHASE_PROFILES[key];
      expect(profile.phase_id).toBe(key);
      expect(profile.high_risk_fact_types.length).toBeGreaterThan(0);
      expect(profile.error_types.length).toBeGreaterThan(0);
      const w = profile.confidence_weights;
      const expected = CONFIDENCE_WEIGHTS_BY_PHASE[key];
      expect(w.factual).toBeCloseTo(expected.factual, 6);
      expect(w.strategic).toBeCloseTo(expected.strategic, 6);
      expect(w.consistency).toBeCloseTo(expected.consistency, 6);
      expect(w.feasibility).toBeCloseTo(expected.feasibility, 6);
      const sum = w.factual + w.strategic + w.consistency + w.feasibility;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('getExtendedPhaseProfile returns fallback for unknown keys', () => {
    const p = getExtendedPhaseProfile('recon');
    expect(p.confidence_weights).toBeDefined();
    expect(p.high_risk_fact_types.length).toBeGreaterThan(0);
  });

  it.each(DOMAIN_KEYS)('matchesHighRiskSignal detects a domain-typical risky phrase for %s', (domainKey: DomainKey) => {
    const profile = EXTENDED_PHASE_PROFILES[domainKey];
    const samples: Record<DomainKey, string> = {
      tech_infrastructure: 'We guarantee 99.9% uptime SLA on this stack.',
      security_compliance: 'The compliance status is certified under SOC2.',
      seo_digital: 'Keyword demand for this term is very high in our model.',
      ux_conversion: 'Checkout conversion rate is 3.2% according to analytics.',
      marketing_utp: 'The market size for this category is five billion dollars.',
      automation_processes: 'Time saving from this automation is twenty hours weekly.',
    };
    expect(matchesHighRiskSignal(samples[domainKey], profile)).toBe(true);
  });
});
