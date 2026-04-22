import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import { DIRECTOR_DEEP_DIVE_QUEUE } from '../../config/director-deep-dive-queue.js';
import {
  DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES,
  DIRECTOR_DEEP_DIVE_QUOTA_BY_PACKAGE,
  DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE,
  DIRECTOR_SUB_AGENTS_ENABLED_DOMAINS,
  GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
  MAX_SUB_AGENTS_PER_DEEP_DIVE,
  SUB_AGENT_TOKEN_BUDGET_BY_DEPTH,
} from '../../config/director-orchestration-policy.js';
import { isDirectorSubAgentsEnabled } from '../../config/feature-flags.js';
import { DIRECTOR_CMO_ROUTING_POLICY } from '../../config/director-cmo-routing-policy.js';
import { DIRECTOR_MODE_AGENT_DEPTHS, type DirectorOperatingMode } from '../../config/director-operating-modes.js';
import { DIRECTOR_SUB_AGENT_IDS, type DirectorSubAgentId } from '../../config/director-sub-agents.js';
import { loadAuditExecutionPlanRow } from './orchestration-read.service.js';
import { logger } from '../logger.js';
import { getRedisUrl } from '../redis.js';
import { supabase } from '../supabase.js';
import { fetchLatestRoadmapManifestSnapshotIdForAudit } from './roadmap-manifest.service.js';
import { runOrchestrationPackPersistFlowFromManifest } from './orchestration-pack-persist-run.service.js';
import { runCmoSubAgentOrchestrator } from './director-cmo-orchestrator.service.js';
import { persistGlcDirectorOrchestrationSliceForAuditOwner } from './director-orchestration-persistence.service.js';
import type { DomainKey } from '@glc/intake-core';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

type DirectorDeepDiveStatus = 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
type DirectorDeepDiveMode = DirectorOperatingMode;

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

type JobRunMetadata = {
  domain_key?: string;
  idempotency_key?: string;
  idempotency_signature?: string;
  queued_at?: string;
  started_at?: string;
  completed_at?: string;
  qa_block?: {
    coherence: string;
    feasibility: string;
    top_3_actions: string[];
    risks: string[];
    measurement: string[];
  };
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
}): Promise<
  { status: 'queued'; job_id: string } | { status: 'quota_exceeded' } | { status: 'token_budget_exceeded' } | { status: 'idempotency_mismatch' }
> {
  const idempotencySignature = JSON.stringify({
    domainKey: args.domainKey,
    goals: args.goals,
    constraints: args.constraints,
    requestedMode: args.requestedMode ?? null,
    requestedSubAgentIds: args.requestedSubAgentIds ?? null,
  });
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
    const metadata = (row as { metadata?: JobRunMetadata }).metadata;
    return metadata?.idempotency_key === args.idempotencyKey;
  });
  if (sameKey) {
    const metadata = (sameKey as { metadata?: JobRunMetadata }).metadata;
    if (
      typeof metadata?.idempotency_signature === 'string' &&
      metadata.idempotency_signature !== idempotencySignature
    ) {
      return { status: 'idempotency_mismatch' };
    }
    return { status: 'queued', job_id: sameKey.queue_job_id };
  }
  if ((existing.count ?? 0) >= quota) return { status: 'quota_exceeded' };
  const tokenBudgetResult = enforceDirectorDeepDiveTokenBudget({
    coveragePackage,
    requestedMode: args.requestedMode,
    requestedSubAgentIds: args.requestedSubAgentIds,
  });
  if (!tokenBudgetResult.ok) {
    return { status: 'token_budget_exceeded' };
  }
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
        idempotency_signature: idempotencySignature,
        queued_at: new Date().toISOString(),
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

function enforceDirectorDeepDiveTokenBudget(args: {
  coveragePackage: 'starter' | 'pro' | 'complete';
  requestedMode?: DirectorDeepDiveMode;
  requestedSubAgentIds?: string[];
}): { ok: true } | { ok: false } {
  const mode = args.requestedMode ?? DIRECTOR_CMO_ROUTING_POLICY.defaultMode;
  const requestedSet = new Set(
    (args.requestedSubAgentIds ?? []).filter((id): id is DirectorSubAgentId =>
      (DIRECTOR_SUB_AGENT_IDS as readonly string[]).includes(id),
    ),
  );
  const selectedSubAgentIds =
    requestedSet.size > 0
      ? Array.from(requestedSet)
      : DIRECTOR_SUB_AGENT_IDS.filter((id) => DIRECTOR_MODE_AGENT_DEPTHS[mode][id] !== 'deferred');
  const totalTokenBudget = selectedSubAgentIds.reduce((sum, id) => {
    const depth = DIRECTOR_MODE_AGENT_DEPTHS[mode][id];
    if (depth === 'deferred') return sum;
    return sum + SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth];
  }, 0);
  return totalTokenBudget <= DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE[args.coveragePackage]
    ? { ok: true }
    : { ok: false };
}

