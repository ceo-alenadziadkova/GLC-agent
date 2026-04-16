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
          className="glc-field-control w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{
            background: 'var(--input-background)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
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
                className="px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: selected
                    ? 'color-mix(in oklab, var(--glc-blue-muted) 78%, var(--bg-surface))'
                    : 'var(--bg-muted)',
                  border: selected
                    ? '1px solid color-mix(in oklab, var(--glc-blue) 70%, var(--border-default))'
                    : '1px solid var(--border-default)',
                  color: selected ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
                  fontWeight: selected ? 600 : 400,
                }}
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
            className="glc-field-control w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--input-background)',
              border: '1px solid var(--glc-blue)',
              color: 'var(--text-primary)',
            }}
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: selected
                    ? 'color-mix(in oklab, var(--glc-blue-muted) 78%, var(--bg-surface))'
                    : 'var(--bg-muted)',
                  border: selected
                    ? '1px solid color-mix(in oklab, var(--glc-blue) 70%, var(--border-default))'
                    : '1px solid var(--border-default)',
                  color: selected ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
                  fontWeight: selected ? 600 : 400,
                }}
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
            className="glc-field-control w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--input-background)',
              border: '1px solid var(--glc-blue)',
              color: 'var(--text-primary)',
            }}
          />
        )}
      </div>
    );
  }

  return null;
}
