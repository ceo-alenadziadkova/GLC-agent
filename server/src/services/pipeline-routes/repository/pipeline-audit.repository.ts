import type { AuditExecutionPlan } from '../../../types/audit.js';
import { safeOrUserFilter } from '../../../lib/postgrest-filter.js';
import { PIPELINE_CLAIMABLE_STATUSES, PIPELINE_STOP_CLAIMABLE_STATUSES } from '../../../config/pipeline-status.js';
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
  status: string;
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

export async function fetchAuditForRetry(auditId: string, userId: string): Promise<AuditForRetry | null> {
  const { data, error } = await supabase
    .from('audits')
    .select('id, status, tokens_used, token_budget, product_mode, execution_plan, updated_at')
    .eq('id', auditId)
    .eq('user_id', userId)
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

export async function claimPipelineRetry(
  auditId: string,
  userId: string,
  updatedAt: string,
  lockStatus: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .update({ status: lockStatus })
    .eq('id', auditId)
    .eq('user_id', userId)
    .eq('updated_at', updatedAt)
    .in('status', PIPELINE_CLAIMABLE_STATUSES as unknown as string[])
    .select('id');
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
