/**
 * Choice option labels that require a free-text clarification — from `choice-specify-triggers.v1.json`.
 */
import raw from './choice-specify-triggers.v1.json' with { type: 'json' };

type ChoiceSpecifyRaw = {
  optionLabelsRequiringSpecify: string[];
  specifyResponseKeyByQuestionId: Record<string, string>;
  defaultSpecifySuffix: string;
};

const cfg = raw as ChoiceSpecifyRaw;

export const CHOICE_OPTION_LABELS_REQUIRING_SPECIFY = new Set<string>(cfg.optionLabelsRequiringSpecify);

export function choiceValueNeedsSpecify(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(value);
  if (Array.isArray(value)) return value.some(v => typeof v === 'string' && CHOICE_OPTION_LABELS_REQUIRING_SPECIFY.has(v));
  return false;
}

/** Response key for the clarification field (aligned with bank wizard / classic brief / discovery). */
export function choiceSpecifyResponseKey(questionId: string): string {
  const mapped = cfg.specifyResponseKeyByQuestionId[questionId];
  if (mapped) return mapped;
  return `${questionId}${cfg.defaultSpecifySuffix}`;
}
