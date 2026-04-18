import { supabase } from '../../services/supabase.js';
import type { AuditRequestRow } from '../types.js';

export type ListAuditRequestsInput = {
  clientId?: string;
  limit: number;
  offset: number;
};

export async function createAuditRequestRow(input: {
  client_id: string;
  url: string;
  industry: string | null;
  product_mode: string;
  brief_snapshot: Record<string, unknown>;
  client_notes: string | null;
  status: string;
}) {
  return supabase.from('audit_requests').insert(input).select().single();
}

export async function listAuditRequests(input: ListAuditRequestsInput) {
  let query = supabase
    .from('audit_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.clientId) {
    query = query.eq('client_id', input.clientId);
  }

  return query;
}

export async function getAuditRequestById(id: string, clientId?: string) {
  let query = supabase.from('audit_requests').select('*').eq('id', id);
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  return query.single();
}

export async function getAuditRequestFieldsById(id: string, fields: string) {
  return supabase.from('audit_requests').select(fields).eq('id', id).single();
}

export async function updateAuditRequestById(id: string, updates: Record<string, unknown>) {
  return supabase.from('audit_requests').update(updates).eq('id', id).select().single();
}

export async function claimAuditRequestForApprove(id: string) {
  return supabase
    .from('audit_requests')
    .update({ status: 'under_review' })
    .eq('id', id)
    .eq('status', 'submitted')
    .is('audit_id', null)
    .select('id');
}

export async function deleteAuditById(id: string) {
  return supabase.from('audits').delete().eq('id', id);
}

export function asAuditRequestRow(row: unknown): AuditRequestRow {
  return row as AuditRequestRow;
}
