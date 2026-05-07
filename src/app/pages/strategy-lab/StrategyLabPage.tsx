import { useMemo, useEffect, useCallback, useId, useState } from 'react';
import { useQueryClient } from '../../lib/tanstack-react-query';
import { useParams, useSearchParams } from 'react-router';
import { AppShell } from '../../components/AppShell';
import { useAudit } from '../../hooks/useAudit';
import { useBrowserOnline } from '../../hooks/useBrowserOnline';
import { useProfile } from '../../hooks/useProfile';
import {
  STRATEGY_LAB_LAYOUT_POLICY,
  STRATEGY_LAB_PAGE_ANCHORS,
} from '../../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { buildAppRoute } from '../../config/route-paths';
import { buildPlanWorkspaceHref } from '../../lib/plan-cross-nav';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../../config/plan-delivery-board-ui';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { applyStrategyLabContextPatchToAuditCache } from '../../lib/strategy-lab-context-cache';
import { StrategyLabOrchestrationPanel } from './StrategyLabOrchestrationPanel';
import { StrategyPlanningChrome } from './StrategyPlanningChrome';
import { api } from '../../data/apiService';
import { toast } from 'sonner';
import { StrategyLabInspectPackScrollBody } from './strategy-lab-inspect-pack-scroll-body';
import { useStrategyJourneyStepStatuses } from '../../hooks/useStrategyJourneyStepStatuses';
import type { StrategyLabOrchestratorTabId } from './StrategyLabOrchestratorListBody';
import { StrategyLabInitiativeEditDrawer } from './StrategyLabInitiativeEditDrawer';
import { Button } from '../../components/ui/button';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { UI_BREAKPOINTS } from '../../config/ui-breakpoints';
import { PlanSummaryRail, type PlanSummaryRailPresentation } from './PlanSummaryRail';
import {
  StrategyLabErrorShell,
  StrategyLabLoadingShell,
  StrategyLabNoStrategyShell,
} from './StrategyLabPageShells';
import { StrategyLabClientOrchestrationNotice } from './StrategyLabClientOrchestrationNotice';
import {
  StrategyLabPlanSummaryDetailBlock,
  StrategyLabPlanSummaryDesktopChrome,
  StrategyLabPlanSummaryFooter,
} from './StrategyLabPlanSummaryPanels';
import { useStrategyConstraints } from '../../hooks/useStrategyConstraints';
import { useDomainBenchmarks } from '../../hooks/useDomainBenchmarks';
import { useOrchestrationFocusScroll } from '../../hooks/useOrchestrationFocusScroll';
import { useStrategyInitiativeEditDrawer } from '../../hooks/useStrategyInitiativeEditDrawer';
import { useStrategyLabReferencePreviews } from '../../hooks/useStrategyLabReferencePreviews';
import { useTablistKeyboardNavigation } from '../../hooks/useTablistKeyboardNavigation';
import type { StrategyLabContextView } from '../../data/audit/contracts/report/report-domain.types';

const ORCHESTRATOR_TAB_ORDER: readonly StrategyLabOrchestratorTabId[] = ['now', 'next', 'dependencies', 'risks'];

export type StrategyLabPlanStudioScrollTarget = 'define' | 'shape-pack' | 'plan-setup';

export type StrategyLabProps = {
  /**
   * When true, render workspace body without {@link AppShell} (used under canonical `/plan?mode=define|shape`).
   */
  embedded?: boolean;
  /** After load, scroll this in-page region into view (Plan studio embed only). */
  planStudioScrollTarget?: StrategyLabPlanStudioScrollTarget | null;
};

