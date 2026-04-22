import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import { DIRECTOR_DEEP_DIVE_QUEUE } from '../../config/director-deep-dive-queue.js';
import { DIRECTOR_DEEP_DIVE_QUOTA_BY_PACKAGE, MAX_SUB_AGENTS_PER_DEEP_DIVE } from '../../config/director-orchestration-policy.js';
import { isDirectorSubAgentsEnabled } from '../../config/feature-flags.js';
import { loadAuditExecutionPlanRow } from './orchestration-read.service.js';
import { logger } from '../logger.js';
import { getRedisUrl } from '../redis.js';
import { supabase } from '../supabase.js';
import { fetchLatestRoadmapManifestSnapshotIdForAudit } from './roadmap-manifest.service.js';
import { runOrchestrationPackPersistFlowFromManifest } from './orchestration-pack-persist-run.service.js';
import { runCmoSubAgentOrchestrator } from './director-cmo-orchestrator.service.js';

type DirectorDeepDiveStatus = 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
type DirectorDeepDiveMode = 'discovery' | 'launch' | 'growth' | 'authority' | 'defense';

type DirectorDeepDiveJobPayload = {
  auditId: string;
  userId: string;
  domainKey: string;
  coveragePackage: 'starter' | 'pro' | 'complete';
  goals: string[];
  constraints: string[];
  requestedMode?: DirectorDeepDiveMode;
  requestedSubAgentIds?: string[];
};

let queue: Queue<DirectorDeepDiveJobPayload> | null = null;
let worker: Worker<DirectorDeepDiveJobPayload> | null = null;

