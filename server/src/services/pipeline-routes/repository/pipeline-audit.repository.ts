import type { AuditExecutionPlan } from '../../../types/audit.js';
import { safeOrUserFilter } from '../../../lib/postgrest-filter.js';
import { POSTGREST_NO_ROWS_CODE } from '../../../config/postgrest-codes.js';
import { PIPELINE_RETRY_CLAIM_OWNERSHIP } from '../../../config/pipeline-retry-claim.js';
import {
  PIPELINE_AUDIT_ORCHESTRATOR_STATUS,
  PIPELINE_CLAIMABLE_STATUSES,
  PIPELINE_STOP_CLAIMABLE_STATUSES,
} from '../../../config/pipeline-status.js';
import { logger } from '../../logger.js';
import { supabase } from '../../supabase.js';

export type AuditForStart = {
  id: string;
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  updated_at: string;
  product_mode?: string | null;
  execution_plan?: Partial<AuditExecutionPlan> | null;
  user_id: string;
  client_id: string | null;
};

export type AuditForNext = {
  id: string;
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  product_mode?: string | null;
  execution_plan?: Partial<AuditExecutionPlan> | null;
  updated_at: string;
  user_id: string;
  client_id: string | null;
};

export type AuditForRetry = {
  id: string;
  user_id: string;
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  product_mode?: string | null;
  execution_plan?: Partial<AuditExecutionPlan> | null;
  updated_at: string;
};

export type AuditForStop = {
  id: string;
  status: string;
  current_phase: number;
  updated_at: string;
  user_id: string;
  client_id: string | null;
};

export type AuditForStatus = {
  status: unknown;
  current_phase: unknown;
  tokens_used: unknown;
  token_budget: unknown;
  execution_plan: unknown;
};

type ClaimMutationResult = {
  data: unknown[] | null;
  error?: { message: string; code?: string | null } | null;
};

type AuditReadError = {
  message: string;
  code?: string | null;
};

function handleAuditReadResult<T>(context: {
  operation: string;
  auditId: string;
  error: AuditReadError | null;
  data: unknown;
}): T | null {
  const { operation, auditId, error, data } = context;
  if (error) {
    if (error.code === POSTGREST_NO_ROWS_CODE) return null;
    logger.error('pipeline.audit_read_failed', {
      component: 'pipeline_routes',
      operation,
      audit_id: auditId,
      error: error.message,
      code: error.code,
    });
    throw new Error(`[pipeline_audit_read] ${operation} failed: ${error.message}`);
  }
  return data ? (data as T) : null;
}

function throwClaimMutationError(context: {
  operation: string;
  auditId: string;
  scope?: 'user_id' | 'client_id';
  error: { message: string; code?: string | null };
}): never {
  const { operation, auditId, scope, error } = context;
  logger.error('pipeline.claim_mutation_failed', {
    component: 'pipeline_routes',
    operation,
    audit_id: auditId,
    scope,
    error: error.message,
    code: error.code,
  });
  throw new Error(`[pipeline_claim] ${operation} failed: ${error.message}`);
}

async function claimByOwnerOrClient(
  operation: string,
  auditId: string,
  claim: (scope: 'user_id' | 'client_id') => Promise<ClaimMutationResult>,
): Promise<boolean> {
  const byOwner = await claim('user_id');
  if (byOwner.error) throwClaimMutationError({ operation, auditId, scope: 'user_id', error: byOwner.error });
  if (Array.isArray(byOwner.data) && byOwner.data.length > 0) return true;
  const byClient = await claim('client_id');
  if (byClient.error) throwClaimMutationError({ operation, auditId, scope: 'client_id', error: byClient.error });
  return Array.isArray(byClient.data) && byClient.data.length > 0;
}

export async function fetchAuditForStart(auditId: string, userId: string): Promise<AuditForStart | null> {
  const { data, error } = await supabase
    .from('audits')
    .select(
      'id, status, current_phase, tokens_used, token_budget, updated_at, product_mode, execution_plan, user_id, client_id',
    )
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return handleAuditReadResult<AuditForStart>({ operation: 'fetchAuditForStart', auditId, data, error });
}

export async function fetchAuditForNext(auditId: string, userId: string): Promise<AuditForNext | null> {
  const { data, error } = await supabase
    .from('audits')
    .select(
      'id, status, current_phase, tokens_used, token_budget, product_mode, execution_plan, updated_at, user_id, client_id',
    )
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return handleAuditReadResult<AuditForNext>({ operation: 'fetchAuditForNext', auditId, data, error });
}

/** Load audit row for retry eligibility (no ownership filter — caller enforces access). */
export async function fetchAuditForRetryById(auditId: string): Promise<AuditForRetry | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('id, user_id, status, current_phase, tokens_used, token_budget, product_mode, execution_plan, updated_at')
    .eq('id', auditId)
    .single();
  return handleAuditReadResult<AuditForRetry>({ operation: 'fetchAuditForRetryById', auditId, data, error });
}

