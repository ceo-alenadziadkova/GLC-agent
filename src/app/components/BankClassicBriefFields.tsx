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
import { cn } from './ui/utils';

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
  questionLabelOverrides,
  questionHintOverrides,
  questionOptionDisplayOverrides,
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
  /** B1 display copy (same contract as `IntakeBankWizard`); stored values stay canonical. */
  questionLabelOverrides?: Record<string, string>;
  questionHintOverrides?: Record<string, string>;
  questionOptionDisplayOverrides?: Record<string, string[]>;
}) {
  const sections = useMemo(
    () => getVisibleBankBriefSections(responses, collectionMode, intakeSurface),
    [responses, collectionMode, intakeSurface],
  );

  const hx = compact
    ? { pad: 'px-1 py-0.5 mb-1.5', gap: 'space-y-3', outer: 'space-y-4 pt-1' }
    : { pad: 'px-2 py-1 mb-3', gap: 'space-y-5', outer: 'space-y-8' };

  return (
    <div className={hx.outer}>
      {sections.map(({ sectionTitle, questions }) => (
        <div key={sectionTitle}>
          <div className={cn(`${hx.pad} rounded ds-bank-classic-section-header-tint`)}>
            <span
              className={cn('ds-bank-classic-section-label', compact && 'ds-bank-classic-section-label--compact')}
            >
              {sectionTitle}
            </span>
          </div>
          <div className={hx.gap}>
            {questions.map(q => {
              const otherKey = choiceSpecifyResponseKey(q.id);
              const otherSpecify = (unwrapForField(responses[otherKey]) as string | undefined) ?? '';
              const lo = questionLabelOverrides?.[q.id]?.trim();
              const ho = questionHintOverrides?.[q.id]?.trim();
              const qM =
                lo || ho
                  ? { ...q, ...(lo ? { question: lo } : {}), ...(ho ? { hint: ho } : {}) }
                  : q;
              const optionDisplayLabels =
                q.options &&
                q.options.length > 0 &&
                questionOptionDisplayOverrides?.[q.id] &&
                questionOptionDisplayOverrides[q.id]!.length === q.options.length
                  ? questionOptionDisplayOverrides[q.id]
                  : undefined;
              return (
                <BriefField
                  key={q.id}
                  q={qM}
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
                  optionDisplayLabels={optionDisplayLabels}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
