import type { WordingAction } from './wording-actions.js';

export type WordingDraftRow = {
  question_id: string | null;
  draft_text: string | null;
  published_text: string | null;
};

export type WordingActionSourceRow = {
  question_id: string | null;
  source_text: string | null;
};

export type WordingPublicationLogRow = {
  id: string | null;
  action: WordingAction | null;
  question_ids: unknown;
  created_at: string | null;
};
