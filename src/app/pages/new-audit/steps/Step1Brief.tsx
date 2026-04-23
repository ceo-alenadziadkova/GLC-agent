import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle, Circle } from '@phosphor-icons/react';
import type { IntakePlanCoverageDomain } from '@glc/intake-core';
import type { BriefIntakeAnalyticsSurface } from '../../../lib/brief-intake-analytics';
import { BriefLayoutPreferenceCards } from '../../../components/BriefLayoutPreferenceCards';
import { IntakeBankCoverageHint } from '../../../components/IntakeBankCoverageHint';
import { Callout } from '../../../components/ui/callout';
import { IntakeBankWizard } from '../../../components/IntakeBankWizard';
import { BankClassicBriefFields } from '../../../components/BankClassicBriefFields';
import type { BriefResponses } from '../../../data/briefQuestions';
import type {
  BriefResponseSource,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
  ProductMode,
} from '../../../data/auditTypes';
import { labelsForMissingReportDomains } from '../../../lib/intake-coverage-domain-labels';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import type { BriefSchemaSnapshot } from '../../../data/api/brief-profile-platform';
import { getQuestionLabel } from '../../../lib/intake-question-lookup';
import { listMissingPipelineRequiredIds } from '../newAuditValidation';
import {
  NEW_AUDIT_STEP1_MISSING_REQUIRED_HINT_DOM_ID,
  NEW_AUDIT_STEP1_MISSING_REQUIRED_LABELS_PREVIEW_MAX,
} from '../wizard-config/wizard-constants';
import { cn } from '../../../components/ui/utils';

export type BriefLayoutChoice = 'unset' | 'classic' | 'wizard';

export type Step1BriefProps = {
  // Header
  interviewMode: boolean;
  layoutSelected: boolean;
  answeredRequired: number;
  pipelineRequiredTotal: number;

  // Layout selection
  briefLayoutChoice: BriefLayoutChoice;
  onChangeConsultantBriefLayout: () => void;
  onSelectConsultantBriefLayout: (mode: 'classic' | 'wizard') => void;

  // Prefill / coaching
  discoveryPrefilled: boolean;
  intakePrefillActive: boolean;

  // Readiness
  progressPct: number;
  readinessBadge: IntakeReadinessBadge;
  nextBestAction: IntakeNextBestAction;

  bankMetrics: {
    dataQualityPct: number;
    visibleRequiredAnswered: number;
    visibleRequiredTotal: number;
    visibleRecommendedAnswered: number;
    visibleRecommendedTotal: number;
    missingForReport: readonly IntakePlanCoverageDomain[];
  };

  // Responses + handlers
  responses: BriefResponses;
  briefProductMode: ProductMode;
  noPublicWebsite: boolean;
  /** Step 0 Basics — merged into pipeline required/missing checks. */
  url: string;
  name: string;
  industry: string;
  industrySpecify: string;
  step0PipelineAnswerSource: BriefResponseSource;
  intakeAnalytics?: {
    auditId: string;
    surface: BriefIntakeAnalyticsSurface;
    getIntakeVersions: () => IntakeVersionTuple | null;
  };
  onResponsesChange: (next: BriefResponses) => void;
  onResponseChange: (id: string, value: string | string[] | number | null) => void;
  onSetUnknown: (id: string) => void;
  step2Complete: boolean;

  // Navigation
  onBackToStep0: () => void;
  onGoToStep2: () => void;

  clientDraftSaveSection: ReactNode;
  clientDraftSaveInlineAction?: ReactNode;

  /** Portal self-serve: simpler copy (no Settings / consultant defaults). */
  isClientSelfServe: boolean;

  /** Server-driven diagnostic intake (GET brief/schema); do not derive locally. */
  briefExecutionDiagnostic: Pick<
    BriefSchemaSnapshot,
    'readiness' | 'critical_signals' | 'remediation_queue'
  > | null;
  briefExecutionDiagnosticLoading: boolean;
  briefExecutionDiagnosticError: boolean;
  /** Optional visible order from GET …/brief `questions` (resolver-authored). */
  serverVisibleQuestionIds?: string[];
};