function ensureDirectorDeepDiveQueue(): Queue<DirectorDeepDiveJobPayload> | null {
  const url = getRedisUrl();
  if (!url) return null;
  if (queue) return queue;
  queue = new Queue<DirectorDeepDiveJobPayload>(DIRECTOR_DEEP_DIVE_QUEUE.queueName, {
    connection: { url },
    defaultJobOptions: {
      attempts: DIRECTOR_DEEP_DIVE_QUEUE.defaultAttempts,
      backoff: { type: 'exponential', delay: DIRECTOR_DEEP_DIVE_QUEUE.backoffDelayMs },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
  return queue;
}

export async function enqueueDirectorDeepDive(args: {
  auditId: string;
  userId: string;
  domainKey: string;
  idempotencyKey: string;
  goals: string[];
  constraints: string[];
  requestedMode?: DirectorDeepDiveMode;
  requestedSubAgentIds?: string[];
}): Promise<{ status: 'queued'; job_id: string } | { status: 'quota_exceeded' }> {
  const executionPlan = await loadAuditExecutionPlanRow(args.auditId, args.userId);
  if (!executionPlan) return { status: 'quota_exceeded' };
  const coveragePackage = executionPlan.plan.coverage_package ?? 'starter';
  const quota = DIRECTOR_DEEP_DIVE_QUOTA_BY_PACKAGE[coveragePackage].perDomainPerAudit;
  const existing = await supabase
    .from('job_runs')
    .select('queue_job_id,status,metadata', { count: 'exact', head: false })
    .eq('queue_name', DIRECTOR_DEEP_DIVE_QUEUE.queueName)
    .eq('audit_id', args.auditId)
    .eq('action', `deep_dive:${args.domainKey}`)
    .in('status', ['queued', 'running', 'completed']);
  const sameKey = (existing.data ?? []).find((row) => {
    const metadata = (row as { metadata?: { idempotency_key?: string } }).metadata;
    return metadata?.idempotency_key === args.idempotencyKey;
  });
  if (sameKey) return { status: 'queued', job_id: sameKey.queue_job_id };
  if ((existing.count ?? 0) >= quota) return { status: 'quota_exceeded' };
  const jobId = `deep_dive:${args.auditId}:${args.domainKey}:${args.idempotencyKey || randomUUID()}`;
  const payload: DirectorDeepDiveJobPayload = {
    auditId: args.auditId,
    userId: args.userId,
    domainKey: args.domainKey,
    coveragePackage,
    goals: args.goals,
    constraints: args.constraints,
    requestedMode: args.requestedMode,
    requestedSubAgentIds: args.requestedSubAgentIds,
  };
  await supabase.from('job_runs').upsert(
    {
      queue_job_id: jobId,
      queue_name: DIRECTOR_DEEP_DIVE_QUEUE.queueName,
      audit_id: args.auditId,
      user_id: args.userId,
      action: `deep_dive:${args.domainKey}`,
      status: 'queued',
      heartbeat_at: new Date().toISOString(),
      metadata: {
        domain_key: args.domainKey,
        idempotency_key: args.idempotencyKey,
      },
    },
    { onConflict: 'queue_job_id' },
  );
  const q = ensureDirectorDeepDiveQueue();
  if (q) {
    await q.add(jobId, payload, { jobId });
  } else {
    logger.warn('director_deep_dive.queue_unavailable_fallback_inline', { audit_id: args.auditId, domain_key: args.domainKey });
    void processDirectorDeepDiveJob(jobId, payload);
  }
  return { status: 'queued', job_id: jobId };
}

async function processDirectorDeepDiveJob(jobId: string, payload: DirectorDeepDiveJobPayload): Promise<void> {
  await setJobStatus(jobId, 'running');
  try {
    if (isDirectorSubAgentsEnabled() && payload.domainKey === 'marketing_utp') {
      const maxAllowed = MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage];
      await runCmoSubAgentOrchestrator({
        auditId: payload.auditId,
        goals: payload.goals,
        constraints: payload.constraints,
        requestedMode: payload.requestedMode,
        requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, maxAllowed),
      });
    }
    await maybeRefreshRoadmapPackAfterDeepDive(payload);
    await setJobStatus(jobId, 'completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Director deep-dive failed';
    await supabase.from('job_runs').update({ status: 'failed', error_message: message }).eq('queue_job_id', jobId);
  }
}

async function setJobStatus(jobId: string, status: DirectorDeepDiveStatus): Promise<void> {
  await supabase
    .from('job_runs')
    .update({
      status,
      heartbeat_at: new Date().toISOString(),
    })
    .eq('queue_job_id', jobId);
}

async function maybeRefreshRoadmapPackAfterDeepDive(payload: DirectorDeepDiveJobPayload): Promise<void> {
  const latestSnapshot = await fetchLatestRoadmapManifestSnapshotIdForAudit({ auditId: payload.auditId });
  if (!latestSnapshot) return;
  const result = await runOrchestrationPackPersistFlowFromManifest({
    auditId: payload.auditId,
    userId: payload.userId,
    manifestSnapshotId: latestSnapshot.id,
    logComponent: 'director.deep_dive',
  });
  if (!result.ok) {
    logger.warn('director_deep_dive.pack_refresh_skipped', {
      audit_id: payload.auditId,
      domain_key: payload.domainKey,
      reason: result.kind,
    });
  }
}

export function startDirectorDeepDiveWorker(): void {
  const url = getRedisUrl();
  if (!url) {
    logger.warn('director_deep_dive.worker_disabled_no_redis');
    return;
  }
  if (worker) return;
  ensureDirectorDeepDiveQueue();
  worker = new Worker<DirectorDeepDiveJobPayload>(
    DIRECTOR_DEEP_DIVE_QUEUE.queueName,
    async (job) => {
      await processDirectorDeepDiveJob(job.id!, job.data);
    },
    {
      connection: { url },
      concurrency: 1,
    },
  );
  worker.on('failed', (job, err) => {
    logger.error('director_deep_dive.worker_job_failed', {
      job_id: job?.id ?? null,
      error: err.message,
    });
    if (job?.id) {
      void setJobStatus(job.id, 'dead_letter');
    }
  });
  logger.info('director_deep_dive.worker_started', {
    queue: DIRECTOR_DEEP_DIVE_QUEUE.queueName,
  });
}

export async function getDirectorDeepDiveJobStatus(args: {
  auditId: string;
  jobId: string;
  userId: string;
}): Promise<{
  job_id: string;
  status: DirectorDeepDiveStatus;
  started_at: string | null;
  completed_at: string | null;
  error_code?: string;
} | null> {
  const row = await supabase
    .from('job_runs')
    .select('queue_job_id,status,updated_at,error_message,user_id')
    .eq('queue_job_id', args.jobId)
    .eq('audit_id', args.auditId)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (!row.data) {
    return null;
  }
  const status = (row.data?.status ?? 'failed') as DirectorDeepDiveStatus;
  return {
    job_id: args.jobId,
    status,
    started_at: row.data?.updated_at ?? null,
    completed_at: status === 'completed' || status === 'failed' || status === 'dead_letter' ? (row.data?.updated_at ?? null) : null,
    error_code:
      status === 'failed'
        ? 'DIRECTOR_DEEP_DIVE_FAILED'
        : status === 'dead_letter'
          ? 'DIRECTOR_DEEP_DIVE_DEAD_LETTER'
          : undefined,
  };
}
