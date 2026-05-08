/**
 * Persists successful phase-7 strategy output to Postgres (audit_strategy + audits).
 */
import { STRATEGY_INITIATIVE_SCHEMA_VERSION } from '../../config/strategy-initiative-policy.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';
import type { StrategyHydratedPersistPayload } from './hydrate-strategy-after-parse.js';

export async function writeStrategyCompletionToDatabase(params: {
  auditId: string;
  payload: StrategyHydratedPersistPayload;
}): Promise<void> {
  const { auditId, payload } = params;

  const { error: strategyErr } = await supabase.from('audit_strategy').update({
    status: 'completed',
    executive_summary: payload.strategyResult.executive_summary,
    overall_score: payload.weightedScore,
    quick_wins: payload.quick_wins,
    medium_term: payload.medium_term,
    strategic: payload.strategic,
    scorecard: payload.strategyResult.scorecard,
    schema_version: STRATEGY_INITIATIVE_SCHEMA_VERSION.v2,
  }).eq('audit_id', auditId);

  if (strategyErr) {
    logger.error('strategy.finalize_audit_strategy_update_failed', {
      component: 'strategy',
      audit_id: auditId,
      error: strategyErr.message,
    });
    throw strategyErr;
  }

  const { error: auditErr } = await supabase.from('audits').update({
    status: 'completed',
    overall_score: payload.weightedScore,
    current_phase: 7,
  }).eq('id', auditId);

  if (auditErr) {
    logger.error('strategy.finalize_audits_update_failed', {
      component: 'strategy',
      audit_id: auditId,
      error: auditErr.message,
    });
    throw auditErr;
  }
}
