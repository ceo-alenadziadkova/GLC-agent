import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from 'react';
import { Path } from '@phosphor-icons/react';

import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';
import type {
  StrategyLabContextView,
  StrategyRoadmap,
} from '../../data/audit/contracts/report/report-domain.types';
import type { GlcOrchestrationPackRevisionDiffView } from '../../data/audit/contracts/report/orchestration-pack.types';
import type {
  OrchestrationPlanGovernanceDto,
} from '../../data/api/orchestration-types';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import { PlanWorkspaceManifestStatePill } from '../../components/glc/PlanWorkspaceManifestStatePill';
import { Button } from '../../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { useManifestSavedSignatureBaseline } from '../../hooks/useManifestSavedSignatureBaseline';
import { usePlanBoardQuery } from '../../data/api/plan-board-queries';
import { useQueryClient } from '../../lib/tanstack-react-query';
import { useDebouncedOrchestratorManifestPreview } from '../../hooks/useDebouncedOrchestratorManifestPreview';
import {
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  parseOptionalOrchestrationPlanHorizon,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_PANEL_DOM_ID } from '../../config/orchestration-ui-limits';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { orchestrationNodeTitleMap } from '../../lib/orchestration-timeline-projection';
import { useOptionalPlanAdvancedDrawer } from '../../context/PlanAdvancedDrawerContext';
import { useOrchestrationAdvancedSectionState } from '../../hooks/useOrchestrationAdvancedSectionState';
import { useOrchestrationManifestSnapshots } from '../../hooks/useOrchestrationManifestSnapshots';
import { useOrchestrationCompileFlow } from '../../hooks/useOrchestrationCompileFlow';
import { useOrchestrationCommercialOffer } from '../../hooks/useOrchestrationCommercialOffer';
import { useStrategyLabContextPreferences } from '../../hooks/useStrategyLabContextPreferences';
import { useOrchestrationRevisionDiffs } from '../../hooks/useOrchestrationRevisionDiffs';
import { usePlanWorkspaceCompileRequest } from '../../hooks/usePlanWorkspaceCompileRequest';
import { OrchestrationManifestCoreFields } from './orchestration-panel/OrchestrationManifestCoreFields';
import { OrchestrationAdvancedSections } from './orchestration-advanced-sections';
import { StrategyLabOrchestrationManifestPreview } from './StrategyLabOrchestrationManifestPreview';

type ExecutionPlan = NonNullable<AuditMeta['execution_plan']>;

interface StrategyLabOrchestrationPanelProps {
  auditId: string;
  executionPlan: ExecutionPlan;
  strategy: StrategyRoadmap;
  onReload: () => void;
  /** Parent-owned React Query merge (panel does not call useQueryClient — avoids stray ReferenceError across chunks). */
  mergeStrategyLabContextInAuditCache?: (strategy_lab_context: StrategyLabContextView) => void;
}

