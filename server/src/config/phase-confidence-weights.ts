/**
 * Phase Confidence Weights — per-domain weighting for CONTROL_OBJECT confidence.overall.
 *
 * Phase 3+ uses these weights instead of the simple average used in v1.5.
 * Each set sums to 1.0. Weights reflect what matters most per domain:
 *   - Tech/Security: factual accuracy is paramount (hard facts, objective checks)
 *   - SEO/UX: strategic hypotheses carry equal weight (recommendations are bets)
 *   - Marketing: strategic dominates (largely qualitative positioning)
 *   - Automation: feasibility is highest (unrealistic automation fails in delivery)
 *
 * Version history:
 *   v1.7  — Phase 3: initial weights (4 dimensions including feasibility)
 */

import type { DomainKey } from '../types/audit.js';

// ─── Weight Shape ─────────────────────────────────────────────────────────────

export interface ConfidenceWeights {
  factual: number;
  strategic: number;
  consistency: number;
  feasibility: number;
}

// ─── Per-Domain Weights ───────────────────────────────────────────────────────

export const CONFIDENCE_WEIGHTS_BY_PHASE: Record<DomainKey, ConfidenceWeights> = {
  tech_infrastructure: {
    factual: 0.50,      // tech facts are objective and measurable — highest weight
    consistency: 0.25,  // internal consistency of architecture claims matters
    strategic: 0.15,    // infra strategy is real but secondary to verifiable facts
    feasibility: 0.10,  // team/timeline risks matter but factual quality dominates
  },

  security_compliance: {
    factual: 0.50,      // compliance and security claims must be rock-solid
    consistency: 0.30,  // contradictions in security posture are red flags
    strategic: 0.10,    // strategy matters but facts trump it here
    feasibility: 0.10,  // team capacity and policy prerequisites
  },

  seo_digital: {
    factual: 0.35,      // traffic/ranking figures need evidence
    strategic: 0.35,    // SEO strategy hypotheses (keyword targets, content bets) equally important
    consistency: 0.20,  // cross-signal consistency (search + analytics + crawl)
    feasibility: 0.10,  // dev capacity for technical SEO
  },

  ux_conversion: {
    factual: 0.30,      // conversion figures require analytics backing
    strategic: 0.40,    // UX recommendations are largely hypotheses — strategy dominates
    consistency: 0.20,  // consistency across funnel stages
    feasibility: 0.10,  // design/dev capacity for implementation
  },

  marketing_utp: {
    strategic: 0.45,    // marketing is hypothesis-driven — strategy is primary signal
    factual: 0.25,      // market size / competitor claims need some evidence base
    consistency: 0.20,  // positioning consistency across channels
    feasibility: 0.10,  // budget and CRM prerequisites
  },

  automation_processes: {
    feasibility: 0.30,  // highest feasibility weight: automation that can't be built is worthless
    factual: 0.30,      // tool capability claims and time-saving figures need evidence
    consistency: 0.25,  // workflow consistency (no contradictory automation paths)
    strategic: 0.15,    // strategic direction matters but delivery is paramount
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns weights for a domain, defaulting to equal-weight fallback for unknown domains. */
export function getConfidenceWeights(domainKey: string): ConfidenceWeights {
  const weights = CONFIDENCE_WEIGHTS_BY_PHASE[domainKey as DomainKey];
  if (weights) return weights;
  // Fallback: equal weights (recon/strategy phases do not use this)
  return { factual: 0.25, strategic: 0.25, consistency: 0.25, feasibility: 0.25 };
}

/**
 * Compute weighted overall confidence from the four dimensions.
 *
 * @param factual     0–100
 * @param strategic   0–100
 * @param consistency 0–100
 * @param feasibility 0–100 (feasibility.score × 100)
 * @param weights     Domain-specific weights (must sum to 1.0)
 */
export function computeWeightedConfidence(
  factual: number,
  strategic: number,
  consistency: number,
  feasibility: number,
  weights: ConfidenceWeights
): number {
  const raw =
    weights.factual * factual +
    weights.strategic * strategic +
    weights.consistency * consistency +
    weights.feasibility * feasibility;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/**
 * Validate that a weights object sums to 1.0 (within float tolerance).
 * Used in tests to catch misconfigured weights early.
 */
export function validateWeights(weights: ConfidenceWeights): boolean {
  const sum = weights.factual + weights.strategic + weights.consistency + weights.feasibility;
  return Math.abs(sum - 1.0) < 0.001;
}
