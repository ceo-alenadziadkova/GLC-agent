/**
 * Agent Performance Service — computes per-phase agent scores from CONTROL_OBJECT data.
 *
 * Phase 5: scores are computed after each rerun and persisted to `agent_performance_aggregate`.
 * The aggregate is refreshed by an async job (hourly/daily) — NOT real-time.
 *
 * Score formula (0.0–1.0):
 *   agent_score = 1 − (
 *     0.40 × hallucination_rate +
 *     0.25 × inconsistency_rate +
 *     0.20 × risky_promise_rate +
 *     0.15 × unverified_rate
 *   )
 * Floor: 0.0.
 *
 * Rates are fractions of `total_facts` in the CONTROL_OBJECT counts.
 * Only meaningful after ≥ MIN_EVALUATION_COUNT runs per (phase_id, agent_number).
 *
 * DB table: `agent_performance_aggregate` (DDL: `server/migrations/052_agent_performance_aggregate.sql`).
 *
 * Version history:
 *   v2.0  — Phase 5: initial implementation
 */

import { supabase } from './supabase.js';
import { logger } from './logger.js';
import type { ControlObjectV1 } from '../schemas/control-object/index.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum number of evaluation runs before a score is considered meaningful. */
export const MIN_EVALUATION_COUNT = SYSTEM_DEFAULTS.agentPerformance.minEvaluationCount;

const SCORE_WEIGHTS = {
  hallucination: SYSTEM_DEFAULTS.agentPerformance.scoreWeights.hallucination,
  inconsistency: SYSTEM_DEFAULTS.agentPerformance.scoreWeights.inconsistency,
  risky_promise: SYSTEM_DEFAULTS.agentPerformance.scoreWeights.riskyPromise,
  unverified: SYSTEM_DEFAULTS.agentPerformance.scoreWeights.unverified,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentPerformanceMetrics {
  phase_id: string;
  agent_number: number;
  /** Number of evaluation runs contributing to this score */
  evaluation_count: number;
  hallucination_rate: number;
  risky_promise_rate: number;
  unverified_rate: number;
  /** Derived from structural error count / total claims */
  inconsistency_rate: number;
  /** Composite score 0.0–1.0 */
  agent_score: number;
}

// ─── Computation ─────────────────────────────────────────────────────────────

/**
 * Computes per-run performance metrics from a CONTROL_OBJECT.
 * Returns null for phases with no facts (recon/strategy/empty outputs).
 */
export function computePerformanceMetrics(
  controlObject: ControlObjectV1,
  agentNumber: number
): AgentPerformanceMetrics | null {
  const { counts, errors, context } = controlObject;
  const totalFacts = counts.fact;

  if (totalFacts === 0) return null;

  const hallucinationRate = counts.statuses.likely_hallucination / totalFacts;
  const riskyPromiseRate = counts.statuses.risky_promise / totalFacts;
  const unverifiedRate = counts.statuses.unverified / totalFacts;
  // Inconsistency: structural errors as a fraction of total claims
  const totalClaims = Math.max(counts.total_claims, 1);
  const inconsistencyRate = errors.structural.length / totalClaims;

  const agentScore = Math.max(
    0,
    1 - (
      SCORE_WEIGHTS.hallucination * hallucinationRate +
      SCORE_WEIGHTS.inconsistency * inconsistencyRate +
      SCORE_WEIGHTS.risky_promise * riskyPromiseRate +
      SCORE_WEIGHTS.unverified * unverifiedRate
    )
  );

  return {
    phase_id: context.phase_id,
    agent_number: agentNumber,
    evaluation_count: 1, // single run; aggregate job sums these
    hallucination_rate: parseFloat(hallucinationRate.toFixed(4)),
    risky_promise_rate: parseFloat(riskyPromiseRate.toFixed(4)),
    unverified_rate: parseFloat(unverifiedRate.toFixed(4)),
    inconsistency_rate: parseFloat(inconsistencyRate.toFixed(4)),
    agent_score: parseFloat(agentScore.toFixed(4)),
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/**
 * Upserts per-run metrics into `agent_performance_aggregate`.
 *
 * Uses incremental averaging: new avg = ((existing_avg × count) + new_value) / (count + 1).
 * Best-effort — failures logged and never throw.
 */
export async function recordAgentPerformance(metrics: AgentPerformanceMetrics): Promise<void> {
  try {
    // Fetch existing aggregate row
    const { data: existing } = await supabase
      .from('agent_performance_aggregate')
      .select('evaluation_count, avg_score, avg_hallucination_rate, avg_risky_promise_rate')
      .eq('phase_id', metrics.phase_id)
      .eq('agent_number', metrics.agent_number)
      .maybeSingle();

    const prevCount = (existing as { evaluation_count?: number } | null)?.evaluation_count ?? 0;
    const prevScore = (existing as { avg_score?: number } | null)?.avg_score ?? 0;
    const prevHallucination = (existing as { avg_hallucination_rate?: number } | null)?.avg_hallucination_rate ?? 0;
    const prevRisky = (existing as { avg_risky_promise_rate?: number } | null)?.avg_risky_promise_rate ?? 0;

    const newCount = prevCount + 1;

    // Incremental rolling average
    const newAvgScore = (prevScore * prevCount + metrics.agent_score) / newCount;
    const newAvgHallucination = (prevHallucination * prevCount + metrics.hallucination_rate) / newCount;
    const newAvgRisky = (prevRisky * prevCount + metrics.risky_promise_rate) / newCount;

    const { error } = await supabase
      .from('agent_performance_aggregate')
      .upsert(
        {
          phase_id: metrics.phase_id,
          agent_number: metrics.agent_number,
          evaluation_count: newCount,
          avg_score: parseFloat(newAvgScore.toFixed(4)),
          avg_hallucination_rate: parseFloat(newAvgHallucination.toFixed(4)),
          avg_risky_promise_rate: parseFloat(newAvgRisky.toFixed(4)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phase_id,agent_number' }
      );

    if (error) {
      logger.warn('agent_performance.upsert_failed', {
        component: 'agent_performance',
        phase_id: metrics.phase_id,
        agent_number: metrics.agent_number,
        message: error.message,
      });
    }
  } catch (err) {
    logger.warn('agent_performance.record_exception', {
      component: 'agent_performance',
      phase_id: metrics.phase_id,
      agent_number: metrics.agent_number,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