export function StrategyLabOrchestrationPanel({
  auditId,
  executionPlan,
  strategy,
  onReload,
  mergeStrategyLabContextInAuditCache,
}: StrategyLabOrchestrationPanelProps) {
  const qc = useQueryClient();
  const pack = isGlcOrchestrationPackView(strategy.glc_orchestration_pack) ? strategy.glc_orchestration_pack : null;

  const boardHintsQuery = usePlanBoardQuery({
    auditId,
    enabled: APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && Boolean(pack),
  });
  const manifestDraftRevisionDigest = boardHintsQuery.data?.manifest_draft_revision_digest ?? '';

  const compileStatusRegionId = useId();
  const orchestrationWorkflowStatusHeadingId = useId();
  const advancedStage2HeadingId = useId();
  const advancedSnapshotHeadingId = useId();
  const advancedCommercialHeadingId = useId();
  const inlineConfirmId = useId();

  const [scenario, setScenario] = useState<OrchestrationChangeScenario>('hybrid');
  const [season, setSeason] = useState<OrchestrationSeasonPreset>('rolling_90d');
  const [planHorizonStart, setPlanHorizonStart] = useState('');
  const [planHorizonEnd, setPlanHorizonEnd] = useState('');
  const [planGovernance, setPlanGovernance] = useState<OrchestrationPlanGovernanceDto | null>(null);
  const [analysisDepthFilter, setAnalysisDepthFilter] = useState<'all' | 'baseline' | 'deep'>('all');

  const {
    stage2Selection,
    stage2Working,
    preserveBoardIdentityOnRename,
    boardIdentityWorking,
    setPreserveBoardIdentityOnRename,
    toggleStage2Domain,
    handleSaveStage2Intent,
    handleClearSavedStage2Intent,
    handleSaveBoardIdentityPreference,
  } = useStrategyLabContextPreferences({
    auditId,
    strategy,
    onReload,
    mergeStrategyLabContextInAuditCache,
  });

  const { hasUnsavedManifestChanges, applySignatureFromManifestPayload, markDraftAsSavedBaseline } =
    useManifestSavedSignatureBaseline({
      scenario,
      season,
      planHorizonStart,
      planHorizonEnd,
      manifestDraftRevisionDigest: APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard
        ? manifestDraftRevisionDigest
        : undefined,
    });

  const {
    manifestSnapshotId,
    setManifestSnapshotId,
    manifestSnapshots,
    hydratedManifestSnapshotId,
    appendOrReplaceManifestSnapshot,
    manifestSaveWorking,
    setManifestSaveWorking,
  } = useOrchestrationManifestSnapshots({
    auditId,
    strategyPack: strategy.glc_orchestration_pack,
    applySignatureFromManifestPayload,
    setScenario,
    setSeason,
    setPlanHorizonStart,
    setPlanHorizonEnd,
  });

  const {
    setLastPostRevision,
    revisionHistory,
    selectedRevisionDiffKey,
    setSelectedRevisionDiffKey,
    revisionDiffCandidates,
    selectedRevisionDiff,
    roadmapVersionToShow,
  } = useOrchestrationRevisionDiffs({
    auditId,
    orchestrationPackVersion: strategy.orchestration_pack_version,
    strategyLastRevisionDiff: strategy.glc_orchestration_last_revision_diff ?? null,
  });

  const {
    compileStatusLine,
    compileMutation,
    handleSaveManifest,
    handleCompilePlan,
  } = useOrchestrationCompileFlow({
    auditId,
    selectedDomains: executionPlan.selected_domains,
    scenario,
    season,
    planHorizonStart,
    planHorizonEnd,
    queryClient: qc,
    invalidateBoardDraftHints: APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard,
    setManifestSaveWorking,
    appendOrReplaceManifestSnapshot,
    markDraftAsSavedBaseline,
    setLastPostRevision,
    setPlanGovernance,
    onReload,
  });

  const onCommercialAcceptedPackResult = useCallback(
    (accepted: {
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      plan_governance: OrchestrationPlanGovernanceDto;
    }) => {
      setLastPostRevision({
        roadmap_version: accepted.roadmap_version,
        diff: accepted.last_revision_diff,
      });
      setPlanGovernance(accepted.plan_governance);
    },
    [setLastPostRevision, setPlanGovernance],
  );

  const {
    commercialOffer,
    commercialWorking,
    pendingAcceptDomain,
    handleProbeCommercialOffer,
    handleRequestAcceptDomain,
    handleCancelInlineAccept,
    handleConfirmInlineAccept,
  } = useOrchestrationCommercialOffer({
    auditId,
    selectedDomains: executionPlan.selected_domains,
    scenario,
    season,
    planHorizonStart,
    planHorizonEnd,
    onReload,
    onAcceptedPackResult: onCommercialAcceptedPackResult,
    onGovernanceFromError: setPlanGovernance,
  });

  const orchestratorPreviewBody = useMemo((): RoadmapManifestRequestBody | null => {
    const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
    return {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: executionPlan.selected_domains,
      change_scenario: scenario,
      season_preset: season,
      ...(planHorizon ? { plan_horizon: planHorizon } : {}),
    };
  }, [executionPlan.selected_domains, planHorizonEnd, planHorizonStart, scenario, season]);

  const { manifestPreview, manifestPreviewError, previewLoading } = useDebouncedOrchestratorManifestPreview({
    auditId,
    body: orchestratorPreviewBody,
    enabled: executionPlan.selected_domains.length > 0,
  });

  const domainLabels = useMemo(
    () =>
      [...executionPlan.selected_domains]
        .sort()
        .map(d => DOMAIN_LABELS[d] ?? d)
        .join(', '),
    [executionPlan.selected_domains],
  );

  const titleById = useMemo(() => (pack ? orchestrationNodeTitleMap(pack) : new Map<string, string>()), [pack]);

  const {
    synthesisConflicts,
    governanceHints,
    depthFilteredNodes,
    hasPlanDiagnostics,
    showRevisionHistorySubsection,
    advancedPreviewLine,
  } = useOrchestrationAdvancedSectionState({
    pack,
    planGovernance,
    revisionHistoryCount: revisionHistory.length,
    selectedRevisionDiffPresent: selectedRevisionDiff !== null,
    roadmapVersionToShow,
    analysisDepthFilter,
    manifestSnapshotsCount: manifestSnapshots.length,
    commercialOffer,
    strategy,
  });

  const onWorkspaceCompileRequest = useCallback(() => {
    void handleCompilePlan();
  }, [handleCompilePlan]);

  usePlanWorkspaceCompileRequest({
    onCompileRequest: onWorkspaceCompileRequest,
  });

  const previewPlanHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);

  const planAdvancedDrawer = useOptionalPlanAdvancedDrawer();
  const setAdvancedDrawerContent = planAdvancedDrawer?.setContent;
  const setAdvancedDrawerPreviewLine = planAdvancedDrawer?.setPreviewLine;

  const orchestrationAdvancedBody = useMemo(
    () => (
      <OrchestrationAdvancedSections
        auditId={auditId}
        executionPlan={executionPlan}
        strategy={strategy}
        pack={pack}
        planGovernance={planGovernance}
        governanceHints={governanceHints}
        revisionHistory={revisionHistory}
        roadmapVersionToShow={roadmapVersionToShow}
        revisionDiffCandidates={revisionDiffCandidates}
        selectedRevisionDiff={selectedRevisionDiff}
        selectedRevisionDiffKey={selectedRevisionDiffKey}
        setSelectedRevisionDiffKey={setSelectedRevisionDiffKey}
        titleById={titleById}
        analysisDepthFilter={analysisDepthFilter}
        setAnalysisDepthFilter={setAnalysisDepthFilter}
        depthFilteredNodes={depthFilteredNodes}
        synthesisConflicts={synthesisConflicts}
        hasPlanDiagnostics={hasPlanDiagnostics}
        showRevisionHistorySubsection={showRevisionHistorySubsection}
        advancedStage2HeadingId={advancedStage2HeadingId}
        advancedSnapshotHeadingId={advancedSnapshotHeadingId}
        advancedCommercialHeadingId={advancedCommercialHeadingId}
        inlineConfirmId={inlineConfirmId}
        stage2Selection={stage2Selection}
        toggleStage2Domain={toggleStage2Domain}
        stage2Working={stage2Working}
        handleSaveStage2Intent={handleSaveStage2Intent}
        handleClearSavedStage2Intent={handleClearSavedStage2Intent}
        preserveBoardIdentityOnRename={preserveBoardIdentityOnRename}
        setPreserveBoardIdentityOnRename={setPreserveBoardIdentityOnRename}
        boardIdentityWorking={boardIdentityWorking}
        handleSaveBoardIdentityPreference={handleSaveBoardIdentityPreference}
        manifestSnapshots={manifestSnapshots}
        manifestSnapshotId={manifestSnapshotId}
        setManifestSnapshotId={setManifestSnapshotId}
        setScenario={setScenario}
        setSeason={setSeason}
        setPlanHorizonStart={setPlanHorizonStart}
        setPlanHorizonEnd={setPlanHorizonEnd}
        applySignatureFromManifestPayload={applySignatureFromManifestPayload}
        hydratedManifestSnapshotId={hydratedManifestSnapshotId}
        handleSaveManifest={handleSaveManifest}
        working={manifestSaveWorking}
        compileMutationPending={compileMutation.isPending}
        commercialOffer={commercialOffer}
        commercialWorking={commercialWorking}
        handleProbeCommercialOffer={handleProbeCommercialOffer}
        pendingAcceptDomain={pendingAcceptDomain}
        handleCancelInlineAccept={handleCancelInlineAccept}
        handleConfirmInlineAccept={handleConfirmInlineAccept}
        handleRequestAcceptDomain={handleRequestAcceptDomain}
      />
    ),
    [
      auditId,
      executionPlan,
      strategy,
      pack,
      planGovernance,
      governanceHints,
      revisionHistory,
      roadmapVersionToShow,
      revisionDiffCandidates,
      selectedRevisionDiff,
      selectedRevisionDiffKey,
      titleById,
      analysisDepthFilter,
      depthFilteredNodes,
      synthesisConflicts,
      hasPlanDiagnostics,
      showRevisionHistorySubsection,
      advancedStage2HeadingId,
      advancedSnapshotHeadingId,
      advancedCommercialHeadingId,
      inlineConfirmId,
      stage2Selection,
      stage2Working,
      preserveBoardIdentityOnRename,
      boardIdentityWorking,
      manifestSnapshots,
      manifestSnapshotId,
      manifestSaveWorking,
      compileMutation.isPending,
      commercialOffer,
      commercialWorking,
      pendingAcceptDomain,
      setSelectedRevisionDiffKey,
      setAnalysisDepthFilter,
      toggleStage2Domain,
      handleSaveStage2Intent,
      handleClearSavedStage2Intent,
      setPreserveBoardIdentityOnRename,
      handleSaveBoardIdentityPreference,
      setManifestSnapshotId,
      setScenario,
      setSeason,
      setPlanHorizonStart,
      setPlanHorizonEnd,
      applySignatureFromManifestPayload,
      hydratedManifestSnapshotId,
      handleSaveManifest,
      handleProbeCommercialOffer,
      handleCancelInlineAccept,
      handleConfirmInlineAccept,
      handleRequestAcceptDomain,
    ],
  );

  useLayoutEffect(() => {
    if (!setAdvancedDrawerContent || !setAdvancedDrawerPreviewLine) return;
    setAdvancedDrawerContent(orchestrationAdvancedBody);
    setAdvancedDrawerPreviewLine(advancedPreviewLine);
    return () => {
      // Synchronous clear: deferred cleanup would run after this effect's successor in the same
      // navigation pass (microtasks flush after layout effects), leaving the Sheet body empty while
      // the panel stays mounted — see drawer registration contract in PlanAdvancedDrawerContext.
      setAdvancedDrawerContent(null);
      setAdvancedDrawerPreviewLine(null);
    };
  }, [setAdvancedDrawerContent, setAdvancedDrawerPreviewLine, orchestrationAdvancedBody, advancedPreviewLine]);

  return (
    <div
      id={ORCHESTRATION_PANEL_DOM_ID}
      className="ds-strategy-lab-orchestration-scroll-anchor bg-card space-y-5 border-b p-4"
    >
      {/* Section header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Path className="text-info h-4 w-4" aria-hidden />
          <h2 className="text-foreground text-sm font-semibold">{ORCHESTRATION_UI_COPY.sectionTitle}</h2>
        </div>
        <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.sectionHint}</p>
      </div>

      <p className="text-muted-foreground bg-background rounded-lg border px-3 py-2 text-xs leading-relaxed max-w-prose">
        {ORCHESTRATION_UI_COPY.strategyLabNextActionInline}
      </p>

      <section
        aria-labelledby={orchestrationWorkflowStatusHeadingId}
        className="border-border bg-background rounded-lg border px-3 py-3"
      >
        <h3 id={orchestrationWorkflowStatusHeadingId} className="text-foreground text-sm font-semibold">
          {STRATEGY_LAB_COPY.orchestrationWorkflowStatus.title}
        </h3>
        <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed max-w-prose">
          <li>
            {hasUnsavedManifestChanges
              ? STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestDirty
              : STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestSynced}
          </li>
          <li>
            {roadmapVersionToShow > 0
              ? STRATEGY_LAB_COPY.orchestrationWorkflowStatus.packPresent.replace(
                  '{version}',
                  String(roadmapVersionToShow),
                )
              : STRATEGY_LAB_COPY.orchestrationWorkflowStatus.packMissing}
          </li>
          {APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && manifestDraftRevisionDigest.length > 0 ? (
            <li>{STRATEGY_LAB_COPY.orchestrationWorkflowStatus.boardHintsQueued}</li>
          ) : null}
        </ul>
      </section>

      {/* Core flow controls (always visible) */}
      <OrchestrationManifestCoreFields
        domainLabels={domainLabels}
        scenario={scenario}
        season={season}
        planHorizonStart={planHorizonStart}
        planHorizonEnd={planHorizonEnd}
        onScenarioChange={setScenario}
        onSeasonChange={setSeason}
        onPlanHorizonStartChange={setPlanHorizonStart}
        onPlanHorizonEndChange={setPlanHorizonEnd}
      />

      {/* Live manifest preview */}
      <StrategyLabOrchestrationManifestPreview
        previewLoading={previewLoading}
        manifestPreviewError={manifestPreviewError}
        manifestPreview={manifestPreview}
        domainLabels={domainLabels}
        scenario={scenario}
        season={season}
        previewPlanHorizon={previewPlanHorizon}
      />

      {/* Primary CTA: compile (snapshot + pack). Save-snapshot-only lives under Advanced. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={manifestSaveWorking || compileMutation.isPending}
            onClick={() => void handleCompilePlan()}
            aria-label={STRATEGY_LAB_COPY.panel.compilePlanPrimaryAria}
            className="w-full sm:w-auto"
          >
            <Path className="h-4 w-4" aria-hidden />
            {compileMutation.isPending ? ORCHESTRATION_UI_COPY.compilePlanStatusCompiling : ORCHESTRATION_UI_COPY.compilePlan}
          </Button>
          <PlanWorkspaceManifestStatePill
            tone={compileMutation.isPending ? 'pending' : hasUnsavedManifestChanges ? 'dirty' : 'saved'}
            label={
              compileMutation.isPending ?
                STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestCompilingChipLabel
              : hasUnsavedManifestChanges ?
                STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestDirtyChipLabel
              : STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestSyncedChipLabel
            }
            srLabel={
              compileMutation.isPending ?
                ORCHESTRATION_UI_COPY.compilePlanStatusCompiling
              : hasUnsavedManifestChanges ?
                STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestDirty
              : STRATEGY_LAB_COPY.orchestrationWorkflowStatus.manifestSynced
            }
          />
        </div>
        <p
          id={compileStatusRegionId}
          className="text-muted-foreground text-xs max-w-prose"
          role="status"
          aria-live="polite"
        >
          {compileMutation.isPending
            ? ORCHESTRATION_UI_COPY.compilePlanStatusCompiling
            : compileStatusLine ?? ORCHESTRATION_UI_COPY.compilePlanStatusIdleHint}
        </p>
      </div>

      {roadmapVersionToShow > 0 && (
        <p className="text-muted-foreground text-xs">
          {ORCHESTRATION_UI_COPY.roadmapVersionLabel}: {roadmapVersionToShow}
        </p>
      )}

      {planAdvancedDrawer ? (
        <div className="bg-background rounded-lg border px-3 py-3">
          <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">{PLAN_WORKSPACE_UI_COPY.advancedMovedToPlanMenuHint}</p>
          <p className="text-muted-foreground mt-2 text-[length:var(--text-2xs)] leading-snug">{advancedPreviewLine}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => planAdvancedDrawer.setOpen(true)}
          >
            {PLAN_WORKSPACE_UI_COPY.advancedDrawerOpenCta}
          </Button>
        </div>
      ) : (
        <Accordion
          type="single"
          collapsible
          className="bg-background rounded-lg border [&_[data-slot=accordion-item]]:border-b-0"
        >
          <AccordionItem value="advanced">
            <AccordionTrigger className="px-3 py-3 hover:no-underline">
              <span className="flex flex-1 flex-col items-start gap-1 text-left">
                <span className="text-foreground text-sm font-semibold">
                  {STRATEGY_LAB_COPY.orchestrationDisclosure.advancedSummary}
                </span>
                <span className="text-muted-foreground text-[length:var(--text-2xs)] font-normal leading-snug">
                  {advancedPreviewLine}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-border border-t p-3 pt-4">{orchestrationAdvancedBody}</AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
