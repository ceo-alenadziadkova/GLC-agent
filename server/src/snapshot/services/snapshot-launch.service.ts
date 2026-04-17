import { PipelineOrchestrator } from '../../services/pipeline.js';
import { logger } from '../../services/logger.js';
import { SnapshotAtCapacityError } from '../abuse-guards.js';

export function launchSnapshotPipeline(auditId: string): void {
  const orchestrator = new PipelineOrchestrator(auditId);
  void orchestrator.runFreeSnapshot().catch((err: Error) => {
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
