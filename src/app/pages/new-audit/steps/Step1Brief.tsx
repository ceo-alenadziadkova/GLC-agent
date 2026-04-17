import { motion } from 'motion/react';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
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
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
  ProductMode,
} from '../../../data/auditTypes';
import { labelsForMissingReportDomains } from '../../../lib/intake-coverage-domain-labels';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
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
  intakeAnalytics,
  onResponsesChange,
  onResponseChange,
  onSetUnknown,
  step2Complete,
  onBackToStep0,
  onGoToStep2,
  clientDraftSaveSection,
}: Step1BriefProps) {
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
        {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsPrefix}
        <Link to="/settings#brief-layout" className="text-info font-medium underline-offset-2 hover:underline">
          {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsLinkText}
        </Link>
        {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsMidSuffix}
        {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsChangeLayoutText}
        {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsSuffix}
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
                <span className="mt-[1px] flex-shrink-0">&#9679;</span>
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
                {WORKSPACE_PAGE_COPY.newAudit.step1.prefilledFromClientPreBriefText}
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
            className="mb-6 h-[3px] bg-muted [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-sky-400 [&>[data-slot=progress-indicator]]:to-sky-600"
          />

          <p className="text-muted-foreground mb-3.5 text-xs">
            {WORKSPACE_PAGE_COPY.newAudit.nextActionText[nextBestAction]}
          </p>

          {briefLayoutChoice === 'wizard' ? (
            <div className="max-h-[min(55vh,28rem)] sm:max-h-[55vh] overflow-y-auto pr-1">
              <IntakeBankWizard
                responses={responses}
                onResponsesChange={onResponsesChange}
                interviewMode={interviewMode}
                emphasizeClientSource={intakePrefillActive}
                answerSource={interviewMode ? 'consultant' : 'client'}
                collectionMode={noPublicWebsite ? 'discovery' : undefined}
                intakeSurface={noPublicWebsite ? undefined : 'consultant_interview'}
                intakeAnalytics={intakeAnalytics}
                productMode={briefProductMode}
              />
            </div>
          ) : (
            <div className="max-h-[min(55vh,28rem)] sm:max-h-[55vh] overflow-y-auto pr-1">
              <BankClassicBriefFields
                responses={responses}
                collectionMode={noPublicWebsite ? 'discovery' : undefined}
                intakeSurface={noPublicWebsite ? undefined : 'consultant_interview'}
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
          className={cn(
            'glc-touch-target flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all sm:min-h-0 sm:py-2.5',
            step2Complete
              ? 'bg-gradient-to-r from-sky-400 to-sky-600 text-primary-foreground shadow-[0_4px_14px_rgba(28,189,255,0.25)]'
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

      {clientDraftSaveSection}
    </motion.div>
  );
}