export function StrategyLab(props: StrategyLabProps = {}) {
  const { embedded = false, planStudioScrollTarget = null } = props;
  const { id } = useParams<{ id: string }>();
  const isNarrowMobileLayout = useMediaQuery(`(max-width: ${UI_BREAKPOINTS.mobile - 1}px)`);
  const packSummaryStackedLayout = useMediaQuery(
    `(max-width: ${STRATEGY_LAB_LAYOUT_POLICY.packSummarySheetMaxWidthPx - 1}px)`,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { audit, loading, error, reload, isFetching } = useAudit(id);
  const online = useBrowserOnline();
  const loadErrorSummaryId = useId();
  const loadOfflineHintId = useId();
  const constraintOverridesErrorRegionId = useId();
  const { isClient } = useProfile();
  const [orchestratorTab, setOrchestratorTab] = useState<StrategyLabOrchestratorTabId>('now');
  const orchestratorTablistOverviewId = useId();
  const definePhaseHeadingId = useId();
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const { setTabRef: setOrchestratorTabButtonRef, handleTablistKeyDown: onOrchestratorTablistKeyDown } =
    useTablistKeyboardNavigation<StrategyLabOrchestratorTabId>({
      order: ORCHESTRATOR_TAB_ORDER,
      activeKey: orchestratorTab,
      onChange: setOrchestratorTab,
    });

  const {
    initiativeEditOpen,
    initiativeEditBucket,
    initiativeEditTarget,
    setInitiativeEditOpen,
    openInitiativeEditor,
  } = useStrategyInitiativeEditDrawer();

  const glcPackView = useMemo(() => {
    const raw = audit?.strategy?.glc_orchestration_pack;
    return isGlcOrchestrationPackView(raw) ? raw : null;
  }, [audit?.strategy?.glc_orchestration_pack]);

  const journeySteps = useStrategyJourneyStepStatuses(audit);

  const orchestratorPanelAnnouncement = useMemo(() => {
    const meta: Record<StrategyLabOrchestratorTabId, readonly [string, string]> = {
      now: [STRATEGY_LAB_COPY.orchestratorTabs.now, STRATEGY_LAB_COPY.orchestratorTabs.nowDesc],
      next: [STRATEGY_LAB_COPY.orchestratorTabs.next, STRATEGY_LAB_COPY.orchestratorTabs.nextDesc],
      dependencies: [
        STRATEGY_LAB_COPY.orchestratorTabs.dependencies,
        STRATEGY_LAB_COPY.orchestratorTabs.dependenciesDesc,
      ],
      risks: [STRATEGY_LAB_COPY.orchestratorTabs.risks, STRATEGY_LAB_COPY.orchestratorTabs.risksDesc],
    };
    const [title, desc] = meta[orchestratorTab];
    return STRATEGY_LAB_COPY.orchestratorTabs.tabPanelStatusTemplate.replace('{title}', title).replace('{desc}', desc);
  }, [orchestratorTab]);

  const mergeStrategyLabContextInAuditCache = useCallback(
    (strategy_lab_context: StrategyLabContextView) => {
      if (!id) return;
      applyStrategyLabContextPatchToAuditCache(queryClient, id, strategy_lab_context);
    },
    [id, queryClient],
  );

  const handleTogglePreserveBoardIdentity = useCallback(async () => {
    if (!id || !audit?.strategy) return;
    const next = !(audit.strategy.strategy_lab_context?.preserve_board_identity_on_rename === true);
    try {
      const res = await api.patchStrategyLabContext(id, {
        preserve_board_identity_on_rename: next ? true : null,
      });
      mergeStrategyLabContextInAuditCache(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.boardIdentity.saveOk);
      void reload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.boardIdentity.saveFailed);
    }
  }, [audit?.strategy, id, mergeStrategyLabContextInAuditCache, reload]);

  const selectedPackNodeId = searchParams.get('node');

  const {
    constraintStageDraft,
    constraintBudgetDraft,
    constraintTeamDraft,
    constraintSaving,
    constraintOverridesSaveErrorMessage,
    dismissConstraintOverridesSaveError,
    setConstraintStageDraft,
    setConstraintBudgetDraft,
    setConstraintTeamDraft,
    handleSaveConstraintOverrides,
    handleClearConstraintOverrides,
  } = useStrategyConstraints({
    auditId: id,
    strategy: audit?.strategy,
    isClient,
    queryClient,
    reload,
  });

  const domainBenchmarks = useDomainBenchmarks({
    enabled: Boolean(audit?.strategy) && !isClient,
    industry: audit?.meta?.industry,
  });

  const { referencePreviewBenchmarks, referencePreviewConstraints } = useStrategyLabReferencePreviews({
    domainBenchmarks,
    strategy: audit?.strategy,
  });

  useOrchestrationFocusScroll({ searchParams, setSearchParams, isClient });

  useEffect(() => {
    if (!packSummaryStackedLayout || isClient) return;
    const rawPack = audit?.strategy?.glc_orchestration_pack;
    if (!isGlcOrchestrationPackView(rawPack)) return;
    if (!selectedPackNodeId) return;
    setIsSummarySheetOpen(true);
  }, [audit?.strategy?.glc_orchestration_pack, isClient, packSummaryStackedLayout, selectedPackNodeId]);

  // Anchor scroll runs only when audit is loaded with a strategy; declared before any early
  // return so React Hook order stays stable across render branches.
  useEffect(() => {
    if (!embedded || !planStudioScrollTarget || !audit?.strategy) return;
    const anchorId =
      planStudioScrollTarget === 'define'
        ? STRATEGY_LAB_PAGE_ANCHORS.definePhase
        : planStudioScrollTarget === 'shape-pack'
          ? STRATEGY_LAB_PAGE_ANCHORS.shapePack
          : STRATEGY_LAB_PAGE_ANCHORS.planSetup;
    const el = typeof document !== 'undefined' ? document.getElementById(anchorId) : null;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [embedded, planStudioScrollTarget, audit?.strategy]);

  const setSelectedPackNodeId = useCallback(
    (nextId: string | null) => {
      setSearchParams(
        prev => {
          const n = new URLSearchParams(prev);
          if (nextId) {
            n.set('node', nextId);
          } else {
            n.delete('node');
          }
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (loading && !audit) {
    return (
      <StrategyLabLoadingShell
        title={STRATEGY_LAB_COPY.appShell.title}
        subtitle={STRATEGY_LAB_COPY.appShell.loadingSubtitle}
        embedded={embedded}
      />
    );
  }

  if (error || !audit) {
    return (
      <StrategyLabErrorShell
        title={STRATEGY_LAB_COPY.appShell.title}
        subtitle={STRATEGY_LAB_COPY.appShell.errorSubtitle}
        errorMessage={error}
        online={online}
        isFetching={isFetching}
        onRetry={() => reload()}
        loadErrorSummaryId={loadErrorSummaryId}
        loadOfflineHintId={loadOfflineHintId}
        embedded={embedded}
      />
    );
  }

  const orchestrationUiEnabled = APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;
  const clientOrchestrationLabReadOnlyEnabled = APP_FEATURE_FLAGS.clientOrchestrationLabReadOnlyEnabled;
  const executionPlanForRoadmap = audit.meta.execution_plan ?? null;
  const reportHref = id
    ? isClient
      ? buildAppRoute.portalReports(id)
      : buildAppRoute.reports(id)
    : isClient
      ? '/portal/reports'
      : '/reports';
  const primaryPlanSurface = primaryPlanWorkbenchViewForStrategyLinks();
  const planExecutionHref = id
    ? buildPlanWorkspaceHref({
        auditId: id,
        isClient,
        mode: 'execute',
        view: primaryPlanSurface,
      })
    : reportHref;

  if (!audit.strategy) {
    return (
      <StrategyLabNoStrategyShell
        title={STRATEGY_LAB_COPY.appShell.title}
        subtitle={STRATEGY_LAB_COPY.appShell.unavailableSubtitle}
        embedded={embedded}
      />
    );
  }

  const journeyStripVisible =
    orchestrationUiEnabled && (!isClient || clientOrchestrationLabReadOnlyEnabled);

  const inspectPackScrollInner = (
    <StrategyLabInspectPackScrollBody
      isClient={isClient}
      definePhaseHeadingId={definePhaseHeadingId}
      domainBenchmarks={domainBenchmarks}
      strategy={audit.strategy}
      referencePreviewBenchmarks={referencePreviewBenchmarks}
      referencePreviewConstraints={referencePreviewConstraints}
      constraintOverridesErrorRegionId={constraintOverridesErrorRegionId}
      constraintOverridesSaveErrorMessage={constraintOverridesSaveErrorMessage}
      dismissConstraintOverridesSaveError={dismissConstraintOverridesSaveError}
      constraintStageDraft={constraintStageDraft}
      constraintBudgetDraft={constraintBudgetDraft}
      constraintTeamDraft={constraintTeamDraft}
      constraintSaving={constraintSaving}
      onConstraintStageChange={setConstraintStageDraft}
      onConstraintBudgetChange={setConstraintBudgetDraft}
      onConstraintTeamChange={setConstraintTeamDraft}
      onSaveConstraintOverrides={() => void handleSaveConstraintOverrides()}
      onClearConstraintOverrides={() => void handleClearConstraintOverrides()}
      glcPackView={glcPackView}
      orchestratorTablistOverviewId={orchestratorTablistOverviewId}
      orchestratorTab={orchestratorTab}
      orchestratorPanelAnnouncement={orchestratorPanelAnnouncement}
      selectedPackNodeId={selectedPackNodeId}
      onOrchestratorTabChange={setOrchestratorTab}
      onOrchestratorTablistKeyDown={onOrchestratorTablistKeyDown}
      setOrchestratorTabButtonRef={setOrchestratorTabButtonRef}
      onSelectPackNodeId={setSelectedPackNodeId}
      openInitiativeEditor={openInitiativeEditor}
      planExecutionHref={planExecutionHref}
      reportHref={reportHref}
      auditId={id}
      preserveBoardIdentityOnRename={audit.strategy.strategy_lab_context?.preserve_board_identity_on_rename === true}
      onTogglePreserveBoardIdentity={() => void handleTogglePreserveBoardIdentity()}
    />
  );

  const planSummaryDetailBlock = (
    <StrategyLabPlanSummaryDetailBlock
      glcPackView={glcPackView}
      selectedPackNodeId={selectedPackNodeId}
      onClearSelectedNode={() => setSelectedPackNodeId(null)}
    />
  );

  const planSummaryFooter = <StrategyLabPlanSummaryFooter reportHref={reportHref} />;

  const planSummaryDesktopChrome = (
    <StrategyLabPlanSummaryDesktopChrome detail={planSummaryDetailBlock} footer={planSummaryFooter} />
  );

  const consultantMobilePackSummarySheet =
    packSummaryStackedLayout && !isClient && Boolean(audit?.strategy);

  const planSummaryPresentation: PlanSummaryRailPresentation = consultantMobilePackSummarySheet
    ? 'consultant-sheet'
    : isNarrowMobileLayout
      ? 'main-only'
      : 'split';

  const workspace = (
    <>
      <StrategyLabClientOrchestrationNotice
        planExecutionHref={planExecutionHref}
        readOnlyStrip={Boolean(
          orchestrationUiEnabled && isClient && glcPackView && clientOrchestrationLabReadOnlyEnabled,
        )}
        hiddenForClient={Boolean(
          orchestrationUiEnabled &&
            isClient &&
            !(glcPackView && clientOrchestrationLabReadOnlyEnabled),
        )}
      />

      {journeyStripVisible && id ? (
        <StrategyPlanningChrome
          auditId={id}
          isClient={isClient}
          audit={audit}
          variant={{ kind: 'strategy-lab' }}
          steps={journeySteps}
        />
      ) : null}

      {orchestrationUiEnabled && !isClient && audit.strategy && executionPlanForRoadmap ? (
        <div id={STRATEGY_LAB_PAGE_ANCHORS.planSetup} className="scroll-mt-20">
          <StrategyLabOrchestrationPanel
            auditId={audit.meta.id}
            executionPlan={executionPlanForRoadmap}
            strategy={audit.strategy}
            onReload={reload}
            mergeStrategyLabContextInAuditCache={mergeStrategyLabContextInAuditCache}
          />
        </div>
      ) : null}

      <PlanSummaryRail
        presentation={planSummaryPresentation}
        inspectPackScrollInner={inspectPackScrollInner}
        planSummaryDetailBlock={planSummaryDetailBlock}
        planSummaryFooter={planSummaryFooter}
        planSummaryDesktopChrome={planSummaryDesktopChrome}
        isSummarySheetOpen={isSummarySheetOpen}
        onSummarySheetOpenChange={setIsSummarySheetOpen}
        selectedPackNodeId={selectedPackNodeId}
      />

      {id && !isClient ? (
        <StrategyLabInitiativeEditDrawer
          open={initiativeEditOpen}
          onOpenChange={setInitiativeEditOpen}
          auditId={id}
          bucket={initiativeEditBucket}
          initiative={initiativeEditTarget}
          onSaved={() => {
            void reload();
          }}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return workspace;
  }

  return (
    <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.subtitle}>
      {workspace}
    </AppShell>
  );
}
