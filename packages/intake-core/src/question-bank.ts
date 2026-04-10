/**
 * Canonical question-bank v1 — imported from question-bank.v1.json (docs/QUESTION_BANK.md).
 * Domain slices (§5): primary/secondary feeds in question-feed-roles.ts → domain-slice-data → ordered here.
 */
import { DOMAIN_TO_QUESTIONS_RAW } from './domain-slice-data.js';
import { buildOrderedDomainToQuestionIds, feedsByQuestionId } from './domain-map-build.js';
import type {
  IntakeAnswerContract,
  IntakePriority,
  IntakeQuestionStub,
  IntakeSliceDomain,
} from './types.js';
import raw from './question-bank.v1.json' with { type: 'json' };

interface RawQuestion {
  id: string;
  section: string;
  priority: IntakePriority;
  branch?: string;
  /** Short English label for agent prompts (docs/QUESTION_BANK.md). */
  label?: string;
  /** Optional: how this answer feeds reporting / strategy (ADR Phase E). */
  reportUse?: string;
  answer?: IntakeAnswerContract;
}

interface RawBankFile {
  version: string;
  optionCatalogs?: Record<string, string[]>;
  questions: RawQuestion[];
}

/** Minimal shape for stub extraction (frozen artifacts may omit newer canon fields). */
export type QuestionBankStubSource = {
  questions: Array<{
    id: string;
    /** JSON import infers `string`; validated at runtime by consumers / lint. */
    priority: string;
    branch?: string;
    answer?: IntakeAnswerContract;
  }>;
};

const rawTyped = raw as RawBankFile;

export const QUESTION_BANK_VERSION = rawTyped.version;

/** Frozen catalogs for `optionsRef` resolution (canon layer). */
export const QUESTION_BANK_OPTION_CATALOGS: Readonly<Record<string, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    Object.entries(rawTyped.optionCatalogs ?? {}).map(([k, v]) => [k, Object.freeze([...v])] as const),
  ),
);

/**
 * Build stubs from a raw bank JSON object (used for frozen artifact tuples).
 */
export function intakeStubsFromBankRaw(data: QuestionBankStubSource): IntakeQuestionStub[] {
  return data.questions.map(q => ({
    id: q.id,
    priority: q.priority as IntakePriority,
    branchCondition: q.branch,
    answer: q.answer,
  }));
}

export const QUESTION_BANK_V1_STUBS: IntakeQuestionStub[] = intakeStubsFromBankRaw(rawTyped);

/** Inverted §5 map — which agents consume each question id. */
export const QUESTION_FEEDS_BY_ID = feedsByQuestionId(DOMAIN_TO_QUESTIONS_RAW);

/** Per-agent question ids in canonical bank order. */
export const DOMAIN_TO_QUESTION_IDS: Record<IntakeSliceDomain, string[]> = buildOrderedDomainToQuestionIds(
  QUESTION_BANK_V1_STUBS,
  DOMAIN_TO_QUESTIONS_RAW,
);

const PROMPT_LABEL_BY_ID = new Map<string, string>();
const REPORT_USE_BY_ID = new Map<string, string>();
const ANSWER_BY_ID = new Map<string, IntakeAnswerContract>();
for (const q of rawTyped.questions) {
  if (q.label && q.label.length > 0) PROMPT_LABEL_BY_ID.set(q.id, q.label);
  if (typeof q.reportUse === 'string' && q.reportUse.trim().length > 0) {
    REPORT_USE_BY_ID.set(q.id, q.reportUse.trim());
  }
  if (q.answer) ANSWER_BY_ID.set(q.id, q.answer);
}

export interface QuestionBankSchemaMeta {
  label: string;
  section: string;
  priority: IntakePriority;
}

const SCHEMA_META_BY_ID = new Map<string, QuestionBankSchemaMeta>();
for (const q of rawTyped.questions) {
  SCHEMA_META_BY_ID.set(q.id, {
    label: q.label ?? q.id,
    section: q.section,
    priority: q.priority,
  });
}

/** Human label for Claude prompts; undefined if id is not in bank or has no label. */
export function getQuestionBankPromptLabel(id: string): string | undefined {
  return PROMPT_LABEL_BY_ID.get(id);
}

/** Canon label + section + priority for API schema snapshots (`GET .../brief/schema`). */
export function getQuestionBankSchemaMeta(id: string): QuestionBankSchemaMeta | undefined {
  return SCHEMA_META_BY_ID.get(id);
}

/** Optional reporting hint from canon (`reportUse`); undefined when not set. */
export function getQuestionBankReportUse(id: string): string | undefined {
  return REPORT_USE_BY_ID.get(id);
}

/** Canon answer contract for a bank id (bank v1.1+). */
export function getQuestionBankAnswerContract(id: string): IntakeAnswerContract | undefined {
  return ANSWER_BY_ID.get(id);
}

/**
 * Resolve `optionsRef` into inline `options` for API consumers (no separate catalog fetch).
 */
export function expandAnswerContractForApi(contract: IntakeAnswerContract): IntakeAnswerContract {
  if (contract.optionsRef) {
    const cat = QUESTION_BANK_OPTION_CATALOGS[contract.optionsRef];
    if (cat?.length) {
      const { optionsRef: _ref, ...rest } = contract;
      return { ...rest, options: [...cat] };
    }
  }
  return contract;
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
