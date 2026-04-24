import { supabase } from '../supabase.js';
import { consistencyChecker } from '../consistency-checker.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { pipelineOrchestratorCopy } from '../../config/pipeline-orchestrator-copy.js';

export type RunAutoWingQualityGateDeps = {
  auditId: string;
  afterPhase: number;
  phasesInWing: number[];
  reviewPhases: readonly number[];
  emitEvent: (phase: number, eventType: string, message: string, data?: Record<string, unknown>) => Promise<void>;
  updateAuditIfNotCancelled: (patch: Record<string, unknown>) => Promise<boolean>;
  cancelledErrorFactory: () => Error;
};

export async function runAutoWingQualityGateAndMaybeReviewGate(
  deps: RunAutoWingQualityGateDeps,
): Promise<void> {
  const { auditId, afterPhase, phasesInWing, reviewPhases, emitEvent, updateAuditIfNotCancelled, cancelledErrorFactory } = deps;

  const gateReport = await consistencyChecker.run(auditId, afterPhase, phasesInWing);

  await supabase.from('review_points')
    .update({ quality_gate_passed: gateReport.passed })
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase);

  if (!reviewPhases.includes(afterPhase)) return;

  await emitEvent(afterPhase, PIPELINE_EVENT_TYPES.reviewNeeded, pipelineOrchestratorCopy().phase.reviewNeeded);

  const setReview = await updateAuditIfNotCancelled({ status: 'review' });
  if (!setReview) throw cancelledErrorFactory();
}

export type RunStrategyQualityGateDeps = {
  auditId: string;
  afterPhase: number;
  phasesToCheck: number[];
};

export async function runStrategyQualityGate(deps: RunStrategyQualityGateDeps): Promise<void> {
  const { auditId, afterPhase, phasesToCheck } = deps;

  const gateReport = await consistencyChecker.run(auditId, afterPhase, phasesToCheck);

  await supabase.from('review_points')
    .update({ quality_gate_passed: gateReport.passed })
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase);
}

/**
 * Prepare the human review row for a new cycle after this phase completes.
 * Required when a gate was previously approved (e.g. Strategy rerun after Gate 3): the row must
 * return to `pending` so the UI and `runPipelineNext` see an open gate again.
 * Prior-round notes are cleared here; they were already incorporated into the saved phase output.
 */
export async function reopenHumanReviewPointForPhase(auditId: string, afterPhase: number): Promise<void> {
  const { error } = await supabase
    .from('review_points')
    .update({
      status: 'pending',
      consultant_notes: null,
      interview_notes: null,
      approved_at: null,
      quality_gate_passed: null,
    })
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase);
  if (error) throw new Error(`[review_gate] reopen review point failed: ${error.message}`);
}

