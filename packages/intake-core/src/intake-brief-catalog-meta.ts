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
  enrichmentPolicy: {
    weightByImportance: Record<'red' | 'yellow' | 'green', number>;
    uxGroupQuestionIds: Record<'basics' | 'goals' | 'business', string[]>;
    domainUxGroups: Partial<Record<Exclude<BriefQuestion['domains'][number], 'all'>, BriefQuestion['ux_group']>>;
  };
  classicBriefSlice: ClassicBriefSlice;
};

const file = raw as CatalogMetaFile;

if (!file.classicBriefSlice?.identity?.length || !file.classicBriefSlice.main?.length) {
  throw new Error('intake-brief-catalog-meta.v1.json: classicBriefSlice.identity and .main are required');
}

const slice = file.classicBriefSlice;
const enrichment = file.enrichmentPolicy;
const uxGroupQuestionIds = {
  basics: new Set(enrichment.uxGroupQuestionIds.basics),
  goals: new Set(enrichment.uxGroupQuestionIds.goals),
  business: new Set(enrichment.uxGroupQuestionIds.business),
};

export const INTAKE_BRIEF_HIGH_REVENUE_QUESTION_IDS: ReadonlySet<string> = new Set(
  file.highRevenueQuestionIds,
);

export const INTAKE_BRIEF_CONSULTANT_HINTS: Readonly<Record<string, string>> = file.consultantHints;

export const INTAKE_BRIEF_TRIGGERS_FOLLOWUP: Readonly<Record<string, readonly string[]>> = file
  .triggersFollowup as Readonly<Record<string, readonly string[]>>;

export const INTAKE_BRIEF_UI_SECTION_BY_ID: Readonly<Record<string, string>> =
  file.uiSectionByQuestionId;

export { BRIEF_ANSWER_STRING_MAX } from './brief-answer-limits.js';

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

/** Express always / if-visible only when in `pre_brief.bankIncluded` (phase 1 portrait slice). */
export const PRE_BRIEF_REQUIRED_SUBMIT_IDS = [
  ...EXPRESS_REQUIRED_ALWAYS_IDS.filter(id => PRE_BRIEF_BANK_ID_SET.has(id)),
  ...EXPRESS_REQUIRED_IF_VISIBLE_IDS.filter(id => PRE_BRIEF_BANK_ID_SET.has(id)),
] as const;

export { INTAKE_BRIEF_UI_SECTION_BY_ID as BRIEF_QUESTION_UI_SECTION };

function enrichQuestion(question: BriefQuestion): BriefQuestion {
  const importance =
    question.priority === 'required' ? 'red' : question.priority === 'recommended' ? 'yellow' : 'green';
  const weight = enrichment.weightByImportance[importance];

  let ux_group: BriefQuestion['ux_group'] = 'business';
  if (uxGroupQuestionIds.basics.has(question.id)) {
    ux_group = 'basics';
  } else if (uxGroupQuestionIds.goals.has(question.id)) {
    ux_group = 'goals';
  } else if (uxGroupQuestionIds.business.has(question.id)) {
    ux_group = 'business';
  } else {
    for (const domain of question.domains) {
      if (domain === 'all') continue;
      const mapped = enrichment.domainUxGroups[domain];
      if (mapped) {
        ux_group = mapped;
        break;
      }
    }
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
