import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowsClockwise, CaretDoubleRight } from '@phosphor-icons/react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { AnimatePresence, motion } from 'motion/react';
import { Link, Navigate } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { StatusPill } from '../../components/glc/StatusPill';
import { useAudit } from '../../hooks/useAudit';
import { useIntakeBankMetrics } from '../../hooks/useIntakeWizard';
import { AUDIT_WORKSPACE_COPY } from '../../config/audit-workspace-copy.en';
import { DOMAIN_LABELS, INTAKE_BRIEF_SLA_PRODUCT_MODE } from '../../data/auditTypes';
import type { IntakeVersionTuple } from '../../data/auditTypes';
import type { BriefResponses } from '../../data/briefQuestions';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import { useIsMobile } from '../../components/ui/use-mobile';
import { cn } from '../../components/ui/utils';
import { useAuditWorkspaceBriefAutosave } from './hooks/useAuditWorkspaceBriefAutosave';
import {
  useAuditWorkspaceRouteParams,
  useAuditWorkspaceState,
} from './hooks/useAuditWorkspaceState';
import { useAuditWorkspaceViewModel } from './hooks/useAuditWorkspaceViewModel';
import { AUDIT_WORKSPACE_UI } from './config/ui';
import { WorkspaceSidebar } from './sections/WorkspaceSidebar';
import { DomainHeaderCard } from './sections/DomainHeaderCard';
import { StrengthsSection } from './sections/StrengthsSection';
import { IssuesSection } from './sections/IssuesSection';
import { RecommendationsSection } from './sections/RecommendationsSection';
import { DataGapsSection } from './sections/DataGapsSection';
import { EnrichmentSection } from './sections/EnrichmentSection';
import { Button } from '../../components/ui/button';
import { ExecutionLogPanel } from '../../components/pipeline/ExecutionLogPanel';
import { PIPELINE_UI_COPY } from '../../config/pipeline-ui-copy.en';
import { buildAppRoute } from '../../config/route-paths';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { CoalitionChainView } from '../../components/CoalitionChainView';
import { ConflictMatrix } from '../../components/ConflictMatrix';

