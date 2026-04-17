import { supabase } from '../../services/supabase.js';

export async function fetchBriefByAuditId(auditId: string) {
  return supabase.from('intake_brief').select('*').eq('audit_id', auditId).single();
}

export async function fetchBriefVersionByAuditId(auditId: string) {
  return supabase.from('intake_brief').select('intake_versions').eq('audit_id', auditId).maybeSingle();
}

export async function insertBriefAnalyticsEvents(rows: Record<string, unknown>[]) {
  return supabase.from('intake_analytics_events').insert(rows);
}
