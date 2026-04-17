import { supabase } from '../../supabase.js';

export async function getAuditProductMode(auditId: string): Promise<string | null> {
  const { data: audit } = await supabase
    .from('audits')
    .select('product_mode')
    .eq('id', auditId)
    .single();
  return (audit?.product_mode as string | undefined) ?? null;
}

export async function getIntakeBriefByAuditId(auditId: string) {
  const { data } = await supabase
    .from('intake_brief')
    .select('*')
    .eq('audit_id', auditId)
    .single();
  return data ?? null;
}

export async function getBriefMetaByAuditId(auditId: string) {
  const { data } = await supabase
    .from('intake_brief')
    .select('recon_prefills, recon_conflicts, collection_mode, intake_versions')
    .eq('audit_id', auditId)
    .maybeSingle();
  return data ?? null;
}

export async function upsertIntakeBrief(auditId: string, payload: Record<string, unknown>) {
  return supabase
    .from('intake_brief')
    .upsert(
      {
        audit_id: auditId,
        ...payload,
      },
      { onConflict: 'audit_id' },
    );
}

export async function upsertIntakeBriefReturningSingle(auditId: string, payload: Record<string, unknown>) {
  return supabase
    .from('intake_brief')
    .upsert(
      {
        audit_id: auditId,
        ...payload,
      },
      { onConflict: 'audit_id' },
    )
    .select()
    .single();
}
