/**
 * Phase Profiles — unified extended profiles for all 6 GLC domain phases.
 *
 * Assembles the full PhaseProfile shape used by the domain-agnostic
 * FactChecker kernel (ADR-FACT-CHECKER-UNIFIED-KERNEL.md).
 *
 * Sources combined here:
 *   - truth-registry.ts    → base profile (high_risk_fact_types, authoritative_sources,
 *                             error_types, default_assumption_risk, auto_remediation_scope)
 *   - phase-confidence-weights.ts → confidence_weights per domain
 *
 * FeasibilityLayer rules live in feasibility-layer.ts and are injected separately
 * (they are domain-keyed, not part of this profile shape).
 *
 * Version history:
 *   v2.1  — Sprint 1: initial file; assembles existing config into one PhaseProfile export
 *            (ADR-PHASE-PROFILES.md)
 *
 * Usage:
 *   import { getExtendedPhaseProfile } from '../config/phase-profiles.js';
 *   const profile = getExtendedPhaseProfile(domainKey); // inject into FactCheckerService
 */

import type { DomainKey } from '../types/audit.js';
import { PHASE_PROFILES } from './truth-registry.js';
import type { PhaseProfile as BasePhaseProfle } from './truth-registry.js';
import { CONFIDENCE_WEIGHTS_BY_PHASE } from './phase-confidence-weights.js';
import type { ConfidenceWeights } from './phase-confidence-weights.js';

// ─── Extended Profile Shape ───────────────────────────────────────────────────

/**
 * ExtendedPhaseProfile = base PhaseProfile + confidence_weights.
 *
 * This is the contract the FactChecker kernel expects.
 * Consumer code should import this type, not BasePhaseProfle.
 */
export interface ExtendedPhaseProfile extends BasePhaseProfle {
  /**
   * Weights for computing CONTROL_OBJECT.confidence.overall.
   * Sourced from phase-confidence-weights.ts; must sum to 1.0.
   */
  confidence_weights: ConfidenceWeights;
}

// ─── Assembled Profiles ───────────────────────────────────────────────────────

export const EXTENDED_PHASE_PROFILES: Record<DomainKey, ExtendedPhaseProfile> = Object.fromEntries(
  (Object.entries(PHASE_PROFILES) as [DomainKey, BasePhaseProfle][]).map(
    ([key, base]) => [
      key,
      {
        ...base,
        confidence_weights: CONFIDENCE_WEIGHTS_BY_PHASE[key],
      },
    ],
  ),
) as Record<DomainKey, ExtendedPhaseProfile>;

// ─── Fallback Profile ─────────────────────────────────────────────────────────

/**
 * Used when phase_id is unknown (e.g. recon/strategy — no domain profile applies).
 * Conservative defaults: tone_only remediation, balanced weights.
 */
export const FALLBACK_PHASE_PROFILE: ExtendedPhaseProfile = {
  phase_id: 'tech_infrastructure', // placeholder — fallback is only for non-domain phases
  high_risk_fact_types: ['numeric_claim', 'causal_claim', 'guarantee_claim'],
  authoritative_sources: ['user_brief'],
  error_types: ['unverified_numbers', 'risky_promise', 'tone_overpromise'],
  default_assumption_risk: 'medium',
  auto_remediation_scope: 'tone_only',
  confidence_weights: {
    factual: 0.40,
    strategic: 0.20,
    consistency: 0.25,
    feasibility: 0.15,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the extended profile for a domain key, or the fallback for unknown keys
 * (recon, strategy, or any unrecognised phase_id).
 *
 * Never throws.
 */
export function getExtendedPhaseProfile(domainKey: string): ExtendedPhaseProfile {
  const profile = EXTENDED_PHASE_PROFILES[domainKey as DomainKey];
  if (!profile) {
    return FALLBACK_PHASE_PROFILE;
  }
  return profile;
}

/**
 * Heuristic: whether free-text claim content matches any `high_risk_fact_types` token pattern
 * for this profile. Used for tests and future deep-check routing; not a full NLP extractor.
 */
export function matchesHighRiskSignal(text: string, profile: ExtendedPhaseProfile): boolean {
  const lower = text.toLowerCase();
  for (const ft of profile.high_risk_fact_types) {
    const stem = ft.replace(/_claim$|_statement$|_status$/, '');
    const parts = stem.split('_').filter(p => p.length >= 3);
    if (parts.length === 0) continue;
    if (parts.every(p => lower.includes(p))) return true;
  }
  return false;
}
