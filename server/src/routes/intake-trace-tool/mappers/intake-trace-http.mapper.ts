import type { WordingPublicationLogRow } from '../domain/wording-draft.types.js';
import { WORDING_ACTIONS, type WordingAction } from '../domain/wording-actions.js';

function mapAction(value: WordingAction | null): WordingAction {
  if (value === WORDING_ACTIONS.rollback) return WORDING_ACTIONS.rollback;
  return WORDING_ACTIONS.publish;
}

export function mapPublicationLogEntries(rows: WordingPublicationLogRow[]): Array<{
  id: string;
  action: WordingAction;
  question_ids: string[];
  created_at: string;
}> {
  return rows
    .filter(row => typeof row.id === 'string' && typeof row.created_at === 'string')
    .map(row => ({
      id: row.id as string,
      action: mapAction(row.action),
      question_ids: Array.isArray(row.question_ids) ? (row.question_ids as string[]) : [],
      created_at: row.created_at as string,
    }));
}
