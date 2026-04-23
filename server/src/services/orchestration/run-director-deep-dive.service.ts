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
import {
  isCaoDeepDiveLlmEnabled,
  isCdoDeepDiveLlmEnabled,
  isCtoDeepDiveLlmEnabled,
  isCsoDeepDiveLlmEnabled,
  isDirectorCaoSubAgentsEnabled,
  isDirectorCdoSubAgentsEnabled,
  isDirectorCsoSubAgentsEnabled,
  isDirectorSubAgentsEnabled,
  isSeoDeepDiveLlmEnabled,
} from '../../config/feature-flags.js';
import { DIRECTOR_CMO_ROUTING_POLICY } from '../../config/director-cmo-routing-policy.js';
import {
  DIRECTOR_CAO_ACCESS_AGENT_DEPTHS,
  listCaoMvpAgentIds,
  routeCaoAccessLevel,
  type CaoMvpSubAgentId,
} from '../../config/director-cao-routing-policy.js';
import {
  DIRECTOR_CDO_ACCESS_AGENT_DEPTHS,
  listCdoMvpAgentIds,
  routeCdoAccessLevel,
  type CdoMvpSubAgentId,
} from '../../config/director-cdo-routing-policy.js';
import {
  DIRECTOR_CSO_CASE_AGENT_DEPTHS,
  listCsoMvpAgentIds,
  type CsoMvpSubAgentId,
} from '../../config/director-cso-routing-policy.js';
import { resolveDirectorDeepDiveHandler } from '../../config/director-domain-deep-dive-dispatch.js';
import { isDirectorSubAgentsEnabledForRequest } from '../../config/orchestration-rollout-gates.js';
import { DIRECTOR_MODE_AGENT_DEPTHS, type DirectorOperatingMode } from '../../config/director-operating-modes.js';
import {
  DIRECTOR_SUB_AGENT_IDS,
  DIRECTOR_SUB_AGENTS,
  type DirectorSubAgentId,
} from '../../config/director-sub-agents.js';
import { loadAuditExecutionPlanRow } from './orchestration-read.service.js';
import { logger } from '../logger.js';
import { getRedisUrl } from '../redis.js';
import { supabase } from '../supabase.js';
import { fetchLatestRoadmapManifestSnapshotIdForAudit } from './roadmap-manifest.service.js';
import { runOrchestrationPackPersistFlowFromManifest } from './orchestration-pack-persist-run.service.js';
import { routeCaoDeepDive } from './director-cao-router.service.js';
import { routeCsoDeepDiveCase } from './director-cso-router.service.js';
import { runCmoSubAgentOrchestrator } from './director-cmo-orchestrator.service.js';
import {
  runCaoDirectorDeepDiveOrchestrator,
  runCaoSubAgentOrchestrator,
} from './director-cao-orchestrator.service.js';
import {
  runCdoDirectorDeepDiveOrchestrator,
  runCdoSubAgentOrchestrator,
} from './director-cdo-orchestrator.service.js';
import {
  runCsoDirectorDeepDiveOrchestrator,
  runCsoSubAgentOrchestrator,
} from './director-cso-orchestrator.service.js';
import { runCtoDirectorDeepDiveOrchestrator } from './director-cto-orchestrator.service.js';
import { runSeoDirectorDeepDiveOrchestrator } from './director-seo-orchestrator.service.js';
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
  /** When true, run CMO sub-agent orchestrator even if global `FEATURE_DIRECTOR_SUB_AGENTS` is off (staged rollout / allowlist). */
  subAgentsEntitled?: boolean;
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
const DIRECTOR_DEEP_DIVE_WORKER_CONCURRENCY = 3;

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
  userEmail?: string | null;
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
    domainKey: args.domainKey,
    goals: args.goals,
    constraints: args.constraints,
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
    subAgentsEntitled: isDirectorSubAgentsEnabledForRequest(args.userEmail),
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
  domainKey: string;
  goals: string[];
  constraints: string[];
}): { ok: true } | { ok: false } {
  if (args.domainKey === 'ux_conversion' && isCdoDeepDiveLlmEnabled()) {
    const cdoIds = listCdoMvpAgentIds();
    const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CdoMvpSubAgentId =>
      (cdoIds as readonly string[]).includes(id),
    );
    const selected: CdoMvpSubAgentId[] = requested.length > 0 ? requested : [...cdoIds];
    const access = routeCdoAccessLevel({ goals: args.goals, constraints: args.constraints });
    const totalTokenBudget = selected.reduce((sum, id) => {
      const depth = DIRECTOR_CDO_ACCESS_AGENT_DEPTHS[access][id];
      if (depth === 'deferred') return sum;
      return sum + SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth];
    }, 0);
    return totalTokenBudget <= DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE[args.coveragePackage]
      ? { ok: true }
      : { ok: false };
  }

  if (args.domainKey === 'automation_processes' && isCaoDeepDiveLlmEnabled()) {
    const route = routeCaoDeepDive({ goals: args.goals, constraints: args.constraints });
    const access = routeCaoAccessLevel(route.zone_stage);
    const caoIds = listCaoMvpAgentIds();
    const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CaoMvpSubAgentId =>
      (caoIds as readonly string[]).includes(id),
    );
    const selected: CaoMvpSubAgentId[] = requested.length > 0 ? requested : [...caoIds];
    const totalTokenBudget = selected.reduce((sum, id) => {
      const depth = DIRECTOR_CAO_ACCESS_AGENT_DEPTHS[access][id];
      if (depth === 'deferred') return sum;
      return sum + SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth];
    }, 0);
    return totalTokenBudget <= DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE[args.coveragePackage]
      ? { ok: true }
      : { ok: false };
  }

  if (args.domainKey === 'security_compliance' && isCsoDeepDiveLlmEnabled()) {
    const csoCase = routeCsoDeepDiveCase({ goals: args.goals, constraints: args.constraints });
    const csoIds = listCsoMvpAgentIds();
    const requested = (args.requestedSubAgentIds ?? []).filter((id): id is CsoMvpSubAgentId =>
      (csoIds as readonly string[]).includes(id),
    );
    const selected: CsoMvpSubAgentId[] = requested.length > 0 ? requested : [...csoIds];
    const totalTokenBudget = selected.reduce((sum, id) => {
      const depth = DIRECTOR_CSO_CASE_AGENT_DEPTHS[csoCase][id];
      if (depth === 'deferred') return sum;
      return sum + SUB_AGENT_TOKEN_BUDGET_BY_DEPTH[depth];
    }, 0);
    return totalTokenBudget <= DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE[args.coveragePackage]
      ? { ok: true }
      : { ok: false };
  }

  if (args.domainKey === 'tech_infrastructure' && isCtoDeepDiveLlmEnabled()) {
    const ctoIds = DIRECTOR_SUB_AGENTS.filter((a) => a.director_domain === 'tech_infrastructure').map((a) => a.id);
    const requested = (args.requestedSubAgentIds ?? []).filter((id): id is DirectorSubAgentId =>
      (ctoIds as readonly string[]).includes(id),
    );
    const selected: DirectorSubAgentId[] = requested.length > 0 ? requested : [...ctoIds];
    const totalTokenBudget = selected.reduce((sum, _id) => sum + SUB_AGENT_TOKEN_BUDGET_BY_DEPTH.standard, 0);
    return totalTokenBudget <= DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE[args.coveragePackage]
      ? { ok: true }
      : { ok: false };
  }

  if (args.domainKey === 'seo_digital' && isSeoDeepDiveLlmEnabled()) {
    const seoIds = DIRECTOR_SUB_AGENTS.filter((a) => a.director_domain === 'seo_digital').map((a) => a.id);
    const requested = (args.requestedSubAgentIds ?? []).filter((id): id is DirectorSubAgentId =>
      (seoIds as readonly string[]).includes(id),
    );
    const selected: DirectorSubAgentId[] = requested.length > 0 ? requested : [...seoIds];
    const totalTokenBudget = selected.reduce((sum, _id) => sum + SUB_AGENT_TOKEN_BUDGET_BY_DEPTH.standard, 0);
    return totalTokenBudget <= DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_BY_PACKAGE[args.coveragePackage]
      ? { ok: true }
      : { ok: false };
  }

  const mode = args.requestedMode ?? DIRECTOR_CMO_ROUTING_POLICY.defaultMode;
  const requestedSet = new Set(
    (args.requestedSubAgentIds ?? []).filter((id): id is DirectorSubAgentId => {
      if (!(DIRECTOR_SUB_AGENT_IDS as readonly string[]).includes(id)) return false;
      const agentId = id as DirectorSubAgentId;
      return DIRECTOR_MODE_AGENT_DEPTHS[mode][agentId] !== undefined;
    }),
  );
  const cmoDefaultOrder = DIRECTOR_SUB_AGENTS.filter((a) => a.director_domain === 'marketing_utp').map((a) => a.id);
  const selectedSubAgentIds: DirectorSubAgentId[] =
    requestedSet.size > 0
      ? [...requestedSet]
      : cmoDefaultOrder.filter((id) => DIRECTOR_MODE_AGENT_DEPTHS[mode][id] !== 'deferred');
  const totalTokenBudget = selectedSubAgentIds.reduce((sum: number, id: DirectorSubAgentId) => {
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
    const cmoSubAgentDomainEnabled = DIRECTOR_SUB_AGENTS_ENABLED_DOMAINS.includes(payload.domainKey as DomainKey);
    const deepHandler = resolveDirectorDeepDiveHandler(payload.domainKey, {
      cdoDeepDiveLlmEnabled: isCdoDeepDiveLlmEnabled(),
      caoDeepDiveLlmEnabled: isCaoDeepDiveLlmEnabled(),
      csoDeepDiveLlmEnabled: isCsoDeepDiveLlmEnabled(),
    });
    const cdoLlmOn = deepHandler === 'cdo' && isCdoDeepDiveLlmEnabled();
    const caoLlmOn = deepHandler === 'cao' && isCaoDeepDiveLlmEnabled();
    const csoLlmOn = deepHandler === 'cso' && isCsoDeepDiveLlmEnabled();
    const cdoOn = isDirectorCdoSubAgentsEnabled() && deepHandler === 'cdo_stub';
    const ctoOn = (isDirectorSubAgentsEnabled() || payload.subAgentsEntitled === true) && deepHandler === 'cto_stub';
    const seoOn = (isDirectorSubAgentsEnabled() || payload.subAgentsEntitled === true) && deepHandler === 'seo_stub';
    const caoOn = isDirectorCaoSubAgentsEnabled() && deepHandler === 'cao_stub';
    const csoOn = isDirectorCsoSubAgentsEnabled() && deepHandler === 'cso_stub';
    if (
      (isDirectorSubAgentsEnabled() || payload.subAgentsEntitled === true) &&
      cmoSubAgentDomainEnabled &&
      deepHandler === 'cmo'
    ) {
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
    } else if (cdoLlmOn) {
      const maxAllowed = MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage];
      const cdoResult = await runCdoSubAgentOrchestrator({
        auditId: payload.auditId,
        domainKey: payload.domainKey,
        goals: payload.goals,
        constraints: payload.constraints,
        requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, maxAllowed),
      });
      qaBlock = cdoResult.qa_block;
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: cdoResult.director_bundle,
        },
      });
    } else if (caoLlmOn) {
      const maxAllowed = MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage];
      const caoResult = await runCaoSubAgentOrchestrator({
        auditId: payload.auditId,
        domainKey: payload.domainKey,
        goals: payload.goals,
        constraints: payload.constraints,
        requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, maxAllowed),
      });
      qaBlock = caoResult.qa_block;
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: caoResult.director_bundle,
        },
      });
    } else if (csoLlmOn) {
      const maxAllowed = MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage];
      const csoResult = await runCsoSubAgentOrchestrator({
        auditId: payload.auditId,
        domainKey: payload.domainKey,
        goals: payload.goals,
        constraints: payload.constraints,
        requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, maxAllowed),
      });
      qaBlock = csoResult.qa_block;
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: csoResult.director_bundle,
        },
      });
    } else if (cdoOn) {
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: runCdoDirectorDeepDiveOrchestrator({
            domainKey: payload.domainKey,
            goals: payload.goals,
            constraints: payload.constraints,
          }),
        },
      });
    } else if (caoOn) {
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: runCaoDirectorDeepDiveOrchestrator({
            domainKey: payload.domainKey,
            goals: payload.goals,
            constraints: payload.constraints,
          }),
        },
      });
    } else if (csoOn) {
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: runCsoDirectorDeepDiveOrchestrator({
            domainKey: payload.domainKey,
            goals: payload.goals,
            constraints: payload.constraints,
          }),
        },
      });
    } else if (ctoOn) {
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: await runCtoDirectorDeepDiveOrchestrator({
            auditId: payload.auditId,
            domainKey: payload.domainKey,
            goals: payload.goals,
            constraints: payload.constraints,
            requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage]),
          }),
        },
      });
    } else if (seoOn) {
      await persistGlcDirectorOrchestrationSliceForAuditOwner({
        auditId: payload.auditId,
        domainKey: payload.domainKey as DomainKey,
        slice: {
          schema_version: GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
          deep: await runSeoDirectorDeepDiveOrchestrator({
            auditId: payload.auditId,
            domainKey: payload.domainKey,
            goals: payload.goals,
            constraints: payload.constraints,
            requestedSubAgentIds: (payload.requestedSubAgentIds ?? []).slice(0, MAX_SUB_AGENTS_PER_DEEP_DIVE[payload.coveragePackage]),
          }),
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
      concurrency: DIRECTOR_DEEP_DIVE_WORKER_CONCURRENCY,
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
