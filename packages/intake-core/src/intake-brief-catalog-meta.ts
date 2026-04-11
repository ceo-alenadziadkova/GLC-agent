/**
 * Classic brief catalog from `intake-brief-catalog-meta.v1.json`
 * (hints, UI sections, follow-ups, high-revenue ids, `classicBriefSlice`).
 *
 * Question `id` and persisted response keys are **bank ids** from each row’s `bankId`.
 * Stems come from `question-bank.v1.json` via `buildBriefQuestionStemFromBankId`.
 * Modes / pre-brief identity / express SLA: `intake-policy.v1.json` + `express-policy-ids.ts`.
 */
import type { BriefQuestion } from './audit-contract.js';
import { buildBriefQuestionStemFromBankId } from './bank-question-presentation.js';
import { INTAKE_POLICY_V1, PRE_BRIEF_BANK_INCLUDED_IDS } from './core/load-policy.js';
import { EXPRESS_REQUIRED_ALWAYS_IDS, EXPRESS_REQUIRED_IF_VISIBLE_IDS } from './express-policy-ids.js';
import raw from './intake-brief-catalog-meta.v1.json' with { type: 'json' };

type SliceBankRow = {
  bankId: string;
  priority: BriefQuestion['priority'];
  domains: BriefQuestion['domains'];
};

type ClassicBriefSlice = {
  version: string;
  identity: SliceBankRow[];
  /** Copy for errors/tooling; industry "Other" clarify uses the same id via `choiceSpecifyResponseKey('a2')` — not a separate brief row. */
  identitySpecify?: {
    id: string;
    priority: BriefQuestion['priority'];
    domains: BriefQuestion['domains'];
    question: string;
    hint: string;
    type: BriefQuestion['type'];
  };
  main: SliceBankRow[];
};

type CatalogMetaFile = {
  version: string;
  highRevenueQuestionIds: string[];
  consultantHints: Record<string, string>;
  triggersFollowup: Record<string, string[]>;
  uiSectionByQuestionId: Record<string, string>;
  classicBriefSlice: ClassicBriefSlice;
};

const file = raw as CatalogMetaFile;

if (!file.classicBriefSlice?.identity?.length || !file.classicBriefSlice.main?.length) {
  throw new Error('intake-brief-catalog-meta.v1.json: classicBriefSlice.identity and .main are required');
}

const slice = file.classicBriefSlice;

export const INTAKE_BRIEF_HIGH_REVENUE_QUESTION_IDS: ReadonlySet<string> = new Set(
  file.highRevenueQuestionIds,
);

export const INTAKE_BRIEF_CONSULTANT_HINTS: Readonly<Record<string, string>> = file.consultantHints;

export const INTAKE_BRIEF_TRIGGERS_FOLLOWUP: Readonly<Record<string, readonly string[]>> = file
  .triggersFollowup as Readonly<Record<string, readonly string[]>>;

export const INTAKE_BRIEF_UI_SECTION_BY_ID: Readonly<Record<string, string>> =
  file.uiSectionByQuestionId;

/** Max length for free-text / textarea answers (classic brief + bank). */
export const BRIEF_ANSWER_STRING_MAX = 12_000;

const preBriefIdentity = INTAKE_POLICY_V1.modes.pre_brief.identityFieldIds;
if (!preBriefIdentity?.length) {
  throw new Error('intake-policy: modes.pre_brief.identityFieldIds missing');
}

/** Same order as policy `identityFieldIds` (bank ids only; `intake_industry_specify` is a side key for a2 Other, not a list row). */
export const INTAKE_IDENTITY_FIELD_IDS = preBriefIdentity as readonly string[];

function bankRowToBriefQuestion(row: SliceBankRow): BriefQuestion {
  return {
    ...buildBriefQuestionStemFromBankId(row.bankId),
    priority: row.priority,
    domains: row.domains,
  };
}

/** Identity block rows only; a2 "Other" uses `intake_industry_specify` inline (BriefField specify), not a second card. */
const BASE_INTAKE_IDENTITY_QUESTIONS: BriefQuestion[] = slice.identity.map(bankRowToBriefQuestion);

const BASE_BRIEF_QUESTIONS: BriefQuestion[] = slice.main.map(bankRowToBriefQuestion);

export const EXPRESS_REQUIRED_QUESTION_IDS = EXPRESS_REQUIRED_ALWAYS_IDS;

export const PRE_BRIEF_PARTICIPATION_IDS: ReadonlySet<string> = new Set<string>([
  ...INTAKE_IDENTITY_FIELD_IDS,
  ...PRE_BRIEF_BANK_INCLUDED_IDS,
]);

/** Static bank ids that may be required on public pre-brief submit (express SLA intersect `pre_brief.bankIncluded`). */
const PRE_BRIEF_BANK_ID_SET = new Set<string>(PRE_BRIEF_BANK_INCLUDED_IDS);

