import { choiceValueNeedsSpecify } from '@glc/intake-core';
import type { DiscoveryAnswers, DiscoveryQuestion } from '../../../lib/discovery-flow';
import { isAnswered } from './discover-summary';

export function canAdvanceDiscoveryQuestion(params: {
  currentQuestion: DiscoveryQuestion | null;
  draft: DiscoveryAnswers[string];
  specifyValue: DiscoveryAnswers[string];
}): boolean {
  const { currentQuestion, draft, specifyValue } = params;
  const optional = Boolean(currentQuestion?.optional);
  const draftNeedsSpecify = choiceValueNeedsSpecify(draft);
  const specifyFilled =
    typeof specifyValue === 'string' && specifyValue.trim().length > 0;
  return optional || (isAnswered(draft) && (!draftNeedsSpecify || specifyFilled));
}
