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
import type { BriefResponses } from '../../../data/briefQuestions';
import type {
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
  ProductMode,
} from '../../../data/auditTypes';
import { labelsForMissingReportDomains } from '../../../lib/intake-coverage-domain-labels';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

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
      className="glc-card p-4 mobile:p-5 sm:p-6"
      style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {WORKSPACE_PAGE_COPY.newAudit.step1.intakeBriefTitle}
          </h2>
          {interviewMode && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: 'var(--callout-warning-bg-strong)',
                border: '1px solid var(--callout-warning-border-strong)',
                color: 'var(--callout-warning-fg-emphasis)',
              }}
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
              className="text-xs font-medium underline-offset-2 hover:underline"
              style={{
                color: 'var(--glc-blue)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {WORKSPACE_PAGE_COPY.newAudit.step1.changeLayoutButton}
            </button>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {answeredRequired} / {pipelineRequiredTotal} {WORKSPACE_PAGE_COPY.newAudit.step1.requiredLowercase}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-quaternary)' }}>
        {WORKSPACE_PAGE_COPY.newAudit.step1.layoutSettingsPrefix}
        <Link to="/settings#brief-layout" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
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
                  className="mt-0.5 flex-shrink-0 text-[var(--glc-blue)]"
                />
                <p className="text-xs leading-[1.55] text-[var(--text-secondary)]">
                  {WORKSPACE_PAGE_COPY.newAudit.step1.discoveryPrefilledBannerText}
                </p>
              </div>
            </Callout>
          )}

          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              {WORKSPACE_PAGE_COPY.newAudit.step1.auditReadinessPrefix}
              {progressPct}%
            </span>
            <span className="px-2 py-0.5 rounded text-xs" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
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
              <div className="flex items-start gap-2 text-xs text-[var(--callout-warning-fg)]">
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
              <span className="text-sm text-[var(--text-secondary)]">
                {WORKSPACE_PAGE_COPY.newAudit.step1.prefilledFromClientPreBriefText}
              </span>
            </Callout>
          )}

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 20 }}>
            {WORKSPACE_PAGE_COPY.newAudit.step1.questionsFeedTextPrefix}{' '}
            <strong className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <Circle size={7} weight="fill" style={{ color: 'var(--score-1)' }} />
              {WORKSPACE_PAGE_COPY.newAudit.step1.requiredLabel}
            </strong>{' '}
            {WORKSPACE_PAGE_COPY.newAudit.step1.questionsMustBeAnsweredText}
          </p>

          <div className="rounded-full overflow-hidden mb-6" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(answeredRequired / pipelineRequiredTotal) * 100}%`,
                background: 'var(--gradient-brand)',
              }}
            />
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 14 }}>
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
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm glc-touch-target sm:min-h-0 sm:min-w-0"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {WORKSPACE_PAGE_COPY.newAudit.step1.navigationBackText}
        </button>
        <button
          type="button"
          onClick={onGoToStep2}
          disabled={!step2Complete}
          className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all glc-touch-target sm:min-h-0"
          style={{
            background: step2Complete ? 'var(--gradient-brand)' : 'var(--bg-muted)',
            color: step2Complete ? 'var(--primary-foreground)' : 'var(--text-secondary)',
            cursor: step2Complete ? 'pointer' : 'not-allowed',
            border: step2Complete ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: step2Complete ? '0 4px 14px rgba(28,189,255,0.25)' : 'none',
          }}
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

