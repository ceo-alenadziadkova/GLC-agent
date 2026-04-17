import type { IntakeBriefCollectionMode, IntakeVersionTuple } from '../../../types/audit.js';
import { supabase } from '../../supabase.js';

export type IntakeBriefRow = {
  responses: Record<string, unknown> | null;
  collection_mode: IntakeBriefCollectionMode | null;
  intake_versions: IntakeVersionTuple | null;
};

export async function fetchIntakeBriefForAudit(auditId: string): Promise<IntakeBriefRow | null> {
  const { data } = await supabase
    .from('intake_brief')
    .select('responses, collection_mode, intake_versions')
    .eq('audit_id', auditId)
    .single();
  return data ? (data as IntakeBriefRow) : null;
}
