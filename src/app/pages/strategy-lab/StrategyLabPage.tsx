import { useMemo, useEffect, useCallback, useId } from 'react';
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
import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';
import { DOMAIN_KEYS } from '../../data/auditTypes';
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

  const {
    orchestrationUiEnabled,
    clientOrchestrationLabReadOnlyEnabled,
    reportHref,
    planExecutionHref,
  } = useStrategyLabWorkspaceLinks({ auditId: id, isClient });

  type ExecutionPlanForLab = NonNullable<AuditMeta['execution_plan']>;

  /**
   * `GET /audits/:id` sometimes omits `meta.execution_plan` even when a GLC pack exists (Plan studio embed).
   * Infer `selected_domains` from pack graph so {@link StrategyLabOrchestrationPanel} mounts and can register
   * the Plan Advanced drawer body; otherwise the sheet shows only chrome copy.
   */
  const executionPlanForRoadmap = useMemo((): ExecutionPlanForLab | null => {
    if (!audit?.strategy) return null;
    const fromMeta = audit.meta.execution_plan ?? null;
    if (fromMeta) return fromMeta;

    const rawPack = audit.strategy.glc_orchestration_pack;
    if (!isGlcOrchestrationPackView(rawPack)) return null;

    const domainSet = new Set<(typeof DOMAIN_KEYS)[number]>();
    for (const node of rawPack.graph?.nodes ?? []) {
      const d = node.domain;
      if (d && (DOMAIN_KEYS as readonly string[]).includes(d)) {
        domainSet.add(d as (typeof DOMAIN_KEYS)[number]);
      }
    }
    const selected_domains = domainSet.size > 0 ? [...domainSet] : [...DOMAIN_KEYS];

    return {
      selected_domains,
      depth: 'standard',
      source: 'system_default',
    };
  }, [audit?.meta.execution_plan, audit?.strategy]);

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