export async function fetchAuditForStop(auditId: string, userId: string): Promise<AuditForStop | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('id, status, current_phase, updated_at, user_id, client_id')
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return handleAuditReadResult<AuditForStop>({ operation: 'fetchAuditForStop', auditId, data, error });
}

export async function fetchAuditForStatus(auditId: string, userId: string): Promise<AuditForStatus | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('status, current_phase, tokens_used, token_budget, execution_plan')
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return handleAuditReadResult<AuditForStatus>({ operation: 'fetchAuditForStatus', auditId, data, error });
}

export async function fetchAuditForAnyAccess(auditId: string, userId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase.from('audits').select('id').eq('id', auditId).or(safeOrUserFilter(userId)).single();
  return handleAuditReadResult<{ id: string }>({ operation: 'fetchAuditForAnyAccess', auditId, data, error });
}

export async function fetchConsultantOwnedAudit(auditId: string, userId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase.from('audits').select('id').eq('id', auditId).eq('user_id', userId).single();
  return handleAuditReadResult<{ id: string }>({ operation: 'fetchConsultantOwnedAudit', auditId, data, error });
}

export async function claimPipelineStart(auditId: string, userId: string, updatedAt: string): Promise<boolean> {
  return claimByOwnerOrClient('claimPipelineStart', auditId, async (scope) => {
    const { data, error } = await supabase
      .from('audits')
      .update({ status: 'recon', current_phase: 0 })
      .eq('id', auditId)
      .eq(scope, userId)
      .eq('status', 'created')
      .eq('updated_at', updatedAt)
      .select('id');
    return { data, error };
  });
}

export async function claimPipelineNext(
  auditId: string,
  userId: string,
  updatedAt: string,
  lockStatus: string,
): Promise<boolean> {
  return claimByOwnerOrClient('claimPipelineNext', auditId, async (scope) => {
    const { data, error } = await supabase
      .from('audits')
      .update({ status: lockStatus })
      .eq('id', auditId)
      .eq(scope, userId)
      .eq('updated_at', updatedAt)
      .in('status', PIPELINE_CLAIMABLE_STATUSES as unknown as string[])
      .select('id');
    return { data, error };
  });
}

export type PipelineRetryOwnershipFilter =
  | { kind: typeof PIPELINE_RETRY_CLAIM_OWNERSHIP.owner; actorUserId: string }
  | { kind: typeof PIPELINE_RETRY_CLAIM_OWNERSHIP.platformOperator };

/**
 * After the last planned phase: no further `pipeline/next` work, all review gates approved.
 * Moves `audits.status` from `review` to `completed` (idempotent if already completed via refetch).
 */
export async function claimPipelineFinalizeAfterLastGate(auditId: string, userId: string, updatedAt: string): Promise<boolean> {
  return claimByOwnerOrClient('claimPipelineFinalizeAfterLastGate', auditId, async (scope) => {
    const { data, error } = await supabase
      .from('audits')
      .update({ status: 'completed' })
      .eq('id', auditId)
      .eq(scope, userId)
      .eq('updated_at', updatedAt)
      .eq('status', 'review')
      .select('id');
    return { data, error };
  });
}

export async function claimPipelineRetry(
  auditId: string,
  updatedAt: string,
  lockStatus: string,
  ownership: PipelineRetryOwnershipFilter,
): Promise<boolean> {
  let q = supabase
    .from('audits')
    .update({ status: lockStatus })
    .eq('id', auditId)
    .eq('updated_at', updatedAt)
    .in('status', PIPELINE_CLAIMABLE_STATUSES as unknown as string[]);
  if (ownership.kind === PIPELINE_RETRY_CLAIM_OWNERSHIP.owner) {
    q = q.eq('user_id', ownership.actorUserId);
  }
  const { data, error } = await q.select('id');
  if (error) throwClaimMutationError({ operation: 'claimPipelineRetry', auditId, error });
  return Boolean(data && data.length > 0);
}

export async function claimPipelineStop(auditId: string, userId: string, updatedAt: string): Promise<boolean> {
  return claimByOwnerOrClient('claimPipelineStop', auditId, async (scope) => {
    const { data, error } = await supabase
      .from('audits')
      .update({ status: 'cancelled' })
      .eq('id', auditId)
      .eq(scope, userId)
      .eq('updated_at', updatedAt)
      .in('status', PIPELINE_STOP_CLAIMABLE_STATUSES as unknown as string[])
      .select('id');
    return { data, error };
  });
}

/**
 * Platform operator: clear `cancelled` so the audit owner can call retry/next again.
 * Sets `review` (idle, claimable) — same pause state used after review gates.
 */
export async function claimPipelineResumeFromCancelled(auditId: string, updatedAt: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('audits')
    .update({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.review })
    .eq('id', auditId)
    .eq('status', 'cancelled')
    .eq('updated_at', updatedAt)
    .select('id');
  if (error) throwClaimMutationError({ operation: 'claimPipelineResumeFromCancelled', auditId, error });
  return Boolean(data && data.length > 0);
}
