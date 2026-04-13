import type { QuestionReason } from '@glc/intake-core';

/**
 * Short, human-readable lines for product UX (consultant / client wizard).
 * Full diagnostics remain in Question Bank Studio / CLI.
 */
const USER_REASON_MESSAGES: Partial<Record<string, string>> = {
  BRANCH_OK: 'This question is relevant based on your previous answers.',
  BRANCH_FALSE: 'This question is hidden because it does not apply to your current answers.',
  PARTICIPATION_OK: 'This question is included for your selected audit flow.',
  DISCOVERY_NOT_INCLUDED: 'This question is not included in the discovery flow.',
  PRE_BRIEF_BANK_NOT_INCLUDED: 'This question is not included in the pre-brief scope.',
  ASK_STRATEGY_CONSULTANT_ONLY: 'This question is handled during the consultant interview.',
  ASK_STRATEGY_PROGRESSIVE:
    'This question will appear later after a few core answers are filled in.',
  LAYOUT_DEFER_REMAINING: 'This question is planned for a later step in the flow.',
  LAYOUT_SURFACE_SUPPRESSED: 'This question is hidden on the current screen layout.',
};

function humanizeReasonForWizard(reason: QuestionReason): string {
  const base =
    USER_REASON_MESSAGES[reason.code] ??
    'This question state is determined by your current answers and flow settings.';

  if (!reason.detail) return base;
  if (reason.code === 'LAYOUT_SURFACE_SUPPRESSED') return `${base} (${reason.detail}).`;

  return base;
}

export function formatIntakeQuestionReasonsBrief(reasons: QuestionReason[] | undefined): string[] {
  if (!reasons?.length) {
    return ['This question follows the current audit flow logic.'];
  }
  return reasons.map(humanizeReasonForWizard);
}
