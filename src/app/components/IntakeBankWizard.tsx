import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Info, ListBullets, Signpost } from '@phosphor-icons/react';
import { BriefField } from './BriefField';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import {
  mergeBriefResponsesPreferFilled,
  type BriefResponseEntry,
  type BriefResponses,
} from '../data/briefQuestions';
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from '../data/auditTypes';
import { briefResponsesToIntakeMap, useIntakeWizard } from '../hooks/useIntakeWizard';
import type { IntakeSurface } from '@glc/intake-core';
import type { BriefIntakeAnalyticsSurface } from '../lib/brief-intake-analytics';
import { choiceSpecifyResponseKey, choiceValueNeedsSpecify } from '@glc/intake-core';
import { labelsForMissingReportDomains } from '../lib/intake-coverage-domain-labels';
import { formatIntakeQuestionReasonsBrief } from '../lib/intake-plan-explain';
import { buildIntakePlan } from '@glc/intake-core';

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
  intakeSurface,
  answerSource,
  intakeAnalytics,
  productMode = 'full',
}: {
  responses: BriefResponses;
  onResponsesChange: (next: BriefResponses) => void;
  interviewMode?: boolean;
  emphasizeClientSource?: boolean;
  collectionMode?: IntakeBriefCollectionMode;
  /** Layout surface for visible ordering (omit with discovery-only flows). */
  intakeSurface?: IntakeSurface;
  /** Source tag for new plain values from the wizard (defaults to consultant). */
  answerSource?: BriefResponseEntry['source'];
  /** Optional funnel analytics (authenticated audit context). */
  intakeAnalytics?: {
    auditId: string;
    surface: BriefIntakeAnalyticsSurface;
    getIntakeVersions: () => IntakeVersionTuple | null;
  };
  /** Align resolver SLA / next-step hints with audit product mode. */
  productMode?: ProductMode;
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
    productMode,
    surface: intakeSurface,
    intakeAnalytics,
  });

  const q = wizard.currentStub ? bankIdToBriefQuestion(wizard.currentStub.id, wizard.currentStub.priority) : null;

  const reportGapLabels = useMemo(
    () => labelsForMissingReportDomains(wizard.missingForReport),
    [wizard.missingForReport],
  );

  const [planExplainOpen, setPlanExplainOpen] = useState(false);

  useEffect(() => {
    setPlanExplainOpen(false);
  }, [wizard.currentStub?.id]);

  const planReasonLines = useMemo(() => {
    if (!planExplainOpen || !wizard.currentStub) return [];
    const plan = buildIntakePlan({
      responses: map,
      productMode,
      collectionMode,
      surface: intakeSurface,
    });
    return formatIntakeQuestionReasonsBrief(plan.reasonsById?.[wizard.currentStub.id]);
  }, [planExplainOpen, wizard.currentStub, map, productMode, collectionMode, intakeSurface]);

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

      {reportGapLabels.length > 0 && (
        <p className="text-xs leading-snug" style={{ color: 'var(--text-tertiary)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Report input gaps: </span>
          {reportGapLabels.slice(0, 5).join(' · ')}
          {reportGapLabels.length > 5 ? ` · +${reportGapLabels.length - 5} more` : ''}
        </p>
      )}

      {wizard.nextRecommended.length > 0 &&
        (() => {
          const chips = wizard.nextRecommended
            .filter(id => id !== wizard.currentStub?.id)
            .slice(0, 6);
          if (chips.length === 0) return null;
          return (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)' }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Signpost className="w-4 h-4 shrink-0" aria-hidden weight="bold" />
                Suggested next
              </div>
              <div className="flex flex-wrap gap-2">
                {chips.map(id => {
                  const st = wizard.visibleQuestionStubs.find(s => s.id === id);
                  const pri = st?.priority ?? 'recommended';
                  const bq = bankIdToBriefQuestion(id, pri);
                  const labelText = bq.question;
                  const label = labelText.length > 48 ? `${labelText.slice(0, 47)}…` : labelText;
                  const step = wizard.visibleQuestionStubs.findIndex(s => s.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (step >= 0) wizard.goToStep(step);
                      }}
                      className="text-left text-xs px-2.5 py-1.5 rounded-md max-w-full sm:max-w-[240px] line-clamp-2"
                      style={{
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        cursor: step >= 0 ? 'pointer' : 'not-allowed',
                      }}
                      disabled={step < 0}
                      title={labelText}
                      aria-label={`Go to: ${labelText}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {q && (() => {
        // a2 / intake_industry "Other" writes to `intake_industry_specify` (see choiceSpecifyResponseKey).
        const otherKey = choiceSpecifyResponseKey(q.id);
        const otherSpecify = (unwrapForField(responses[otherKey]) as string | undefined) ?? '';
        return (
          <div className="space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setPlanExplainOpen(o => !o)}
                className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 -ml-2"
                style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}
                aria-expanded={planExplainOpen}
              >
                <Info className="w-3.5 h-3.5 shrink-0" aria-hidden weight="bold" />
                {planExplainOpen ? 'Hide plan trace' : 'Why this question?'}
              </button>
              {planExplainOpen && (
                <ul
                  className="list-disc pl-5 mt-2 space-y-1 text-xs leading-snug"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {planReasonLines.map((line, i) => (
                    <li key={`${line}-${i}`}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
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
          </div>
        );
      })()}

      {wizard.totalSteps === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No bank questions visible yet. Answer basics (e.g. industry and website presence) in step 0 or switch to
          classic brief view.
        </p>
      )}

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