export function Step1Brief({
  interviewMode,
  layoutSelected,
  answeredRequired,
  pipelineRequiredTotal,
  briefLayoutChoice,
  onChangeConsultantBriefLayout,
  onSelectConsultantBriefLayout,
  discoveryPrefilled,
  intakePrefillActive,
  progressPct,
  readinessBadge,
  nextBestAction,
  bankMetrics,
  responses,
  briefProductMode,
  noPublicWebsite,
  url,
  name,
  industry,
  industrySpecify,
  step0PipelineAnswerSource,
  intakeAnalytics,
  onResponsesChange,
  onResponseChange,
  onSetUnknown,
  step2Complete,
  onBackToStep0,
  onGoToStep2,
  clientDraftSaveSection,
  clientDraftSaveInlineAction,
  isClientSelfServe,
  briefExecutionDiagnostic,
  briefExecutionDiagnosticLoading,
  briefExecutionDiagnosticError,
  serverVisibleQuestionIds,
}: Step1BriefProps) {
  const [focusedWizardQuestionId, setFocusedWizardQuestionId] = useState<string | null>(null);
  const [showMissingRequired, setShowMissingRequired] = useState(false);
  const pipelineProductMode = briefProductMode === 'express' ? 'express' : 'full';
  const missingRequiredIds = useMemo(
    () =>
      listMissingPipelineRequiredIds({
        responses,
        noPublicWebsite,
        briefProductMode: pipelineProductMode,
        step0Basics: {
          url,
          name,
          industry,
          industrySpecify,
          answerSource: step0PipelineAnswerSource,
        },
      }),
    [
      responses,
      noPublicWebsite,
      pipelineProductMode,
      url,
      name,
      industry,
      industrySpecify,
      step0PipelineAnswerSource,
    ],
  );
  const missingRequiredPreview = useMemo(() => {
    const max = NEW_AUDIT_STEP1_MISSING_REQUIRED_LABELS_PREVIEW_MAX;
    const head = missingRequiredIds.slice(0, max);
    return {
      visible: head.map(id => ({ id, label: getQuestionLabel(id) })),
      overflow: missingRequiredIds.length > max ? missingRequiredIds.length - max : 0,
    };
  }, [missingRequiredIds]);
  const briefIntakeSurface = noPublicWebsite
    ? undefined
    : isClientSelfServe
      ? 'client_form'
      : 'consultant_interview';
  const isBlockedReadiness = briefExecutionDiagnostic?.readiness?.auditReadinessStatus === 'blocked';
  const isCaveatReadiness = briefExecutionDiagnostic?.readiness?.auditReadinessStatus === 'ready_with_caveats';
  const remainingRequiredCount = Math.max(pipelineRequiredTotal - answeredRequired, 0);

  useEffect(() => {
    if (step2Complete && showMissingRequired) {
      setShowMissingRequired(false);
    }
  }, [showMissingRequired, step2Complete]);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.28 }}
      className="glc-card rounded-2xl p-4 shadow-lg mobile:p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground text-lg font-bold">
            {WORKSPACE_PAGE_COPY.newAudit.step1.intakeBriefTitle}
          </h2>
          {interviewMode && (
            <span
              className="bg-warning/15 text-warning border-warning/40 rounded-full border px-2 py-0.5 text-[length:var(--text-2xs)] font-semibold"
            >
              {WORKSPACE_PAGE_COPY.newAudit.step1.interviewBadgeLabel}
            </span>
          )}
        </div>

        {isClientSelfServe ? clientDraftSaveInlineAction : null}

        {layoutSelected && !isClientSelfServe && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onChangeConsultantBriefLayout}
              className="text-info bg-transparent p-0 text-xs font-medium underline-offset-2 hover:underline"
            >
              {WORKSPACE_PAGE_COPY.newAudit.step1.changeLayoutButton}
            </button>
          </div>
        )}
      </div>

      {!layoutSelected && !isClientSelfServe && (
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsPrefix}
          <Link to="/settings#brief-layout" className="text-info font-medium underline-offset-2 hover:underline">
            {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsLinkText}
          </Link>
          {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsMidSuffix}
          {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsChangeLayoutText}
          {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsSuffix}
        </p>
      )}

      {!layoutSelected && !isClientSelfServe && (
        <BriefLayoutPreferenceCards selected={null} onSelect={onSelectConsultantBriefLayout} />
      )}

      {layoutSelected && (
        <>
          {isBlockedReadiness ? (
            <Callout intent="warning" className="mb-4" title={WORKSPACE_PAGE_COPY.newAudit.step1.blockedCalloutTitle}>
              <p className="m-0 mb-2">{WORKSPACE_PAGE_COPY.newAudit.step1.blockedCalloutBody}</p>
              {briefExecutionDiagnostic?.remediation_queue?.[0] ? (
                <button
                  type="button"
                  className="text-info text-xs font-medium underline-offset-2 hover:underline"
                  onClick={() => {
                    if (briefLayoutChoice !== 'wizard') {
                      onSelectConsultantBriefLayout('wizard');
                    }
                    setFocusedWizardQuestionId(briefExecutionDiagnostic.remediation_queue[0] ?? null);
                  }}
                >
                  {WORKSPACE_PAGE_COPY.newAudit.step1.blockedCalloutActionPrefix}
                  {getQuestionLabel(briefExecutionDiagnostic.remediation_queue[0])}
                </button>
              ) : null}
              {!briefExecutionDiagnostic?.remediation_queue?.length && missingRequiredPreview.visible[0] ? (
                <button
                  type="button"
                  className="text-info text-xs font-medium underline-offset-2 hover:underline"
                  onClick={() => setShowMissingRequired(true)}
                >
                  {WORKSPACE_PAGE_COPY.newAudit.step1.blockedCalloutFallbackAction}
                </button>
              ) : null}
            </Callout>
          ) : null}
          {!isClientSelfServe ? (
            <details className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <summary className="cursor-pointer list-none text-xs font-medium text-foreground">
                {WORKSPACE_PAGE_COPY.newAudit.step1.supportDetailsToggle}
              </summary>
              <div className="mt-3 space-y-3">
                {briefExecutionDiagnosticLoading ? (
                  <p className="text-muted-foreground text-xs">{WORKSPACE_PAGE_COPY.newAudit.step1.detailsSyncing}</p>
                ) : null}
                {briefExecutionDiagnosticError ? (
                  <Callout intent="info">
                    {WORKSPACE_PAGE_COPY.newAudit.step1.detailsLoadError}
                  </Callout>
                ) : null}
                {discoveryPrefilled && (
                  <Callout intent="info">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle
                        size={15}
                        weight="fill"
                        className="text-info mt-0.5 flex-shrink-0"
                      />
                      <p className="text-muted-foreground text-xs leading-[1.55]">
                        {WORKSPACE_PAGE_COPY.newAudit.step1.discoveryPrefilledBannerText}
                      </p>
                    </div>
                  </Callout>
                )}
                {interviewMode && (
                  <Callout intent="warning">
                    <div className="text-warning-foreground flex items-start gap-2 text-xs">
                      <Circle className="mt-px h-3 w-3 shrink-0 text-current" weight="fill" aria-hidden />
                      <span>
                        {WORKSPACE_PAGE_COPY.newAudit.step1.coachingHintsPrefix}
                        <strong>{WORKSPACE_PAGE_COPY.newAudit.step1.coachingHintsConsultantTag}</strong>
                        {WORKSPACE_PAGE_COPY.newAudit.step1.coachingHintsMid}
                        <strong>{WORKSPACE_PAGE_COPY.newAudit.step1.coachingHintsClientTag}</strong>
                        {WORKSPACE_PAGE_COPY.newAudit.step1.coachingHintsSuffix}
                      </span>
                    </div>
                  </Callout>
                )}
                {intakePrefillActive ? (
                  <Callout intent="info">
                    <span className="text-muted-foreground text-sm">
                      {WORKSPACE_PAGE_COPY.newAudit.step1.prefilledFromClientPreBriefText}
                    </span>
                  </Callout>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {WORKSPACE_PAGE_COPY.newAudit.step1.auditReadinessPrefix}
                    {progressPct}%
                  </span>
                  <span className="text-muted-foreground rounded border px-2 py-0.5 text-xs">
                    {readinessBadge.toUpperCase()}
                  </span>
                </div>
                <IntakeBankCoverageHint
                  dataQualityPct={bankMetrics.dataQualityPct}
                  visibleRequiredAnswered={bankMetrics.visibleRequiredAnswered}
                  visibleRequiredTotal={bankMetrics.visibleRequiredTotal}
                  visibleRecommendedAnswered={bankMetrics.visibleRecommendedAnswered}
                  visibleRecommendedTotal={bankMetrics.visibleRecommendedTotal}
                  reportInputGapLabels={labelsForMissingReportDomains(bankMetrics.missingForReport)}
                />
                {isCaveatReadiness ? (
                  <Callout intent="info" title={WORKSPACE_PAGE_COPY.newAudit.step1.detailsCaveatsTitle}>
                    <p className="m-0 mb-2">{WORKSPACE_PAGE_COPY.newAudit.step1.detailsCaveatsLead}</p>
                    <ul className="m-0 list-disc space-y-1 pl-4">
                      {briefExecutionDiagnostic?.readiness.trace
                        .filter(t => Boolean(t.semanticCause))
                        .slice(0, 6)
                        .map((t, i) => (
                          <li key={`${t.code}-${i}`}>{t.semanticCause}</li>
                        ))}
                    </ul>
                  </Callout>
                ) : null}
                {briefExecutionDiagnostic?.remediation_queue && briefExecutionDiagnostic.remediation_queue.length > 0 ? (
                  <Callout intent="neutral" title={WORKSPACE_PAGE_COPY.newAudit.step1.detailsRemediationTitle}>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {WORKSPACE_PAGE_COPY.newAudit.step1.detailsRemediationLead}
                    </p>
                    <ul className="m-0 list-disc space-y-1 pl-4">
                      {briefExecutionDiagnostic.remediation_queue.map(id => (
                        <li key={id}>
                          <button
                            type="button"
                            className="text-info underline-offset-2 hover:underline"
                            onClick={() => {
                              if (briefLayoutChoice !== 'wizard') {
                                onSelectConsultantBriefLayout('wizard');
                              }
                              setFocusedWizardQuestionId(id);
                            }}
                          >
                            {getQuestionLabel(id)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Callout>
                ) : null}
                <p className="m-0 text-xs text-muted-foreground">
                  {WORKSPACE_PAGE_COPY.newAudit.nextActionText[nextBestAction]}
                </p>
              </div>
            </details>
          ) : null}

          {briefLayoutChoice === 'wizard' ? (
            <div className="ds-step1-brief-scroll">
              <IntakeBankWizard
                responses={responses}
                onResponsesChange={onResponsesChange}
                interviewMode={interviewMode}
                emphasizeClientSource={intakePrefillActive}
                answerSource={interviewMode ? 'consultant' : 'client'}
                collectionMode={noPublicWebsite ? 'discovery' : undefined}
                intakeSurface={briefIntakeSurface}
                intakeAnalytics={intakeAnalytics}
                productMode={briefProductMode}
                focusQuestionId={focusedWizardQuestionId}
                serverVisibleQuestionIds={serverVisibleQuestionIds}
                clientGuidedRail={isClientSelfServe}
                clientGuidedFastPassLabel={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedFastPassLabel}
                clientGuidedPrecisionPassLabel={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedPrecisionPassLabel}
                clientGuidedValueFeedbackEarly={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedValueFeedbackEarly}
                clientGuidedValueFeedbackMid={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedValueFeedbackMid}
                clientGuidedValueFeedbackLate={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedValueFeedbackLate}
                clientGuidedValueFeedbackQualityShort={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedValueFeedbackQualityShort}
                clientGuidedValueFeedbackQualityVague={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedValueFeedbackQualityVague}
                clientGuidedCompletionPrefix={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedCompletionPrefix}
                clientGuidedContextDepthPrefix={WORKSPACE_PAGE_COPY.newAudit.step1.clientGuidedContextDepthPrefix}
                guidedPrevButtonLabel={WORKSPACE_PAGE_COPY.newAudit.step1.guidedPrevQuestionButton}
                guidedNextButtonLabel={WORKSPACE_PAGE_COPY.newAudit.step1.guidedNextQuestionButton}
                guidanceDetailsToggleLabel={WORKSPACE_PAGE_COPY.newAudit.step1.guidanceDetailsToggle}
                reportInputGapsPrefix={WORKSPACE_PAGE_COPY.newAudit.step1.guidanceGapsPrefix}
                reportInputGapsOverflowSuffix={WORKSPACE_PAGE_COPY.newAudit.step1.guidanceGapsOverflowSuffix}
                noVisibleQuestionsHint={WORKSPACE_PAGE_COPY.newAudit.step1.noVisibleQuestionsHint}
              />
            </div>
          ) : (
            <div className="ds-step1-brief-scroll">
              <BankClassicBriefFields
                responses={responses}
                collectionMode={noPublicWebsite ? 'discovery' : undefined}
                intakeSurface={briefIntakeSurface}
                productMode={briefProductMode}
                onChange={onResponseChange}
                onSetUnknown={onSetUnknown}
                emphasizeClientSource={intakePrefillActive}
                interviewMode={interviewMode}
              />
            </div>
          )}
        </>
      )}

      <div className="glc-divider mt-5" />

      {/* Navigation */}
      <div className="mt-3 flex items-end gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onBackToStep0}
          className="text-muted-foreground glc-touch-target inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-transparent px-3 py-2 text-sm sm:min-h-0 sm:min-w-0 hover:bg-muted/30"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{WORKSPACE_PAGE_COPY.newAudit.step1.navigationBackText}</span>
        </button>
        <div className="flex-1 space-y-1">
          {!step2Complete && remainingRequiredCount > 0 ? (
            <p className="m-0 text-right text-[11px] text-muted-foreground">
              {WORKSPACE_PAGE_COPY.newAudit.step1.navigationRequiredLeftInline.replace(
                '{{count}}',
                String(remainingRequiredCount),
              )}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onGoToStep2}
            disabled={!step2Complete}
            aria-describedby={!step2Complete && showMissingRequired ? NEW_AUDIT_STEP1_MISSING_REQUIRED_HINT_DOM_ID : undefined}
            className={cn(
              'glc-touch-target flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
              step2Complete
                ? 'bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)] ring-1 ring-primary/20'
                : 'bg-muted text-muted-foreground cursor-not-allowed border',
            )}
          >
            {step2Complete ? (
              <>
                <CheckCircle className="w-4 h-4" />{' '}
                {isClientSelfServe
                  ? WORKSPACE_PAGE_COPY.newAudit.step1.navigationContinueClientText
                  : WORKSPACE_PAGE_COPY.newAudit.step1.navigationReviewLaunchText}
              </>
            ) : (
              <>{isClientSelfServe
                ? WORKSPACE_PAGE_COPY.newAudit.step1.navigationContinueClientText
                : WORKSPACE_PAGE_COPY.newAudit.step1.navigationReviewLaunchText}</>
            )}
          </button>
        </div>
      </div>

      {!step2Complete && missingRequiredPreview.visible.length > 0 && (
        <div className="mt-2 flex items-center gap-3">
          <p className="m-0 text-xs text-muted-foreground">
            {WORKSPACE_PAGE_COPY.newAudit.step1.navigationMissingRequiredHint}
          </p>
          <button
            type="button"
            onClick={() => setShowMissingRequired(prev => !prev)}
            className="text-xs font-medium text-info underline-offset-2 hover:underline"
            aria-expanded={showMissingRequired}
            aria-controls={NEW_AUDIT_STEP1_MISSING_REQUIRED_HINT_DOM_ID}
          >
            {showMissingRequired
              ? WORKSPACE_PAGE_COPY.newAudit.step1.navigationMissingRequiredToggleHide
              : WORKSPACE_PAGE_COPY.newAudit.step1.navigationMissingRequiredToggleShow}
          </button>
        </div>
      )}

      {!step2Complete && showMissingRequired && missingRequiredPreview.visible.length > 0 && (
        <div
          id={NEW_AUDIT_STEP1_MISSING_REQUIRED_HINT_DOM_ID}
          className="ds-step1-brief-missing-required"
          role="status"
        >
          <p className="ds-step1-brief-missing-required-intro">
            {WORKSPACE_PAGE_COPY.newAudit.step1.navigationMissingRequiredIntro}
          </p>
          <ul className="ds-step1-brief-missing-required-list">
            {missingRequiredPreview.visible.map(({ id, label }) => (
              <li key={id}>{label}</li>
            ))}
          </ul>
          {missingRequiredPreview.overflow > 0 && (
            <p className="ds-step1-brief-missing-required-overflow">
              {WORKSPACE_PAGE_COPY.newAudit.step1.navigationMissingRequiredOverflow.replace(
                '{{count}}',
                String(missingRequiredPreview.overflow),
              )}
            </p>
          )}
        </div>
      )}

      {isClientSelfServe ? null : clientDraftSaveSection}
    </motion.div>
  );
}

