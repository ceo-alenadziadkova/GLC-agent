import type { QuestionReason } from '@glc/intake-core';

/**
 * Short, human-readable lines for product UX (consultant / client wizard).
 * Full trace remains on IntakeTraceTool / CLI.
 */
export function formatIntakeQuestionReasonsBrief(reasons: QuestionReason[] | undefined): string[] {
  if (!reasons?.length) {
    return ['No classification trace is recorded for this question in the current plan.'];
  }
  return reasons.map(r => {
    const detail = r.detail ? ` (${r.detail})` : '';
    return `${r.layer} · ${r.state}: ${r.code}${detail}`;
  });
}
