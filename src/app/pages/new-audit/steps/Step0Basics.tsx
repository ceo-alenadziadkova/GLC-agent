import { motion } from 'motion/react';
import { Globe, ArrowRight } from '@phosphor-icons/react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';

import { SectionLabel } from '../../../components/glc/SectionLabel';
import { Callout } from '../../../components/ui/callout';
import { FormField } from '../../../components/ui/form-field';
import { DOMAIN_PILLS } from '..';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { INDUSTRY_OPTIONS, type IndustryOption } from '../../../data/industry-options';
import { AUDIT_COVERAGE_PACKAGES, type AuditCoveragePackage, type DomainKey, type BriefResponseSource } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import {
  NEW_AUDIT_ALL_COVERAGE_DOMAINS,
  NEW_AUDIT_COVERAGE_DOMAIN_COUNT_HINT,
  NEW_AUDIT_COVERAGE_DOMAIN_LABELS,
  NEW_AUDIT_COVERAGE_SELECTION_LIMITS,
} from '../../../config/new-audit-coverage-policy';
import { coveragePackageLabel } from '../../../lib/audit-execution-plan';
import { cn } from '../../../components/ui/utils';

export type Step0BasicsProps = {
  step0Valid: boolean;
  isClientSelfServe: boolean;

  // Step 0 basics
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  noPublicWebsite: boolean;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  industry: string;
  setIndustry: Dispatch<SetStateAction<string>>;
  industrySpecify: string;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;

  // Coverage selection
  coveragePackage: AuditCoveragePackage;
  setCoveragePackage: Dispatch<SetStateAction<AuditCoveragePackage>>;
  selectedDomains: DomainKey[];
  toggleDomainSelection: (domain: DomainKey) => void;
  recommendedDomains: DomainKey[];

  // Actions
  onContinue: () => void;
  clientDraftSaveSection: ReactNode;

  // Interview mode + pre-brief
  interviewMode: boolean;
  setInterviewMode: Dispatch<SetStateAction<boolean>>;
  onOpenPreBrief: () => void;
};

