import { PIPELINE_PHASE_RUN_ATTEMPT_INITIAL } from '../../../config/pipeline-orchestrator-constants.js';
import { generateLockToken } from '../../../lib/generate-lock-token.js';
import { emitPhaseErrorDurable } from '../../pipeline-error.js';
import { enqueuePipelineJob } from '../../pipeline-jobs.js';
import { PipelineOrchestrator } from '../../pipeline.js';
import { runWithPhaseRunLease } from '../../pipeline/phase-run-lease-context.js';
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

  const leaseOwner = generateLockToken();
  void runWithPhaseRunLease({ leaseOwner, attempt: PIPELINE_PHASE_RUN_ATTEMPT_INITIAL }, async () => {
    const orchestrator = new PipelineOrchestrator(auditId, { disableAutoRemediate });
    if (action === 'next') {
      await orchestrator.runBlock();
    } else if (action === 'retry' && Number.isInteger(phase) && phase >= 1 && phase <= 6) {
      await orchestrator.retryDomainPhase(phase);
    } else {
      await orchestrator.startPhase(phase);
    }
  }).catch((e) => emitPhaseErrorDurable(auditId, phase, e as Error));
}
