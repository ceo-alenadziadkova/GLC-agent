import { Check } from '@phosphor-icons/react';
import { choiceValueNeedsSpecify } from '@glc/intake-core';
import { getQuestion, type DiscoveryAnswers } from '../../../lib/discovery-flow';
import discoveryUiCopy from '../../../data/discovery-ui-copy.en.json';
import discoverResultsUi from '../../../data/discover-page-results-ui.en.json';

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
        <textarea
          autoFocus
          rows={3}
          value={strVal}
          onChange={event => onChange(event.target.value || null)}
          placeholder={freeTextPlaceholderById[qId] ?? discoveryUiCopy.freeTextDefaultPlaceholder}
          className="ds-discover-question-textarea glc-field-control w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
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
            const selected = strVal === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(selected ? null : option)}
                data-discover-choice-selected={selected ? 'true' : 'false'}
                className="ds-discover-choice-chip rounded-lg px-3 py-2 text-sm transition-all"
              >
                {option}
              </button>
            );
          })}
        </div>
        {needsSpec && (
          <input
            type="text"
            value={specifyValue}
            onChange={event => onSpecifyChange(event.target.value)}
            placeholder={discoverResultsUi.copy.specifyPlaceholder}
            className="ds-discover-specify-field glc-field-control w-full rounded-xl px-4 py-3 text-sm outline-none"
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
            const selected = arrVal.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  const next = selected ? arrVal.filter(valueItem => valueItem !== option) : [...arrVal, option];
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
          <input
            type="text"
            value={specifyValue}
            onChange={event => onSpecifyChange(event.target.value)}
            placeholder={discoverResultsUi.copy.specifyPlaceholder}
            className="ds-discover-specify-field glc-field-control w-full rounded-xl px-4 py-3 text-sm outline-none"
          />
        )}
      </div>
    );
  }

  return null;
}
