import { supabase } from '../../services/supabase.js';

export type CollectedDataRow = {
  collector_key: string;
  data: Record<string, unknown>;
};

/**
 * All collector rows for an audit (one row per `collector_key` after upsert).
 */
export async function fetchCollectedDataRowsForAudit(
  auditId: string,
): Promise<{ rows: CollectedDataRow[]; error: { message: string } | null }> {
  const { data, error } = await supabase
    .from('collected_data')
    .select('collector_key, data')
    .eq('audit_id', auditId);
  if (error) {
    return { rows: [], error: { message: error.message } };
  }
  const rows = (data ?? [])
    .map(r => {
      const raw = r as { collector_key: string; data: unknown };
      if (!raw.collector_key || !raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) {
        return null;
      }
      return { collector_key: raw.collector_key, data: raw.data as Record<string, unknown> };
    })
    .filter((r): r is CollectedDataRow => r != null);
  return { rows, error: null };
}
