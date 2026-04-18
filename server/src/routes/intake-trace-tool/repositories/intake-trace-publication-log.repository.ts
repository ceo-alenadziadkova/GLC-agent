import { supabase } from '../../../services/supabase.js';
import type { WordingPublicationLogRow } from '../domain/wording-draft.types.js';

export async function listWordingPublicationLogRows(
  userId: string,
  limit: number,
): Promise<WordingPublicationLogRow[]> {
  const { data, error } = await supabase
    .from('intake_wording_publication_log')
    .select('id, action, question_ids, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as WordingPublicationLogRow[];
}
