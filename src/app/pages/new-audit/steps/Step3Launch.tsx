import { motion } from 'motion/react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Lightning, Rocket, Warning } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
import { Callout } from '../../../components/ui/callout';
import { cn } from '../../../components/ui/utils';

export type Step3LaunchProps = {
  error: string | null;
  loading: boolean;
  isClientSelfServe: boolean;

  consultantDpaLoading: boolean;
  consultantDpaOnFile: boolean;
  consultantDpaChecked: boolean;
  onConsultantDpaCheckedChange: (next: boolean) => void;

  onBackToStep2: () => void;
  onLaunchSubmit: (e: FormEvent) => void | Promise<void>;

  clientDraftSaveSection: ReactNode;
};

export function Step3Launch({
  error,
  loading,
  isClientSelfServe,
  consultantDpaLoading,
  consultantDpaOnFile,
  consultantDpaChecked,
  onConsultantDpaCheckedChange,
  onBackToStep2,
  onLaunchSubmit,
  clientDraftSaveSection,
}: Step3LaunchProps) {
  const launchBlockedByDpa =
    !isClientSelfServe && !consultantDpaLoading && !consultantDpaOnFile && !consultantDpaChecked;

  return (
    <motion.form
      key="step3-launch"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.28 }}
      onSubmit={onLaunchSubmit}
      className="glc-card space-y-5 rounded-[var(--radius-2xl)] p-4 shadow-[var(--shadow-lg)] mobile:p-5 sm:p-6"
    >
      <div className="text-center mb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gradient-brand)] shadow-[var(--shadow-snapshot-cta-active)]">
          <Rocket className="h-6 w-6 text-[var(--on-gradient-brand-fg)]" />
        </div>
        <h2 className="text-[length:var(--text-xl)] font-bold text-[var(--text-primary)]">{WORKSPACE_PAGE_COPY.newAudit.step2.readyToLaunchTitle}</h2>
        <p className="mt-[length:var(--space-1-5)] text-[length:var(--text-sm)] text-[var(--text-tertiary)]">{WORKSPACE_PAGE_COPY.newAudit.step2.readyToLaunchSubtitle}</p>
        {isClientSelfServe && (
          <p className="mt-[length:var(--space-2-5)] text-[length:var(--text-xs)] leading-[1.5] text-[var(--text-quaternary)]">
            {WORKSPACE_PAGE_COPY.newAudit.step2.afterLaunchPauseNoteClient}
          </p>
        )}
      </div>

      {error && (
        <Callout intent="danger">
          <div className="flex items-center gap-2.5 text-sm text-[var(--score-1)]">
            <Warning className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        </Callout>
      )}

      {!isClientSelfServe && (
        <Callout intent="neutral" className="space-y-3 rounded-xl p-4">
          <div>
            <p className="m-0 text-sm font-medium text-[var(--text-primary)]">
              {WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantTitle}
            </p>
            <p className="mt-1.5 m-0 text-xs leading-relaxed text-[var(--text-tertiary)]">
              {WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantIntro}
            </p>
          </div>
          {consultantDpaLoading ? (
            <p className="m-0 text-xs text-[var(--text-quaternary)]">
              {WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantLoadingLegal}
            </p>
          ) : consultantDpaOnFile ? (
            <p className="m-0 text-xs text-[var(--text-secondary)]">{WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantOnFile}</p>
          ) : (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                className="glc-auth-signup-legal-checkbox mt-0.5"
                checked={consultantDpaChecked}
                onChange={event => onConsultantDpaCheckedChange(event.target.checked)}
                aria-required
                aria-label={WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantLinkLabel}
              />
              <span>
                {WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantCheckboxPrefix}
                <Link to={APP_ROUTE_PATHS.legalDpa} className="ds-marketing-inline-link-accent" target="_blank" rel="noreferrer">
                  {WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantLinkLabel}
                </Link>
                {WORKSPACE_PAGE_COPY.newAudit.step2.dpaConsultantCheckboxSuffix}
              </span>
            </label>
          )}
        </Callout>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onBackToStep2}
          className="glc-touch-target flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-transparent px-4 py-2.5 text-sm text-[var(--text-tertiary)] sm:min-h-0 sm:min-w-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {WORKSPACE_PAGE_COPY.newAudit.step2.navigationBackText}
        </button>
        <motion.button
          type="submit"
          disabled={loading || consultantDpaLoading || launchBlockedByDpa}
          whileHover={!loading && !consultantDpaLoading && !launchBlockedByDpa ? { scale: 1.015 } : {}}
          whileTap={!loading && !consultantDpaLoading && !launchBlockedByDpa ? { scale: 0.985 } : {}}
          className={cn(
            'glc-touch-target flex flex-1 items-center justify-center gap-2 rounded-lg border-none bg-[var(--gradient-accent)] py-3 text-sm font-semibold text-[var(--on-warm-gradient-fg)] shadow-[var(--shadow-accent-cta)] sm:min-h-0 sm:py-2.5',
            loading || consultantDpaLoading || launchBlockedByDpa ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 animate-spin rounded-full border-2 border-[var(--on-warm-gradient-fg)] border-t-transparent" />
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
