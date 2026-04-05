/**
 * Choice option labels that require a free-text clarification.
 * Keep in sync with server/src/intake/choice-specify-triggers.ts
 */
export const CHOICE_OPTION_LABELS_REQUIRING_SPECIFY = new Set<string>([
  'Other',
  'Something else',
  'Yes, other tool',
  'Yes, another tool',
]);

export function choiceValueNeedsSpecify(value: string | string[] | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(value);
  if (Array.isArray(value)) return value.some(v => CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(v));
  return false;
}

/** Storage key for the clarification field (aligned with bank wizard / classic brief). */
export function choiceSpecifyResponseKey(questionId: string): string {
  if (questionId === 'a2' || questionId === 'intake_industry') {
    return 'intake_industry_specify';
  }
  return `${questionId}__other`;
}
