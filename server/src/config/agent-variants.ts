/**
 * Agent Variants Registry — registered instruction variants per domain phase.
 *
 * Each variant represents a different instruction strategy for a given phase.
 * The 'default' variant always exists implicitly (no delta applied).
 * Non-default variants are selected by BanditService when FEATURE_BANDITS=true
 * and the readiness gate is satisfied.
 *
 * How to register a new variant:
 *   1. Add an entry to AGENT_VARIANTS[phaseId] array.
 *   2. Assign a unique variant_id string (no spaces, kebab-case).
 *   3. Write the instruction_delta text (appended to or replacing base instructions).
 *   4. Set delta_type: 'append' to add on top, 'replace' to fully substitute.
 *   5. Deploy and monitor performance in the evaluation_dataset before promoting.
 *
 * Safety constraints (from ADR-ML-BANDITS.md):
 *   - ≤ 2 non-default variants per phase (`SYSTEM_DEFAULTS.bandits.maxVariantsPerPhase`; 3 arms with implicit `default`)
 *   - Variants that are not registered here are never selected by BanditService
 *   - The 'default' variant_id is reserved; do not register a variant with that id
 *
 * Version history:
 *   v2.2  — Phase 6 / Sprint 2: initial file (empty registry — bandits not yet active)
 */

import type { DomainKey } from '../types/audit.js';
import { SYSTEM_DEFAULTS } from './system-defaults.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentVariant {
  /** Unique identifier for this variant. Reserved: 'default'. */
  variant_id: string;
  /** Which GLC domain phase this variant applies to. */
  phase_id: DomainKey;
  /**
   * The instruction text to apply on top of (or instead of) the base instructions.
   * For 'append': appended with a blank line separator.
   * For 'replace': replaces the entire base instructions string.
   * Prefer 'append' — it is safer and easier to diff against the baseline.
   */
  instruction_delta: string;
  /** Whether to append or fully replace the base instructions. */
  delta_type: 'append' | 'replace';
  /**
   * Optional human-readable description of what this variant tests.
   * Not sent to the model — for engineering documentation only.
   */
  description?: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * All registered non-default variants, keyed by phase_id.
 *
 * Currently empty — no variants have been registered yet.
 * Add variants here once you have a specific instruction hypothesis to test.
 *
 * Example (do not activate until monitoring setup is complete):
 *
 *   tech_infrastructure: [
 *     {
 *       variant_id: 'conservative',
 *       phase_id: 'tech_infrastructure',
 *       instruction_delta: 'Prefer conservative estimates. Label all capacity claims as hypotheses.',
 *       delta_type: 'append',
 *       description: 'Tests whether more conservative output reduces hallucination_rate',
 *     },
 *   ],
 */
export const AGENT_VARIANTS: Partial<Record<DomainKey, AgentVariant[]>> = {
  // Register variants here when ready.
  // Keep each phase at ≤ 2 non-default variants (max 3 total including 'default').
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns all registered variants for a phase (may be empty). */
export function getVariantsForPhase(phaseId: DomainKey): AgentVariant[] {
  return AGENT_VARIANTS[phaseId] ?? [];
}

/** Returns a specific variant by variant_id, or undefined if not found. */
export function findVariant(phaseId: DomainKey, variantId: string): AgentVariant | undefined {
  return getVariantsForPhase(phaseId).find(v => v.variant_id === variantId);
}

/** Returns true if at least one non-default variant is registered for the phase. */
export function hasNonDefaultVariants(phaseId: DomainKey): boolean {
  return getVariantsForPhase(phaseId).length > 0;
}

/** Maximum non-default variants allowed per phase (`SYSTEM_DEFAULTS.bandits.maxVariantsPerPhase`). */
export const MAX_VARIANTS_PER_PHASE = SYSTEM_DEFAULTS.bandits.maxVariantsPerPhase;