async function processDirectorDeepDiveJob(jobId: string, payload: DirectorDeepDiveJobPayload): Promise<void> {
  await setJobStatus(jobId, 'running', { started_at: new Date().toISOString() });
  try {
    let qaBlock: JobRunMetadata['qa_block'] | undefined;
    const subAgentDomainEnabled = DIRECTOR_SUB_AGENTS_ENABLED_DOMAINS.includes(payload.domainKey as DomainKey);
    if (isDirectorSubAgentsEnabled() && subAgentDomainEnabled) {
      const maxAllowed = MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage];
      const subAgentResult = await runCmoSubAgentOrchestrator({
        auditId: payload.auditId,
        goals: payload.goals,
        constraints: payload.constraints,
        requestedMode: payload.requestedMode,
        requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, maxAllowed),
      });
      qaBlock = subAgentResult.qa_block;
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: subAgentResult.director_bundle,
        },
      });
    } else {
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: buildSingleAgentFallbackBundle(payload),
        },
      });
    }
    await maybeRefreshRoadmapPackAfterDeepDive(payload);
    await setJobStatus(jobId, 'completed', { completed_at: new Date().toISOString(), qa_block: qaBlock });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Director deep-dive failed';
    await setJobStatus(jobId, 'failed', { completed_at: new Date().toISOString(), error_message: message });
  }
}

function buildSingleAgentFallbackBundle(payload: DirectorDeepDiveJobPayload): DirectorWaveBundle {
  return {
    actions: [
      {
        id: `deep_dive:${payload.domainKey}:summary`,
        title: `Deep-dive summary (${payload.domainKey})`,
        description: payload.goals.slice(0, 3).join(' | ') || 'Domain deep-dive summary',
        impact: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.impact,
        effort: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.effort,
        risk: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.risk,
        urgency: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.urgency,
        confidence: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.confidence,
        dependencies: [],
        evidence: {
          observed: payload.goals.slice(0, 2),
          assumed: payload.constraints.slice(0, 2),
        },
      },
    ],
    bottlenecks: [],
    risks: payload.constraints.slice(0, 3),
    zones: [payload.domainKey],
  };
}

async function setJobStatus(
  jobId: string,
  status: DirectorDeepDiveStatus,
  options?: {
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    qa_block?: JobRunMetadata['qa_block'];
  },
): Promise<void> {
  const metaRead = await supabase
    .from('job_runs')
    .select('metadata')
    .eq('queue_job_id', jobId)
    .maybeSingle();
  const previousMetadata = ((metaRead.data as { metadata?: JobRunMetadata } | null)?.metadata ?? {}) as JobRunMetadata;
  const nextMetadata: JobRunMetadata = {
    ...previousMetadata,
    ...(options?.started_at ? { started_at: options.started_at } : {}),
    ...(options?.completed_at ? { completed_at: options.completed_at } : {}),
    ...(options?.qa_block ? { qa_block: options.qa_block } : {}),
  };
  await supabase
    .from('job_runs')
    .update({
      status,
      heartbeat_at: new Date().toISOString(),
      metadata: nextMetadata,
      ...(options?.error_message ? { error_message: options.error_message } : {}),
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
      void setJobStatus(job.id, 'dead_letter', { completed_at: new Date().toISOString(), error_message: err.message });
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
  qa_block?: {
    coherence: string;
    feasibility: string;
    top_3_actions: string[];
    risks: string[];
    measurement: string[];
  };
} | null> {
  const row = await supabase
    .from('job_runs')
    .select('queue_job_id,status,updated_at,error_message,user_id,metadata')
    .eq('queue_job_id', args.jobId)
    .eq('audit_id', args.auditId)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (!row.data) {
    return null;
  }
  const status = (row.data?.status ?? 'failed') as DirectorDeepDiveStatus;
  const metadata = (row.data as { metadata?: JobRunMetadata } | null)?.metadata;
  return {
    job_id: args.jobId,
    status,
    started_at: metadata?.started_at ?? null,
    completed_at:
      status === 'completed' || status === 'failed' || status === 'dead_letter'
        ? (metadata?.completed_at ?? row.data?.updated_at ?? null)
        : null,
    error_code:
      status === 'failed'
        ? 'DIRECTOR_DEEP_DIVE_FAILED'
        : status === 'dead_letter'
          ? 'DIRECTOR_DEEP_DIVE_DEAD_LETTER'
          : undefined,
    qa_block: metadata?.qa_block,
  };
}
