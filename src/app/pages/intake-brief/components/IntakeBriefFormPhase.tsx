import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  Info,
  Question,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { BriefField } from '../../../components/BriefField';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { briefResponseTrimmedString } from '../../../data/briefQuestions';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { INTAKE_DIAGNOSTIC_PILOT_COPY_EN } from '../../../config/intake-diagnostic-pilot-copy.en';
import { formatIntakeBriefSavedAt } from '../../../lib/format-intake-dates';
import { replaceIntakePublicCopyPlaceholders } from '../lib/intake-public-copy-helpers';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

function SignalConfidenceGlyph(props: {
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  certaintyStage?: 'assumed' | 'confirming' | 'confirmed';
}) {
  const { confidence, certaintyStage = 'assumed' } = props;
  const tone = (() => {
    if (confidence === 'high') return 'text-[var(--ds-semantic-success)]';
    if (confidence === 'medium') return 'text-[var(--ds-semantic-warning)]';
    if (confidence === 'low') return 'text-[var(--ds-semantic-danger)]';
    return 'text-[var(--ds-text-muted)]';
  })();
  const Icon =
    confidence === 'high'
      ? CheckCircle
      : confidence === 'medium'
        ? WarningCircle
        : confidence === 'low'
          ? XCircle
          : Question;
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`} title={`${copy.signalConfidencePrefix} ${confidence}`}>
      <Icon className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
      <span className="rounded border px-1 py-0.5 text-[10px] leading-none text-[var(--ds-text-muted)]">
        {certaintyStage}
      </span>
      <span className="sr-only">
        {copy.signalConfidencePrefix} {confidence}
      </span>
    </span>
  );
}

function resolveDeepenPrompt(args: {
  questionId: string;
  questionType: BriefQuestion['type'];
  value: string;
  copy: typeof WORKSPACE_PAGE_COPY.intakePublicPrebrief;
}): string | null {
  if (args.questionType !== 'free_text') return null;
  const text = args.value.trim();
  if (!text) return null;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const normalized = text.toLowerCase();
  const isVeryShort = text.length < 28 || wordCount < 4;
  if (isVeryShort) return args.copy.deepenPromptShortAnswer;
  const questionSpecificPrompt =
    args.questionId === 'f1'
      ? args.copy.deepenPromptF1
      : args.questionId === 'd2'
        ? args.copy.deepenPromptD2
        : args.questionId === 'b1'
          ? args.copy.deepenPromptB1
          : null;
  const vaguePattern = /^(ok|good|fine|normal|none|n\/a|na|same|idk|unknown|not sure|maybe)$/i;
  if (vaguePattern.test(normalized) || wordCount <= 5) return args.copy.deepenPromptVagueAnswer;
  if (text.length < 90 && !/[0-9]/.test(text)) return questionSpecificPrompt ?? args.copy.deepenPromptExample;
  return null;
}

type SectionBlock = { section: string; questions: BriefQuestion[] };

export function IntakeBriefFormPhase(props: {
  questionSections: SectionBlock[];
  displayedQuestionSections: SectionBlock[];
  responses: BriefResponses;
  nlIngress?: {
    text: string;
    onTextChange: (v: string) => void;
    onSubmit: () => void;
    consentAccepted: boolean;
    onConsentChange: (accepted: boolean) => void;
    busy: boolean;
    status: 'idle' | 'ok' | 'error';
  };
  readinessPanel: {
    state: 'pristine' | 'partial' | 'blocked';
    flowReadinessStatus: 'flow_ready' | 'blocked';
    auditReadinessStatus: 'audit_ready' | 'blocked' | 'ready_with_caveats';
    criticalSignals: Record<string, 'high' | 'medium' | 'low' | 'unknown'>;
    remediation: Array<{ id: string; label: string }>;
    trace: Array<{ code: string; questionId?: string; signalKey?: string }>;
  };
  intelligenceByQuestionId: Record<
    string,
    {
      whyAsked: string;
      semanticDomain: 'market' | 'value' | 'economics' | 'operations' | 'resources' | 'risks';
      decisionImpact: Array<{ target: string; weight: 'low' | 'medium' | 'high'; effectDescription: string }>;
    }
  >;
  signalConfidenceByQuestionId: Record<
    string,
    {
      signalKey: string;
      confidence: 'high' | 'medium' | 'low' | 'unknown';
      certaintyStage: 'assumed' | 'confirming' | 'confirmed';
    }
  >;
  companyName: string;
  message: string;
  submittedAt: string | null;
  expiresAtIso: string | null;
  consultantPrefilledIdentity: boolean;
  answered: number;
  total: number;
  formComplete: boolean;
  isCurrentStepSatisfied: boolean;
  journeyStage: 'fast_pass' | 'precision_pass';
  questionMode: 'progressive' | 'all_questions';
  progressiveStepIndex: number;
  progressiveStepTotal: number;
  precisionPassQuestionCount: number;
  skippedByConfidenceIds: string[];
  showFastPassDoneBanner: boolean;
  optionalDetailsOpenById: Record<string, boolean>;
  resumeBannerVisible: boolean;
  submitError: string | null;
  onFieldChange: (id: string, value: string | string[] | number | null) => void;
  onIndustryChange: (value: string | string[] | number | null) => void;
  onWebsitePresenceChange: (value: string | string[] | number | null) => void;
  onUnknown: (id: string) => void;
  onOpenOptionalDetails: (id: string) => void;
  onSubmitOptionalDetails: (id: string) => void;
  onAdvanceProgressive: () => void;
  onBackProgressive: () => void;
  onSaveAndContinueLater: () => void;
  onToggleQuestionMode: (mode: 'progressive' | 'all_questions') => void;
  onDismissResumeBanner: () => void;
  onGoReview: () => void;
}) {
  const {
    questionSections,
    displayedQuestionSections,
    responses,
    nlIngress,
    readinessPanel,
    intelligenceByQuestionId,
    signalConfidenceByQuestionId,
    companyName,
    message,
    submittedAt,
    expiresAtIso,
    consultantPrefilledIdentity,
    answered,
    total,
    formComplete,
    isCurrentStepSatisfied,
    journeyStage,
    questionMode,
    progressiveStepIndex,
    progressiveStepTotal,
    precisionPassQuestionCount,
    skippedByConfidenceIds,
    showFastPassDoneBanner,
    optionalDetailsOpenById,
    resumeBannerVisible,
    submitError,
    onFieldChange,
    onIndustryChange,
    onWebsitePresenceChange,
    onUnknown,
    onOpenOptionalDetails,
    onSubmitOptionalDetails,
    onAdvanceProgressive,
    onBackProgressive,
    onSaveAndContinueLater,
    onToggleQuestionMode,
    onDismissResumeBanner,
    onGoReview,
  } = props;

  const title = companyName || copy.formTitleFallback;
  const expiresDisplay = expiresAtIso ? formatIntakeBriefSavedAt(expiresAtIso) : '';
  const readinessStateLabel =
    readinessPanel.state === 'pristine'
      ? copy.readinessStatePristine
      : readinessPanel.state === 'blocked'
        ? copy.readinessStateBlocked
        : copy.readinessStatePartial;
  const confidenceToneClass = (confidence: 'high' | 'medium' | 'low' | 'unknown') => {
    if (confidence === 'high') return 'text-[var(--ds-semantic-success)]';
    if (confidence === 'medium') return 'text-[var(--ds-semantic-warning)]';
    if (confidence === 'low') return 'text-[var(--ds-semantic-danger)]';
    return 'text-[var(--ds-text-muted)]';
  };
  const progressRatio = total > 0 ? answered / total : 0;
  const progressValueLine =
    progressRatio < 0.4
      ? copy.progressValueEarly
      : progressRatio < 0.85
        ? copy.progressValueMid
        : copy.progressValueLate;

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="ds-intake-brief-form-title">{title}</h1>
        {message && (
          <p className="text-sm ds-type-sm-secondary-leading" >
            {message}
          </p>
        )}
        <p className="text-xs ds-text-quaternary m-0">{copy.trustLine}</p>
      </div>

      {resumeBannerVisible && (
        <div className="rounded-lg border px-3 py-2 text-xs ds-intake-brief-inline-notice ds-intake-brief-inline-notice--info w-full max-w-2xl">
          <div className="flex items-center justify-between gap-2">
            <span>{copy.resumeBannerText}</span>
            <button type="button" className="underline" onClick={onDismissResumeBanner}>
              {copy.resumeBannerDismiss}
            </button>
          </div>
        </div>
      )}

      {submittedAt && (
        <p className="text-xs text-center px-3 py-2 rounded-lg ds-intake-brief-inline-notice">
          {expiresDisplay
            ? replaceIntakePublicCopyPlaceholders(copy.alreadySubmittedWithExpiry, {
                submittedAt: formatIntakeBriefSavedAt(submittedAt),
                expiresAt: expiresDisplay,
              })
            : replaceIntakePublicCopyPlaceholders(copy.alreadySubmittedResubmit, {
                submittedAt: formatIntakeBriefSavedAt(submittedAt),
              })}
        </p>
      )}

      {consultantPrefilledIdentity && (
        <p className="text-xs text-center px-3 py-2 rounded-lg ds-intake-brief-inline-notice ds-intake-brief-inline-notice--info">
          {copy.consultantPrefillNotice}
        </p>
      )}
      <p className="text-xs text-center px-3 py-2 rounded-lg ds-intake-brief-inline-notice">{copy.shortAnswersHint}</p>

      {nlIngress ? (
        <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)] p-4 space-y-2 max-w-2xl mx-auto w-full">
          <p className="text-sm font-semibold m-0 ds-text-primary">{copy.nlIngressTitle}</p>
          <p className="text-xs m-0 ds-text-secondary">{copy.nlIngressHelper}</p>
          <p className="text-xs m-0 ds-text-quaternary">{INTAKE_DIAGNOSTIC_PILOT_COPY_EN.nlIngressPreferExplicitNote}</p>
          <textarea
            className="w-full min-h-[88px] rounded-lg border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm ds-text-primary"
            value={nlIngress.text}
            onChange={e => nlIngress.onTextChange(e.target.value)}
            placeholder={copy.nlIngressPlaceholder}
            aria-label={copy.nlIngressTitle}
          />
          <p className="text-xs m-0 ds-text-quaternary">{copy.nlIngressPrivacy}</p>
          <label className="flex items-start gap-2 text-xs ds-text-secondary">
            <input
              type="checkbox"
              checked={nlIngress.consentAccepted}
              onChange={e => nlIngress.onConsentChange(e.target.checked)}
              className="mt-0.5"
            />
            <span>{copy.nlConsentLabel}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="ds-btn ds-btn--secondary text-sm"
              disabled={nlIngress.busy || !nlIngress.text.trim() || !nlIngress.consentAccepted}
              onClick={() => nlIngress.onSubmit()}
            >
              {nlIngress.busy ? copy.nlIngressSending : copy.nlIngressSubmit}
            </button>
            {nlIngress.status === 'ok' ? (
              <span className="text-xs ds-text-secondary">{copy.nlIngressOk}</span>
            ) : null}
            {nlIngress.status === 'error' ? (
              <span className="text-xs text-[var(--ds-semantic-danger)]">{copy.nlIngressError}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {showFastPassDoneBanner ? (
        <p className="text-xs text-center px-3 py-2 rounded-lg ds-intake-brief-inline-notice ds-intake-brief-inline-notice--info">
          {copy.fastPassDoneBanner}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ds-border-subtle)] p-2">
        <div className="text-xs ds-text-secondary">
          {journeyStage === 'fast_pass'
            ? `${copy.stageFastPassLabel} ${Math.min(progressiveStepIndex + 1, Math.max(progressiveStepTotal, 1))}/${Math.max(progressiveStepTotal, 1)}`
            : `${copy.stagePrecisionPassLabel} ${Math.min(progressiveStepIndex + 1, Math.max(progressiveStepTotal, 1))}/${Math.max(progressiveStepTotal, 1)}`}
          {journeyStage === 'precision_pass' ? ` · ${precisionPassQuestionCount} ${copy.stageTargetedChecksSuffix}` : ''}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ds-btn ds-btn--secondary text-xs"
            onClick={() => onToggleQuestionMode(questionMode === 'progressive' ? 'all_questions' : 'progressive')}
          >
            {questionMode === 'progressive' ? copy.showAllQuestions : copy.backToGuidedMode}
          </button>
          <button type="button" className="ds-btn ds-btn--secondary text-xs" onClick={onSaveAndContinueLater}>
            {copy.saveAndContinueLater}
          </button>
        </div>
      </div>

      <div className="w-full lg:grid lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <aside className="mb-6 space-y-3 lg:mb-0 lg:sticky lg:top-20 self-start">
          <div className="glc-card p-4 space-y-3 ds-radius-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide ds-text-tertiary m-0">{copy.readinessPanelTitle}</p>
                <p className="text-sm font-semibold m-0">{readinessStateLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs ds-text-tertiary m-0">{copy.readinessFlowLabel}</p>
                <p className="text-xs font-medium m-0">{readinessPanel.flowReadinessStatus}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium m-0">{copy.readinessSignalsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(readinessPanel.criticalSignals).map(([signalKey, confidence]) => (
                  <span
                    key={signalKey}
                    className={`text-xs rounded-md px-2 py-1 border ${confidenceToneClass(confidence)}`}
                  >
                    {signalKey}: {confidence}
                  </span>
                ))}
              </div>
            </div>

            {readinessPanel.remediation.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium m-0">{copy.readinessRemediationLabel}</p>
                <ul className="text-xs m-0 pl-4 space-y-1">
                  {readinessPanel.remediation.map(item => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </div>
            )}

            {readinessPanel.trace.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium m-0">{copy.readinessTraceLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {readinessPanel.trace.slice(0, 6).map((item, idx) => (
                    <span key={`${item.code}-${idx}`} className="text-xs rounded-md px-2 py-1 border ds-text-tertiary">
                      {item.code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div>
            <div className="flex justify-between text-xs mb-1 ds-text-tertiary">
              <span>{copy.progressLabel}</span>
              <span>
                {answered} / {total}
              </span>
            </div>
            <div className="rounded-full overflow-hidden ds-intake-brief-progress-track">
              <div
                className="h-full rounded-full transition-all ds-intake-progress-fill"
                style={{ width: `${total ? (answered / total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs mt-2 mb-0 ds-text-secondary">{progressValueLine}</p>
          </div>

          <div className="glc-card overflow-hidden p-5 space-y-8 ds-radius-xl">
            {displayedQuestionSections.map((block, blockIdx) => (
              <section
                key={`intake-form-section-${blockIdx}`}
                className="space-y-6"
                aria-labelledby={`intake-section-${blockIdx}`}
              >
                <h2
                  id={`intake-section-${blockIdx}`}
                  className="text-xs font-semibold uppercase m-0 pb-1 ds-intake-form-section-heading"
                >
                  {block.section}
                </h2>
                <div className="space-y-6">
                  {block.questions.map(q => {
                    const specKey =
                      q.id === 'a2'
                        ? null
                        : q.type === 'single_choice' || q.type === 'multi_choice'
                          ? `${q.id}__other`
                          : null;
                    const otherSpecify =
                      q.id === 'a2'
                        ? briefResponseTrimmedString(responses.intake_industry_specify)
                        : specKey
                          ? briefResponseTrimmedString(responses[specKey])
                          : '';
                    const deepenPrompt = resolveDeepenPrompt({
                      questionId: q.id,
                      questionType: q.type,
                      value: briefResponseTrimmedString(responses[q.id]),
                      copy,
                    });
                    return (
                      <div key={q.id} id={`intake-q-${q.id}`}>
                        {signalConfidenceByQuestionId[q.id] && (
                          <div className="mb-2 flex items-center gap-2">
                            <SignalConfidenceGlyph
                              confidence={signalConfidenceByQuestionId[q.id]!.confidence}
                              certaintyStage={signalConfidenceByQuestionId[q.id]!.certaintyStage}
                            />
                          </div>
                        )}
                        {intelligenceByQuestionId[q.id] && (
                          <div className="mb-2 rounded-lg border p-2 space-y-2">
                            <p className="text-xs m-0 ds-text-tertiary">
                              <span className="font-medium text-[var(--ds-text-primary)]">
                                {INTAKE_DIAGNOSTIC_PILOT_COPY_EN.whyAskedExpandLabel}:{' '}
                              </span>
                              {intelligenceByQuestionId[q.id]!.whyAsked}
                            </p>
                            {intelligenceByQuestionId[q.id]!.decisionImpact.length > 0 && (
                              <div className="flex items-start gap-2">
                                <p className="text-xs m-0 flex-1 ds-text-tertiary">
                                  <span className="font-medium text-[var(--ds-text-primary)]">
                                    {copy.decisionImpactLabel}
                                  </span>
                                </p>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ds-text-tertiary hover:ds-text-primary"
                                      aria-label={`${copy.decisionImpactDetailsTrigger}: ${INTAKE_DIAGNOSTIC_PILOT_COPY_EN.whyAskedExpandLabel}`}
                                    >
                                      <Info className="h-3.5 w-3.5" weight="duotone" aria-hidden />
                                      <span>{copy.decisionImpactDetailsTrigger}</span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="text-xs leading-snug">
                                    {intelligenceByQuestionId[q.id]!.decisionImpact[0]!.effectDescription}
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        )}
                        <BriefField
                          q={q}
                          value={responses[q.id]}
                          onChange={
                            q.id === 'a2'
                              ? v => onIndustryChange(v)
                              : q.id === 'a5'
                                ? v => onWebsitePresenceChange(v)
                                : v => onFieldChange(q.id, v)
                          }
                          onSetUnknown={() => onUnknown(q.id)}
                          otherSpecify={q.id === 'a2' || specKey ? otherSpecify : undefined}
                          onOtherSpecifyChange={
                            q.id === 'a2'
                              ? text => onFieldChange('intake_industry_specify', text || null)
                              : specKey
                                ? text => onFieldChange(specKey, text || null)
                                : undefined
                          }
                        />
                        {!optionalDetailsOpenById[q.id] ? (
                          <button
                            type="button"
                            className="mt-2 text-xs underline ds-text-secondary"
                            onClick={() => onOpenOptionalDetails(q.id)}
                          >
                            {copy.addDetails}
                          </button>
                        ) : deepenPrompt ? (
                          <p className="mt-2 text-xs ds-text-secondary">{deepenPrompt}</p>
                        ) : (
                          <p className="mt-2 text-xs ds-text-secondary">{copy.detailsEnough}</p>
                        )}
                        {optionalDetailsOpenById[q.id] ? (
                          <button
                            type="button"
                            className="mt-1 text-xs underline ds-text-secondary"
                            onClick={() => onSubmitOptionalDetails(q.id)}
                          >
                            {copy.doneAddingDetails}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {skippedByConfidenceIds.length > 0 && (
        <p className="text-xs ds-text-secondary">
          {copy.skippedByConfidencePrefix} {skippedByConfidenceIds.length} {copy.skippedByConfidenceSuffix}
        </p>
      )}

      {submitError && (
        <p className="text-sm text-center ds-text-score-1" >
          {submitError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="ds-btn ds-btn--secondary flex-1 py-3 text-sm"
          onClick={onBackProgressive}
        >
          {copy.backButton}
        </button>
        <button
          type="button"
          disabled={questionMode === 'progressive' ? !isCurrentStepSatisfied : !formComplete}
          className="ds-intake-brief-review-cta flex-[2] flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
          onClick={questionMode === 'progressive' ? onAdvanceProgressive : onGoReview}
        >
          {questionMode === 'progressive' ? copy.continueButton : copy.reviewAnswers} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
