import { useMemo } from 'react';
import { BriefField } from './BriefField';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
  type ProductMode,
} from '../data/auditTypes';
import { getVisibleBankBriefSections } from '../data/bankClassicBrief';
import type { BriefResponses } from '../data/briefQuestions';
import type { IntakeSurface } from '@glc/intake-core';
import { choiceSpecifyResponseKey, choiceValueNeedsSpecify } from '@glc/intake-core';
import { EXPRESS_LOCKED_F2_OPTIONS, normalizeF2ValueForExpress } from '../lib/express-focus-area-locks';

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
  intakeSurface,
  onChange,
  onSetUnknown,
  interviewMode,
  emphasizeClientSource,
  compact,
  productMode = INTAKE_BRIEF_SLA_PRODUCT_MODE,
}: {
  responses: BriefResponses;
  collectionMode?: IntakeBriefCollectionMode;
  intakeSurface?: IntakeSurface;
  onChange: (id: string, value: string | string[] | number | null) => void;
  onSetUnknown: (id: string) => void;
  interviewMode?: boolean;
  emphasizeClientSource?: boolean;
  /** Tighter section headers (e.g. Audit Workspace sidebar). */
  compact?: boolean;
  /** Needed for express-specific option locking in some fields. */
  productMode?: ProductMode;
}) {
  const sections = useMemo(
    () => getVisibleBankBriefSections(responses, collectionMode, intakeSurface),
    [responses, collectionMode, intakeSurface],
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
              const otherKey = choiceSpecifyResponseKey(q.id);
              const otherSpecify = (unwrapForField(responses[otherKey]) as string | undefined) ?? '';
              return (
                <BriefField
                  key={q.id}
                  q={q}
                  value={q.id === 'f2' && productMode === 'express' ? normalizeF2ValueForExpress(responses[q.id]) as BriefResponses[string] : responses[q.id]}
                  onChange={v => {
                    const nextValue = q.id === 'f2' && productMode === 'express' ? normalizeF2ValueForExpress(v) : v;
                    onChange(q.id, nextValue as string | string[] | number | null);
                    if (!choiceValueNeedsSpecify(nextValue)) {
                      onChange(otherKey, null);
                    }
                  }}
                  onSetUnknown={() => {
                    onSetUnknown(q.id);
                    onChange(otherKey, null);
                  }}
                  emphasizeClientSource={emphasizeClientSource}
                  interviewMode={interviewMode}
                  otherSpecify={otherSpecify}
                  onOtherSpecifyChange={text => onChange(otherKey, text || null)}
                  disabledOptions={q.id === 'f2' && productMode === 'express' ? EXPRESS_LOCKED_F2_OPTIONS : undefined}
                  productMode={productMode}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
