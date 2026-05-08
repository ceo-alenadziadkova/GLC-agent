import { motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import type { DomainKey, AuditCoveragePackage } from '../../../data/auditTypes';
import { coveragePackageLabel } from '../../../lib/audit-execution-plan';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { BriefPipelineAnsweredTable } from '../../../components/BriefPipelineAnsweredTable';
import { Callout } from '../../../components/ui/callout';
import { ClientProjectContextPanel } from '../../../components/ClientProjectContextPanel';
import type { BriefResponses } from '../../../data/briefQuestions';

export type Step2ReviewProps = {
  url: string;
  name: string;
  industry: string;
  industrySpecify: string;
  coveragePackage: AuditCoveragePackage;
  selectedDomains: DomainKey[];
  answeredRequired: number;
  pipelineRequiredTotal: number;
  answeredQuestionIds: string[];
  pipelineGateBriefResponses: BriefResponses;
  onBackToStep1: () => void;
  onGoToStep3: () => void;
  clientDraftSaveSection: ReactNode;
  draftAuditId: string | null;
};

export function Step2Review({
  url,
  name,
  industry,
  industrySpecify,
  coveragePackage,
  selectedDomains,
  answeredRequired,
  pipelineRequiredTotal,
  answeredQuestionIds,
  pipelineGateBriefResponses,
  onBackToStep1,
  onGoToStep3,
  clientDraftSaveSection,
  draftAuditId,
}: Step2ReviewProps) {
  const clientProjectContextSyncKey = useMemo(
    () => JSON.stringify(pipelineGateBriefResponses),
    [pipelineGateBriefResponses],
  );

  return (
    <motion.div
      key="step2-review"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.28 }}
      className="glc-card space-y-5 rounded-[var(--radius-2xl)] p-4 shadow-[var(--shadow-lg)] mobile:p-5 sm:p-6"
    >
      <div className="text-center mb-2">
        <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--text-primary)]">
          {WORKSPACE_PAGE_COPY.newAudit.step2.readyToLaunchTitle}
        </h2>
        <p className="mt-[length:var(--space-1-5)] text-[length:var(--text-sm)] text-[var(--text-tertiary)]">
          {WORKSPACE_PAGE_COPY.newAudit.step2.reviewBeforeLaunchSubtitle}
        </p>
      </div>

      <Callout intent="neutral" className="space-y-2 rounded-xl p-4">
        {[
          [WORKSPACE_PAGE_COPY.newAudit.step2.summaryWebsiteLabel, url],
          name ? [WORKSPACE_PAGE_COPY.newAudit.step2.summaryCompanyLabel, name] : null,
          industry ? [WORKSPACE_PAGE_COPY.newAudit.step2.summaryIndustryLabel, industry] : null,
          [WORKSPACE_PAGE_COPY.newAudit.step2.summaryCoverageLabel, `${coveragePackageLabel(coveragePackage)} · ${selectedDomains.length} domain(s)`],
        ]
          .filter((row): row is [string, string] => row != null)
          .map(([label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <span className="ds-step2-summary-label-col pt-[length:var(--border-width-default)] text-xs text-[var(--text-tertiary)]">{label}</span>
              <span className="break-words text-sm text-[var(--text-primary)]">{value}</span>
            </div>
          ))}
        <div className="flex items-start gap-3">
          <span className="ds-step2-summary-label-col pt-[length:var(--border-width-default)] text-xs text-[var(--text-tertiary)]">
            {WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefLabel}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="m-0 break-words text-sm text-[var(--text-primary)]">
              {answeredRequired}/{pipelineRequiredTotal}{' '}
              {WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefRequiredAnsweredSuffix}
            </p>
            {answeredQuestionIds.length > 0 ? (
              <details className="ds-step2-brief-answered-details" open>
                <summary>{WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnsweredExpand}</summary>
                <BriefPipelineAnsweredTable
                  answeredIds={answeredQuestionIds}
                  responses={pipelineGateBriefResponses}
                  questionHeader={WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnsweredTableQuestionCol}
                  answerHeader={WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnsweredTableAnswerCol}
                  valueLabels={{
                    unknown: WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnswerValueUnknown,
                    yes: WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnswerValueYes,
                    no: WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnswerValueNo,
                    empty: WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefAnswerValueEmpty,
                  }}
                />
              </details>
            ) : null}
          </div>
        </div>
      </Callout>

      <ClientProjectContextPanel
        auditId={draftAuditId}
        briefSyncKey={clientProjectContextSyncKey}
        clientStep0Basics={{ industry, industrySpecify }}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onBackToStep1}
          className="glc-touch-target flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-tertiary)] sm:min-h-0 sm:min-w-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {WORKSPACE_PAGE_COPY.newAudit.step2.navigationBackText}
        </button>
        <button
          type="button"
          onClick={onGoToStep3}
          className="glc-touch-target flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--gradient-brand-cta)] py-3 text-sm font-semibold text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)] sm:min-h-0 sm:py-2.5"
        >
          {WORKSPACE_PAGE_COPY.newAudit.step2.navigationContinueToLaunchText}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {clientDraftSaveSection}
    </motion.div>
  );
}
