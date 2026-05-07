import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Path } from '@phosphor-icons/react';

import type { DomainKey } from '@glc/intake-core';
import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';
import type {
  StrategyLabContextView,
  StrategyRoadmap,
} from '../../data/audit/contracts/report/report-domain.types';
import type { GlcOrchestrationPackRevisionDiffView } from '../../data/audit/contracts/report/orchestration-pack.types';
import type {
  OrchestrationCommercialOfferResponseDto,
  OrchestrationPlanGovernanceDto,
  OrchestrationPackRevisionHistoryItemDto,
  RoadmapManifestRequestBody,
  RoadmapManifestSnapshotListItem,
} from '../../data/api/audits-orchestration';
import { api } from '../../data/apiService';
import { ApiError } from '../../data/api-error';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import { PlanWorkspaceManifestStatePill } from '../../components/glc/PlanWorkspaceManifestStatePill';
import { Button } from '../../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { toast } from 'sonner';
import { useManifestSavedSignatureBaseline } from '../../hooks/useManifestSavedSignatureBaseline';
import { useCompilePlanMutation } from '../../hooks/useCompilePlanMutation';
import { usePlanBoardQuery } from '../../data/api/plan-board-queries';
import { useQueryClient } from '../../lib/tanstack-react-query';
import { invalidatePlanWorkspaceQueries } from '../../lib/plan-workspace-queries';
import { useDebouncedOrchestratorManifestPreview } from '../../hooks/useDebouncedOrchestratorManifestPreview';
import {
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  parseOptionalOrchestrationPlanHorizon,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_PANEL_DOM_ID, ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS } from '../../config/orchestration-plan-governance';
import { PLAN_WORKSPACE_COMPILE_REQUEST_EVENT } from '../../config/plan-workspace-mode';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import {
  extractPlanGovernanceFromPackApiError,
  formatOrchestrationPackRunErrorMessage,
} from '../../lib/orchestration-pack-api-error';
import { orchestrationNodeTitleMap } from '../../lib/orchestration-timeline-projection';
import { useOptionalPlanAdvancedDrawer } from '../../context/PlanAdvancedDrawerContext';
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
  const [manifestSnapshotId, setManifestSnapshotId] = useState<string | null>(null);
  const hydratedManifestSnapshotId = useRef<string | null>(null);
  const [manifestSnapshots, setManifestSnapshots] = useState<RoadmapManifestSnapshotListItem[]>([]);
  const [working, setWorking] = useState(false);
  const [lastPostRevision, setLastPostRevision] = useState<{
    roadmap_version: number;
    diff: GlcOrchestrationPackRevisionDiffView | null;
  } | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<OrchestrationPackRevisionHistoryItemDto[]>([]);
  const [selectedRevisionDiffKey, setSelectedRevisionDiffKey] = useState<string | null>(null);
  const [planGovernance, setPlanGovernance] = useState<OrchestrationPlanGovernanceDto | null>(null);
  const [commercialOffer, setCommercialOffer] = useState<OrchestrationCommercialOfferResponseDto | null>(null);
  const [commercialWorking, setCommercialWorking] = useState(false);
  /** Inline accept confirmation: domain pending confirmation, or null. Replaces overlay AlertDialog. */
  const [pendingAcceptDomain, setPendingAcceptDomain] = useState<keyof typeof DOMAIN_LABELS | null>(null);
  const [analysisDepthFilter, setAnalysisDepthFilter] = useState<'all' | 'baseline' | 'deep'>('all');
  const [stage2Selection, setStage2Selection] = useState<DomainKey[]>(
    () => strategy.strategy_lab_context?.director_stage2_domains ?? [],
  );
  const [stage2Working, setStage2Working] = useState(false);
  const [preserveBoardIdentityOnRename, setPreserveBoardIdentityOnRename] = useState<boolean>(
    () => strategy.strategy_lab_context?.preserve_board_identity_on_rename === true,
  );
  const [boardIdentityWorking, setBoardIdentityWorking] = useState(false);
  const [compileStatusLine, setCompileStatusLine] = useState<string | null>(null);

  const compileMutation = useCompilePlanMutation({
    auditId,
    onSettled: () => {
      onReload();
    },
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

  useEffect(() => {
    setStage2Selection(strategy.strategy_lab_context?.director_stage2_domains ?? []);
  }, [strategy.strategy_lab_context?.director_stage2_domains]);

  useEffect(() => {
    setPreserveBoardIdentityOnRename(strategy.strategy_lab_context?.preserve_board_identity_on_rename === true);
  }, [strategy.strategy_lab_context?.preserve_board_identity_on_rename]);

  useEffect(() => {
    const p = isGlcOrchestrationPackView(strategy.glc_orchestration_pack) ? strategy.glc_orchestration_pack : null;
    if (p?.manifest_snapshot_id) {
      hydratedManifestSnapshotId.current = null;
      setManifestSnapshotId(prev => prev ?? p.manifest_snapshot_id);
    }
  }, [strategy.glc_orchestration_pack]);

  useEffect(() => {
    if (isGlcOrchestrationPackView(strategy.glc_orchestration_pack)) return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      try {
        const latest = await api.getRoadmapManifestSnapshotLatest(auditId, { signal });
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems,
          signal,
        });
        if (signal.aborted) return;
        setManifestSnapshots(snapshots);
        if (manifestSnapshotId) return;
        const row = latest.snapshot ?? snapshots[0] ?? null;
        if (!row) return;
        hydratedManifestSnapshotId.current = null;
        setManifestSnapshotId(row.id);
        toast.success(ORCHESTRATION_UI_COPY.snapshotAutoSelected);
      } catch {
        if (signal.aborted) return;
        setManifestSnapshots([]);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [auditId, manifestSnapshotId, strategy.glc_orchestration_pack]);

  useEffect(() => {
    if (!isGlcOrchestrationPackView(strategy.glc_orchestration_pack)) return;
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      try {
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems,
          signal,
        });
        if (signal.aborted) return;
        setManifestSnapshots(snapshots);
      } catch {
        if (signal.aborted) return;
        setManifestSnapshots([]);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [auditId, strategy.glc_orchestration_pack]);

  useEffect(() => {
    if (!manifestSnapshotId || manifestSnapshots.length === 0) return;
    if (hydratedManifestSnapshotId.current === manifestSnapshotId) return;
    const row = manifestSnapshots.find(s => s.id === manifestSnapshotId);
    if (!row) return;
    hydratedManifestSnapshotId.current = manifestSnapshotId;
    setScenario(row.payload.change_scenario);
    setSeason(row.payload.season_preset);
    setPlanHorizonStart(row.payload.plan_horizon?.start_date ?? '');
    setPlanHorizonEnd(row.payload.plan_horizon?.end_date ?? '');
    applySignatureFromManifestPayload(row.payload);
  }, [manifestSnapshotId, manifestSnapshots, applySignatureFromManifestPayload]);

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

  useEffect(() => {
    if (
      lastPostRevision &&
      typeof strategy.orchestration_pack_version === 'number' &&
      strategy.orchestration_pack_version === lastPostRevision.roadmap_version
    ) {
      setLastPostRevision(null);
    }
  }, [strategy.orchestration_pack_version, lastPostRevision]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void (async () => {
      try {
        const { items } = await api.getOrchestrationPackDiffHistory(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxRevisionDiffHistoryItems,
          signal,
        });
        if (signal.aborted) return;
        setRevisionHistory(items);
        if (items.length > 0) {
          const firstKey = `${items[0].from_version}:${items[0].to_version}`;
          setSelectedRevisionDiffKey(prev => prev ?? firstKey);
        }
      } catch {
        if (signal.aborted) return;
        setRevisionHistory([]);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [auditId, strategy.orchestration_pack_version]);

  const domainLabels = useMemo(
    () =>
      [...executionPlan.selected_domains]
        .sort()
        .map(d => DOMAIN_LABELS[d] ?? d)
        .join(', '),
    [executionPlan.selected_domains],
  );

  const titleById = useMemo(() => (pack ? orchestrationNodeTitleMap(pack) : new Map<string, string>()), [pack]);

  const synthesisConflicts = useMemo(() => {
    if (!pack?.conflicts_resolved?.length) return [];
    return pack.conflicts_resolved.filter(
      row => row.resolution === 'synthesis_applied' || row.resolution === 'synthesis_pending',
    );
  }, [pack]);
  const governanceHints = useMemo(() => {
    if (!planGovernance) return [];
    return planGovernance.reason_codes
      .map(code => ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS[code])
      .filter((hint): hint is string => Boolean(hint));
  }, [planGovernance]);

  const depthFilteredNodes = useMemo(() => {
    if (!pack?.graph?.nodes?.length) return [];
    return pack.graph.nodes
      .filter(n => {
        if (analysisDepthFilter === 'all') return true;
        const d = n.analysis_depth ?? 'baseline';
        return d === analysisDepthFilter;
      })
      .slice(0, ORCHESTRATION_UI_LIMITS.orchestratorRisksMaxItems);
  }, [pack, analysisDepthFilter]);

  const handleSaveManifest = useCallback(async () => {
    setWorking(true);
    try {
      const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
      const res = await api.postRoadmapManifestSnapshot(auditId, {
        schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
        selected_domains: executionPlan.selected_domains,
        change_scenario: scenario,
        season_preset: season,
        ...(planHorizon ? { plan_horizon: planHorizon } : {}),
      });
      setManifestSnapshotId(res.id);
      hydratedManifestSnapshotId.current = res.id;
      markDraftAsSavedBaseline();
      setManifestSnapshots(prev => [
        {
          id: res.id,
          created_at: new Date().toISOString(),
          payload: {
            schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
            selected_domains: executionPlan.selected_domains,
            change_scenario: scenario,
            season_preset: season,
            ...(planHorizon ? { plan_horizon: planHorizon } : {}),
          },
        },
        ...prev,
      ].slice(0, ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems));
      if (APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard) {
        await invalidatePlanWorkspaceQueries(qc, auditId);
      }
      toast.success(ORCHESTRATION_UI_COPY.manifestSaved);
    } catch (e) {
      const detail =
        e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
          ? String((e.details as { detail?: unknown }).detail ?? '')
          : '';
      toast.error(detail ? `${ORCHESTRATION_UI_COPY.manifestSaveFailed} (${detail})` : ORCHESTRATION_UI_COPY.manifestSaveFailed);
    } finally {
      setWorking(false);
    }
  }, [
    auditId,
    executionPlan.selected_domains,
    scenario,
    season,
    planHorizonStart,
    planHorizonEnd,
    markDraftAsSavedBaseline,
    qc,
  ]);

  const handleCompilePlan = useCallback(async () => {
    const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
    const body: RoadmapManifestRequestBody = {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: executionPlan.selected_domains,
      change_scenario: scenario,
      season_preset: season,
      ...(planHorizon ? { plan_horizon: planHorizon } : {}),
    };
    try {
      const res = await compileMutation.mutateAsync(body);
      setManifestSnapshotId(res.manifest_snapshot_id);
      hydratedManifestSnapshotId.current = res.manifest_snapshot_id;
      markDraftAsSavedBaseline();
      setManifestSnapshots(prev => [
        {
          id: res.manifest_snapshot_id,
          created_at: new Date().toISOString(),
          payload: {
            schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
            selected_domains: executionPlan.selected_domains,
            change_scenario: scenario,
            season_preset: season,
            ...(planHorizon ? { plan_horizon: planHorizon } : {}),
          },
        },
        ...prev.filter(row => row.id !== res.manifest_snapshot_id),
      ].slice(0, ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems));
      setLastPostRevision({ roadmap_version: res.roadmap_version, diff: res.last_revision_diff });
      setPlanGovernance(res.plan_governance);
      setCompileStatusLine(
        ORCHESTRATION_UI_COPY.compilePlanStatusDone.replace(
          '{version}',
          String(res.orchestration_pack_version),
        ),
      );
      toast.success(ORCHESTRATION_UI_COPY.packBuilt);
    } catch (e) {
      const pg = extractPlanGovernanceFromPackApiError(e);
      if (pg) setPlanGovernance(pg);
      const { message, description } = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
      toast.error(message, description ? { description, duration: 14_000 } : { duration: 6_000 });
    }
  }, [
    compileMutation,
    executionPlan.selected_domains,
    markDraftAsSavedBaseline,
    planHorizonEnd,
    planHorizonStart,
    scenario,
    season,
  ]);

  useEffect(() => {
    const onCompileRequest = () => {
      void handleCompilePlan();
    };
    window.addEventListener(PLAN_WORKSPACE_COMPILE_REQUEST_EVENT, onCompileRequest);
    return () => window.removeEventListener(PLAN_WORKSPACE_COMPILE_REQUEST_EVENT, onCompileRequest);
  }, [handleCompilePlan]);

  const performCommercialOfferFetch = useCallback(
    async (accept_domain?: keyof typeof DOMAIN_LABELS) => {
      setCommercialWorking(true);
      try {
        const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
        const res = await api.postOrchestrationCommercialOffer(auditId, {
          schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
          selected_domains: executionPlan.selected_domains,
          change_scenario: scenario,
          season_preset: season,
          ...(planHorizon ? { plan_horizon: planHorizon } : {}),
          ...(accept_domain ? { accept_domain } : {}),
        });
        setCommercialOffer(res);
        if (res.accepted_pack_result) {
          setLastPostRevision({
            roadmap_version: res.accepted_pack_result.roadmap_version,
            diff: res.accepted_pack_result.last_revision_diff,
          });
          setPlanGovernance(res.accepted_pack_result.plan_governance);
          toast.success(ORCHESTRATION_UI_COPY.packBuilt);
          onReload();
        }
      } catch (e) {
        const pg = extractPlanGovernanceFromPackApiError(e);
        if (pg) setPlanGovernance(pg);
        setCommercialOffer(null);
      } finally {
        setCommercialWorking(false);
      }
    },
    [auditId, executionPlan.selected_domains, onReload, scenario, season, planHorizonStart, planHorizonEnd],
  );

  /** Top-level CTA Apply: probe with no accept_domain (initial scan). */
  const handleProbeCommercialOffer = useCallback(async () => {
    await performCommercialOfferFetch(undefined);
  }, [performCommercialOfferFetch]);

  /** Inline-confirm trigger: arms the inline confirmation block for a specific domain. */
  const handleRequestAcceptDomain = useCallback((accept_domain: keyof typeof DOMAIN_LABELS) => {
    setPendingAcceptDomain(accept_domain);
  }, []);

  const handleCancelInlineAccept = useCallback(() => {
    setPendingAcceptDomain(null);
  }, []);

  const handleConfirmInlineAccept = useCallback(
    (accept_domain: keyof typeof DOMAIN_LABELS) => {
      setPendingAcceptDomain(null);
      void performCommercialOfferFetch(accept_domain);
    },
    [performCommercialOfferFetch],
  );

  const toggleStage2Domain = useCallback((d: DomainKey) => {
    setStage2Selection(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }, []);

  const handleSaveStage2Intent = useCallback(async () => {
    setStage2Working(true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        director_stage2_domains: stage2Selection.length > 0 ? stage2Selection : null,
      });
      mergeStrategyLabContextInAuditCache?.(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.directorStage2Intent.saved);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.directorStage2Intent.saveFailed);
    } finally {
      setStage2Working(false);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, onReload, stage2Selection]);

  const handleClearSavedStage2Intent = useCallback(async () => {
    setStage2Working(true);
    setStage2Selection([]);
    try {
      const res = await api.patchStrategyLabContext(auditId, { director_stage2_domains: null });
      mergeStrategyLabContextInAuditCache?.(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.directorStage2Intent.clearSaved);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.directorStage2Intent.saveFailed);
    } finally {
      setStage2Working(false);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, onReload]);

  const handleSaveBoardIdentityPreference = useCallback(async () => {
    setBoardIdentityWorking(true);
    try {
      const res = await api.patchStrategyLabContext(auditId, {
        preserve_board_identity_on_rename: preserveBoardIdentityOnRename ? true : null,
      });
      mergeStrategyLabContextInAuditCache?.(res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.boardIdentity.saveOk);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.boardIdentity.saveFailed);
    } finally {
      setBoardIdentityWorking(false);
    }
  }, [auditId, mergeStrategyLabContextInAuditCache, onReload, preserveBoardIdentityOnRename]);

  const revisionDiffToShow = lastPostRevision?.diff ?? strategy.glc_orchestration_last_revision_diff ?? null;
  const revisionDiffCandidates = useMemo(() => {
    const items = revisionHistory.map(row => ({
      key: `${row.from_version}:${row.to_version}`,
      from_version: row.from_version,
      to_version: row.to_version,
      diff: row.diff,
    }));
    if (lastPostRevision?.diff) {
      const key = `${lastPostRevision.diff.from_version}:${lastPostRevision.diff.to_version}`;
      if (!items.some(item => item.key === key)) {
        items.unshift({
          key,
          from_version: lastPostRevision.diff.from_version,
          to_version: lastPostRevision.diff.to_version,
          diff: lastPostRevision.diff,
        });
      }
    }
    return items;
  }, [revisionHistory, lastPostRevision]);
  const selectedRevisionDiff =
    revisionDiffCandidates.find(item => item.key === selectedRevisionDiffKey)?.diff ?? revisionDiffToShow;
  const roadmapVersionToShow =
    typeof strategy.orchestration_pack_version === 'number' && strategy.orchestration_pack_version > 0
      ? strategy.orchestration_pack_version
      : lastPostRevision?.roadmap_version ?? 0;
  const previewPlanHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);

  /** Whether we have any diagnostics to render flat (governance, revision diff, or pack inspection content). */
  const hasPlanDiagnostics = !!planGovernance || revisionHistory.length > 0 || pack !== null;
  /** Whether revision history sub-block has anything to show. */
  const showRevisionHistorySubsection =
    (APP_FEATURE_FLAGS.revisionHistoryPanelEnabled && revisionHistory.length > 0) ||
    (selectedRevisionDiff !== null && roadmapVersionToShow > 1);

  // Advanced accordion preview tokens — joined with ` · ` so each capability has a hint without expanding.
  const savedStage2Count = strategy.strategy_lab_context?.director_stage2_domains?.length ?? 0;
  const advancedPreviewStage2 = savedStage2Count > 0
    ? STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewStage2Count.replace(
        '{count}',
        String(savedStage2Count),
      )
    : STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewStage2None;
  const advancedPreviewSnapshots = manifestSnapshots.length > 0
    ? STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewSnapshotsCount.replace(
        '{count}',
        String(manifestSnapshots.length),
      )
    : STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewSnapshotsEmpty;
  const advancedPreviewOffers = (commercialOffer?.offers.length ?? 0) > 0
    ? STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewOffersReady
    : STRATEGY_LAB_COPY.orchestrationDisclosure.advancedPreviewOffersIdle;
  const advancedPreviewTokens = [
    APP_FEATURE_FLAGS.strategyLabDirectorStage2IntentEnabled ? advancedPreviewStage2 : null,
    advancedPreviewSnapshots,
    advancedPreviewOffers,
  ].filter((token): token is string => token !== null);
  const advancedPreviewLine = advancedPreviewTokens.join(' · ');

  const planAdvancedDrawer = useOptionalPlanAdvancedDrawer();

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
        working={working}
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
      working,
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
    if (!planAdvancedDrawer) return;
    planAdvancedDrawer.setContent(orchestrationAdvancedBody);
    planAdvancedDrawer.setPreviewLine(advancedPreviewLine);
    return () => {
      planAdvancedDrawer.setContent(null);
      planAdvancedDrawer.setPreviewLine(null);
    };
  }, [planAdvancedDrawer, orchestrationAdvancedBody, advancedPreviewLine]);

  return (
    <div id={ORCHESTRATION_PANEL_DOM_ID} className="bg-card space-y-5 border-b p-4">
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
            disabled={working || compileMutation.isPending}
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