export function AuditWorkspaceScreen() {
  const { id, domainId } = useAuditWorkspaceRouteParams();
  const isMobile = useIsMobile();
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const layout = AUDIT_WORKSPACE_UI.layout;
  const { audit, loading, error, reload } = useAudit(id);
  const state = useAuditWorkspaceState(audit, domainId, id);
  const { visibleDomainKeys, domainData, followupQuestions, overallScore, companyName } =
    useAuditWorkspaceViewModel(audit, state.activeDomain);

  const intakeVersions = audit?.brief?.intake_versions as IntakeVersionTuple | null | undefined;
  const { workspaceSavedFlash, enrichSaved, queueWorkspaceSave, queueFollowupBriefSave } =
    useAuditWorkspaceBriefAutosave({
      id,
      intakeVersions,
      reload,
    });

  const [workspaceBriefResponses, setWorkspaceBriefResponses] = useState<BriefResponses>({});

  useEffect(() => {
    setWorkspaceBriefResponses((audit?.brief?.responses as BriefResponses) ?? {});
  }, [audit?.meta?.id, audit?.brief?.responses, audit?.brief?.updated_at]);
  const briefCollectionMode = audit?.brief?.collection_mode;
  const workspaceConsultantSurface =
    briefCollectionMode === 'discovery' ? undefined : 'consultant_interview';
  const bankMetrics = useIntakeBankMetrics(
    workspaceBriefResponses,
    briefCollectionMode,
    workspaceConsultantSurface,
    INTAKE_BRIEF_SLA_PRODUCT_MODE,
  );

  if (loading && !audit) {
    return (
      <AppShell title={AUDIT_WORKSPACE_COPY.shell.title} subtitle={AUDIT_WORKSPACE_COPY.shell.loadingSubtitle}>
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="text-info h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={AUDIT_WORKSPACE_COPY.shell.title} subtitle={AUDIT_WORKSPACE_COPY.shell.errorSubtitle}>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{error || AUDIT_WORKSPACE_COPY.shell.notFound}</p>
        </div>
      </AppShell>
    );
  }

  if (audit.meta.status === 'created' && id) {
    return <Navigate to={buildAppRoute.auditNewResumeDraft(id)} replace />;
  }

  const domainEntries = visibleDomainKeys
    .map(key => audit.domains[key])
    .filter(entry => entry != null && entry.score != null);

  const workspaceSidebar = (
    <WorkspaceSidebar
      id={id}
      audit={audit}
      overallScore={overallScore}
      domainCount={domainEntries.length}
      briefPanelOpen={state.briefPanelOpen}
      setBriefPanelOpen={state.setBriefPanelOpen}
      briefLayoutChoice={state.briefLayoutChoice}
      selectBriefLayout={state.selectBriefLayout}
      clearBriefLayout={state.clearBriefLayout}
      workspaceBriefResponses={workspaceBriefResponses}
      workspaceBriefSavedFlash={workspaceSavedFlash}
      onWizardResponsesChange={next => {
        setWorkspaceBriefResponses(next);
        queueWorkspaceSave(next);
      }}
      onFieldChange={(qid, value) => {
        setWorkspaceBriefResponses(prev => {
          const next = { ...prev, [qid]: { value, source: 'consultant' as const } };
          queueWorkspaceSave(next);
          return next;
        });
      }}
      onFieldUnknown={qid => {
        setWorkspaceBriefResponses(prev => {
          const next = { ...prev, [qid]: { value: null, source: 'unknown' as const } };
          queueWorkspaceSave(next);
          return next;
        });
      }}
      visibleDomainKeys={visibleDomainKeys}
      activeDomain={state.activeDomain}
      setActiveDomain={state.setActiveDomain}
      resetOpenRecommendation={() => state.setOpenRec(null)}
      workspaceConsultantSurface={workspaceConsultantSurface}
      bankMetrics={bankMetrics}
      fillParentWidth={!isMobile}
      onRequestCollapse={
        isMobile ? undefined : () => {
          sidebarPanelRef.current?.collapse();
        }
      }
    />
  );

  const workspaceMain = (
    <div
      className={cn(
        'ds-audit-workspace-main relative min-h-0 overflow-y-auto',
        isMobile ? 'flex-1' : 'h-full min-w-0',
      )}
    >
      {sidebarCollapsed && !isMobile ? (
        <button
          type="button"
          onClick={() => {
            sidebarPanelRef.current?.expand(layout.sidebarPanelMinSizePct);
          }}
          className="absolute left-2 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          aria-label={AUDIT_WORKSPACE_COPY.sidebar.expandSidebar}
        >
          <CaretDoubleRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      <AnimatePresence mode="wait">
        {domainData ? (
          <motion.div
            key={state.activeDomain}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{
              duration: AUDIT_WORKSPACE_UI.transitions.contentFadeDuration,
              ease: AUDIT_WORKSPACE_UI.transitions.panelEase,
            }}
            className={`${AUDIT_WORKSPACE_UI.layout.contentMaxWidthClass} mx-auto ds-pattern-page-shell-body space-y-6`}
          >
            <DomainHeaderCard activeDomain={state.activeDomain} domainData={domainData} />
            {APP_FEATURE_FLAGS.coalitionProtocolEnabled ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <CoalitionChainView coalition={audit.coalition} />
                <ConflictMatrix resolution={audit.coalition?.conflict_resolution} />
              </div>
            ) : null}
            <StrengthsSection domainData={domainData} />
            <IssuesSection domainData={domainData} />
            <EnrichmentSection
              id={id}
              domainData={domainData}
              activeDomain={state.activeDomain}
              followupQuestions={followupQuestions}
              enrichOpen={state.enrichOpen}
              setEnrichOpen={state.setEnrichOpen}
              enrichSaved={enrichSaved}
              briefResponses={workspaceBriefResponses}
              queueFollowupSave={(qid, value, source, base) => {
                const next = {
                  ...base,
                  [qid]: { value, source: source ?? 'consultant' },
                };
                setWorkspaceBriefResponses(next);
                queueFollowupBriefSave(qid, value, source ?? 'consultant', next);
              }}
            />
            <RecommendationsSection
              domainData={domainData}
              openRec={state.openRec}
              setOpenRec={state.setOpenRec}
            />
            <DataGapsSection domainData={domainData} />
            <ExecutionLogPanel auditId={id} title={PIPELINE_UI_COPY.executionLogTitles.auditWorkspace} compact />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-64"
          >
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                {AUDIT_WORKSPACE_COPY.emptyDomain.title}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {AUDIT_WORKSPACE_COPY.emptyDomain.hint}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <AppShell
      title={AUDIT_WORKSPACE_COPY.shell.title}
      subtitle={`${companyName} · ${domainData ? DOMAIN_LABELS[state.activeDomain] : AUDIT_WORKSPACE_COPY.shell.selectDomain}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill
            status={
              audit.meta.status === 'completed'
                ? 'completed'
                : audit.meta.status === 'cancelled'
                  ? 'cancelled'
                  : 'running'
            }
          />
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={`/reports/${id}`}>
              {AUDIT_WORKSPACE_COPY.shell.openReport} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      }
    >
      {isMobile ? (
        <div className="flex ds-audit-workspace-main-h">
          {workspaceSidebar}
          {workspaceMain}
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="ds-audit-workspace-main-h"
          autoSaveId={layout.sidebarLayoutAutoSaveId}
          onLayout={sizes => {
            const left = sizes[0];
            if (left === undefined) return;
            setSidebarCollapsed(left <= 1);
          }}
        >
          <ResizablePanel
            ref={sidebarPanelRef}
            id="audit-workspace-sidebar"
            order={1}
            defaultSize={layout.sidebarPanelDefaultSizePct}
            minSize={layout.sidebarPanelMinSizePct}
            maxSize={layout.sidebarPanelMaxSizePct}
            collapsible
            collapsedSize={layout.sidebarPanelCollapsedSizePct}
            onCollapse={() => setSidebarCollapsed(true)}
            onExpand={() => setSidebarCollapsed(false)}
            className="min-w-0"
          >
            <div className="flex h-full min-h-0 flex-col">{workspaceSidebar}</div>
          </ResizablePanel>
          <ResizableHandle
            aria-label={AUDIT_WORKSPACE_COPY.sidebar.resizeHandle}
            title={AUDIT_WORKSPACE_COPY.sidebar.resizeHint}
            className="w-1.5 bg-[var(--border-subtle)] after:w-1.5"
          />
          <ResizablePanel
            id="audit-workspace-main"
            order={2}
            defaultSize={100 - layout.sidebarPanelDefaultSizePct}
            minSize={layout.sidebarPanelRightMinSizePct}
            className="min-w-0"
          >
            <div className="flex h-full min-h-0 flex-col">{workspaceMain}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </AppShell>
  );
}
