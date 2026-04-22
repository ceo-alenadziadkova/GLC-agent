import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle, Circle, Warning } from '@phosphor-icons/react';
import type { IntakePlanCoverageDomain } from '@glc/intake-core';
import type { BriefIntakeAnalyticsSurface } from '../../../lib/brief-intake-analytics';
import { BriefLayoutPreferenceCards } from '../../../components/BriefLayoutPreferenceCards';
import { IntakeBankCoverageHint } from '../../../components/IntakeBankCoverageHint';
import { Callout } from '../../../components/ui/callout';
import { IntakeBankWizard } from '../../../components/IntakeBankWizard';
import { BankClassicBriefFields } from '../../../components/BankClassicBriefFields';
import { Progress } from '../../../components/ui/progress';
import type { BriefResponses } from '../../../data/briefQuestions';
import type {
  BriefResponseSource,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
  ProductMode,
} from '../../../data/auditTypes';
import { labelsForMissingReportDomains } from '../../../lib/intake-coverage-domain-labels';
import { INTAKE_DIAGNOSTIC_PILOT_COPY_EN } from '../../../config/intake-diagnostic-pilot-copy.en';
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
  isClientSelfServe,
  briefExecutionDiagnostic,
  briefExecutionDiagnosticLoading,
  briefExecutionDiagnosticError,
  serverVisibleQuestionIds,
}: Step1BriefProps) {
  const [focusedWizardQuestionId, setFocusedWizardQuestionId] = useState<string | null>(null);
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

        {layoutSelected && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onChangeConsultantBriefLayout}
              className="text-info bg-transparent p-0 text-xs font-medium underline-offset-2 hover:underline"
            >
              {WORKSPACE_PAGE_COPY.newAudit.step1.changeLayoutButton}
            </button>
            <span className="text-muted-foreground text-xs">
              {answeredRequired} / {pipelineRequiredTotal} {WORKSPACE_PAGE_COPY.newAudit.step1.requiredLowercase}
            </span>
          </div>
        )}
      </div>

      <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
        {isClientSelfServe ? (
          WORKSPACE_PAGE_COPY.newAudit.step1.layoutIntroClient
        ) : (
          <>
            {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsPrefix}
            <Link to="/settings#brief-layout" className="text-info font-medium underline-offset-2 hover:underline">
              {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsLinkText}
            </Link>
            {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsMidSuffix}
            {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsChangeLayoutText}
            {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsSuffix}
          </>
        )}
      </p>

      {!layoutSelected && (
        <BriefLayoutPreferenceCards selected={null} onSelect={onSelectConsultantBriefLayout} />
      )}

      {layoutSelected && (
        <>
          {/* Discovery pre-fill banner */}
          {discoveryPrefilled && (
            <Callout intent="info" className="mb-4">
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

          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-xs">
              {WORKSPACE_PAGE_COPY.newAudit.step1.auditReadinessPrefix}
              {progressPct}%
            </span>
            <span className="text-muted-foreground rounded border px-2 py-0.5 text-xs">
              {readinessBadge.toUpperCase()}
            </span>
          </div>

          <div className="mb-3">
            <IntakeBankCoverageHint
              dataQualityPct={bankMetrics.dataQualityPct}
              visibleRequiredAnswered={bankMetrics.visibleRequiredAnswered}
              visibleRequiredTotal={bankMetrics.visibleRequiredTotal}
              visibleRecommendedAnswered={bankMetrics.visibleRecommendedAnswered}
              visibleRecommendedTotal={bankMetrics.visibleRecommendedTotal}
              reportInputGapLabels={labelsForMissingReportDomains(bankMetrics.missingForReport)}
            />
          </div>

          {interviewMode && (
            <Callout intent="warning" className="mb-3">
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

          {intakePrefillActive && (
            <Callout intent="info" className="mb-4">
              <span className="text-muted-foreground text-sm">
                {isClientSelfServe
                  ? WORKSPACE_PAGE_COPY.newAudit.step1.prefilledBriefNoteClient
                  : WORKSPACE_PAGE_COPY.newAudit.step1.prefilledFromClientPreBriefText}
              </span>
            </Callout>
          )}

          <p className="text-muted-foreground mb-5 text-sm">
            {WORKSPACE_PAGE_COPY.newAudit.step1.questionsFeedTextPrefix}{' '}
            <strong className="text-muted-foreground inline-flex items-center gap-1">
              <Circle size={7} weight="fill" className="text-destructive" />
              {WORKSPACE_PAGE_COPY.newAudit.step1.requiredLabel}
            </strong>{' '}
            {WORKSPACE_PAGE_COPY.newAudit.step1.questionsMustBeAnsweredText}
          </p>

          <Progress
            value={(answeredRequired / pipelineRequiredTotal) * 100}
            className="ds-step1-brief-progress-thin mb-6 bg-muted [&>[data-slot=progress-indicator]]:bg-[var(--gradient-brand)]"
          />

          {briefExecutionDiagnosticLoading ? (
            <p className="text-muted-foreground mb-3 text-xs">{INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessSyncing}</p>
          ) : null}

          {briefExecutionDiagnosticError ? (
            <Callout intent="info" className="mb-4">
              {INTAKE_DIAGNOSTIC_PILOT_COPY_EN.schemaLoadError}
            </Callout>
          ) : null}

          {briefExecutionDiagnostic?.readiness?.auditReadinessStatus === 'blocked' ? (
            <Callout intent="warning" className="mb-4" title={INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessTitle}>
              <p className="m-0 mb-2">{INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessBlockedLead}</p>
              <ul className="m-0 list-disc space-y-1 pl-4">
                {briefExecutionDiagnostic.readiness.trace
                  .filter(t => Boolean(t.semanticCause))
                  .slice(0, 6)
                  .map((t, i) => (
                    <li key={`${t.code}-${i}`}>{t.semanticCause}</li>
                  ))}
              </ul>
            </Callout>
          ) : null}

          {briefExecutionDiagnostic?.readiness?.auditReadinessStatus === 'ready_with_caveats' ? (
            <Callout intent="info" className="mb-4" title={INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessTitle}>
              <p className="m-0 mb-2">{INTAKE_DIAGNOSTIC_PILOT_COPY_EN.executionReadinessCaveatsLead}</p>
              <ul className="m-0 list-disc space-y-1 pl-4">
                {briefExecutionDiagnostic.readiness.trace
                  .filter(t => Boolean(t.semanticCause))
                  .slice(0, 6)
                  .map((t, i) => (
                    <li key={`${t.code}-${i}`}>{t.semanticCause}</li>
                  ))}
              </ul>
            </Callout>
          ) : null}

          {briefExecutionDiagnostic?.remediation_queue && briefExecutionDiagnostic.remediation_queue.length > 0 ? (
            <Callout intent="neutral" className="mb-4" title={INTAKE_DIAGNOSTIC_PILOT_COPY_EN.remediationTitle}>
              <p className="mb-2 text-xs text-muted-foreground">
                {INTAKE_DIAGNOSTIC_PILOT_COPY_EN.remediationCheckpointLead}
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

          <p className="text-muted-foreground mb-3.5 text-xs">
            {WORKSPACE_PAGE_COPY.newAudit.nextActionText[nextBestAction]}
          </p>

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
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3 mt-4">
        <button
          type="button"
          onClick={onBackToStep0}
          className="text-muted-foreground glc-touch-target flex items-center justify-center gap-1.5 rounded-lg border bg-transparent px-4 py-2.5 text-sm sm:min-h-0 sm:min-w-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {WORKSPACE_PAGE_COPY.newAudit.step1.navigationBackText}
        </button>
        <button
          type="button"
          onClick={onGoToStep2}
          disabled={!step2Complete}
          aria-describedby={
            !step2Complete && missingRequiredPreview.visible.length > 0
              ? NEW_AUDIT_STEP1_MISSING_REQUIRED_HINT_DOM_ID
              : undefined
          }
          className={cn(
            'glc-touch-target flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all sm:min-h-0 sm:py-2.5',
            step2Complete
              ? 'bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)]'
              : 'bg-muted text-muted-foreground cursor-not-allowed border',
          )}
        >
          {step2Complete ? (
            <>
              <CheckCircle className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.newAudit.step1.navigationReviewLaunchText}
            </>
          ) : (
            <>
              <Warning className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.newAudit.step1.navigationFillMoreRequiredPrefix}
              {pipelineRequiredTotal - answeredRequired}
              {WORKSPACE_PAGE_COPY.newAudit.step1.navigationFillMoreRequiredSuffix}
            </>
          )}
        </button>
      </div>

      {!step2Complete && missingRequiredPreview.visible.length > 0 && (
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

      {clientDraftSaveSection}
    </motion.div>
  );
}

