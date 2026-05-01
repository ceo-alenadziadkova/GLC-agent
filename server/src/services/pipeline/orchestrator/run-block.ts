import { ANALYTIC_WING_PHASES, AUTO_WING_PHASES } from '../../../config/pipeline-orchestrator-constants.js';
import { PIPELINE_AUDIT_ORCHESTRATOR_STATUS } from '../../../config/pipeline-status.js';
import {
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  reviewPhasesForExecutionPlan,
  type AuditExecutionPlan,
} from '../../../types/audit.js';
import { logger } from '../../logger.js';
import { supabase } from '../../supabase.js';
import {
  runAutoWingQualityGateAndMaybeReviewGate,
  runStrategyQualityGate,
} from '../reviewGateCoordinator.js';
import { PipelineCancelledError } from './pipeline-cancelled.error.js';
import type { EmitPipelineEventFn, SequentialPhaseOutcome } from './run-single-phase.js';

export type RunPipelineOrchestratorBlockParams = {
  auditId: string;
  loadExecutionPlan: () => Promise<AuditExecutionPlan>;
  updateAuditIfNotCancelled: (patch: Record<string, unknown>) => Promise<boolean>;
  runParallelBlock: (phases: readonly number[]) => Promise<string[]>;
  startPhaseSequential: (phase: number) => Promise<SequentialPhaseOutcome>;
  emitEvent: EmitPipelineEventFn;
  cancelledErrorFactory: () => PipelineCancelledError;
};

export async function runPipelineOrchestratorBlock(params: RunPipelineOrchestratorBlockParams): Promise<void> {
  const {
    auditId,
    loadExecutionPlan,
    updateAuditIfNotCancelled,
    runParallelBlock,
    startPhaseSequential,
    emitEvent,
    cancelledErrorFactory,
  } = params;

  try {
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('current_phase, status')
      .eq('id', auditId)
      .single();

    if (auditErr || !audit) {
      logger.error('Run block failed to load audit', {
        audit_id: auditId,
        error: auditErr?.message ?? 'missing',
      });
      throw new Error('Audit not found while running block');
    }

    const executionPlan = await loadExecutionPlan();
    const allExecutablePhases = executionPlanToPhases(executionPlan);
    const executablePhases = allExecutablePhases.filter((p) => p > 0);
    const maxPhase = maxPhaseForExecutionPlan(executionPlan);
    const reviewPhases = reviewPhasesForExecutionPlan(executionPlan);
    const nextPhase = executablePhases.find((p) => p > audit.current_phase);

    if (audit.status === PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled) return;
    if (!nextPhase || nextPhase > maxPhase) return;

    if ((AUTO_WING_PHASES as readonly number[]).includes(nextPhase)) {
      const wingPhases = AUTO_WING_PHASES.filter((p) => p <= maxPhase && executablePhases.includes(p));
      const lastWingPhase = wingPhases.length > 0 ? Math.max(...wingPhases) : nextPhase;

      const movedToAuto = await updateAuditIfNotCancelled({
        status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.auto,
        current_phase: nextPhase,
      });
      if (!movedToAuto) throw cancelledErrorFactory();

      await runParallelBlock(wingPhases);

      const advancedAuto = await updateAuditIfNotCancelled({ current_phase: lastWingPhase });
      if (!advancedAuto) throw cancelledErrorFactory();

      await runAutoWingQualityGateAndMaybeReviewGate({
        auditId,
        afterPhase: lastWingPhase,
        phasesInWing: wingPhases,
        reviewPhases,
        emitEvent,
        updateAuditIfNotCancelled,
        cancelledErrorFactory,
      });
      return;
    }

    if ((ANALYTIC_WING_PHASES as readonly number[]).includes(nextPhase)) {
      const wingPhases = ANALYTIC_WING_PHASES.filter((p) => p <= maxPhase && executablePhases.includes(p));
      const lastWingPhase = wingPhases.length > 0 ? Math.max(...wingPhases) : nextPhase;

      const movedToAnalytic = await updateAuditIfNotCancelled({
        status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.analytic,
        current_phase: nextPhase,
      });
      if (!movedToAnalytic) throw cancelledErrorFactory();

      await runParallelBlock(wingPhases);

      const advancedAnalytic = await updateAuditIfNotCancelled({ current_phase: lastWingPhase });
      if (!advancedAnalytic) throw cancelledErrorFactory();

      if (allExecutablePhases.includes(7)) {
        const strategyOutcome = await startPhaseSequential(7);
        if (strategyOutcome !== 'completed') {
          return;
        }

        const allDomainPhases = [...wingPhases, 7];
        await runStrategyQualityGate({
          auditId,
          afterPhase: 7,
          phasesToCheck: allDomainPhases,
        });
      } else {
        /** No strategy phase: leave analytic so `pipeline/next` can finalize to completed. */
        const setReview = await updateAuditIfNotCancelled({
          status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.review,
        });
        if (!setReview) throw cancelledErrorFactory();
      }
      return;
    }

    if (nextPhase === 7) {
      await startPhaseSequential(7);
    }
  } catch (err) {
    if (err instanceof PipelineCancelledError) {
      logger.info('Pipeline block cancelled', { audit_id: auditId });
      return;
    }
    throw err;
  }
}
