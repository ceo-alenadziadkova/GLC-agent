import { supabase } from '../../../services/supabase.js';
import { DISCOVER_SESSIONS_LIST_MAX } from '../../../config/route-query-limits.js';

export type DiscoverySessionInsertRow = {
  answers: Record<string, unknown>;
  maturity_level: number;
  findings: unknown[];
  contact_edit_key_hash: string;
};

export type DiscoverySessionCreated = {
  session_token: string;
  created_at: string;
};

export type DiscoverySessionListRow = {
  session_token: string;
  maturity_level: number;
  findings: unknown;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  audit_id: string | null;
  created_at: string;
  answers: unknown;
  consultant_id: string | null;
};

export type DiscoverySessionPublicRow = {
  answers: unknown;
  maturity_level: number;
  findings: unknown;
  created_at: string;
  audit_id: string | null;
};

export type DiscoverySessionContactLoadRow = {
  id: string;
  contact_edit_key_hash: string | null;
  audit_id: string | null;
};

const LIST_SELECT =
  'session_token, maturity_level, findings, contact_name, contact_email, contact_phone, contact_company, audit_id, created_at, answers, consultant_id';

export async function insertDiscoverySession(
  row: DiscoverySessionInsertRow,
): Promise<{ data: DiscoverySessionCreated | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('discovery_sessions')
    .insert(row)
    .select('session_token, created_at')
    .single();
  return {
    data: data as DiscoverySessionCreated | null,
    error: error as { message: string } | null,
  };
}

/**
 * Unclaimed sessions plus sessions owned by this consultant (queue triage + own work).
 */
export async function listDiscoverySessionsForConsultant(consultantId: string): Promise<{
  data: DiscoverySessionListRow[] | null;
  error: { message: string } | null;
}> {
  const { data, error } = await supabase
    .from('discovery_sessions')
    .select(LIST_SELECT)
    .or(`consultant_id.is.null,consultant_id.eq.${consultantId}`)
    .order('created_at', { ascending: false })
    .limit(DISCOVER_SESSIONS_LIST_MAX);
  return {
    data: data as DiscoverySessionListRow[] | null,
    error: error as { message: string } | null,
  };
}

export async function getDiscoverySessionPublicByToken(token: string): Promise<{
  data: DiscoverySessionPublicRow | null;
  error: { message: string; code?: string } | null;
}> {
  const { data, error } = await supabase
    .from('discovery_sessions')
    .select('answers, maturity_level, findings, created_at, audit_id')
    .eq('session_token', token)
    .single();
  return {
    data: data as DiscoverySessionPublicRow | null,
    error: error as { message: string; code?: string } | null,
  };
}

export async function getDiscoverySessionForContactPatch(token: string): Promise<{
  data: DiscoverySessionContactLoadRow | null;
  error: { message: string } | null;
}> {
  const { data, error } = await supabase
    .from('discovery_sessions')
    .select('id, contact_edit_key_hash, audit_id')
    .eq('session_token', token)
    .maybeSingle();
  return {
    data: data as DiscoverySessionContactLoadRow | null,
    error: error as { message: string } | null,
  };
}

export async function updateDiscoverySessionContact(
  token: string,
  patch: Record<string, string | null>,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('discovery_sessions')
    .update(patch)
    .eq('session_token', token)
    .is('audit_id', null)
    .select('id')
    .maybeSingle();
  return {
    data: data as { id: string } | null,
    error: error as { message: string } | null,
  };
}
