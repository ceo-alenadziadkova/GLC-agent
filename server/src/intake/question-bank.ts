/**
 * Canonical question-bank v1 — imported from question-bank.v1.json (docs/QUESTION_BANK.md).
 * Domain slices (§5) are derived from ./domain-slice-data.ts and ordered by bank sequence.
 */
import { calcDataQualityScore } from './data-quality.js';
import { DOMAIN_TO_QUESTIONS_RAW } from './domain-slice-data.js';
import { buildOrderedDomainToQuestionIds, feedsByQuestionId } from './domain-map-build.js';
import type { IntakePriority, IntakeQuestionStub, IntakeSliceDomain } from './types.js';
import raw from './question-bank.v1.json' with { type: 'json' };

interface RawQuestion {
  id: string;
  section: string;
  priority: IntakePriority;
  branch?: string;
  /** Short English label for agent prompts (docs/QUESTION_BANK.md). */
  label?: string;
}

const rawTyped = raw as { version: string; questions: RawQuestion[] };

export const QUESTION_BANK_VERSION = rawTyped.version;

export const QUESTION_BANK_V1_STUBS: IntakeQuestionStub[] = rawTyped.questions.map(q => ({
  id: q.id,
  priority: q.priority,
  branchCondition: q.branch,
}));

/** Inverted §5 map — which agents consume each question id. */
export const QUESTION_FEEDS_BY_ID = feedsByQuestionId(DOMAIN_TO_QUESTIONS_RAW);

/** Per-agent question ids in canonical bank order. */
export const DOMAIN_TO_QUESTION_IDS: Record<IntakeSliceDomain, string[]> = buildOrderedDomainToQuestionIds(
  QUESTION_BANK_V1_STUBS,
  DOMAIN_TO_QUESTIONS_RAW,
);

const PROMPT_LABEL_BY_ID = new Map<string, string>();
for (const q of rawTyped.questions) {
  if (q.label && q.label.length > 0) PROMPT_LABEL_BY_ID.set(q.id, q.label);
}

/** Human label for Claude prompts; undefined if id is not in bank or has no label. */
export function getQuestionBankPromptLabel(id: string): string | undefined {
  return PROMPT_LABEL_BY_ID.get(id);
}

export const QUESTION_BANK_V1_IDS = new Set(QUESTION_BANK_V1_STUBS.map(q => q.id));

/** True when responses include at least one v1 bank id (migration / dual schema). */
export function responsesUseQuestionBankV1(responses: Record<string, unknown>): boolean {
  for (const key of Object.keys(responses)) {
    if (QUESTION_BANK_V1_IDS.has(key)) return true;
  }
  return false;
}

export function roundDataQualityScore(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
}

/** Server-side data_quality_score for `intake_brief` when responses use bank ids; else null (caller skips DB field). */
export function deriveBankV1DataQuality(responses: Record<string, unknown>): number | null {
  if (!responsesUseQuestionBankV1(responses)) return null;
  return roundDataQualityScore(calcDataQualityScore(QUESTION_BANK_V1_STUBS, responses).score);
}
