import { motion } from 'motion/react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Lightning, Rocket, Warning } from '@phosphor-icons/react';
import type { DomainKey, AuditCoveragePackage } from '../../../data/auditTypes';
import { coveragePackageLabel } from '../../../lib/audit-execution-plan';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';

export type Step2ConfirmProps = {
  url: string;
  name: string;
  industry: string;
  coveragePackage: AuditCoveragePackage;
  selectedDomains: DomainKey[];

  answeredRequired: number;
  pipelineRequiredTotal: number;

  error: string | null;
  loading: boolean;
  isClientSelfServe: boolean;

  onBackToStep1: () => void;
  onLaunchSubmit: (e: FormEvent) => void | Promise<void>;

  clientDraftSaveSection: ReactNode;
};

export function Step2Confirm({
  url,
  name,
  industry,
  coveragePackage,
  selectedDomains,
  answeredRequired,
  pipelineRequiredTotal,
  error,
  loading,
  isClientSelfServe,
  onBackToStep1,
  onLaunchSubmit,
  clientDraftSaveSection,
}: Step2ConfirmProps) {
  return (
    <motion.form
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.28 }}
      onSubmit={onLaunchSubmit}
      className="glc-card p-4 mobile:p-5 sm:p-6 space-y-5"
      style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="text-center mb-2">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--gradient-brand)', boxShadow: '0 6px 20px rgba(28,189,255,0.30)' }}
        >
          <Rocket className="w-6 h-6" style={{ color: 'var(--primary-foreground)' }} />
        </div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>{WORKSPACE_PAGE_COPY.newAudit.step2.readyToLaunchTitle}</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 6 }}>{WORKSPACE_PAGE_COPY.newAudit.step2.readyToLaunchSubtitle}</p>
        {isClientSelfServe && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-quaternary)', marginTop: 10, lineHeight: 1.5 }}>
            {WORKSPACE_PAGE_COPY.newAudit.step2.afterReconPauseText}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        {[
          [WORKSPACE_PAGE_COPY.newAudit.step2.summaryWebsiteLabel, url],
          name ? [WORKSPACE_PAGE_COPY.newAudit.step2.summaryCompanyLabel, name] : null,
          industry ? [WORKSPACE_PAGE_COPY.newAudit.step2.summaryIndustryLabel, industry] : null,
          [WORKSPACE_PAGE_COPY.newAudit.step2.summaryCoverageLabel, `${coveragePackageLabel(coveragePackage)} · ${selectedDomains.length} domain(s)`],
          [WORKSPACE_PAGE_COPY.newAudit.step2.summaryBriefLabel, `${answeredRequired}/${pipelineRequiredTotal} required answered`],
        ]
          .filter((row): row is [string, string] => row != null)
          .map(([label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 90, paddingTop: 1 }}>{label}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</span>
            </div>
          ))}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--callout-error-bg)', border: '1px solid var(--callout-error-border)', color: 'var(--score-1)' }}>
          <Warning className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onBackToStep1}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm glc-touch-target sm:min-h-0 sm:min-w-0"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {WORKSPACE_PAGE_COPY.newAudit.step2.navigationBackText}
        </button>
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={!loading ? { scale: 1.015 } : {}}
          whileTap={!loading ? { scale: 0.985 } : {}}
          className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-semibold glc-touch-target sm:min-h-0"
          style={{ background: 'var(--gradient-accent)', color: 'var(--primary-foreground)', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 14px rgba(242,79,29,0.30)' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {WORKSPACE_PAGE_COPY.newAudit.step2.launchStartingText}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lightning className="w-4 h-4" /> {WORKSPACE_PAGE_COPY.newAudit.step2.launchAuditText}
            </span>
          )}
        </motion.button>
      </div>

      {clientDraftSaveSection}
    </motion.form>
  );
}