export function Step0Basics({
  step0Valid,
  isClientSelfServe,

  url,
  setUrl,
  noPublicWebsite,
  setNoPublicWebsite,
  name,
  setName,
  industry,
  setIndustry,
  industrySpecify,
  setIndustrySpecify,
  setResponses,

  coveragePackage,
  setCoveragePackage,
  selectedDomains,
  toggleDomainSelection,
  recommendedDomains,

  onContinue,
  clientDraftSaveSection,

  interviewMode,
  setInterviewMode,
  onOpenPreBrief,
}: Step0BasicsProps) {
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28 }}
    >
      {/* Header */}
      <div className="text-center mb-6 mobile:mb-5 sm:mb-8">
        <SectionLabel accent>{WORKSPACE_PAGE_COPY.newAudit.step0.sectionLabel}</SectionLabel>
        <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight sm:text-[length:var(--text-3xl)]">
          {WORKSPACE_PAGE_COPY.newAudit.newAuditTitle}
        </h1>
        <p className="text-muted-foreground mt-2.5 px-1 text-sm leading-relaxed">
          {WORKSPACE_PAGE_COPY.newAudit.newAuditIntro}
        </p>
      </div>

      {/* Domain pills */}
      <motion.div
        className="flex flex-wrap gap-1.5 justify-center mb-7"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }}
      >
        {DOMAIN_PILLS.map(({ icon: I, label }) => (
          <motion.span
            key={label}
            variants={{
              hidden: { opacity: 0, scale: 0.85 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
            }}
            className="text-muted-foreground bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
          >
            <I className="h-3 w-3 text-current" />
            {label}
          </motion.span>
        ))}
      </motion.div>

      {/* Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          if (step0Valid) onContinue();
        }}
        className="glc-card space-y-5 rounded-2xl p-4 shadow-lg mobile:p-5 sm:p-6"
      >
        {/* URL */}
        <FormField
          htmlFor="url"
          label={WORKSPACE_PAGE_COPY.newAudit.step0.companyWebsiteLabel}
          requiredMark={!noPublicWebsite}
          optionalHint={
            noPublicWebsite ? WORKSPACE_PAGE_COPY.newAudit.step0.skippedLabel : undefined
          }
        >
          <div
            className={cn(
              'bg-card rounded-lg border transition-colors',
              noPublicWebsite ? 'border-border opacity-65' : url ? 'border-info shadow-[var(--shadow-blue)]' : 'border-border',
            )}
          >
            <div
              className="bg-muted flex min-w-11 flex-shrink-0 items-center self-stretch justify-center border-r px-3"
            >
              <Globe className="text-muted-foreground h-4 w-4" />
            </div>
            <input
              id="url"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={url}
              onChange={e => {
                setNoPublicWebsite(false);
                setUrl(e.target.value);
              }}
              placeholder="company.com"
              required={!noPublicWebsite}
              disabled={noPublicWebsite}
              autoFocus
              className="text-foreground flex-1 bg-transparent px-4 py-3 text-sm outline-none disabled:cursor-not-allowed"
            />
          </div>
          <label className="text-muted-foreground flex cursor-pointer select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noPublicWebsite}
              onChange={e => {
                const on = e.target.checked;
                setNoPublicWebsite(on);
                if (on) setUrl('');
              }}
              className="accent-info rounded"
            />
            {WORKSPACE_PAGE_COPY.newAudit.step0.noPublicWebsiteLabel}
          </label>
        </FormField>

        {/* Name */}
        <FormField
          htmlFor="cname"
          label={WORKSPACE_PAGE_COPY.newAudit.step0.companyNameLabel}
          optionalHint={WORKSPACE_PAGE_COPY.newAudit.step0.optionalLabel}
        >
          <input
            id="cname"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={WORKSPACE_PAGE_COPY.newAudit.step0.companyNamePlaceholder}
            className="glc-field-control w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
          />
        </FormField>

        {/* Industry */}
        <FormField
          htmlFor="industry"
          label={WORKSPACE_PAGE_COPY.newAudit.step0.industryLabel}
          optionalHint={WORKSPACE_PAGE_COPY.newAudit.step0.industryTailorsRecommendations}
        >
          <select
            id="industry"
            value={industry}
            onChange={e => {
              const v = e.target.value;
              setIndustry(v);
              if (v !== 'Other') {
                setIndustrySpecify('');
                setResponses(prev => {
                  const next = { ...prev };
                  delete next.intake_industry_specify;
                  return next;
                });
              }
            }}
            className={cn(
              'glc-field-control w-full appearance-none rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-[var(--text-sm)] outline-none',
              industry ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <option value="">{WORKSPACE_PAGE_COPY.newAudit.step0.industrySelectPlaceholder}</option>
            {INDUSTRY_OPTIONS.map((i: IndustryOption) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {industry === 'Other' && (
            <div className="space-y-1 pt-1">
              <FormField
                htmlFor="industry-specify"
                label={WORKSPACE_PAGE_COPY.newAudit.step0.industryOtherLabel}
                requiredMark
              >
              <input
                id="industry-specify"
                type="text"
                value={industrySpecify}
                onChange={e => {
                  const t = e.target.value;
                  setIndustrySpecify(t);
                  setResponses(prev => {
                    const next = { ...prev };
                    const trimmed = t.trim();
                    if (trimmed) {
                      next.intake_industry_specify = { value: t, source: 'client' as BriefResponseSource };
                    } else {
                      delete next.intake_industry_specify;
                    }
                    return next;
                  });
                }}
                placeholder={WORKSPACE_PAGE_COPY.newAudit.step0.industryOtherPlaceholder}
                className="glc-field-control w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
              <p className="text-muted-foreground m-0 text-xs">
                {WORKSPACE_PAGE_COPY.newAudit.step0.industryOtherRequiredNote}
              </p>
              </FormField>
            </div>
          )}
        </FormField>

        {/* Coverage selection */}
        <div className="space-y-2">
          <label className="text-foreground block text-sm font-medium">
            {WORKSPACE_PAGE_COPY.newAudit.step0.coveragePackageLabel}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIT_COVERAGE_PACKAGES.map(pkg => {
              const sel = coveragePackage === pkg;
              return (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setCoveragePackage(pkg)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left text-xs transition-all',
                    sel ? 'border-info/50 bg-info/10' : 'bg-muted border-border',
                  )}
                >
                  <div className={cn('font-semibold', sel ? 'text-info' : 'text-foreground')}>
                    {coveragePackageLabel(pkg)}
                  </div>
                  <div className="text-muted-foreground mt-0.5">{NEW_AUDIT_COVERAGE_DOMAIN_COUNT_HINT[pkg]}</div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {NEW_AUDIT_ALL_COVERAGE_DOMAINS.map(domain => {
              const checked = selectedDomains.includes(domain);
              const disabled =
                coveragePackage === 'complete' ||
                (coveragePackage === 'starter' && checked && selectedDomains.length === NEW_AUDIT_COVERAGE_SELECTION_LIMITS.starter.min) ||
                (coveragePackage === 'pro' && !checked && selectedDomains.length >= NEW_AUDIT_COVERAGE_SELECTION_LIMITS.pro.max);
              return (
                <label
                  key={domain}
                  className="bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleDomainSelection(domain)}
                    className="accent-info"
                  />
                  <span className="text-foreground text-xs">{NEW_AUDIT_COVERAGE_DOMAIN_LABELS[domain]}</span>
                </label>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {WORKSPACE_PAGE_COPY.newAudit.step0.recommendedFromIntakeContextPrefix}
            {recommendedDomains.map(d => NEW_AUDIT_COVERAGE_DOMAIN_LABELS[d]).join(', ')}
            {WORKSPACE_PAGE_COPY.newAudit.step0.recommendedFromIntakeContextSuffix}
          </p>
        </div>

        <div className="glc-divider" />

        <motion.button
          type="submit"
          disabled={!step0Valid}
          whileHover={step0Valid ? { scale: 1.015 } : {}}
          whileTap={step0Valid ? { scale: 0.985 } : {}}
          className={cn(
            'w-full rounded-lg py-3 text-sm font-semibold',
            step0Valid
              ? 'bg-gradient-to-r from-sky-400 to-sky-600 text-primary-foreground shadow-[0_4px_14px_rgba(28,189,255,0.28)]'
              : 'bg-muted text-muted-foreground cursor-not-allowed border',
          )}
        >
          {WORKSPACE_PAGE_COPY.newAudit.step0.continueToBriefButton} <ArrowRight className="w-4 h-4" />
        </motion.button>

        {clientDraftSaveSection}

        {!isClientSelfServe && (
          <>
            {/* Interview mode toggle */}
            <Callout intent={interviewMode ? 'warning' : 'neutral'}>
              <label className="flex cursor-pointer select-none items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={interviewMode}
                  onChange={e => setInterviewMode(e.target.checked)}
                  className="accent-warning ds-interview-checkbox-size flex-shrink-0 rounded"
                />
                <div>
                  <span className="text-foreground text-sm font-medium">
                    {WORKSPACE_PAGE_COPY.newAudit.step0.interviewModeLabel}
                  </span>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {interviewMode ? WORKSPACE_PAGE_COPY.newAudit.interviewModeHintOn : WORKSPACE_PAGE_COPY.newAudit.interviewModeHintOff}
                  </p>
                </div>
              </label>
            </Callout>

            <button
              type="button"
              className="text-info w-full bg-transparent pt-2 text-center text-sm"
              onClick={onOpenPreBrief}
            >
              {WORKSPACE_PAGE_COPY.newAudit.step0.sendPreBriefToClientButton}
            </button>
          </>
        )}
      </form>
    </motion.div>
  );
}

