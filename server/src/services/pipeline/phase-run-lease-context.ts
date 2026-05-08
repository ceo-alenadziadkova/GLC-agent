import { AsyncLocalStorage } from 'node:async_hooks';
import { generateLockToken } from '../../lib/generate-lock-token.js';
import { PIPELINE_PHASE_RUN_ATTEMPT_INITIAL } from '../../config/pipeline-orchestrator-constants.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

export type PhaseRunLeaseContextValue = {
  leaseOwner: string;
  attempt: number;
};

const storage = new AsyncLocalStorage<PhaseRunLeaseContextValue>();

let warnedMissingLeaseContext = false;

export function getPhaseRunLeaseContext(): PhaseRunLeaseContextValue | undefined {
  return storage.getStore();
}

/**
 * Resolves lease owner + attempt for `phase_runs` / mirrored writes.
 * Prefer AsyncLocalStorage (worker / inline orchestration); never use raw PID.
 */
export function resolvePhaseRunLeaseForWrite(queueJobId: string | undefined): PhaseRunLeaseContextValue {
  const existing = storage.getStore();
  if (existing) return existing;
  const fromJobMap =
    queueJobId !== undefined && queueJobId !== '' ? pipelineJobLeaseByQueueId.get(queueJobId) : undefined;
  if (fromJobMap) return fromJobMap;

  if (!warnedMissingLeaseContext) {
    warnedMissingLeaseContext = true;
    logger.debug('pipeline.phase_run_lease_context_missing_fallback', {
      component: 'pipeline',
      detail: 'using_ephemeral_generated_token',
      queue_job_id: queueJobId ?? null,
    });
  }
  return {
    leaseOwner: generateLockToken(),
    attempt: PIPELINE_PHASE_RUN_ATTEMPT_INITIAL,
  };
}

// --- Worker job id ↔ lease (for Bull `failed` handler outside ALS) ---

const pipelineJobLeaseByQueueId = new Map<string, PhaseRunLeaseContextValue>();

export function registerPipelineJobLease(queueJobId: string, lease: PhaseRunLeaseContextValue): void {
  pipelineJobLeaseByQueueId.set(queueJobId, lease);
}

export function unregisterPipelineJobLease(queueJobId: string): void {
  pipelineJobLeaseByQueueId.delete(queueJobId);
}

export async function runWithPhaseRunLease<T>(
  lease: PhaseRunLeaseContextValue,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(lease, fn);
}

/** Thrown when this instance no longer holds the phase_runs lease (duplicate workers / expiry). */
export class PhaseRunLeaseLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhaseRunLeaseLostError';
  }
}

export async function assertPhaseRunLeaseHeld(params: {
  auditId: string;
  phase: number;
  attempt: number;
  expectedOwner: string;
}): Promise<void> {
  const { auditId, phase, attempt, expectedOwner } = params;
  const { data, error } = await supabase
    .from('phase_runs')
    .select('lease_owner, lease_expires_at')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('attempt', attempt)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new PhaseRunLeaseLostError('phase_runs row missing for lease check');
  }
  if (data.lease_owner !== expectedOwner) {
    throw new PhaseRunLeaseLostError('phase_runs lease_owner mismatch');
  }
  const expires = new Date(data.lease_expires_at as string);
  if (!(expires instanceof Date && !Number.isNaN(expires.getTime())) || expires <= new Date()) {
    throw new PhaseRunLeaseLostError('phase_runs lease expired');
  }
}
