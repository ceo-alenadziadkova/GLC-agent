import { Queue, Worker } from 'bullmq';
import { logger } from './logger.js';
import { PipelineOrchestrator } from './pipeline.js';
import { emitPhaseErrorDurable } from './pipeline-error.js';
import { getRedisUrl } from './redis.js';

type PipelineJobPayload = {
  auditId: string;
  action: 'start' | 'next' | 'retry';
  phase?: number;
};

const QUEUE_NAME = 'pipeline_execution';
let queue: Queue<PipelineJobPayload> | null = null;
let worker: Worker<PipelineJobPayload> | null = null;

function ensureQueue(): Queue<PipelineJobPayload> | null {
  const url = getRedisUrl();
  if (!url) return null;
  if (queue) return queue;
  queue = new Queue<PipelineJobPayload>(QUEUE_NAME, {
    connection: { url },
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1500 },
    },
  });
  return queue;
}

export async function enqueuePipelineJob(payload: PipelineJobPayload): Promise<boolean> {
  const q = ensureQueue();
  if (!q) return false;
  await q.add(
    `${payload.action}:${payload.auditId}:${payload.phase ?? 'block'}`,
    payload,
    {
      jobId: `${payload.action}:${payload.auditId}:${payload.phase ?? 'block'}:${Date.now()}`,
    },
  );
  return true;
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
      const { auditId, action, phase } = job.data;
      const orchestrator = new PipelineOrchestrator(auditId);
      try {
        if (action === 'start') {
          await orchestrator.startPhase(phase ?? 0);
          return;
        }
        if (action === 'retry') {
          await orchestrator.startPhase(phase ?? 0);
          return;
        }
        await orchestrator.runBlock();
      } catch (err) {
        const e = err as Error;
        await emitPhaseErrorDurable(auditId, typeof phase === 'number' ? phase : -1, e);
        throw err;
      }
    },
    {
      connection: { url },
      concurrency: Number(process.env.PIPELINE_WORKER_CONCURRENCY ?? 2),
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('pipeline.worker_job_failed', {
      job_id: job?.id ?? null,
      name: job?.name ?? null,
      error: err.message,
    });
  });

  logger.info('pipeline.worker_started', {
    queue: QUEUE_NAME,
    concurrency: Number(process.env.PIPELINE_WORKER_CONCURRENCY ?? 2),
  });
}