export const PRE_BRIEF_REQUIRED_SUBMIT_IDS = [
  ...EXPRESS_REQUIRED_ALWAYS_IDS,
  ...EXPRESS_REQUIRED_IF_VISIBLE_IDS.filter(id => PRE_BRIEF_BANK_ID_SET.has(id)),
] as const;

export { INTAKE_BRIEF_UI_SECTION_BY_ID as BRIEF_QUESTION_UI_SECTION };

function enrichQuestion(question: BriefQuestion): BriefQuestion {
  const importance =
    question.priority === 'required' ? 'red' : question.priority === 'recommended' ? 'yellow' : 'green';
  const weight = importance === 'red' ? 3 : importance === 'yellow' ? 2 : 1;

  let ux_group: BriefQuestion['ux_group'] = 'business';
  if (question.id === 'a11' || question.id === 'a12' || question.id === 'a2' || question.id === 'a5') {
    ux_group = 'basics';
  } else if (question.domains.includes('tech_infrastructure') || question.domains.includes('security_compliance')) {
    ux_group = 'tech';
  } else if (question.domains.includes('seo_digital')) {
    ux_group = 'audience';
  } else if (question.id === 'f1' || question.id === 'f2' || question.id === 'f8') {
    ux_group = 'goals';
  } else if (question.id === 'a7') {
    ux_group = 'business';
  } else if (question.id === 'a10') {
    ux_group = 'basics';
  }

  let intake_layer: BriefQuestion['intake_layer'] = question.priority === 'required' ? 1 : 2;
  if (PRE_BRIEF_PARTICIPATION_IDS.has(question.id)) {
    intake_layer = 'pre_brief';
  }

  const revenue_signal = INTAKE_BRIEF_HIGH_REVENUE_QUESTION_IDS.has(question.id)
    ? 'high'
    : question.priority === 'optional'
      ? 'low'
      : 'medium';

  const section = INTAKE_BRIEF_UI_SECTION_BY_ID[question.id];

  return {
    ...question,
    ...(section !== undefined ? { section } : {}),
    importance,
    weight,
    ux_group,
    intake_layer,
    consultant_hint: INTAKE_BRIEF_CONSULTANT_HINTS[question.id],
    revenue_signal,
    triggers_followup: [...(INTAKE_BRIEF_TRIGGERS_FOLLOWUP[question.id] ?? [])],
  };
}

/**
 * @deprecated As a driver for server API question bundles.
 * Prefer `buildIntakePlan(...).visible` + `getBriefQuestionsByIds` for route payloads.
 */
export const BRIEF_QUESTIONS: BriefQuestion[] = BASE_BRIEF_QUESTIONS.map(enrichQuestion);

export const INTAKE_IDENTITY_BRIEF_QUESTIONS: BriefQuestion[] =
  BASE_INTAKE_IDENTITY_QUESTIONS.map(enrichQuestion);

export function getBriefQuestionText(id: string): string {
  const specifyId = INTAKE_POLICY_V1.modes.pre_brief.identitySpecifyFieldId;
  if (id === specifyId && slice.identitySpecify) {
    return slice.identitySpecify.question;
  }
  return (
    BRIEF_QUESTIONS.find(q => q.id === id)?.question
    ?? INTAKE_IDENTITY_BRIEF_QUESTIONS.find(q => q.id === id)?.question
    ?? id.replace(/_/g, ' ')
  );
}

export const REQUIRED_QUESTION_IDS = BRIEF_QUESTIONS.filter(q => q.priority === 'required').map(q => q.id);

export const RECOMMENDED_QUESTION_IDS = BRIEF_QUESTIONS.filter(q => q.priority === 'recommended').map(q => q.id);

export const OPTIONAL_QUESTION_IDS = BRIEF_QUESTIONS.filter(q => q.priority === 'optional').map(q => q.id);

export const PRE_BRIEF_QUESTION_IDS = BRIEF_QUESTIONS.filter(q => q.intake_layer === 'pre_brief').map(q => q.id);

const BRIEF_QUESTION_BY_ID = new Map(BRIEF_QUESTIONS.map(q => [q.id, q] as const));

export function getBriefQuestionsByIds(ids: readonly string[]): BriefQuestion[] {
  const out: BriefQuestion[] = [];
  for (const id of ids) {
    const q = BRIEF_QUESTION_BY_ID.get(id);
    if (q) out.push(q);
  }
  return out;
}

export function getQuestionsForDomain(domainKey: string): BriefQuestion[] {
  return BRIEF_QUESTIONS.filter(
    q => q.domains.includes('all') || q.domains.includes(domainKey as BriefQuestion['domains'][number]),
  );
}
