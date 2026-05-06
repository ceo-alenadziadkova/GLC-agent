import { PIPELINE_PHASE_RUN_ATTEMPT_INITIAL } from '../../config/pipeline-orchestrator-constants.js';
import { generateLockToken } from '../../lib/generate-lock-token.js';
import { PipelineOrchestrator } from '../../services/pipeline.js';
import { runWithPhaseRunLease } from '../../services/pipeline/phase-run-lease-context.js';
import { logger } from '../../services/logger.js';
import { SnapshotAtCapacityError } from '../abuse-guards.js';

export function launchSnapshotPipeline(auditId: string): void {
  const leaseOwner = generateLockToken();
  void runWithPhaseRunLease({ leaseOwner, attempt: PIPELINE_PHASE_RUN_ATTEMPT_INITIAL }, async () => {
    const orchestrator = new PipelineOrchestrator(auditId);
    await orchestrator.runFreeSnapshot();
  }).catch((err: Error) => {
    if (err instanceof SnapshotAtCapacityError) {
      logger.warn('snapshot.pipeline_capacity', {
        component: 'snapshot',
        audit_id: auditId,
        error: err.message,
      });
      return;
    }

    logger.error('snapshot.pipeline_unhandled', {
      component: 'snapshot',
      audit_id: auditId,
      error: err.message,
      stack: err.stack,
    });
  });
}
