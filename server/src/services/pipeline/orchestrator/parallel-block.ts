import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../../../config/pipeline-orchestrator-copy.js';
import { PIPELINE_EVENT_ERROR_CODES } from '../../../config/pipeline-event-error-codes.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { PIPELINE_AUDIT_ORCHESTRATOR_STATUS } from '../../../config/pipeline-status.js';
import { PHASE_DOMAIN_MAP } from '../../../types/audit.js';
import type { EmitPipelineEventFn } from './run-single-phase.js';
import { PipelineCancelledError } from './pipeline-cancelled.error.js';

export type RunParallelBlockParams = {
  phases: readonly number[];
  parallelFailureThreshold: number;
  emitEvent: EmitPipelineEventFn;
  updateAuditIfNotCancelled: (patch: Record<string, unknown>) => Promise<boolean>;
  /** Fresh DB cancel check after parallel work; must run before orchestration persist / summary events. */
  assertNotCancelled: () => Promise<void>;
  runIsolatedPhase: (phase: number) => Promise<void>;
};

export async function runParallelBlockForAudit(params: RunParallelBlockParams): Promise<string[]> {
  const {
    phases,
    parallelFailureThreshold,
    emitEvent,
    updateAuditIfNotCancelled,
    assertNotCancelled,
    runIsolatedPhase,
  } = params;

  const ocPar = pipelineOrchestratorCopy();
  await emitEvent(
    -1,
    PIPELINE_EVENT_TYPES.parallelStarted,
    interpolateOrchestratorMessage(ocPar.parallel.startedTemplate, { phases: phases.join(',') }),
  );

  const results = await Promise.allSettled(phases.map((p) => runIsolatedPhase(p)));

  await assertNotCancelled();

  const failedDomains: string[] = [];
  const cancelledErrors: Error[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const reason = result.reason as Error;
      if (reason instanceof PipelineCancelledError) {
        cancelledErrors.push(reason);
        return;
      }
      failedDomains.push(String(PHASE_DOMAIN_MAP[phases[i]]));
    }
  });

  if (cancelledErrors.length > 0) {
    throw cancelledErrors[0];
  }

  if (failedDomains.length === phases.length) {
    await updateAuditIfNotCancelled({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.failed });
    const joined = failedDomains.join(', ');
    await emitEvent(
      -1,
      PIPELINE_EVENT_TYPES.error,
      interpolateOrchestratorMessage(ocPar.parallel.allFailedTemplate, { domains: joined }),
      { error_code: PIPELINE_EVENT_ERROR_CODES.ALL_PARALLEL_PHASES_FAILED, domains_unavailable: failedDomains },
    );
    throw new Error(`All parallel phases failed: ${joined}`);
  }

  if (failedDomains.length >= parallelFailureThreshold) {
    await updateAuditIfNotCancelled({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.failed });
    const joined = failedDomains.join(', ');
    await emitEvent(
      -1,
      PIPELINE_EVENT_TYPES.error,
      interpolateOrchestratorMessage(ocPar.parallel.thresholdFailedTemplate, {
        failed: failedDomains.length,
        total: phases.length,
        domains: joined,
      }),
      { domains_unavailable: failedDomains, threshold: parallelFailureThreshold },
    );
    throw new Error(`Parallel block failure threshold exceeded: ${joined}`);
  }

  if (failedDomains.length > 0) {
    await emitEvent(
      -1,
      PIPELINE_EVENT_TYPES.partialFailure,
      interpolateOrchestratorMessage(ocPar.parallel.partialFailureTemplate, {
        count: failedDomains.length,
        domains: failedDomains.join(', '),
      }),
      { domains_unavailable: failedDomains },
    );
  } else {
    await emitEvent(
      -1,
      PIPELINE_EVENT_TYPES.parallelCompleted,
      interpolateOrchestratorMessage(ocPar.parallel.completedTemplate, { phases: phases.join(',') }),
    );
  }

  return failedDomains;
}
