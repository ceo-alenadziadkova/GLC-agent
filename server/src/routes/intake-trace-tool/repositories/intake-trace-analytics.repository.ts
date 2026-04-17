import { supabase } from '../../../services/supabase.js';
import type { IntakeAnalyticsInsertRow } from '../mappers/intake-trace-db.mapper.js';

export async function insertAnalyticsRows(rows: IntakeAnalyticsInsertRow[]): Promise<void> {
  const { error } = await supabase.from('intake_analytics_events').insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}
