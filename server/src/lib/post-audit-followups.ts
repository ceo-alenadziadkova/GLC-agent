/**
 * Map agent unknown_items to brief question IDs for post-audit enrichment (Layer 3 nudges).
 */
import { getQuestionsForDomain } from '../schemas/intake-brief.js';
import type { BriefQuestion, DomainKey } from '../types/audit.js';

export interface PostAuditQuestionRef {
  domain: string;
  id: string;
}

function scoreQuestionAgainstUnknowns(q: BriefQuestion, unknownItems: string[]): number {
  let score = 0;
  const blob = `${q.id} ${q.question} ${q.hint ?? ''}`.toLowerCase();
  const tokens = blob.split(/\W+/).filter(w => w.length > 4);
  const idPhrase = q.id.replace(/_/g, ' ');
  for (const raw of unknownItems) {
    const u = raw.toLowerCase();
    if (u.includes(idPhrase)) score += 4;
    for (const t of tokens) {
      if (t.length > 4 && u.includes(t)) score += 2;
    }
  }
  return score;
}

export function followupQuestionsFromUnknowns(
  domainKey: DomainKey,
  unknownItems: string[]
): PostAuditQuestionRef[] {
  if (unknownItems.length === 0) return [];
  const candidates = getQuestionsForDomain(domainKey);
  const scored = candidates
    .map(q => ({ q, score: scoreQuestionAgainstUnknowns(q, unknownItems) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const out: PostAuditQuestionRef[] = [];
  for (const { q } of scored.slice(0, 2)) {
    out.push({ domain: domainKey, id: q.id });
  }
  return out;
}
