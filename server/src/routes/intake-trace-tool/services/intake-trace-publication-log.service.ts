import { mapPublicationLogEntries } from '../mappers/intake-trace-http.mapper.js';
import { listWordingPublicationLogRows } from '../repositories/intake-trace-publication-log.repository.js';

export async function loadPublicationLog(userId: string, limit: number): Promise<{
  entries: Array<{
    id: string;
    action: 'publish' | 'rollback';
    question_ids: string[];
    created_at: string;
  }>;
}> {
  const rows = await listWordingPublicationLogRows(userId, limit);
  return { entries: mapPublicationLogEntries(rows) };
}
