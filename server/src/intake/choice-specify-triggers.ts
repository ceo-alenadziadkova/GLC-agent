/**
 * Choice option labels that require a free-text clarification.
 * Mirror: src/app/lib/choice-specify-triggers.ts
 */
export const CHOICE_OPTION_LABELS_REQUIRING_SPECIFY = new Set<string>([
  'Other',
  'Something else',
  'Yes, other tool',
  'Yes, another tool',
]);

export function choiceValueNeedsSpecify(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(value);
  if (Array.isArray(value)) return value.some(v => typeof v === 'string' && CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(v));
  return false;
}
