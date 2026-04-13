/**
 * BanditService — ε-greedy agent variant selection for GLC domain phases.
 *
 * Selects from registered AgentVariants per phase using an ε-greedy algorithm
 * over aggregated performance scores from `bandit_arm_performance`.
 *
 * Activation requires FEATURE_BANDITS=true AND all three readiness gate conditions:
 *   1. MIN_EVALUATION_COUNT runs recorded for each variant in the phase
 *   2. MIN_PHASES_WITH_DATA distinct phases with sufficient data (prevents outlier skew)
 *   3. Registered variants ≤ MAX_VARIANTS_PER_PHASE (keeps ε-greedy convergence tractable)
 *
 * Falls back to 'default' on any gate failure, disabled flag, or unexpected error.
 * Never throws — all errors are logged and result in a 'default' selection.
 *
 * Scope: affects only agent/prompt variant selection. Does not touch Decision Layer
 * routing, CONTROL_OBJECT structure, or Rule Engine patches.
 *
 * See docs/adrs/ADR-ML-BANDITS.md for full design rationale.
 *
 * Version history:
 *   v2.2  — Phase 6 / Sprint 2: initial implementation
 */

import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { isBanditsEnabled } from '../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  getVariantsForPhase,
  hasNonDefaultVariants,
  MAX_VARIANTS_PER_PHASE,
  type AgentVariant,
} from '../config/agent-variants.js';
import type { DomainKey } from '../types/audit.js';

// ─── Constants (re-export SYSTEM_DEFAULTS.bandits for tests / ADR parity) ───

/** Minimum evaluation runs before a variant arm score is considered reliable. */
export const BANDIT_MIN_EVALUATION_COUNT: number = SYSTEM_DEFAULTS.bandits.minEvaluationCount;

/**
 * Minimum number of distinct phase_ids that must have ≥ BANDIT_MIN_EVALUATION_COUNT
 * runs before any bandit activates. Prevents a single client from skewing policy.
 */
export const BANDIT_MIN_PHASES_WITH_DATA: number = SYSTEM_DEFAULTS.bandits.minPhasesWithData;

/** Exploration rate for ε-greedy: probability of choosing a random arm. */
export const BANDIT_EPSILON: number = SYSTEM_DEFAULTS.bandits.epsilon;

export const DEFAULT_VARIANT_ID = 'default';

// ─── DB row type ─────────────────────────────────────────────────────────────

interface BanditArmRow {
  phase_id: string;
  variant_id: string;
  run_count: number;
  avg_score: number;
}

interface EvaluationDatasetBanditRow {
  phase_id: string;
  agent_variant_id: string | null;
  control_object: {
    agent_performance?: {
      agent_score?: number;
    };
  } | null;
}

// ─── Readiness gate state (returned for observability/logging) ────────────────

export type BanditGateMiss =
  | 'BANDIT_DISABLED'
  | 'NO_NON_DEFAULT_VARIANTS'
  | 'TOO_MANY_VARIANTS'
  | 'INSUFFICIENT_PHASES_WITH_DATA'
  | 'INSUFFICIENT_ARM_RUNS'
  | 'DB_ERROR';

export interface BanditSelectionResult {
  variant_id: string;
  /** undefined = bandit was active and made a choice */
  gate_miss?: BanditGateMiss;
  /** true = exploration step; false = exploitation; undefined = gate missed */
  explored?: boolean;
}

export interface RecomputeBanditArmsResult {
  phases_updated: number;
  arms_upserted: number;
  dataset_rows_seen: number;
}

export interface AggregatedBanditArm {
  phase_id: string;
  variant_id: string;
  run_count: number;
  avg_score: number;
}

