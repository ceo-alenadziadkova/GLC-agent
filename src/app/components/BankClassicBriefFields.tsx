import { useMemo } from 'react';
import { BriefField } from './BriefField';
import { getVisibleBankBriefSections } from '../data/bankClassicBrief';
import { BRIEF_QUESTIONS, type BriefResponses } from '../data/briefQuestions';
import type { CollectionMode } from '../../../server/src/intake/types';

const REVENUE_MODEL = BRIEF_QUESTIONS.find(q => q.id === 'revenue_model')!;

function unwrapForField(raw: BriefResponses[string] | undefined): string | string[] | number | null | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    return raw.value as string | string[] | number | null;
  }
  return raw as string | string[] | number | null;
}

export function BankClassicBriefFields({
  responses,
  collectionMode,
  onChange,
  onSetUnknown,
  interviewMode,
  emphasizeClientSource,
  compact,
}: {
  responses: BriefResponses;
  collectionMode?: CollectionMode;
  onChange: (id: string, value: string | string[] | number | null) => void;
  onSetUnknown: (id: string) => void;
  interviewMode?: boolean;
  emphasizeClientSource?: boolean;
  /** Tighter section headers (e.g. Audit Workspace sidebar). */
  compact?: boolean;
}) {
  const sections = useMemo(
    () => getVisibleBankBriefSections(responses, collectionMode),
    [responses, collectionMode],
  );

  const hx = compact
    ? { pad: 'px-1 py-0.5 mb-1.5', label: '9px', gap: 'space-y-3', outer: 'space-y-4 pt-1' }
    : { pad: 'px-2 py-1 mb-3', label: '10px', gap: 'space-y-5', outer: 'space-y-8' };

  return (
    <div className={hx.outer}>
      {sections.map(({ sectionTitle, questions }) => (
        <div key={sectionTitle}>
          <div
            className={`${hx.pad} rounded`}
            style={{
              backgroundColor: 'rgba(28,189,255,0.05)',
              borderLeft: '2px solid rgba(28,189,255,0.25)',
            }}
          >
            <span
              style={{
                fontSize: hx.label,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'rgba(28,189,255,0.7)',
                textTransform: 'uppercase',
              }}
            >
              {sectionTitle}
            </span>
          </div>
          <div className={hx.gap}>
            {questions.map(q => {
              const otherKey = q.id === 'a2' ? 'intake_industry_specify' : `${q.id}__other`;
              const otherSpecify = (unwrapForField(responses[otherKey]) as string | undefined) ?? '';
              return (
                <BriefField
                  key={q.id}
                  q={q}
                  value={responses[q.id]}
                  onChange={v => onChange(q.id, v)}
                  onSetUnknown={() => onSetUnknown(q.id)}
                  emphasizeClientSource={emphasizeClientSource}
                  interviewMode={interviewMode}
                  otherSpecify={otherSpecify}
                  onOtherSpecifyChange={text => onChange(otherKey, text || null)}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
          Also required for launch
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Revenue model is not in the bank JSON; capture it here if you have not already.
        </p>
        <BriefField
          q={REVENUE_MODEL}
          value={responses.revenue_model}
          onChange={v => onChange('revenue_model', v)}
          onSetUnknown={() => onSetUnknown('revenue_model')}
          emphasizeClientSource={emphasizeClientSource}
          interviewMode={interviewMode}
        />
      </div>
    </div>
  );
}
