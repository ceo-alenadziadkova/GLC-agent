import { logger } from '../../logger.js';
import { decisionLayer } from '../../decision-layer.js';
import { applyAutoRemediation } from '../../remediation.js';
import { invalidateDownstreamDependents } from '../../audit-claim-graph.js';
import { isCausalDagEnabled } from '../../../config/feature-flags.js';
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { attachBenchmarkReferenceToControlObject } from '../../benchmark-snapshot.js';
import { recordEvaluationDatasetIfEnabled } from '../../evaluation-dataset-writer.js';
import { formatDecisionFallbackReasoning } from '../../../config/decision-layer-messages.en.js';
import type { ControlObjectV1, PhaseId } from '../../../schemas/control-object/index.js';
import type { DomainResult } from '../../../types/audit.js';
import type { DecisionResult } from '../../decision-layer.js';

export type EvaluationCapture = {
  phaseId: PhaseId;
  rawAgentOutput: Record<string, unknown> | null;
  cleanedOutput: DomainResult;
};

export type PublishControlObjectGovernanceCoreDeps = {
  auditId: string;
  disableAutoRemediate: boolean;
  phase: number;
  controlObject: ControlObjectV1;
  evaluationCapture?: EvaluationCapture;
  emitEvent: (phase: number, eventType: string, message: string, data?: Record<string, unknown>) => Promise<void>;
  recordPerformanceAsync: (controlObject: ControlObjectV1, phase: number) => Promise<void>;
  recordBanditArmAsync: (controlObject: ControlObjectV1) => void;
};

/**
 * Decision + governance side effects (no refine/manual escalation here).
 * Returns DecisionResult so caller can decide between auto-loop and manual review.
 */
export async function publishControlObjectGovernanceCore(
  deps: PublishControlObjectGovernanceCoreDeps,
): Promise<DecisionResult | undefined> {
  const {
    auditId,
    disableAutoRemediate,
    phase,
    controlObject,
    evaluationCapture,
    emitEvent,
    recordPerformanceAsync,
    recordBanditArmAsync,
  } = deps;

  let decision: DecisionResult | undefined;
  let decisionFallbackMeta: { applied: true; reasonCode: string; originalError: string } | null = null;
  try {
    decision = decisionLayer.decideForControlObject(controlObject);
    controlObject.decision_hint = decision.hint;
  } catch (dlErr) {
    const fallbackHint = SYSTEM_DEFAULTS.decisionLayer.onErrorFallback.hint;
    const reasonCode = SYSTEM_DEFAULTS.decisionLayer.onErrorFallback.reasonCode;
    const errorMessage = dlErr instanceof Error ? dlErr.message : String(dlErr);
    decision = {
      hint: fallbackHint,
      reasoning: formatDecisionFallbackReasoning({ fallbackHint, errorMessage }),
      active_error_types: [reasonCode],
    };
    controlObject.decision_hint = decision.hint;
    decisionFallbackMeta = {
      applied: true,
      reasonCode,
      originalError: errorMessage,
    };
    logger.warn('pipeline.decision_layer_failed', {
      component: 'pipeline',
      audit_id: auditId,
      phase,
      fallback_hint: fallbackHint,
      reason_code: reasonCode,
      error: errorMessage,
    });
  }

  if (isCausalDagEnabled() && controlObject.errors.structural.length > 0) {
    const pid = controlObject.context.phase_id;
    if (pid !== 'recon' && pid !== 'strategy') {
      const seeds = controlObject.context.structural_invalidation_claim_ids;
      if (seeds && seeds.length > 0) {
        const refs = seeds.map(claimId => ({ phase_id: pid as PhaseId, claim_id: claimId }));
        const { marked } = await invalidateDownstreamDependents(auditId, refs);
        if (marked.length > 0) {
          await emitEvent(
            phase,
            PIPELINE_EVENT_TYPES.log,
            `Causal DAG: marked ${marked.length} downstream claim(s) invalidated after upstream structural issues.`,
            { invalidated_downstream: marked, source_phase_id: pid },
          );
        }
      }
    }
  }

  if (evaluationCapture) {
    const remediated = await applyAutoRemediation({
      auditId,
      controlObject,
      cleanedOutput: evaluationCapture.cleanedOutput,
      phaseNumber: phase,
      disableAutoRemediate,
    });
    if (remediated > 0) {
      try {
        const postRem = decisionLayer.decideForControlObject(controlObject);
        controlObject.decision_hint = postRem.hint;
      } catch (reDecideErr) {
        logger.warn('pipeline.remediation_redecide_failed', {
          component: 'pipeline',
          audit_id: auditId,
          phase,
          error: reDecideErr instanceof Error ? reDecideErr.message : String(reDecideErr),
        });
      }

      await emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.log,
        `Auto-remediation: corrected ${remediated} issue(s).`,
        { auto_remediation_count: remediated },
      );
    }
  }

  await attachBenchmarkReferenceToControlObject(auditId, controlObject);

  if (evaluationCapture) {
    await recordEvaluationDatasetIfEnabled({
      auditId,
      phaseId: evaluationCapture.phaseId,
      controlObject,
      rawAgentOutput: evaluationCapture.rawAgentOutput,
      cleanedOutput: evaluationCapture.cleanedOutput,
    });
  }

  // v2.0: persist agent performance metrics (async, best-effort)
  void recordPerformanceAsync(controlObject, phase);
  void recordBanditArmAsync(controlObject);

  try {
    await emitEvent(phase, PIPELINE_EVENT_TYPES.controlObject, '', {
      control_object: controlObject,
      ...(decisionFallbackMeta
        ? {
            decision_fallback_applied: true,
            decision_fallback_reason_code: decisionFallbackMeta.reasonCode,
            decision_fallback_error: decisionFallbackMeta.originalError,
          }
        : {}),
    });
  } catch (emitErr) {
    logger.warn('pipeline.control_object_emit_failed', {
      component: 'pipeline',
      audit_id: auditId,
      phase,
      error: emitErr instanceof Error ? emitErr.message : String(emitErr),
    });
  }

  return decision;
}