export function aggregateBanditArmsFromEvaluationRows(
  rows: EvaluationDatasetBanditRow[],
): AggregatedBanditArm[] {
  const acc = new Map<string, { phase_id: string; variant_id: string; run_count: number; sum: number }>();
  for (const row of rows) {
    const score = row.control_object?.agent_performance?.agent_score;
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    const variantId = row.agent_variant_id ?? DEFAULT_VARIANT_ID;
    const key = `${row.phase_id}::${variantId}`;
    const prev = acc.get(key);
    if (prev) {
      prev.run_count += 1;
      prev.sum += score;
    } else {
      acc.set(key, { phase_id: row.phase_id, variant_id: variantId, run_count: 1, sum: score });
    }
  }

  return [...acc.values()].map(v => ({
    phase_id: v.phase_id,
    variant_id: v.variant_id,
    run_count: v.run_count,
    avg_score: parseFloat((v.sum / v.run_count).toFixed(4)),
  }));
}

// ─── BanditService ────────────────────────────────────────────────────────────

export class BanditService {
  /**
   * Selects a variant for the given phase.
   *
   * Returns { variant_id: 'default', gate_miss } on any gate failure.
   * Returns { variant_id, explored } when bandit is active.
   * Never throws.
   */
  async selectVariant(phaseId: DomainKey): Promise<BanditSelectionResult> {
    // Gate 1: feature flag
    if (!isBanditsEnabled()) {
      return { variant_id: DEFAULT_VARIANT_ID, gate_miss: 'BANDIT_DISABLED' };
    }

    // Gate 2: variants registered?
    if (!hasNonDefaultVariants(phaseId)) {
      return { variant_id: DEFAULT_VARIANT_ID, gate_miss: 'NO_NON_DEFAULT_VARIANTS' };
    }

    const variants = getVariantsForPhase(phaseId);

    // Gate 3: action space size
    if (variants.length > MAX_VARIANTS_PER_PHASE) {
      logger.warn('bandit.too_many_variants', {
        component: 'bandit',
        phase_id: phaseId,
        variant_count: variants.length,
        max: MAX_VARIANTS_PER_PHASE,
      });
      return { variant_id: DEFAULT_VARIANT_ID, gate_miss: 'TOO_MANY_VARIANTS' };
    }

    try {
      // Gate 4: global data sufficiency (MIN_PHASES_WITH_DATA)
      const phasesReady = await this.countPhasesWithSufficientData();
      if (phasesReady < BANDIT_MIN_PHASES_WITH_DATA) {
        return { variant_id: DEFAULT_VARIANT_ID, gate_miss: 'INSUFFICIENT_PHASES_WITH_DATA' };
      }

      // Gate 5: per-arm run count for this phase
      const armRows = await this.fetchArmPerformance(phaseId, variants);
      const allArmsReady = [DEFAULT_VARIANT_ID, ...variants.map(v => v.variant_id)].every(vid => {
        const row = armRows.find(r => r.variant_id === vid);
        return (row?.run_count ?? 0) >= BANDIT_MIN_EVALUATION_COUNT;
      });

      if (!allArmsReady) {
        return { variant_id: DEFAULT_VARIANT_ID, gate_miss: 'INSUFFICIENT_ARM_RUNS' };
      }

      // All gates passed — run ε-greedy
      return this.epsilonGreedy(phaseId, variants, armRows);

    } catch (err) {
      logger.error('bandit.selection_error', {
        component: 'bandit',
        phase_id: phaseId,
        error: (err as Error).message,
      });
      return { variant_id: DEFAULT_VARIANT_ID, gate_miss: 'DB_ERROR' };
    }
  }

  /**
   * Records a completed run for a variant arm in `bandit_arm_performance`.
   * Uses the same incremental rolling average as agent_performance_aggregate.
   * Fire-and-forget — never throws.
   */
  async recordArmResult(phaseId: DomainKey, variantId: string, agentScore: number): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('bandit_arm_performance')
        .select('run_count, avg_score')
        .eq('phase_id', phaseId)
        .eq('variant_id', variantId)
        .maybeSingle();

      const prevCount = (existing as { run_count?: number } | null)?.run_count ?? 0;
      const prevAvg = (existing as { avg_score?: number } | null)?.avg_score ?? 0;
      const newCount = prevCount + 1;
      const newAvg = (prevAvg * prevCount + agentScore) / newCount;

