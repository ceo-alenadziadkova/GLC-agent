import { useMemo, useCallback, useId } from 'react';
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
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { applyStrategyLabContextPatchToAuditCache } from '../../lib/strategy-lab-context-cache';
import { StrategyLabOrchestrationPanel } from './StrategyLabOrchestrationPanel';
import { StrategyPlanningChrome } from './StrategyPlanningChrome';
import { StrategyLabInspectPackScrollBody } from './strategy-lab-inspect-pack-scroll-body';
import { useStrategyJourneyStepStatuses } from '../../hooks/useStrategyJourneyStepStatuses';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { UI_BREAKPOINTS } from '../../config/ui-breakpoints';
import { PlanSummaryRail } from './PlanSummaryRail';
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
import { useStrategyLabReferencePreviews } from '../../hooks/useStrategyLabReferencePreviews';
import { useStrategyLabSummaryRailState } from '../../hooks/useStrategyLabSummaryRailState';
import type { StrategyLabContextView } from '../../data/audit/contracts/report/report-domain.types';
import { useStrategyOrchestratorTabs } from '../../hooks/useStrategyOrchestratorTabs';
import { useStrategyBoardIdentityPreference } from '../../hooks/useStrategyBoardIdentityPreference';
import { useStrategyLabWorkspaceLinks } from '../../hooks/useStrategyLabWorkspaceLinks';
import { usePlanFocusCanonicalToken } from '../../hooks/usePlanFocusKey';
import { useStrategyLabEmbeddedScroll } from '../../hooks/useStrategyLabEmbeddedScroll';
import { useStrategyLabExecutionPlan } from '../../hooks/useStrategyLabExecutionPlan';

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
  const focusToken = usePlanFocusCanonicalToken();
  const queryClient = useQueryClient();
  const { audit, loading, error, reload, isFetching } = useAudit(id);
  const online = useBrowserOnline();
  const loadErrorSummaryId = useId();
  const loadOfflineHintId = useId();
  const constraintOverridesErrorRegionId = useId();
  const { isClient } = useProfile();
  const orchestratorTablistOverviewId = useId();
  const definePhaseHeadingId = useId();
  const {
    orchestratorTab,
    setOrchestratorTab,
    orchestratorPanelAnnouncement,
    setOrchestratorTabButtonRef,
    onOrchestratorTablistKeyDown,
  } = useStrategyOrchestratorTabs();

  const glcPackView = useMemo(() => {
    const raw = audit?.strategy?.glc_orchestration_pack;
    return isGlcOrchestrationPackView(raw) ? raw : null;
  }, [audit?.strategy?.glc_orchestration_pack]);

  const journeySteps = useStrategyJourneyStepStatuses(audit);

  const mergeStrategyLabContextInAuditCache = useCallback(
    (strategy_lab_context: StrategyLabContextView) => {
      if (!id) return;
      applyStrategyLabContextPatchToAuditCache(queryClient, id, strategy_lab_context);
    },
    [id, queryClient],
  );

  const handleTogglePreserveBoardIdentity = useStrategyBoardIdentityPreference({
    auditId: id,
    strategy: audit?.strategy,
    reload,
    mergeStrategyLabContextInAuditCache,
  });

  const {
    selectedPackNodeId,
    setSelectedPackNodeId,
    isSummarySheetOpen,
    setIsSummarySheetOpen,
    planSummaryPresentation,
  } = useStrategyLabSummaryRailState({
    searchParams,
    setSearchParams,
    isClient,
    packSummaryStackedLayout,
    isNarrowMobileLayout,
    rawPack: audit?.strategy?.glc_orchestration_pack,
  });

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

  useStrategyLabEmbeddedScroll({
    embedded,
    planStudioScrollTarget,
    strategyPresent: Boolean(audit?.strategy),
    focusToken,
    packView: glcPackView,
    onSelectPackNode: setSelectedPackNodeId,
  });

  const {
    orchestrationUiEnabled,
    clientOrchestrationLabReadOnlyEnabled,
    reportHref,
    planExecutionHref,
  } = useStrategyLabWorkspaceLinks({ auditId: id, isClient });

  const executionPlanForRoadmap = useStrategyLabExecutionPlan({
    strategy: audit?.strategy,
    executionPlan: audit?.meta.execution_plan,
  });

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
