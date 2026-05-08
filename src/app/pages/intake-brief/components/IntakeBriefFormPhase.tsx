import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ListBullets, Microphone } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Textarea } from '../../../components/ui/textarea';
import { BriefField } from '../../../components/BriefField';
import type { BriefQuestion, BriefResponses } from '../../../data/briefQuestions';
import { briefResponseTrimmedString } from '../../../data/briefQuestions';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { formatIntakeBriefSavedAt } from '../../../lib/format-intake-dates';
import { replaceIntakePublicCopyPlaceholders } from '../lib/intake-public-copy-helpers';

const copy = WORKSPACE_PAGE_COPY.intakePublicPrebrief;

const LS_PREFILL_DISMISS = (token: string) => `glc:intake:inline-notice:prefill:${token}`;
const LS_SHORT_HINT_DISMISS = (token: string) => `glc:intake:inline-notice:short-hint:${token}`;

function readNoticeDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function persistNoticeDismissed(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    /* ignore quota / private mode */
  }
}

function resolveDeepenPrompt(args: {
  questionId: string;
  questionType: BriefQuestion['type'];
  value: string;
  copy: typeof WORKSPACE_PAGE_COPY.intakePublicPrebrief;
}): string | null {
  if (args.questionType !== 'free_text') return null;
  const text = args.value.trim();
  if (!text) return args.copy.addDetailsEmptyHint;
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
  /** Public intake token — used to remember dismissed inline notices for this link. */
  intakeToken: string | null;
  displayedQuestionSections: SectionBlock[];
  responses: BriefResponses;
  /** When set, user chooses guided form vs free text / dictation before the NL block is shown. */
  intakePathChoice?: {
    mode: 'form' | 'dictation';
    onChange: (mode: 'form' | 'dictation') => void;
  };
  nlIngress?: {
    text: string;
    onTextChange: (v: string) => void;
    onSubmit: () => void;
    consentAccepted: boolean;
    onConsentChange: (accepted: boolean) => void;
    busy: boolean;
    status: 'idle' | 'ok' | 'error';
  };
  /** Only `state` is used for friendly nudges; technical readiness is not shown on this screen. */
  readinessPanel: { state: 'pristine' | 'partial' | 'blocked' };
  intelligenceByQuestionId: Record<
    string,
    {
      whyAsked: string;
      semanticDomain: 'market' | 'value' | 'economics' | 'operations' | 'resources' | 'risks';
      decisionImpact: Array<{ target: string; weight: 'low' | 'medium' | 'high'; effectDescription: string }>;
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
  /** Public two-phase intake: after pre-brief, planner-driven follow-ups. */
  hideGuidedAllToggle?: boolean;
  tailoredPhaseBanner?: { title: string; body: string } | null;
  modeSubtitleOverride?: string | null;
  progressiveContinueBusy?: boolean;
}) {
  const {
    intakeToken,
    displayedQuestionSections,
    responses,
    intakePathChoice,
    nlIngress,
    readinessPanel,
    intelligenceByQuestionId,
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
    hideGuidedAllToggle = false,
    tailoredPhaseBanner = null,
    modeSubtitleOverride = null,
    progressiveContinueBusy = false,
  } = props;

  const [prefillNoticeDismissed, setPrefillNoticeDismissed] = useState(() =>
    intakeToken ? readNoticeDismissed(LS_PREFILL_DISMISS(intakeToken)) : false,
  );
  const [shortAnswersHintDismissed, setShortAnswersHintDismissed] = useState(() =>
    intakeToken ? readNoticeDismissed(LS_SHORT_HINT_DISMISS(intakeToken)) : false,
  );

  const dismissPrefillNotice = useCallback(() => {
    setPrefillNoticeDismissed(true);
    if (intakeToken) persistNoticeDismissed(LS_PREFILL_DISMISS(intakeToken));
  }, [intakeToken]);
  const dismissShortAnswersHint = useCallback(() => {
    setShortAnswersHintDismissed(true);
    if (intakeToken) persistNoticeDismissed(LS_SHORT_HINT_DISMISS(intakeToken));
  }, [intakeToken]);

  const title = companyName || copy.formTitleFallback;
  const expiresDisplay = expiresAtIso ? formatIntakeBriefSavedAt(expiresAtIso) : '';
  const clientReadinessNudge =
    readinessPanel.state === 'blocked'
      ? copy.readinessNudgeNeedBasics
      : readinessPanel.state === 'partial' && answered > 0
        ? copy.readinessNudgeMoreContext
        : null;
  const stepCurrent = Math.min(progressiveStepIndex + 1, Math.max(progressiveStepTotal, 1));
  const stepMax = Math.max(progressiveStepTotal, 1);
  const stepLine = replaceIntakePublicCopyPlaceholders(copy.stepProgressFormat, {
    current: String(stepCurrent),
    total: String(stepMax),
  });
  const progressRatio = total > 0 ? answered / total : 0;
  const stepRatio = stepMax > 0 ? stepCurrent / stepMax : 0;
  const progressValueLine =
    progressRatio < 0.4
      ? copy.progressValueEarly
      : progressRatio < 0.85
        ? copy.progressValueMid
        : copy.progressValueLate;
  const modeSubtitle =
    modeSubtitleOverride ??
    (journeyStage === 'fast_pass' ? copy.modeSubtitleFast : copy.modeSubtitlePrecision);

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

      {consultantPrefilledIdentity && !prefillNoticeDismissed && (
        <div className="text-xs text-center rounded-lg ds-intake-brief-inline-notice ds-intake-brief-inline-notice--info w-full max-w-2xl mx-auto px-3 py-2">
          <div className="flex items-start justify-between gap-3 text-left">
            <span className="min-w-0 flex-1 leading-relaxed">{copy.consultantPrefillNotice}</span>
            <button
              type="button"
              className="shrink-0 underline ds-text-secondary"
              onClick={dismissPrefillNotice}
            >
              {copy.inlineNoticeDismiss}
            </button>
          </div>
        </div>
      )}
      {!shortAnswersHintDismissed && (
        <div className="text-xs text-center rounded-lg ds-intake-brief-inline-notice w-full max-w-2xl mx-auto px-3 py-2">
          <div className="flex items-start justify-between gap-3 text-left">
            <span className="min-w-0 flex-1 leading-relaxed">{copy.shortAnswersHint}</span>
            <button
              type="button"
              className="shrink-0 underline ds-text-secondary"
              onClick={dismissShortAnswersHint}
            >
              {copy.inlineNoticeDismiss}
            </button>
          </div>
        </div>
      )}

      {intakePathChoice ? (
        <div
          className="w-full max-w-2xl mx-auto space-y-2"
          role="group"
          aria-label={copy.intakePathChoiceTitle}
        >
          <p className="text-sm font-medium text-center ds-text-primary m-0">{copy.intakePathChoiceTitle}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => intakePathChoice.onChange('form')}
              aria-pressed={intakePathChoice.mode === 'form'}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-focus-ring,currentColor)] ${
                intakePathChoice.mode === 'form'
                  ? 'border-[var(--ds-border-default)] bg-[var(--ds-surface-raised)] ring-2 ring-[var(--primitive-focus-ring-color)]'
                  : 'border-[var(--ds-border-subtle)] bg-[var(--ds-surface-default)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold ds-text-primary">
                <ListBullets className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
                {copy.intakePathFormLabel}
              </span>
              <span className="text-xs leading-relaxed ds-text-secondary">{copy.intakePathFormDescription}</span>
            </button>
            <button
              type="button"
              onClick={() => intakePathChoice.onChange('dictation')}
              aria-pressed={intakePathChoice.mode === 'dictation'}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-focus-ring,currentColor)] ${
                intakePathChoice.mode === 'dictation'
                  ? 'border-[var(--ds-border-default)] bg-[var(--ds-surface-raised)] ring-2 ring-[var(--primitive-focus-ring-color)]'
                  : 'border-[var(--ds-border-subtle)] bg-[var(--ds-surface-default)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold ds-text-primary">
                <Microphone className="h-4 w-4 shrink-0" weight="duotone" aria-hidden />
                {copy.intakePathDictationLabel}
              </span>
              <span className="text-xs leading-relaxed ds-text-secondary">{copy.intakePathDictationDescription}</span>
            </button>
          </div>
        </div>
      ) : null}

      {nlIngress ? (
        <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)] p-4 space-y-2 max-w-2xl mx-auto w-full">
          <p className="text-sm font-semibold m-0 ds-text-primary">{copy.nlIngressTitle}</p>
          <p className="text-xs m-0 ds-text-secondary">{copy.nlIngressHelper}</p>
          <Textarea
            className="w-full min-h-[length:var(--intake-nl-ingress-textarea-min-height)] rounded-lg border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] text-sm ds-text-primary"
            value={nlIngress.text}
            onChange={e => nlIngress.onTextChange(e.target.value)}
            placeholder={copy.nlIngressPlaceholder}
            aria-label={copy.nlIngressTitle}
            voiceInput
          />
          <p className="text-xs m-0 ds-text-quaternary">{copy.nlIngressPrivacy}</p>
          <label className="flex flex-wrap items-start gap-2 text-xs ds-text-secondary">
            <input
              type="checkbox"
              checked={nlIngress.consentAccepted}
              onChange={e => nlIngress.onConsentChange(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {copy.nlConsentLabel}{' '}
              <Link
                to="/legal/privacy"
                className="underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.nlPrivacyLinkLabel}
              </Link>
            </span>
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
      {tailoredPhaseBanner ? (
        <div
          className="w-full max-w-2xl mx-auto rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)] p-4 text-left space-y-1"
          role="status"
        >
          <p className="text-sm font-semibold m-0 ds-text-primary">{tailoredPhaseBanner.title}</p>
          <p className="text-xs m-0 ds-text-secondary leading-relaxed">{tailoredPhaseBanner.body}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ds-border-subtle)] p-3">
        {questionMode === 'progressive' ? (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold m-0 ds-text-primary">{stepLine}</p>
            <p className="text-xs m-0 ds-text-quaternary">{modeSubtitle}</p>
            <div className="mt-2 rounded-full overflow-hidden ds-intake-brief-progress-track h-1.5">
              <div
                className="h-full rounded-full transition-all ds-intake-progress-fill"
                style={{ width: `${stepRatio * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs ds-text-secondary">
            {copy.progressLabel}: {answered} / {total}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!hideGuidedAllToggle ? (
            <button
              type="button"
              className="ds-btn ds-btn--secondary text-xs"
              onClick={() => onToggleQuestionMode(questionMode === 'progressive' ? 'all_questions' : 'progressive')}
            >
              {questionMode === 'progressive' ? copy.showAllQuestions : copy.backToGuidedMode}
            </button>
          ) : null}
          <button type="button" className="ds-btn ds-btn--secondary text-xs" onClick={onSaveAndContinueLater}>
            {copy.saveAndContinueLater}
          </button>
        </div>
      </div>

      {clientReadinessNudge ? (
        <p className="text-sm text-center max-w-2xl mx-auto rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)] px-3 py-2 ds-text-secondary">
          {clientReadinessNudge}
        </p>
      ) : null}

      <div className="w-full min-w-0 space-y-6 max-w-3xl mx-auto">
        {questionMode === 'all_questions' ? (
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
        ) : null}

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
                        {intelligenceByQuestionId[q.id] && (
                          <details className="mb-2 rounded-lg border border-[var(--ds-border-subtle)] p-2">
                            <summary className="cursor-pointer text-xs ds-text-secondary list-none [&::-webkit-details-marker]:hidden">
                              {copy.whyWeAskSummary}
                            </summary>
                            <p className="text-xs m-0 mt-2 leading-relaxed ds-text-tertiary">
                              {intelligenceByQuestionId[q.id]!.whyAsked}
                            </p>
                          </details>
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
                        {q.type === 'free_text' ? (
                          <>
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
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
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

      <div className="flex max-w-3xl mx-auto w-full items-center gap-2">
        <button
          type="button"
          className="ds-btn ds-btn--secondary flex-1 py-3 text-sm"
          disabled={progressiveContinueBusy}
          onClick={onBackProgressive}
        >
          {copy.backButton}
        </button>
        <button
          type="button"
          disabled={
            progressiveContinueBusy ||
            (questionMode === 'progressive' ? !isCurrentStepSatisfied : !formComplete)
          }
          aria-busy={progressiveContinueBusy}
          className="ds-intake-brief-review-cta flex-[2] flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
          onClick={questionMode === 'progressive' ? onAdvanceProgressive : onGoReview}
        >
          {progressiveContinueBusy
            ? copy.tailoredLoading
            : questionMode === 'progressive'
              ? copy.continueButton
              : copy.reviewAnswers}{' '}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
