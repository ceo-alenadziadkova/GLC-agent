/**
 * Choice option labels that require a free-text clarification (shared by server validation and SPA).
 */
export const CHOICE_OPTION_LABELS_REQUIRING_SPECIFY = new Set<string>([
  'Other',
  'Something else',
  'Yes, other tool',
  'Yes, another tool',
  'Not quite (I will clarify)',
]);

export function choiceValueNeedsSpecify(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(value);
  if (Array.isArray(value)) return value.some(v => typeof v === 'string' && CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(v));
  return false;
}

/** Response key for the clarification field (aligned with bank wizard / classic brief / discovery). */
export function choiceSpecifyResponseKey(questionId: string): string {
  if (questionId === 'a2' || questionId === 'intake_industry') {
    return 'intake_industry_specify';
  }
  return `${questionId}__other`;
}
