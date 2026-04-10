import type { QuestionReason } from '@glc/intake-core';

const REASON_MESSAGES: Partial<Record<string, string>> = {
  BRANCH_TRUE: 'Branch condition passed based on the current answers.',
  BRANCH_FALSE: 'Branch condition did not pass with the current answers.',
  BRANCH_MISSING_KEY: 'A required upstream answer is missing for this branch check.',
  POLICY_INCLUDED: 'Policy includes this question for the selected intake context.',
  POLICY_EXCLUDED: 'Policy excludes this question for the selected intake context.',
  LAYOUT_VISIBLE: 'Layout makes this question visible on the current surface.',
  LAYOUT_HIDDEN: 'Layout keeps this question hidden on the current surface.',
  REQUIRED_BY_SLA: 'This question is currently required for SLA/report completeness.',
  DEFERRED_BY_POLICY: 'This question is deferred for a later stage.',
};

function fallbackReasonMessage(code: string): string {
  return `Decision code: ${code}.`;
}

export function humanizeReason(reason: QuestionReason): string {
  const base = REASON_MESSAGES[reason.code] ?? fallbackReasonMessage(reason.code);
  const detail = reason.detail ? ` Detail: ${reason.detail}.` : '';
  return `${reason.layer} -> ${reason.state}. ${base}${detail}`;
}

export function summarizeStatus(
  id: string,
  sets: {
    required: ReadonlySet<string>;
    visible: ReadonlySet<string>;
    deferred: ReadonlySet<string>;
    hidden: ReadonlySet<string>;
    eligible: ReadonlySet<string>;
  },
): string {
  if (sets.required.has(id)) return 'Required now';
  if (sets.visible.has(id)) return 'Shown now';
  if (sets.deferred.has(id)) return 'Deferred for later';
  if (sets.hidden.has(id)) return 'Hidden by condition';
  if (sets.eligible.has(id)) return 'Eligible in rule set';
  return 'Not in current plan';
}
