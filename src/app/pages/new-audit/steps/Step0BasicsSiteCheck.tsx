import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';

import { ClientProjectContextPanel } from '../../../components/ClientProjectContextPanel';
import { SectionLabel } from '../../../components/glc/SectionLabel';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { cn } from '../../../components/ui/utils';

const copy = WORKSPACE_PAGE_COPY.newAudit.step0SiteCheck;

export function Step0BasicsSiteCheck(props: {
  draftAuditId: string | null;
  industry: string;
  industrySpecify: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      key="step0-site-check"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28 }}
    >
      <div className="ds-new-audit-step0-page-header">
        <SectionLabel accent>{WORKSPACE_PAGE_COPY.newAudit.step0.sectionLabel}</SectionLabel>
        <h1 className="ds-new-audit-step0-title text-foreground mt-2 font-bold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-muted-foreground m-0 mt-2 max-w-2xl text-sm leading-relaxed">
          {copy.lead}
        </p>
        <p className="text-muted-foreground/90 m-0 mt-2 max-w-2xl text-xs leading-relaxed">
          {copy.lighthouseStaleNote}
        </p>
      </div>

      <div className="glc-card ds-new-audit-step0-form">
        <ClientProjectContextPanel
          auditId={props.draftAuditId}
          briefSyncKey=""
          refetchIntervalMs={2500}
          variant="site_check"
          clientStep0Basics={{ industry: props.industry, industrySpecify: props.industrySpecify }}
        />
        <div className="glc-divider" />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={props.onBack}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/70 bg-transparent px-4 py-3 text-sm font-medium text-foreground sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden />
            {copy.backToEditButton}
          </button>
          <button
            type="button"
            onClick={props.onContinue}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold sm:w-auto',
              'bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)]',
            )}
          >
            {copy.continueToBriefButton}
            <ArrowRight className="h-4 w-4 shrink-0" weight="bold" aria-hidden />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
