import { Queue, Worker } from 'bullmq';
import { logger } from './logger.js';
import { PipelineOrchestrator } from './pipeline.js';
import { emitPhaseErrorDurable } from './pipeline-error.js';
import { getRedisUrl } from './redis.js';
import { supabase } from './supabase.js';
import {
  PIPELINE_QUEUE_BACKOFF_DELAY_MS,
  PIPELINE_QUEUE_DEFAULT_ATTEMPTS,
  PIPELINE_QUEUE_REMOVE_ON_COMPLETE,
  PIPELINE_QUEUE_REMOVE_ON_FAIL,
} from '../config/pipeline-queue.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

type PipelineJobPayload = {
  auditId: string;
  action: 'start' | 'next' | 'retry';
  phase?: number;
  /** When true, skip Phase 9 auto-remediation for this job. */
  disable_auto_remediate?: boolean;
};

const QUEUE_NAME = 'pipeline_execution';
const PW = SYSTEM_DEFAULTS.pipelineWorker;
const PIPELINE_LEASE_TTL_SECONDS = PW.leaseTtlSeconds;
const PIPELINE_HEARTBEAT_MS = PW.heartbeatMs;
let queue: Queue<PipelineJobPayload> | null = null;
let worker: Worker<PipelineJobPayload> | null = null;

function ensureQueue(): Queue<PipelineJobPayload> | null {
  const url = getRedisUrl();
  if (!url) return null;
  if (queue) return queue;
  queue = new Queue<PipelineJobPayload>(QUEUE_NAME, {
    connection: { url },
    defaultJobOptions: {
      removeOnComplete: PIPELINE_QUEUE_REMOVE_ON_COMPLETE,
      removeOnFail: PIPELINE_QUEUE_REMOVE_ON_FAIL,
      attempts: PIPELINE_QUEUE_DEFAULT_ATTEMPTS,
      backoff: { type: 'exponential', delay: PIPELINE_QUEUE_BACKOFF_DELAY_MS },
    },
  });
  return queue;
}

export async function enqueuePipelineJob(payload: PipelineJobPayload): Promise<boolean> {
  const q = ensureQueue();
  if (!q) return false;
  const queueJobId = `${payload.action}:${payload.auditId}:${payload.phase ?? 'block'}`;
  await q.add(
    `${payload.action}:${payload.auditId}:${payload.phase ?? 'block'}`,
    payload,
    {
      jobId: queueJobId,
    },
  );
  await supabase.from('job_runs').upsert(
    {
      queue_job_id: queueJobId,
      queue_name: QUEUE_NAME,
      audit_id: payload.auditId,
      action: payload.action,
      phase: payload.phase ?? null,
      attempt: 1,
      status: 'queued',
      heartbeat_at: new Date().toISOString(),
    },
    { onConflict: 'queue_job_id' },
  );
  return true;
}

async function touchLease(queueJobId: string, payload: PipelineJobPayload, attempt: number, status: 'running' | 'completed' | 'failed' | 'dead_letter'): Promise<void> {
  const now = new Date();
  const leaseExpires = new Date(now.getTime() + PIPELINE_LEASE_TTL_SECONDS * 1000).toISOString();
  await supabase.from('job_runs').upsert(
    {
      queue_job_id: queueJobId,
      queue_name: QUEUE_NAME,
      audit_id: payload.auditId,
      action: payload.action,
      phase: payload.phase ?? null,
      attempt,
      status,
      lease_owner: `pid:${process.pid}`,
      lease_expires_at: leaseExpires,
      heartbeat_at: now.toISOString(),
    },
    { onConflict: 'queue_job_id' },
  );
  if (typeof payload.phase === 'number') {
    await supabase.from('phase_runs').upsert(
      {
        audit_id: payload.auditId,
        phase: payload.phase,
        attempt,
        status,
        lease_owner: `pid:${process.pid}`,
        lease_expires_at: leaseExpires,
        heartbeat_at: now.toISOString(),
      },
      { onConflict: 'audit_id,phase,attempt' },
    );
  }
}

export function startPipelineWorker(): void {
  const url = getRedisUrl();
  if (!url) {
    logger.warn('pipeline.worker_disabled_no_redis');
    return;
  }
  if (worker) return;

  worker = new Worker<PipelineJobPayload>(
    QUEUE_NAME,
    async (job) => {
      const { auditId, action, phase, disable_auto_remediate: disableAutoRemediateRaw } = job.data;
      const attempt = job.attemptsMade + 1;
      const orchestrator = new PipelineOrchestrator(auditId, {
        disableAutoRemediate: disableAutoRemediateRaw === true,
      });
      await touchLease(job.id!, job.data, attempt, 'running');
      const heartbeatTimer = setInterval(() => {
        void touchLease(job.id!, job.data, attempt, 'running');
      }, PIPELINE_HEARTBEAT_MS);
      try {
        if (action === 'start') {
          await orchestrator.startPhase(phase ?? 0);
          clearInterval(heartbeatTimer);
          await touchLease(job.id!, job.data, attempt, 'completed');
          return;
        }
        if (action === 'retry') {
          const p = phase ?? 0;
          if (Number.isInteger(p) && p >= 1 && p <= 6) {
            await orchestrator.retryDomainPhase(p);
          } else {
            await orchestrator.startPhase(p);
          }
          clearInterval(heartbeatTimer);
          await touchLease(job.id!, job.data, attempt, 'completed');
          return;
        }
        await orchestrator.runBlock();
        clearInterval(heartbeatTimer);
        await touchLease(job.id!, job.data, attempt, 'completed');
      } catch (err) {
        clearInterval(heartbeatTimer);
        const e = err as Error;
        await touchLease(job.id!, job.data, attempt, 'failed');
        await supabase.from('job_runs')
          .update({ error_message: e.message })
          .eq('queue_job_id', job.id!);
        if (typeof phase === 'number') {
          await supabase.from('phase_runs')
            .update({ error_message: e.message })
            .eq('audit_id', auditId)
            .eq('phase', phase)
            .eq('attempt', attempt);
        }
        await emitPhaseErrorDurable(auditId, typeof phase === 'number' ? phase : -1, e);
        throw err;
      }
    },
    {
      connection: { url },
      concurrency: PW.concurrency,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('pipeline.worker_job_failed', {
      job_id: job?.id ?? null,
      name: job?.name ?? null,
      error: err.message,
    });
    if (job) {
      const attempt = job.attemptsMade + 1;
      void touchLease(job.id!, job.data, attempt, 'dead_letter');
    }
  });

  logger.info('pipeline.worker_started', {
    queue: QUEUE_NAME,
    concurrency: PW.concurrency,
  });
}

