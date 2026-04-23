import { useEffect, useMemo, useRef, useState } from 'react';
import { useBriefDiagnosticIntakeAnalyticsEvents } from '../hooks/useBriefDiagnosticIntakeAnalyticsEvents';
import { ArrowLeft, ArrowRight, Info, ListBullets, Signpost } from '@phosphor-icons/react';
import { BriefField } from './BriefField';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import {
  type BriefResponseEntry,
  type BriefResponses,
} from '../data/briefQuestions';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
  type ProductMode,
} from '../data/auditTypes';
import { briefResponsesToIntakeMap, useIntakeWizard } from '../hooks/useIntakeWizard';
import type { IntakeSurface } from '@glc/intake-core';
import { briefTrackGuidedFeedbackShown, type BriefIntakeAnalyticsSurface } from '../lib/brief-intake-analytics';
import { choiceSpecifyResponseKey, choiceValueNeedsSpecify } from '@glc/intake-core';
import { labelsForMissingReportDomains } from '../lib/intake-coverage-domain-labels';
import { formatIntakeQuestionReasonsBrief } from '../lib/intake-plan-explain';
import { EXPRESS_LOCKED_F2_OPTIONS, normalizeF2ValueForExpress } from '../lib/express-focus-area-locks';
import { cn } from './ui/utils';
import { INTAKE_DIAGNOSTIC_PILOT_COPY_EN } from '../config/intake-diagnostic-pilot-copy.en';

