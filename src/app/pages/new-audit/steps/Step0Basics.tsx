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
        <h1
          className="mt-2 text-2xl sm:text-[length:var(--text-3xl)]"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          {WORKSPACE_PAGE_COPY.newAudit.newAuditTitle}
        </h1>
        <p
          className="mt-2.5 px-1"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}
        >
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
        {DOMAIN_PILLS.map(({ icon: I, label, color }) => (
          <motion.span
            key={label}
            variants={{
              hidden: { opacity: 0, scale: 0.85 },
              visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px' }}
          >
            <I className="w-3 h-3" style={{ color }} />
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
        className="glc-card p-4 mobile:p-5 sm:p-6 space-y-5"
        style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
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
            className="flex items-center overflow-hidden"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: noPublicWebsite ? '1px solid var(--border-subtle)' : url ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)',
              boxShadow: !noPublicWebsite && url ? 'var(--shadow-blue)' : 'none',
              backgroundColor: 'var(--bg-surface)',
              opacity: noPublicWebsite ? 0.65 : 1,
              transition: 'border-color var(--ease-fast)',
            }}
          >
            <div
              className="flex items-center justify-center px-3 self-stretch flex-shrink-0"
              style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)', minWidth: 44 }}
            >
              <Globe className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
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
              className="flex-1 px-4 py-3 bg-transparent outline-none disabled:cursor-not-allowed"
              style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={noPublicWebsite}
              onChange={e => {
                const on = e.target.checked;
                setNoPublicWebsite(on);
                if (on) setUrl('');
              }}
              className="rounded border-[var(--border-default)]"
              style={{ accentColor: 'var(--glc-blue)' }}
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
            className="glc-field-control w-full appearance-none rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-[var(--text-sm)] outline-none"
            style={{ color: industry ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
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
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                {WORKSPACE_PAGE_COPY.newAudit.step0.industryOtherRequiredNote}
              </p>
              </FormField>
            </div>
          )}
        </FormField>

        {/* Coverage selection */}
        <div className="space-y-2">
          <label className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
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
                  className="rounded-lg px-3 py-2.5 text-left text-xs transition-all"
                  style={{
                    backgroundColor: sel ? 'var(--callout-info-bg)' : 'var(--bg-inset)',
                    border: sel ? '1px solid var(--callout-info-border-strong)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="font-semibold" style={{ color: sel ? 'var(--glc-blue-deeper)' : 'var(--text-primary)' }}>
                    {coveragePackageLabel(pkg)}
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{NEW_AUDIT_COVERAGE_DOMAIN_COUNT_HINT[pkg]}</div>
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
                  className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2"
                  style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleDomainSelection(domain)}
                    style={{ accentColor: 'var(--glc-blue)' }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{NEW_AUDIT_COVERAGE_DOMAIN_LABELS[domain]}</span>
                </label>
              );
            })}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 6 }}>
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
          className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
          style={{
            borderRadius: 'var(--radius-lg)',
            background: step0Valid ? 'var(--gradient-brand)' : 'var(--bg-muted)',
            color: step0Valid ? 'var(--primary-foreground)' : 'var(--text-secondary)',
            cursor: step0Valid ? 'pointer' : 'not-allowed',
            fontSize: 'var(--text-sm)',
            border: step0Valid ? 'none' : '1px solid var(--border-subtle)',
            boxShadow: step0Valid ? '0 4px 14px rgba(28,189,255,0.28)' : 'none',
          }}
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
                  className="h-[15px] w-[15px] flex-shrink-0 rounded"
                  style={{ accentColor: 'var(--callout-warning-icon)' }}
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {WORKSPACE_PAGE_COPY.newAudit.step0.interviewModeLabel}
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                    {interviewMode ? WORKSPACE_PAGE_COPY.newAudit.interviewModeHintOn : WORKSPACE_PAGE_COPY.newAudit.interviewModeHintOff}
                  </p>
                </div>
              </label>
            </Callout>

            <button
              type="button"
              className="w-full text-center text-sm pt-2"
              style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
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

