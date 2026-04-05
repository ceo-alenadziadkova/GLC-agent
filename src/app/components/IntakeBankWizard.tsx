import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CaretDown, CaretRight, ListBullets } from '@phosphor-icons/react';
import { BriefField } from './BriefField';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import {
  BRIEF_QUESTIONS,
  mergeBriefResponsesPreferFilled,
  type BriefResponseEntry,
  type BriefResponses,
} from '../data/briefQuestions';
import { briefResponsesToIntakeMap, useIntakeWizard } from '../hooks/useIntakeWizard';
import { choiceSpecifyResponseKey, choiceValueNeedsSpecify } from '../lib/choice-specify-triggers';

function intakeMapToBriefResponses(map: Record<string, unknown>): BriefResponses {
  const out: BriefResponses = {};
  for (const [k, v] of Object.entries(map)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in v && 'source' in v) {
      out[k] = {
        value: (v as BriefResponseEntry).value,
        source: (v as BriefResponseEntry).source,
      };
    } else {
      out[k] = { value: v as BriefResponseEntry['value'], source: 'consultant' };
    }
  }
  return out;
}

function unwrapForField(raw: BriefResponses[string] | undefined): string | string[] | number | null | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    return (raw as BriefResponseEntry).value as string | string[] | number | null;
  }
  return raw as string | string[] | number | null;
}

function isRevenueModelAnswered(
  value: string | string[] | number | null | undefined,
): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const REVENUE_MODEL = BRIEF_QUESTIONS.find(q => q.id === 'revenue_model')!;

/**
 * Step-by-step questionnaire over the full question-bank v1 (branch-aware).
 * Caller owns `responses`; updates are merged so non-bank keys (e.g. legacy-only) are preserved.
 */
