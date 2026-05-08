import { motion } from 'motion/react';
import { Globe, ArrowRight, CaretDown } from '@phosphor-icons/react';
import { useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';

import { SectionLabel } from '../../../components/glc/SectionLabel';
import { Callout } from '../../../components/ui/callout';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { FormField } from '../../../components/ui/form-field';
import { NEW_AUDIT_COVERAGE_DOMAIN_PILLS } from '../new-audit-coverage-pills';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { INDUSTRY_OPTIONS, type IndustryOption } from '../../../data/industry-options';
import { AUDIT_COVERAGE_PACKAGES, type AuditCoveragePackage, type DomainKey, type BriefResponseSource } from '../../../data/auditTypes';
import type { BriefResponses } from '../../../data/briefQuestions';
import {
  NEW_AUDIT_COVERAGE_DOMAIN_COUNT_HINT,
  NEW_AUDIT_COVERAGE_DOMAIN_LABELS,
  NEW_AUDIT_COVERAGE_SELECTION_LIMITS,
} from '../../../config/new-audit-coverage-policy';
import { coveragePackageLabel } from '../../../lib/audit-execution-plan';
import { cn } from '../../../components/ui/utils';
import { Input } from '../../../../design-system/ui';

export type Step0BasicsProps = {
  step0Valid: boolean;
  coverageValid: boolean;
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
  coveragePackage: AuditCoveragePackage | null;
  setCoveragePackage: Dispatch<SetStateAction<AuditCoveragePackage | null>>;
  selectedDomains: DomainKey[];
  toggleDomainSelection: (domain: DomainKey) => void;
  recommendedDomains: DomainKey[];

  // Actions
  onContinue: () => void | Promise<void>;
  /** Disables the primary button while the parent runs create-audit / DPA. */
  continuePending?: boolean;
  clientDraftSaveSection: ReactNode;

  // Interview mode + pre-brief
  interviewMode: boolean;
  setInterviewMode: Dispatch<SetStateAction<boolean>>;
  onOpenPreBrief: () => void;
};

export function Step0Basics({
  step0Valid,
  coverageValid,
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
  recommendedDomains: _recommendedDomains,

  onContinue,
  continuePending = false,
  clientDraftSaveSection,

  interviewMode,
  setInterviewMode,
  onOpenPreBrief,
}: Step0BasicsProps) {
  const [coverageOpen, setCoverageOpen] = useState(() => isClientSelfServe);

  useEffect(() => {
    if (!coverageValid) {
      setCoverageOpen(true);
    }
  }, [coverageValid]);

  const domainWord =
    selectedDomains.length === 1
      ? WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureDomainWordOne
      : WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureDomainWordMany;
  const coverageSummaryLine =
    coveragePackage == null
      ? WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureSummaryPendingClient
      : `${coveragePackageLabel(coveragePackage)}${WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureSummarySeparator}${selectedDomains.length} ${domainWord}`;
  const disclosureHint =
    isClientSelfServe && coveragePackage == null
      ? WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureCollapsedHintClient
      : WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureCollapsedHint;

  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28 }}
    >
      <div className="ds-new-audit-step0-page-header">
        <SectionLabel accent>{WORKSPACE_PAGE_COPY.newAudit.step0.sectionLabel}</SectionLabel>
        <h1 className="ds-new-audit-step0-title text-foreground mt-2 font-bold tracking-tight">
          {WORKSPACE_PAGE_COPY.newAudit.newAuditTitle}
        </h1>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          if (!step0Valid || !coverageValid || continuePending) {
            return;
          }
          void Promise.resolve(onContinue());
        }}
        className="glc-card ds-new-audit-step0-form"
      >
        <div className="ds-new-audit-step0-basics-stack">
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
              className="ds-new-audit-step0-url-field"
              data-url-state={noPublicWebsite ? 'disabled' : url.trim() ? 'filled' : 'default'}
            >
              <div className="ds-new-audit-step0-url-addon" aria-hidden>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
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
                placeholder={WORKSPACE_PAGE_COPY.newAudit.step0.companyWebsitePlaceholder}
                required={!noPublicWebsite}
                disabled={noPublicWebsite}
                autoFocus
                className="ds-new-audit-step0-url-input h-auto min-h-9 border-0 bg-transparent shadow-none"
              />
            </div>
            <label className="ds-new-audit-step0-no-site-row">
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
            requiredMark
          >
            <Input
              id="cname"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={WORKSPACE_PAGE_COPY.newAudit.step0.companyNamePlaceholder}
              required
              className="glc-field-control h-auto w-full min-h-10 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </FormField>

          {/* Industry */}
          <FormField
            htmlFor="industry"
            label={WORKSPACE_PAGE_COPY.newAudit.step0.industryLabel}
            requiredMark
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
              required
            >
              <option value="">{WORKSPACE_PAGE_COPY.newAudit.step0.industrySelectPlaceholder}</option>
              {INDUSTRY_OPTIONS.map((i: IndustryOption) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            {industry === 'Other' && (
              <div className="ds-new-audit-step0-industry-other-nested">
                <FormField
                  htmlFor="industry-specify"
                  label={WORKSPACE_PAGE_COPY.newAudit.step0.industryOtherLabel}
                  requiredMark
                >
                  <Input
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
                    className="glc-field-control h-auto w-full min-h-10 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  <p className="text-muted-foreground m-0 text-xs">
                    {WORKSPACE_PAGE_COPY.newAudit.step0.industryOtherRequiredNote}
                  </p>
                </FormField>
              </div>
            )}
          </FormField>
        </div>

        {/* Coverage — progressive disclosure (defaults stay valid while collapsed) */}
        <div className="ds-new-audit-step0-coverage-region">
          <Collapsible open={coverageOpen} onOpenChange={setCoverageOpen}>
            <CollapsibleTrigger
              type="button"
              className="ds-new-audit-coverage-disclosure-trigger"
            >
              <div className="ds-new-audit-coverage-disclosure-trigger-text">
                <span className="ds-new-audit-coverage-disclosure-title">
                  {WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureTitle}
                </span>
                <span className="ds-new-audit-coverage-disclosure-summary">
                  {coverageSummaryLine}
                </span>
                <span className="ds-new-audit-coverage-disclosure-hint">
                  {disclosureHint}
                </span>
              </div>
              <CaretDown className="ds-new-audit-coverage-disclosure-caret" weight="bold" aria-hidden />
            </CollapsibleTrigger>
            <CollapsibleContent className="ds-new-audit-coverage-disclosure-content">
              {isClientSelfServe && coveragePackage == null && (
                <p className="ds-new-audit-coverage-choose-package-hint">
                  {WORKSPACE_PAGE_COPY.newAudit.step0.coverageDisclosureChoosePackageHint}
                </p>
              )}
              <div className="ds-new-audit-coverage-package-layer">
                <p className="ds-new-audit-coverage-package-heading">
                  {WORKSPACE_PAGE_COPY.newAudit.step0.coveragePackageLabel}
                </p>
                <div className="ds-new-audit-coverage-package-grid">
                  {AUDIT_COVERAGE_PACKAGES.map(pkg => {
                    const sel = coveragePackage === pkg;
                    return (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => setCoveragePackage(pkg)}
                        className="ds-new-audit-coverage-package-option"
                        data-selected={sel ? 'true' : 'false'}
                      >
                        <span className="ds-new-audit-coverage-package-option-title">
                          {coveragePackageLabel(pkg)}
                        </span>
                        <span className="ds-new-audit-coverage-package-option-hint">
                          {NEW_AUDIT_COVERAGE_DOMAIN_COUNT_HINT[pkg]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {coveragePackage != null && (
                <div className="ds-new-audit-coverage-domains-layer">
                  <p className="ds-new-audit-coverage-domains-heading">
                    {WORKSPACE_PAGE_COPY.newAudit.step0.coverageDomainsSectionLabel}
                  </p>
                  <p className="ds-new-audit-coverage-domains-hint">
                    {WORKSPACE_PAGE_COPY.newAudit.step0.coverageDomainsSectionHint}
                  </p>
                  <div
                    role="group"
                    aria-label={WORKSPACE_PAGE_COPY.newAudit.step0.coverageDomainsGroupAriaLabel}
                    className="ds-new-audit-coverage-pill-row"
                  >
                    {NEW_AUDIT_COVERAGE_DOMAIN_PILLS.map(({ domain, Icon }) => {
                      const selected = selectedDomains.includes(domain);
                      const disabled =
                        coveragePackage === 'complete' ||
                        (coveragePackage === 'starter' && selected && selectedDomains.length === NEW_AUDIT_COVERAGE_SELECTION_LIMITS.starter.min) ||
                        (coveragePackage === 'pro' && !selected && selectedDomains.length >= NEW_AUDIT_COVERAGE_SELECTION_LIMITS.pro.max);
                      return (
                        <button
                          key={domain}
                          type="button"
                          disabled={disabled}
                          aria-pressed={selected}
                          data-selected={selected ? 'true' : 'false'}
                          onClick={() => toggleDomainSelection(domain)}
                          className="ds-new-audit-coverage-pill"
                        >
                          <Icon className="ds-new-audit-coverage-pill-icon" aria-hidden />
                          <span className="ds-new-audit-coverage-pill-label">{NEW_AUDIT_COVERAGE_DOMAIN_LABELS[domain]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="glc-divider" />

        <motion.button
          type="submit"
          disabled={!step0Valid || !coverageValid || continuePending}
          whileHover={step0Valid && coverageValid && !continuePending ? { scale: 1.015 } : {}}
          whileTap={step0Valid && coverageValid && !continuePending ? { scale: 0.985 } : {}}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold',
            step0Valid && coverageValid && !continuePending
              ? 'bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)]'
              : 'bg-muted text-muted-foreground cursor-not-allowed border',
          )}
        >
          <span>{WORKSPACE_PAGE_COPY.newAudit.step0.continueToBriefButton}</span>
          <ArrowRight className="h-4 w-4 shrink-0" weight="bold" aria-hidden />
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