      await supabase.from('bandit_arm_performance').upsert(
        {
          phase_id: phaseId,
          variant_id: variantId,
          run_count: newCount,
          avg_score: parseFloat(newAvg.toFixed(4)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phase_id,variant_id' },
      );
    } catch (err) {
      logger.error('bandit.record_arm_error', {
        component: 'bandit',
        phase_id: phaseId,
        variant_id: variantId,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Rebuilds `bandit_arm_performance` from `evaluation_datasets` snapshots.
   * Useful for backfills and drift recovery when arm aggregates need canonical recomputation.
   */
  async recomputeArmPerformanceFromEvaluationDatasets(
    phaseId?: DomainKey,
  ): Promise<RecomputeBanditArmsResult> {
    try {
      const evalQuery = supabase
        .from('evaluation_datasets')
        .select('phase_id, agent_variant_id, control_object');
      const { data, error } = phaseId
        ? await evalQuery.eq('phase_id', phaseId)
        : await evalQuery;
      if (error) throw error;

      const datasetRows = (data ?? []) as EvaluationDatasetBanditRow[];
      const aggregated = aggregateBanditArmsFromEvaluationRows(datasetRows);
      const phases = [...new Set(aggregated.map(r => r.phase_id))];

      for (const phase of phases) {
        await supabase.from('bandit_arm_performance').delete().eq('phase_id', phase);
      }

      if (aggregated.length > 0) {
        await supabase.from('bandit_arm_performance').upsert(
          aggregated.map(row => ({
            ...row,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'phase_id,variant_id' },
        );
      }

      return {
        phases_updated: phases.length,
        arms_upserted: aggregated.length,
        dataset_rows_seen: datasetRows.length,
      };
    } catch (err) {
      logger.error('bandit.recompute_from_evaluation_datasets_failed', {
        component: 'bandit',
        phase_id: phaseId ?? null,
        error: (err as Error).message,
      });
      return { phases_updated: 0, arms_upserted: 0, dataset_rows_seen: 0 };
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async countPhasesWithSufficientData(): Promise<number> {
    const { data, error } = await supabase
      .from('bandit_arm_performance')
      .select('phase_id')
      .gte('run_count', BANDIT_MIN_EVALUATION_COUNT);

    if (error) throw error;

    const uniquePhases = new Set((data ?? []).map((r: { phase_id: string }) => r.phase_id));
    return uniquePhases.size;
  }

  private async fetchArmPerformance(
    phaseId: DomainKey,
    variants: AgentVariant[],
  ): Promise<BanditArmRow[]> {
    const variantIds = [DEFAULT_VARIANT_ID, ...variants.map(v => v.variant_id)];

    const { data, error } = await supabase
      .from('bandit_arm_performance')
      .select('phase_id, variant_id, run_count, avg_score')
      .eq('phase_id', phaseId)
      .in('variant_id', variantIds);

    if (error) throw error;
    return (data ?? []) as BanditArmRow[];
  }

  private epsilonGreedy(
    phaseId: DomainKey,
    variants: AgentVariant[],
    armRows: BanditArmRow[],
  ): BanditSelectionResult {
    const allVariantIds = [DEFAULT_VARIANT_ID, ...variants.map(v => v.variant_id)];

    // Exploration: pick a random arm
    if (Math.random() < BANDIT_EPSILON) {
      const idx = Math.floor(Math.random() * allVariantIds.length);
      const chosen = allVariantIds[idx];
      logger.info('bandit.explore', { component: 'bandit', phase_id: phaseId, chosen });
      return { variant_id: chosen, explored: true };
    }

    // Exploitation: pick the arm with the highest avg_score
    let bestVariantId = DEFAULT_VARIANT_ID;
    let bestScore = armRows.find(r => r.variant_id === DEFAULT_VARIANT_ID)?.avg_score ?? 0;

    for (const variantId of allVariantIds) {
      const row = armRows.find(r => r.variant_id === variantId);
      const score = row?.avg_score ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestVariantId = variantId;
      }
    }

    logger.info('bandit.exploit', {
      component: 'bandit',
      phase_id: phaseId,
      chosen: bestVariantId,
      score: bestScore,
    });
    return { variant_id: bestVariantId, explored: false };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const banditService = new BanditService();
