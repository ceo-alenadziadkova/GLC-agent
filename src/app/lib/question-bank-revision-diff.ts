/**
 * Compare two question-bank JSON revisions by stub `id` (canon layer).
 * Accepts full bank files `{ questions: [{ id }] }` or bare `{ questions: [...] }`.
 */

export type QuestionBankIdDiff = {
  added: string[];
  removed: string[];
  unchanged: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Extract sorted unique ids from parsed bank JSON (throws if shape invalid). */
export function extractQuestionIdsFromBankJson(json: unknown): string[] {
  if (!isRecord(json) || !Array.isArray(json.questions)) {
    throw new Error('Expected JSON object with a "questions" array');
  }
  const ids: string[] = [];
  for (const row of json.questions) {
    if (!isRecord(row) || typeof row.id !== 'string' || row.id.length === 0) {
      throw new Error('Each question must be an object with non-empty string "id"');
    }
    ids.push(row.id);
  }
  const uniq = [...new Set(ids)];
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq;
}

export function diffQuestionBankIdSets(baseIds: string[], otherIds: string[]): QuestionBankIdDiff {
  const a = new Set(baseIds);
  const b = new Set(otherIds);
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  for (const id of otherIds) {
    if (!a.has(id)) added.push(id);
    else unchanged.push(id);
  }
  for (const id of baseIds) {
    if (!b.has(id)) removed.push(id);
  }
  added.sort((x, y) => x.localeCompare(y));
  removed.sort((x, y) => x.localeCompare(y));
  unchanged.sort((x, y) => x.localeCompare(y));
  return { added, removed, unchanged };
}

export function diffQuestionBankJson(baseJson: unknown, otherJson: unknown): QuestionBankIdDiff {
  return diffQuestionBankIdSets(
    extractQuestionIdsFromBankJson(baseJson),
    extractQuestionIdsFromBankJson(otherJson),
  );
}
