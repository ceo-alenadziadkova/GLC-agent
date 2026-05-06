import { emitPhaseErrorDurable } from '../../pipeline-error.js';
import { enqueuePipelineJob } from '../../pipeline-jobs.js';
import { PipelineOrchestrator } from '../../pipeline.js';
import type { PipelineAction } from '../domain/pipeline-route.types.js';

export async function schedulePipelineExecution(params: {
  auditId: string;
  action: PipelineAction;
  phase: number;
  disableAutoRemediate: boolean;
  retryComment?: string;
}): Promise<void> {
  const { auditId, action, phase, disableAutoRemediate, retryComment } = params;
  const queued = await enqueuePipelineJob({
    auditId,
    action,
    phase,
    disable_auto_remediate: disableAutoRemediate,
    retry_comment: retryComment,
  });
  if (queued) return;

  const orchestrator = new PipelineOrchestrator(auditId, { disableAutoRemediate });
  if (action === 'next') {
    void orchestrator.runBlock().catch((e) => emitPhaseErrorDurable(auditId, phase, e as Error));
  } else if (action === 'retry' && Number.isInteger(phase) && phase >= 1 && phase <= 6) {
    void orchestrator
      .retryDomainPhase(phase)
      .catch((e) => emitPhaseErrorDurable(auditId, phase, e as Error));
  } else {
    void orchestrator.startPhase(phase).catch((e) => emitPhaseErrorDurable(auditId, phase, e as Error));
  }
}
