import type { AuditExecutionPlan } from '../../../types/audit.js';
import { safeOrUserFilter } from '../../../lib/postgrest-filter.js';
import { PIPELINE_RETRY_CLAIM_OWNERSHIP } from '../../../config/pipeline-retry-claim.js';
import {
  PIPELINE_AUDIT_ORCHESTRATOR_STATUS,
  PIPELINE_CLAIMABLE_STATUSES,
  PIPELINE_STOP_CLAIMABLE_STATUSES,
} from '../../../config/pipeline-status.js';
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

export async function fetchAuditForStart(auditId: string, userId: string): Promise<AuditForStart | null> {
  const { data, error } = await supabase
    .from('audits')
    .select(
      'id, status, current_phase, tokens_used, token_budget, updated_at, product_mode, execution_plan, user_id, client_id',
    )
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return error || !data ? null : (data as AuditForStart);
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
  return error || !data ? null : (data as AuditForNext);
}

/** Load audit row for retry eligibility (no ownership filter — caller enforces access). */
export async function fetchAuditForRetryById(auditId: string): Promise<AuditForRetry | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('id, user_id, status, current_phase, tokens_used, token_budget, product_mode, execution_plan, updated_at')
    .eq('id', auditId)
    .single();
  return error || !data ? null : (data as AuditForRetry);
}

export async function fetchAuditForStop(auditId: string, userId: string): Promise<AuditForStop | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('id, status, current_phase, updated_at, user_id, client_id')
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return error || !data ? null : (data as AuditForStop);
}

export async function fetchAuditForStatus(auditId: string, userId: string): Promise<AuditForStatus | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('status, current_phase, tokens_used, token_budget, execution_plan')
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();
  return error || !data ? null : (data as AuditForStatus);
}

export async function fetchAuditForAnyAccess(auditId: string, userId: string): Promise<{ id: string } | null> {
  const { data } = await supabase.from('audits').select('id').eq('id', auditId).or(safeOrUserFilter(userId)).single();
  return data ? ({ id: (data as { id: string }).id } as { id: string }) : null;
}

export async function fetchConsultantOwnedAudit(auditId: string, userId: string): Promise<{ id: string } | null> {
  const { data } = await supabase.from('audits').select('id').eq('id', auditId).eq('user_id', userId).single();
  return data ? ({ id: (data as { id: string }).id } as { id: string }) : null;
}

export async function claimPipelineStart(auditId: string, userId: string, updatedAt: string): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .update({ status: 'recon', current_phase: 0 })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('status', 'created')
    .eq('updated_at', updatedAt)
    .select('id');
  return Boolean(data && data.length > 0);
}

export async function claimPipelineNext(
  auditId: string,
  userId: string,
  updatedAt: string,
  lockStatus: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .update({ status: lockStatus })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('updated_at', updatedAt)
    .in('status', PIPELINE_CLAIMABLE_STATUSES as unknown as string[])
    .select('id');
  return Boolean(data && data.length > 0);
}

export type PipelineRetryOwnershipFilter =
  | { kind: typeof PIPELINE_RETRY_CLAIM_OWNERSHIP.owner; actorUserId: string }
  | { kind: typeof PIPELINE_RETRY_CLAIM_OWNERSHIP.platformOperator };

/**
 * After the last planned phase: no further `pipeline/next` work, all review gates approved.
 * Moves `audits.status` from `review` to `completed` (idempotent if already completed via refetch).
 */
export async function claimPipelineFinalizeAfterLastGate(auditId: string, userId: string, updatedAt: string): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .update({ status: 'completed' })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('updated_at', updatedAt)
    .eq('status', 'review')
    .select('id');
  return Boolean(data && data.length > 0);
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
  const { data } = await q.select('id');
  return Boolean(data && data.length > 0);
}

export async function claimPipelineStop(auditId: string, userId: string, updatedAt: string): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .update({ status: 'cancelled' })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('updated_at', updatedAt)
    .in('status', PIPELINE_STOP_CLAIMABLE_STATUSES as unknown as string[])
    .select('id');
  return Boolean(data && data.length > 0);
}

/**
 * Platform operator: clear `cancelled` so the audit owner can call retry/next again.
 * Sets `review` (idle, claimable) — same pause state used after review gates.
 */
export async function claimPipelineResumeFromCancelled(auditId: string, updatedAt: string): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .update({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.review })
    .eq('id', auditId)
    .eq('status', 'cancelled')
    .eq('updated_at', updatedAt)
    .select('id');
  return Boolean(data && data.length > 0);
}