const HIDDEN_IDENTITY_BANK_IDS = new Set(['a2', 'a11', 'a12']);

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
  productMode = INTAKE_BRIEF_SLA_PRODUCT_MODE,
  focusQuestionId,
  serverVisibleQuestionIds,
  clientGuidedRail = false,
  clientGuidedFastPassLabel = 'Fast Pass',
  clientGuidedPrecisionPassLabel = 'Precision Pass',
  clientGuidedValueFeedbackEarly,
  clientGuidedValueFeedbackMid,
  clientGuidedValueFeedbackLate,
  clientGuidedValueFeedbackQualityShort,
  clientGuidedValueFeedbackQualityVague,
  clientGuidedCompletionPrefix = 'Completed',
  clientGuidedContextDepthPrefix = 'Context depth',
  guidedPrevButtonLabel = 'Previous question',
  guidedNextButtonLabel = 'Next question',
  guidanceDetailsToggleLabel = 'More context (optional)',
  reportInputGapsPrefix = 'Still unclear:',
  reportInputGapsOverflowSuffix = 'more',
  noVisibleQuestionsHint = 'No questions are available yet. Complete Basics first, then continue here.',
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
  /** Optional question id to focus from external remediation/suggestion UI. */
  focusQuestionId?: string | null;
  /** Optional server-authored visible sequence for this surface. */
  serverVisibleQuestionIds?: string[];
  /** Client self-serve UX rail: show Fast/Precision stage labels. */
  clientGuidedRail?: boolean;
  /** Copy override for client guided rail stage labels. */
  clientGuidedFastPassLabel?: string;
  clientGuidedPrecisionPassLabel?: string;
  /** Optional value-feedback copy for client guided rail. */
  clientGuidedValueFeedbackEarly?: string;
  clientGuidedValueFeedbackMid?: string;
  clientGuidedValueFeedbackLate?: string;
  clientGuidedValueFeedbackQualityShort?: string;
  clientGuidedValueFeedbackQualityVague?: string;
  clientGuidedCompletionPrefix?: string;
  clientGuidedContextDepthPrefix?: string;
  guidedPrevButtonLabel?: string;
  guidedNextButtonLabel?: string;
  guidanceDetailsToggleLabel?: string;
  reportInputGapsPrefix?: string;
  reportInputGapsOverflowSuffix?: string;
  noVisibleQuestionsHint?: string;
}) {
  const source = answerSource ?? 'consultant';
  const map = useMemo(() => briefResponsesToIntakeMap(responses), [responses]);
  const [localMap, setLocalMap] = useState<Record<string, unknown>>(() => map);

  useEffect(() => {
    setLocalMap(map);
  }, [map]);

  const wizard = useIntakeWizard({
    value: localMap,
    onChange: next => {
      setLocalMap(next);
      const patch = intakeMapToBriefResponses(next);
      onResponsesChange(patch);
    },
    collectionMode,
    productMode,
    surface: intakeSurface,
    intakeAnalytics,
    serverVisibleQuestionIds,
  });
  const analyticsSink = wizard.analyticsSink;

  const responsesFingerprint = useMemo(() => JSON.stringify(responses), [responses]);
  useBriefDiagnosticIntakeAnalyticsEvents({
    auditId: intakeAnalytics?.auditId,
    enabled: Boolean(intakeAnalytics),
    responsesFingerprint,
    sink: wizard.analyticsSink,
  });

  const visibleQuestionStubs = useMemo(
    () => wizard.visibleQuestionStubs.filter(stub => !HIDDEN_IDENTITY_BANK_IDS.has(stub.id)),
    [wizard.visibleQuestionStubs],
  );
  const currentRawIndex = wizard.currentStub
    ? wizard.visibleQuestionStubs.findIndex(stub => stub.id === wizard.currentStub?.id)
    : -1;
  const currentVisibleIndexFromRaw = visibleQuestionStubs.findIndex(stub => stub.id === wizard.currentStub?.id);
  const fallbackVisibleStub = useMemo(() => {
    if (visibleQuestionStubs.length === 0) return null;
    if (currentRawIndex < 0) return visibleQuestionStubs[0];
    const nextVisible = wizard.visibleQuestionStubs
      .slice(currentRawIndex + 1)
      .find(stub => !HIDDEN_IDENTITY_BANK_IDS.has(stub.id));
    if (nextVisible) return nextVisible;
    const prevVisible = [...wizard.visibleQuestionStubs]
      .slice(0, currentRawIndex)
      .reverse()
      .find(stub => !HIDDEN_IDENTITY_BANK_IDS.has(stub.id));
    return prevVisible ?? visibleQuestionStubs[0];
  }, [currentRawIndex, visibleQuestionStubs, wizard.visibleQuestionStubs]);
  const currentVisibleStub = currentVisibleIndexFromRaw >= 0
    ? visibleQuestionStubs[currentVisibleIndexFromRaw]
    : fallbackVisibleStub;
  const currentVisibleIndex = currentVisibleStub
    ? visibleQuestionStubs.findIndex(stub => stub.id === currentVisibleStub.id)
    : -1;
  const totalVisibleSteps = visibleQuestionStubs.length;
  const isFirstVisibleStep = currentVisibleIndex <= 0;
  const isLastVisibleStep = totalVisibleSteps > 0 && currentVisibleIndex >= totalVisibleSteps - 1;
  const fastPassTotal = Math.min(8, Math.max(totalVisibleSteps, 1));
  const inFastPass = totalVisibleSteps <= 8 || currentVisibleIndex < fastPassTotal;
  const stageLabel = inFastPass ? clientGuidedFastPassLabel : clientGuidedPrecisionPassLabel;
  const stageProgress = inFastPass
    ? `${Math.min(currentVisibleIndex + 1, fastPassTotal)}/${fastPassTotal}`
    : `${Math.max(currentVisibleIndex - fastPassTotal + 1, 1)}/${Math.max(totalVisibleSteps - fastPassTotal, 1)}`;
  const answeredRequired = wizard.dataQuality.answeredRequired;
  const visibleRequired = wizard.dataQuality.visibleRequired;
  const answeredRecommended = wizard.dataQuality.answeredRecommended;
  const visibleRecommended = wizard.dataQuality.visibleRecommended;
  const guidedCompletionRatio = visibleRequired > 0 ? Math.min(answeredRequired / visibleRequired, 1) : 0;
  const guidedCompletionPct = Math.round(guidedCompletionRatio * 100);
  const contextDepthTotal = visibleRequired + visibleRecommended;
  const contextDepthAnswered = answeredRequired + answeredRecommended;
  const contextDepthRatio = contextDepthTotal > 0 ? Math.min(contextDepthAnswered / contextDepthTotal, 1) : 0;
  const contextDepthPct = Math.round(contextDepthRatio * 100);
  const q = currentVisibleStub ? bankIdToBriefQuestion(currentVisibleStub.id, currentVisibleStub.priority) : null;
  const baseGuidedFeedback =
    guidedCompletionRatio < 0.35
      ? clientGuidedValueFeedbackEarly
      : guidedCompletionRatio < 0.8
        ? clientGuidedValueFeedbackMid
        : clientGuidedValueFeedbackLate;
  const guidedQualityFeedback = useMemo(() => {
    if (!q) return null;
    if (q.type !== 'free_text') return null;
    const raw = unwrapForField(wizard.responses[q.id] as BriefResponses[string]);
    if (typeof raw !== 'string') return null;
    const text = raw.trim();
    if (!text) return null;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (text.length < 28 || wordCount < 4) return clientGuidedValueFeedbackQualityShort ?? null;
    const normalized = text.toLowerCase();
    if (/^(ok|good|fine|normal|none|n\/a|na|same|idk|unknown|not sure|maybe)$/.test(normalized)) {
      return clientGuidedValueFeedbackQualityVague ?? null;
    }
    return null;
  }, [clientGuidedValueFeedbackQualityShort, clientGuidedValueFeedbackQualityVague, q, wizard.responses]);
  const guidedFeedbackVariant: 'early' | 'mid' | 'late' | 'quality_short' | 'quality_vague' = guidedQualityFeedback
    ? (guidedQualityFeedback === clientGuidedValueFeedbackQualityShort ? 'quality_short' : 'quality_vague')
    : guidedCompletionRatio < 0.35
      ? 'early'
      : guidedCompletionRatio < 0.8
        ? 'mid'
        : 'late';
  const guidedFeedbackMessage = guidedQualityFeedback ?? baseGuidedFeedback ?? null;

  const reportGapLabels = useMemo(
    () => labelsForMissingReportDomains(wizard.missingForReport),
    [wizard.missingForReport],
  );

  const [planExplainOpen, setPlanExplainOpen] = useState(false);
  const lastFocusedQuestionRef = useRef<string | null>(null);
  const lastGuidedFeedbackRef = useRef<string>('');

  useEffect(() => {
    setPlanExplainOpen(false);
  }, [wizard.currentStub?.id]);

  useEffect(() => {
    if (!focusQuestionId) return;
    if (lastFocusedQuestionRef.current === focusQuestionId) return;
    const targetIndex = wizard.visibleQuestionStubs.findIndex(stub => stub.id === focusQuestionId);
    if (targetIndex >= 0) {
      wizard.goToStep(targetIndex);
      lastFocusedQuestionRef.current = focusQuestionId;
    }
  }, [focusQuestionId, wizard]);

  useEffect(() => {
    if (!clientGuidedRail) return;
    if (!guidedFeedbackMessage) return;
    if (!analyticsSink) return;
    if (totalVisibleSteps === 0 || currentVisibleIndex < 0) return;
    const key = `${currentVisibleIndex}:${guidedFeedbackVariant}`;
    if (lastGuidedFeedbackRef.current === key) return;
    lastGuidedFeedbackRef.current = key;
    briefTrackGuidedFeedbackShown(analyticsSink, {
      stepIndex: currentVisibleIndex,
      feedbackVariant: guidedFeedbackVariant,
    });
  }, [analyticsSink, clientGuidedRail, currentVisibleIndex, guidedFeedbackMessage, guidedFeedbackVariant, totalVisibleSteps]);

  const planReasonLines = useMemo(() => {
    if (!planExplainOpen || !currentVisibleStub) return [];
    return formatIntakeQuestionReasonsBrief(wizard.reasonsById?.[currentVisibleStub.id]);
  }, [planExplainOpen, currentVisibleStub, wizard.reasonsById]);

  const suggestedNextBlock = useMemo(() => {
    if (wizard.nextRecommended.length === 0) return null;
    const chips = wizard.nextRecommended
      .filter(id => !HIDDEN_IDENTITY_BANK_IDS.has(id))
      .filter(id => id !== currentVisibleStub?.id)
      .slice(0, 6);
    if (chips.length === 0) return null;
    return (
      <div
        className="rounded-lg p-3 space-y-2 ds-border-subtle ds-bg-inset"
        
      >
        <div
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ds-text-tertiary"
          
        >
          <Signpost className="w-4 h-4 shrink-0" aria-hidden weight="bold" />
          {INTAKE_DIAGNOSTIC_PILOT_COPY_EN.suggestedNextSectionTitle}
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
                className="ds-intake-bank-wizard-chip text-left text-xs px-2.5 py-1.5 rounded-md max-w-full sm:max-w-[240px] line-clamp-2"
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
  }, [currentVisibleStub, wizard]);

  function goToNextVisibleStep() {
    if (totalVisibleSteps === 0 || isLastVisibleStep) return;
    const next = visibleQuestionStubs[currentVisibleIndex + 1];
    if (!next) return;
    const nextIndex = wizard.visibleQuestionStubs.findIndex(stub => stub.id === next.id);
    if (nextIndex >= 0) wizard.goToStep(nextIndex);
  }

  function goToPrevVisibleStep() {
    if (totalVisibleSteps === 0 || isFirstVisibleStep) return;
    const prev = visibleQuestionStubs[currentVisibleIndex - 1];
    if (!prev) return;
    const prevIndex = wizard.visibleQuestionStubs.findIndex(stub => stub.id === prev.id);
    if (prevIndex >= 0) wizard.goToStep(prevIndex);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          <ListBullets className="w-4 h-4" aria-hidden />
          <span>
            {clientGuidedRail
              ? `${stageLabel} ${stageProgress}`
              : `Question-bank step ${totalVisibleSteps === 0 ? 0 : currentVisibleIndex + 1} of ${totalVisibleSteps}`}
          </span>
          {clientGuidedRail ? (
            <span>{`${clientGuidedCompletionPrefix} ${guidedCompletionPct}% · ${clientGuidedContextDepthPrefix} ${contextDepthPct}%`}</span>
          ) : null}
        </div>
      </div>
      {clientGuidedRail && guidedFeedbackMessage ? (
        <p className="text-xs text-[var(--text-tertiary)]">{guidedFeedbackMessage}</p>
      ) : null}

      <div className="h-[3px] rounded-full overflow-hidden bg-[var(--bg-muted)]">
        <div
          className="h-full rounded-full transition-all ds-intake-bank-wizard-progress-fill"
          style={{
            width:
              totalVisibleSteps > 0
                ? `${((currentVisibleIndex + 1) / totalVisibleSteps) * 100}%`
                : '0%',
          }}
        />
      </div>

      {q && (() => {
        // a2 "Other" writes to `intake_industry_specify` (see choiceSpecifyResponseKey).
        const otherKey = choiceSpecifyResponseKey(q.id);
        const otherSpecify = (unwrapForField(wizard.responses[otherKey] as BriefResponses[string]) as string | undefined) ?? '';
        const currentResponseEntry = wizard.responses[q.id] as BriefResponses[string] | undefined;
        const normalizedFieldValue = q.id === 'f2' && productMode === 'express'
          ? (
            currentResponseEntry &&
            typeof currentResponseEntry === 'object' &&
            !Array.isArray(currentResponseEntry) &&
            'source' in currentResponseEntry
              ? {
                value: normalizeF2ValueForExpress(unwrapForField(currentResponseEntry)),
                source: (currentResponseEntry as BriefResponseEntry).source,
              }
              : normalizeF2ValueForExpress(unwrapForField(currentResponseEntry))
          )
          : currentResponseEntry;
        return (
          <div className="space-y-3">
            <div>
              <button
                type="button"
                onClick={() => setPlanExplainOpen(o => !o)}
                className="inline-flex -ml-2 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-tertiary)] cursor-pointer"
                aria-expanded={planExplainOpen}
              >
                <Info className="w-3.5 h-3.5 shrink-0" aria-hidden weight="bold" />
                {planExplainOpen
                  ? INTAKE_DIAGNOSTIC_PILOT_COPY_EN.whyAskedCollapseLabel
                  : INTAKE_DIAGNOSTIC_PILOT_COPY_EN.whyAskedExpandLabel}
              </button>
              {planExplainOpen && (
                <ul
                  className="mt-2 list-disc space-y-1 pl-5 text-xs leading-snug text-[var(--text-tertiary)]"
                >
                  {planReasonLines.map((line, i) => (
                    <li key={`${line}-${i}`}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
            <BriefField
              q={q}
              value={normalizedFieldValue}
              onChange={v => {
                wizard.setResponses(prev => {
                  const normalizedValue = q.id === 'f2' && productMode === 'express'
                    ? normalizeF2ValueForExpress(v)
                    : v;
                  const next = { ...prev, [q.id]: { value: normalizedValue, source } };
                  const isChoiceQuestion = q.type === 'single_choice' || q.type === 'multi_choice';
                  if (isChoiceQuestion && !choiceValueNeedsSpecify(normalizedValue as string | string[] | null)) {
                    next[choiceSpecifyResponseKey(q.id)] = { value: null, source };
                  }
                  return next;
                });
              }}
              onSetUnknown={() => {
                wizard.setResponses(prev => ({
                  ...prev,
                  [q.id]: { value: null, source: 'unknown' },
                  [choiceSpecifyResponseKey(q.id)]: { value: null, source: 'unknown' },
                }));
              }}
              emphasizeClientSource={emphasizeClientSource}
              interviewMode={interviewMode}
              otherSpecify={otherSpecify}
              onOtherSpecifyChange={text => {
                wizard.setField(otherKey, { value: text || null, source });
              }}
              disabledOptions={q.id === 'f2' && productMode === 'express' ? EXPRESS_LOCKED_F2_OPTIONS : undefined}
              productMode={productMode}
            />
            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={goToPrevVisibleStep}
                disabled={isFirstVisibleStep}
                className={cn(
                  'text-muted-foreground glc-touch-target inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-transparent px-2.5 py-1.5 text-xs sm:min-h-0 sm:min-w-0',
                  isFirstVisibleStep
                    ? 'cursor-not-allowed text-muted-foreground/50'
                    : 'cursor-pointer text-muted-foreground hover:bg-muted/30',
                )}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{guidedPrevButtonLabel}</span>
              </button>
              <button
                type="button"
                onClick={goToNextVisibleStep}
                disabled={isLastVisibleStep || totalVisibleSteps === 0}
                className={cn(
                  'text-muted-foreground glc-touch-target inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-transparent px-2.5 py-1.5 text-xs sm:min-h-0 sm:min-w-0',
                  isLastVisibleStep || totalVisibleSteps === 0
                    ? 'cursor-not-allowed text-muted-foreground/50'
                    : 'cursor-pointer text-muted-foreground hover:bg-muted/30',
                )}
              >
                <span className="hidden sm:inline">{guidedNextButtonLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {!clientGuidedRail && (reportGapLabels.length > 0 || suggestedNextBlock) ? (
        <details className="rounded-lg border ds-border-subtle ds-bg-inset p-3">
          <summary className="cursor-pointer list-none text-xs font-medium ds-text-secondary">
            {guidanceDetailsToggleLabel}
          </summary>
          <div className="mt-3 space-y-3">
            {reportGapLabels.length > 0 ? (
              <p className="text-xs leading-snug text-[var(--text-tertiary)]">
                <span className="font-semibold text-[var(--text-secondary)]">{reportInputGapsPrefix} </span>
                {reportGapLabels.slice(0, 5).join(' · ')}
                {reportGapLabels.length > 5 ? ` · +${reportGapLabels.length - 5} ${reportInputGapsOverflowSuffix}` : ''}
              </p>
            ) : null}
            {suggestedNextBlock}
          </div>
        </details>
      ) : null}

      {totalVisibleSteps === 0 && (
        <p className="text-sm text-[var(--text-tertiary)]">
          {noVisibleQuestionsHint}
        </p>
      )}

    </div>
  );
}
