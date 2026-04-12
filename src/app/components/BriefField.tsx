import { Circle, Check, CheckCircle, Lightbulb, LockSimple, UserCircle } from '@phosphor-icons/react';
import type { ProductMode } from '../data/auditTypes';
import type { BriefQuestion, BriefResponseEntry } from '../data/briefQuestions';
import { choiceValueNeedsSpecify } from '@glc/intake-core';

export const PRIORITY_BADGE: Record<string, { label: string; color: string }> = {
  required: { label: 'Required', color: 'var(--score-1)' },
  recommended: { label: 'Recommended', color: 'var(--callout-warning-icon)' },
  optional: { label: 'Optional', color: 'var(--glc-green-dark)' },
};

function friendlyFreeTextPlaceholder(questionId: string): string {
  const byId: Record<string, string> = {
    b1: 'Example: "Families visiting Palma for 3-5 nights, booking 2-4 weeks ahead."',
    c6: 'Example: "People visit but rarely contact us" or "Mobile pages feel slow."',
    c8: 'Add 2-3 competitor names or URLs.',
    f1: 'Example: "Too much manual work and unclear channel performance."',
  };
  return byId[questionId] ?? 'Write what comes to mind first. Short is fine, detailed is even better.';
}

export function BriefField({
  q,
  value,
  onChange,
  onSetUnknown,
  emphasizeClientSource,
  interviewMode,
  otherSpecify,
  onOtherSpecifyChange,
  disabledOptions,
  productMode,
}: {
  q: BriefQuestion;
  value: string | string[] | number | boolean | null | BriefResponseEntry | undefined;
  onChange: (v: string | string[] | number | null) => void;
  onSetUnknown: () => void;
  /** When true, shows a tag if the entry came from the client (e.g. pre-brief link). */
  emphasizeClientSource?: boolean;
  /** When true, shows consultant_hint coaching prompts and marks answers as consultant-sourced. */
  interviewMode?: boolean;
  /** Current free-text clarification when an "Other / specify" option is selected. */
  otherSpecify?: string;
  /** Callback to update the clarification text. Required to enable the specify input. */
  onOtherSpecifyChange?: (v: string) => void;
  /** Optional set of option labels that must be non-selectable for current mode. */
  disabledOptions?: readonly string[];
  /** Optional product mode for contextual hints. */
  productMode?: ProductMode;
}) {
  const rawValue = (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value)
    ? value.value
    : value;
  const entrySource = (value && typeof value === 'object' && !Array.isArray(value) && 'source' in value)
    ? (value as BriefResponseEntry).source
    : undefined;
  const badge = PRIORITY_BADGE[q.priority];
  const strVal = (typeof rawValue === 'number' ? String(rawValue) : (rawValue as string) ?? '');
  const arrVal = (Array.isArray(rawValue) ? rawValue : []) as string[];
  const markedUnknown = entrySource === 'unknown';

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <label className="block text-sm leading-snug" style={{ color: 'var(--text-primary)', flex: 1 }}>
          {q.question}
        </label>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 mt-0.5">
          {emphasizeClientSource && entrySource === 'client' && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'rgba(28,189,255,0.12)', color: 'var(--glc-blue)', border: '1px solid rgba(28,189,255,0.25)' }}
            >
              Client
            </span>
          )}
          <span
            className="flex items-center gap-0.5"
            style={{ color: badge.color, opacity: 0.75, fontSize: '10px' }}
          >
            <Circle size={6} weight="fill" />
            {badge.label}
          </span>
        </div>
      </div>
      {q.hint && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: -2 }}>{q.hint}</p>
      )}
      {q.id === 'f2' && productMode === 'express' && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: -2 }}>
          In Express, deep analysis covers Tech/Security/SEO/UX. Marketing and Automation inputs are captured for prioritization and full-audit planning.
        </p>
      )}

      {interviewMode && q.consultant_hint && (
        <div
          className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{
            background: 'var(--callout-warning-bg)',
            border: '1px solid var(--callout-warning-border)',
            marginTop: 2,
          }}
        >
          <Lightbulb size={13} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--callout-warning-icon)' }} />
          <p style={{ fontSize: '11px', color: 'var(--callout-warning-fg)', lineHeight: 1.5, margin: 0 }}>
            {q.consultant_hint}
          </p>
        </div>
      )}

      {q.type === 'free_text' && (
        <div className="space-y-1.5">
          <textarea
            rows={interviewMode ? 3 : 2}
            value={strVal}
            onChange={e => onChange(e.target.value || null)}
            placeholder={friendlyFreeTextPlaceholder(q.id)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{
              backgroundColor: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
          />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
            Short answer is enough. If you want, write in detail. Voice input is also welcome.
          </p>
        </div>
      )}

      {q.type === 'number' && (
        <input
          type="number"
          value={typeof rawValue === 'number' ? rawValue : ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
          onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
        />
      )}

      {q.type === 'single_choice' && q.options && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {q.options.map(opt => {
              const selected = strVal === opt;
              const locked = disabledOptions?.includes(opt) ?? false;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    onChange(selected ? null : opt);
                  }}
                  disabled={locked}
                  className="px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: selected ? 'rgba(28,189,255,0.12)' : 'var(--bg-inset)',
                    border: selected ? '1px solid rgba(28,189,255,0.35)' : '1px solid var(--border-subtle)',
                    color: locked ? 'var(--text-quaternary)' : selected ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
                    fontWeight: selected ? 500 : 400,
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: locked ? 0.75 : 1,
                  }}
                >
                  {locked && <LockSimple size={11} weight="bold" style={{ display: 'inline', marginRight: 3 }} />}
                  {opt}
                </button>
              );
            })}
          </div>
          {choiceValueNeedsSpecify(strVal) && onOtherSpecifyChange !== undefined && (
            <input
              type="text"
              value={otherSpecify ?? ''}
              onChange={e => onOtherSpecifyChange(e.target.value)}
              placeholder="Add one short clarification..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-inset)',
                border: '1px solid var(--glc-blue)',
                color: 'var(--text-primary)',
              }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
            />
          )}
        </div>
      )}

      {q.type === 'multi_choice' && q.options && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {q.options.map(opt => {
              const selected = arrVal.includes(opt);
              const locked = disabledOptions?.includes(opt) ?? false;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    const next = selected ? arrVal.filter(v => v !== opt) : [...arrVal, opt];
                    onChange(next.length ? next : null);
                  }}
                  disabled={locked}
                  className="px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: selected ? 'rgba(28,189,255,0.12)' : 'var(--bg-inset)',
                    border: selected ? '1px solid rgba(28,189,255,0.35)' : '1px solid var(--border-subtle)',
                    color: locked ? 'var(--text-quaternary)' : selected ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)',
                    fontWeight: selected ? 500 : 400,
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: locked ? 0.75 : 1,
                  }}
                >
                  {locked ? (
                    <LockSimple size={11} weight="bold" style={{ display: 'inline', marginRight: 3 }} />
                  ) : selected ? (
                    <Check size={11} weight="bold" style={{ display: 'inline', marginRight: 3 }} />
                  ) : null}
                  {opt}
                </button>
              );
            })}
          </div>
          {choiceValueNeedsSpecify(arrVal) && onOtherSpecifyChange !== undefined && (
            <input
              type="text"
              value={otherSpecify ?? ''}
              onChange={e => onOtherSpecifyChange(e.target.value)}
              placeholder="Add one short clarification..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-inset)',
                border: '1px solid var(--glc-blue)',
                color: 'var(--text-primary)',
              }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
            />
          )}
        </div>
      )}

      <div className="mt-2 space-y-1.5">
        {markedUnknown ? (
          <div
            className="flex flex-wrap items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs leading-snug"
            style={{
              background: 'rgba(16,207,130,0.08)',
              border: '1px solid rgba(16,207,130,0.28)',
              color: 'var(--text-secondary)',
            }}
          >
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" weight="fill" style={{ color: 'var(--glc-green)' }} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p style={{ color: 'var(--text-primary)' }}>
                {interviewMode
                  ? 'Client doesn\'t know — flagged for post-audit follow-up.'
                  : 'Marked as "I don\'t know" — this counts toward progress. You can return and fill this later.'}
              </p>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-xs font-medium underline underline-offset-2 cursor-pointer"
                style={{ color: 'var(--glc-blue)' }}
              >
                {interviewMode ? 'Clear — enter answer instead' : 'I\'ll answer myself instead'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSetUnknown}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-surface)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--glc-blue)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            {interviewMode
              ? <><UserCircle size={13} className="flex-shrink-0" /> Client doesn&apos;t know — flag for follow-up</>
              : <>I don&apos;t know for now</>}
          </button>
        )}
      </div>
    </div>
  );
}
