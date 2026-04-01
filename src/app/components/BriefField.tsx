import { Circle, Check } from '@phosphor-icons/react';
import type { BriefQuestion, BriefResponseEntry } from '../data/briefQuestions';

export const PRIORITY_BADGE: Record<string, { label: string; color: string }> = {
  required: { label: 'Required', color: '#EF4444' },
  recommended: { label: 'Recommended', color: '#F59E0B' },
  optional: { label: 'Optional', color: '#10B981' },
};

export function BriefField({
  q,
  value,
  onChange,
  onSetUnknown,
  emphasizeClientSource,
}: {
  q: BriefQuestion;
  value: string | string[] | number | boolean | null | BriefResponseEntry | undefined;
  onChange: (v: string | string[] | number | null) => void;
  onSetUnknown: () => void;
  /** When true, shows a tag if the entry came from the client (e.g. pre-brief link). */
  emphasizeClientSource?: boolean;
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
      <button
        type="button"
        onClick={onSetUnknown}
        className="text-xs underline underline-offset-2"
        style={{ color: 'var(--text-tertiary)' }}
      >
        I don’t know / Ask consultant
      </button>

      {q.type === 'free_text' && (
        <textarea
          rows={2}
          value={strVal}
          onChange={e => onChange(e.target.value || null)}
          placeholder="Your answer..."
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{
            backgroundColor: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
          onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
        />
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
        <div className="flex flex-wrap gap-1.5">
          {q.options.map(opt => {
            const selected = strVal === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(selected ? null : opt)}
                className="px-2.5 py-1 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: selected ? 'rgba(28,189,255,0.12)' : 'var(--bg-inset)',
                  border: selected ? '1px solid rgba(28,189,255,0.35)' : '1px solid var(--border-subtle)',
                  color: selected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: selected ? 500 : 400,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'multi_choice' && q.options && (
        <div className="flex flex-wrap gap-1.5">
          {q.options.map(opt => {
            const selected = arrVal.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = selected ? arrVal.filter(v => v !== opt) : [...arrVal, opt];
                  onChange(next.length ? next : null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: selected ? 'rgba(28,189,255,0.12)' : 'var(--bg-inset)',
                  border: selected ? '1px solid rgba(28,189,255,0.35)' : '1px solid var(--border-subtle)',
                  color: selected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: selected ? 500 : 400,
                }}
              >
                {selected && <Check size={11} weight="bold" style={{ display: 'inline', marginRight: 3 }} />}
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
