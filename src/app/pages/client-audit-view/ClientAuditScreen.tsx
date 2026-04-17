import { useEffect } from 'react';
import { ArrowLeft, Spinner, Warning } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { UI_SEMANTIC_COLORS } from '../../config/ui-semantic-colors';
import { CLIENT_AUDIT_VIEW_COPY } from '../../config/client-audit-view-copy';
import { useClientPortalPipeline } from '../../context/ClientPortalPipelineContext';
import { getGlcQueryClient } from '../../lib/glc-query-client';
import { invalidateAuditRelatedQueries } from '../../lib/glc-invalidate-queries';
import { useClientAuditActions } from './hooks/useClientAuditActions';
import { useClientAuditData } from './hooks/useClientAuditData';
import { ClientBriefSection } from './sections/ClientBriefSection';
import { AuditHeaderCard } from './sections/AuditHeaderCard';
import { RunAuditSection } from './sections/RunAuditSection';
import { BriefHelpSection } from './sections/BriefHelpSection';
import { SnapshotUpgradeSection } from './sections/SnapshotUpgradeSection';
import { NavigationLinksSection } from './sections/NavigationLinksSection';

export function ClientAuditScreen({ auditId }: { auditId: string }) {
  const {
    auditState,
    meta,
    loading,
    error,
    isCreated,
    isFreeSnapshot,
    canStart,
    canViewPipeline,
    snapshotPreview,
    freeSnapshotAccess,
    domain,
    statusLabel,
    portalSubtitle,
  } = useClientAuditData(auditId);
  const {
    startError,
    starting,
    handleStart,
    helpMessage,
    setHelpMessage,
    helpBusy,
    helpOk,
    helpError,
    handleHelp,
    upgradeCoveragePackage,
    setUpgradeCoveragePackage,
    upgradeBusy,
    upgradeError,
    handleUpgradeFromSnapshot,
  } = useClientAuditActions(auditId);
  const { setPipelineAccess } = useClientPortalPipeline();

  useEffect(() => {
    if (!meta) {
      setPipelineAccess(auditId, false);
      return;
    }
    setPipelineAccess(auditId, canViewPipeline);
    return () => setPipelineAccess(null, false);
  }, [auditId, canViewPipeline, meta, setPipelineAccess]);

  return (
    <AppShell
      title={domain || CLIENT_AUDIT_VIEW_COPY.shell.fallbackTitle}
      subtitle={portalSubtitle}
      actions={
        <Link to="/portal" className="hidden sm:inline-flex items-center gap-1.5 text-sm no-underline" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          {CLIENT_AUDIT_VIEW_COPY.shell.backToPortal}
        </Link>
      }
    >
      <div className="glc-page-content max-w-2xl mx-auto space-y-4 mobile:space-y-3">
        <Link to="/portal" className="sm:hidden inline-flex items-center gap-1.5 text-sm font-medium no-underline glc-touch-target -mt-1" style={{ color: 'var(--glc-blue)' }}>
          <ArrowLeft className="w-4 h-4" />
          {CLIENT_AUDIT_VIEW_COPY.shell.backToPortal}
        </Link>
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: UI_SEMANTIC_COLORS.dangerMutedBg, border: UI_SEMANTIC_COLORS.dangerBorder20, color: UI_SEMANTIC_COLORS.danger }}>
            <Warning className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && auditState && meta && (
          <div className="space-y-5">
            <AuditHeaderCard domain={domain} meta={meta} statusLabel={statusLabel} />

            {isCreated && (
              <>
                <ClientBriefSection
                  auditId={auditId}
                  onBriefSaved={() => invalidateAuditRelatedQueries(getGlcQueryClient(), auditId)}
                />

                {startError && (
                  <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: UI_SEMANTIC_COLORS.dangerMutedBg, border: UI_SEMANTIC_COLORS.dangerBorder20, color: UI_SEMANTIC_COLORS.danger }}>
                    <Warning className="w-4 h-4 flex-shrink-0" />
                    {startError}
                  </div>
                )}

                <RunAuditSection canStart={canStart} starting={starting} onStart={() => void handleStart()} />

                <BriefHelpSection
                  helpMessage={helpMessage}
                  setHelpMessage={setHelpMessage}
                  helpError={helpError}
                  helpOk={helpOk}
                  helpBusy={helpBusy}
                  onHelp={() => void handleHelp()}
                />
              </>
            )}

            {!isCreated && meta.status === 'completed' && isFreeSnapshot && (
              <SnapshotUpgradeSection
                snapshotPreview={snapshotPreview}
                freeSnapshotAccess={freeSnapshotAccess}
                upgradeCoveragePackage={upgradeCoveragePackage}
                setUpgradeCoveragePackage={setUpgradeCoveragePackage}
                upgradeBusy={upgradeBusy}
                upgradeError={upgradeError}
                onUpgrade={handleUpgradeFromSnapshot}
              />
            )}

            <NavigationLinksSection
              auditId={auditId}
              canViewPipeline={canViewPipeline}
              isCreated={isCreated}
              isFreeSnapshot={isFreeSnapshot}
              isCompleted={meta.status === 'completed'}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
