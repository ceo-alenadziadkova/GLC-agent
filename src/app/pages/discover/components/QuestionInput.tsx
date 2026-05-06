import { Check } from '@phosphor-icons/react';
import { choiceValueNeedsSpecify, INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL } from '@glc/intake-core';
import { getQuestion, type DiscoveryAnswers } from '../../../lib/discovery-flow';
import discoveryUiCopy from '../../../locales/en/discovery-ui-copy.en.json';
import discoverResultsUi from '../../../locales/en/discover-page-results-ui.en.json';
import { Input, Textarea } from '../../../../design-system/ui';

const DEFER_CHIP = INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL;

type QuestionInputProps = {
  qId: string;
  value: DiscoveryAnswers[string];
  onChange: (v: DiscoveryAnswers[string]) => void;
  specifyValue: string;
  onSpecifyChange: (text: string) => void;
};

export function QuestionInput({
  qId,
  value,
  onChange,
  specifyValue,
  onSpecifyChange,
}: QuestionInputProps) {
  const question = getQuestion(qId);
  if (!question) return null;
  const freeTextPlaceholderById = discoveryUiCopy.freeTextPlaceholders as Record<string, string>;

  const strVal = typeof value === 'string' ? value : '';
  const arrVal = Array.isArray(value) ? value : [];

  if (question.type === 'free_text') {
    return (
      <div className="space-y-1.5">
        <Textarea
          autoFocus
          rows={3}
          value={strVal}
          onChange={event => onChange(event.target.value || null)}
          placeholder={freeTextPlaceholderById[qId] ?? discoveryUiCopy.freeTextDefaultPlaceholder}
          className="ds-discover-question-textarea glc-field-control w-full rounded-xl border-0 bg-transparent px-4 py-3 text-sm shadow-none outline-none"
        />
        <p className="m-0 text-[length:var(--discover-question-help-font-size)] ds-text-tertiary">
          {discoverResultsUi.copy.questionInputHelp}
        </p>
      </div>
    );
  }

  if (question.type === 'single_choice' && question.options) {
    const needsSpec = choiceValueNeedsSpecify(strVal);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {question.options.map(option => {
            const isDefer = option === DEFER_CHIP;
            const selected = isDefer ? strVal === DEFER_CHIP : strVal === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (isDefer) {
                    onChange(selected ? null : DEFER_CHIP);
                    return;
                  }
                  onChange(selected ? null : option);
                }}
                data-discover-choice-selected={selected ? 'true' : 'false'}
                className="ds-discover-choice-chip rounded-lg px-3 py-2 text-sm transition-all"
              >
                {option}
              </button>
            );
          })}
        </div>
        {needsSpec && (
          <Input
            type="text"
            value={specifyValue}
            onChange={event => onSpecifyChange(event.target.value)}
            placeholder={discoverResultsUi.copy.specifyPlaceholder}
            className="ds-discover-specify-field glc-field-control h-auto w-full rounded-xl border-0 bg-transparent py-3 pr-2 text-sm shadow-none outline-none"
          />
        )}
      </div>
    );
  }

  if (question.type === 'multi_choice' && question.options) {
    const needsSpec = choiceValueNeedsSpecify(arrVal);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {question.options.map(option => {
            const isDefer = option === DEFER_CHIP;
            const selected = arrVal.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (isDefer) {
                    if (selected) {
                      const next = arrVal.filter(valueItem => valueItem !== DEFER_CHIP);
                      onChange(next.length ? next : null);
                    } else {
                      onChange([DEFER_CHIP]);
                    }
                    return;
                  }
                  const base = arrVal.filter(v => v !== DEFER_CHIP);
                  const next = selected
                    ? base.filter(valueItem => valueItem !== option)
                    : [...base, option];
                  onChange(next.length ? next : null);
                }}
                data-discover-choice-selected={selected ? 'true' : 'false'}
                className="ds-discover-choice-chip flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all"
              >
                {selected && <Check size={12} weight="bold" />}
                {option}
              </button>
            );
          })}
        </div>
        {needsSpec && (
          <Input
            type="text"
            value={specifyValue}
            onChange={event => onSpecifyChange(event.target.value)}
            placeholder={discoverResultsUi.copy.specifyPlaceholder}
            className="ds-discover-specify-field glc-field-control h-auto w-full rounded-xl border-0 bg-transparent py-3 pr-2 text-sm shadow-none outline-none"
          />
        )}
      </div>
    );
  }

  return null;
}
