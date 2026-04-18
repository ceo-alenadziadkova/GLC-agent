import { supabase } from '../../services/supabase.js';

export async function fetchAuditOwnershipById(id: string) {
  return supabase.from('audits').select('id, user_id, client_id').eq('id', id).single();
}

export async function fetchAuditForBriefById(id: string) {
  return supabase
    .from('audits')
    .select('id, product_mode, execution_plan, user_id, client_id')
    .eq('id', id)
    .single();
}

export async function fetchAuditForHelpRequestById(id: string) {
  return supabase.from('audits').select('id, user_id, client_id, company_url, status').eq('id', id).single();
}

export async function markBriefHelpRequested(auditId: string, clientId: string, message: string | null) {
  return supabase
    .from('audits')
    .update({
      brief_help_requested_at: new Date().toISOString(),
      brief_help_client_message: message,
    })
    .eq('id', auditId)
    .eq('client_id', clientId);
}

export async function deleteAuditByIdAndOwner(id: string, ownerUserId: string) {
  return supabase.from('audits').delete().eq('id', id).eq('user_id', ownerUserId);
}