export function IntakeBankWizard({
  responses,
  onResponsesChange,
  interviewMode,
  emphasizeClientSource,
  collectionMode,
  answerSource,
}: {
  responses: BriefResponses;
  onResponsesChange: (next: BriefResponses) => void;
  interviewMode?: boolean;
  emphasizeClientSource?: boolean;
  collectionMode?: 'standard' | 'discovery';
  /** Source tag for new plain values from the wizard (defaults to consultant). */
  answerSource?: BriefResponseEntry['source'];
}) {
  const source = answerSource ?? 'consultant';
  const map = useMemo(() => briefResponsesToIntakeMap(responses), [responses]);

  const wizard = useIntakeWizard({
    value: map,
    onChange: next => {
      const patch = intakeMapToBriefResponses(next);
      onResponsesChange(mergeBriefResponsesPreferFilled(responses, patch));
    },
    collectionMode,
  });

  const q = wizard.currentStub ? bankIdToBriefQuestion(wizard.currentStub.id, wizard.currentStub.priority) : null;

  const revenueValue = unwrapForField(responses.revenue_model);
  const revenueAnswered = isRevenueModelAnswered(revenueValue);
  const [revenueLaunchOpen, setRevenueLaunchOpen] = useState(() => !revenueAnswered);

  useEffect(() => {
    if (!revenueAnswered) {
      setRevenueLaunchOpen(true);
    }
  }, [revenueAnswered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
          <ListBullets className="w-4 h-4" aria-hidden />
          <span>
            Question-bank step {wizard.totalSteps === 0 ? 0 : wizard.stepIndex + 1} of {wizard.totalSteps}
          </span>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Score {Math.round(wizard.dataQuality.score * 100)}% · required {wizard.dataQuality.answeredRequired}/
          {wizard.dataQuality.visibleRequired}
        </div>
      </div>

      <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width:
              wizard.totalSteps > 0
                ? `${((wizard.stepIndex + 1) / wizard.totalSteps) * 100}%`
                : '0%',
            background: 'var(--gradient-brand)',
          }}
        />
      </div>

      {q && (() => {
        // For a2 (industry), use the legacy-compat key so legacy-to-bank synthesises a1 correctly.
        const otherKey = choiceSpecifyResponseKey(q.id);
        const otherSpecify = (unwrapForField(responses[otherKey]) as string | undefined) ?? '';
        return (
          <BriefField
            q={q}
            value={unwrapForField(responses[q.id])}
            onChange={v => {
              wizard.setField(q.id, { value: v, source });
              if (!choiceValueNeedsSpecify(v as string | string[] | null)) {
                wizard.setField(choiceSpecifyResponseKey(q.id), { value: null, source });
              }
            }}
            onSetUnknown={() => {
              wizard.setField(q.id, { value: null, source: 'unknown' });
              wizard.setField(choiceSpecifyResponseKey(q.id), { value: null, source: 'unknown' });
            }}
            emphasizeClientSource={emphasizeClientSource}
            interviewMode={interviewMode}
            otherSpecify={otherSpecify}
            onOtherSpecifyChange={text => {
              wizard.setField(otherKey, { value: text || null, source });
            }}
          />
        );
      })()}

      {wizard.totalSteps === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No bank questions visible yet. Answer basics (e.g. industry and website presence) in step 0 or switch to
          classic brief view.
        </p>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}>
        {revenueAnswered && !revenueLaunchOpen ? (
          <button
            type="button"
            onClick={() => setRevenueLaunchOpen(true)}
            className="w-full flex items-start gap-2 text-left p-4 rounded-xl transition-colors"
            style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
            aria-expanded={false}
          >
            <CaretRight className="w-4 h-4 shrink-0 mt-0.5" aria-hidden weight="bold" />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Also required for launch
              </span>
              <span className="block text-sm" style={{ color: 'var(--text-secondary)' }}>
                Revenue model: {revenueValue}
              </span>
              <span className="block text-xs" style={{ color: 'var(--text-quaternary)' }}>
                Expand to change
              </span>
            </span>
          </button>
        ) : (
          <div className="p-4 space-y-3">
            {revenueAnswered ? (
              <button
                type="button"
                onClick={() => setRevenueLaunchOpen(false)}
                className="w-full flex items-start gap-2 text-left rounded-lg -m-1 p-1"
                style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                aria-expanded
              >
                <CaretDown className="w-4 h-4 shrink-0 mt-0.5" aria-hidden weight="bold" />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                    Also required for launch
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Tap to collapse when done (expand again from the summary row).
                  </span>
                </span>
              </button>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  Also required for launch
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Revenue model is not in the bank JSON; capture it here if you have not already.
                </p>
              </div>
            )}
            <BriefField
              q={REVENUE_MODEL}
              value={unwrapForField(responses.revenue_model)}
              onChange={v => {
                const next: BriefResponses = {
                  ...responses,
                  revenue_model: { value: v, source },
                };
                if (!choiceValueNeedsSpecify(v as string | string[] | null)) {
                  delete next.revenue_model__other;
                }
                onResponsesChange(next);
                if (typeof v === 'string' && v.trim().length > 0) {
                  setRevenueLaunchOpen(false);
                }
              }}
              onSetUnknown={() => {
                onResponsesChange({
                  ...responses,
                  revenue_model: { value: null, source: 'unknown' },
                  revenue_model__other: { value: null, source: 'unknown' },
                });
              }}
              emphasizeClientSource={emphasizeClientSource}
              interviewMode={interviewMode}
              otherSpecify={(unwrapForField(responses.revenue_model__other) as string | undefined) ?? ''}
              onOtherSpecifyChange={text => {
                onResponsesChange({
                  ...responses,
                  revenue_model__other: { value: text || null, source },
                });
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={wizard.goPrev}
          disabled={wizard.isFirstStep}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
          style={{
            color: wizard.isFirstStep ? 'var(--text-quaternary)' : 'var(--text-tertiary)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            cursor: wizard.isFirstStep ? 'not-allowed' : 'pointer',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={wizard.goNext}
          disabled={wizard.isLastStep || wizard.totalSteps === 0}
          className="flex flex-1 items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background:
              wizard.isLastStep || wizard.totalSteps === 0 ? 'var(--bg-muted)' : 'var(--gradient-brand)',
            color:
              wizard.isLastStep || wizard.totalSteps === 0
                ? 'var(--text-secondary)'
                : 'var(--primary-foreground)',
            border: wizard.isLastStep || wizard.totalSteps === 0 ? '1px solid var(--border-subtle)' : 'none',
            cursor: wizard.isLastStep || wizard.totalSteps === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Next <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
