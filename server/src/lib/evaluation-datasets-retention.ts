import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';

/**
 * Deletes expired `evaluation_datasets` rows (`expires_at < now`) and returns deleted count.
 * Best-effort: logs and returns 0 on failure.
 */
export async function cleanupExpiredEvaluationDatasets(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('evaluation_datasets')
    .delete()
    .lt('expires_at', nowIso)
    .select('id');

  if (error) {
    logger.error('Failed to cleanup expired evaluation_datasets', { error: error.message });
    return 0;
  }
  return data?.length ?? 0;
}
