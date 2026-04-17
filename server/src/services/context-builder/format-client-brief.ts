import {
  DOMAIN_TO_QUESTION_IDS,
  getQuestionBankPromptLabel,
  QUESTION_BANK_V1_IDS,
  isPrimaryFeedForDomain,
  isSecondaryFeedForDomain,
} from '@glc/intake-core';
import { getBriefQuestionText, INTAKE_IDENTITY_FIELD_IDS } from '../../schemas/intake-brief.js';
import { BRIEF_ENTRY_SORT_FALLBACK_ORDER, CONTEXT_BUILDER_DEFAULT_BRIEF_RESPONSE_SOURCE } from '../../config/context-builder-limits.js';
import { CONTEXT_BUILDER_PROMPT } from '../../config/context-builder-prompt.js';
import type { AgentContext } from './agent-context.types.js';
import { escapePromptContent } from './lib/escape-prompt.js';

function briefLine(question: string, escapedAnswer: string, source: string): string {
  return CONTEXT_BUILDER_PROMPT.briefLineTemplate
    .replace('{{question}}', question)
    .replace('{{answer}}', escapedAnswer)
    .replace('{{source}}', source);
}

/**
 * Markdown for "## Client Brief" with primary vs secondary grouping when bank v1 ids are present.
 */
export function formatClientBriefSection(ctx: AgentContext, industryOtherSpecify: string): string | null {
  const slice = ctx.slice_domain;
  const domainOrder = DOMAIN_TO_QUESTION_IDS[slice];
  const orderIdx = domainOrder ? new Map(domainOrder.map((id, i) => [id, i] as const)) : null;

  type BriefEntry = { id: string; line: string };

  const entries: BriefEntry[] = [];
  for (const [id, v] of Object.entries(ctx.brief_responses)) {
    if (v === null || v === '') continue;
    if (id.endsWith('__other')) continue;
    if (id === 'intake_industry_specify' && ctx.industry === 'Other' && industryOtherSpecify) {
      continue;
    }
    const question = getQuestionBankPromptLabel(id) ?? getBriefQuestionText(id);
    let answer = Array.isArray(v) ? v.join(', ') : String(v);
    const specKey = `${id}__other`;
    const rawSpec = ctx.brief_responses[specKey];
    const specStr =
      rawSpec != null && rawSpec !== ''
        ? (Array.isArray(rawSpec) ? rawSpec.join(', ') : String(rawSpec)).trim()
        : '';
    if (specStr) {
      answer = `${answer}${CONTEXT_BUILDER_PROMPT.specifyOtherJoiner}${specStr}`;
    }
    const escapedAnswer = escapePromptContent(answer);
    const source = ctx.brief_response_sources[id] ?? CONTEXT_BUILDER_DEFAULT_BRIEF_RESPONSE_SOURCE;
    entries.push({
      id,
      line: briefLine(question, escapedAnswer, source),
    });
  }

  if (entries.length === 0) return null;

  const title = CONTEXT_BUILDER_PROMPT.clientBriefTitle;
  const hasBankId = entries.some(e => QUESTION_BANK_V1_IDS.has(e.id));
  if (!hasBankId || !orderIdx) {
    return `${title}\n${entries.map(e => e.line).join('\n')}`;
  }

  const primary: BriefEntry[] = [];
  const secondary: BriefEntry[] = [];
  const legacy: BriefEntry[] = [];

  for (const e of entries) {
    const { id } = e;
    if (!QUESTION_BANK_V1_IDS.has(id) || !orderIdx.has(id)) {
      legacy.push(e);
      continue;
    }
    if (isPrimaryFeedForDomain(id, slice)) {
      primary.push(e);
    } else if (isSecondaryFeedForDomain(id, slice)) {
      secondary.push(e);
    } else {
      legacy.push(e);
    }
  }

  const bySliceOrder = (a: BriefEntry, b: BriefEntry) =>
    (orderIdx.get(a.id) ?? BRIEF_ENTRY_SORT_FALLBACK_ORDER) -
    (orderIdx.get(b.id) ?? BRIEF_ENTRY_SORT_FALLBACK_ORDER);
  primary.sort(bySliceOrder);
  secondary.sort(bySliceOrder);

  const identityOrder = new Map(INTAKE_IDENTITY_FIELD_IDS.map((id, i) => [id, i] as const));
  legacy.sort((a, b) => {
    const ai = identityOrder.get(a.id as (typeof INTAKE_IDENTITY_FIELD_IDS)[number]);
    const bi = identityOrder.get(b.id as (typeof INTAKE_IDENTITY_FIELD_IDS)[number]);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });

  const parts: string[] = [title];
  if (primary.length > 0) {
    parts.push(CONTEXT_BUILDER_PROMPT.clientBriefPrimaryHeading);
    parts.push(...primary.map(e => e.line));
  }
  if (secondary.length > 0) {
    parts.push(CONTEXT_BUILDER_PROMPT.clientBriefSecondaryHeading);
    parts.push(...secondary.map(e => e.line));
  }
  if (legacy.length > 0) {
    parts.push(CONTEXT_BUILDER_PROMPT.clientBriefLegacyHeading);
    parts.push(...legacy.map(e => e.line));
  }

  return parts.join('\n');
}
