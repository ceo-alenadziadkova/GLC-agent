import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { Button } from '../../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { toast } from 'sonner';
import { useManifestSavedSignatureBaseline } from '../../hooks/useManifestSavedSignatureBaseline';
import { useDebouncedOrchestratorManifestPreview } from '../../hooks/useDebouncedOrchestratorManifestPreview';
import {
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  parseOptionalOrchestrationPlanHorizon,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_PANEL_DOM_ID, ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS } from '../../config/orchestration-plan-governance';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import {
  extractPlanGovernanceFromPackApiError,
  formatOrchestrationPackRunErrorMessage,
} from '../../lib/orchestration-pack-api-error';
import { orchestrationNodeTitleMap } from '../../lib/orchestration-timeline-projection';
import { formatAppMediumDateTime } from '../../lib/date-format';
import { OrchestrationManifestCoreFields } from './orchestration-panel/OrchestrationManifestCoreFields';
import { OrchestrationPanelDiagnosticsSection } from './orchestration-panel/OrchestrationPanelDiagnosticsSection';
import { StrategyLabOrchestrationManifestPreview } from './StrategyLabOrchestrationManifestPreview';
import { TimelineLinkButton } from './TimelineLinkButton';

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
  const pack = isGlcOrchestrationPackView(strategy.glc_orchestration_pack) ? strategy.glc_orchestration_pack : null;

  const buildPackHintId = useId();
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

  const { hasUnsavedManifestChanges, applySignatureFromManifestPayload, markDraftAsSavedBaseline } =
    useManifestSavedSignatureBaseline({
    scenario,
    season,
    planHorizonStart,
    planHorizonEnd,
  });

  /** Newest-first list from API; server only accepts this id for POST orchestrator run. */
  const latestManifestSnapshotId = useMemo(
    () => (manifestSnapshots.length > 0 ? manifestSnapshots[0]!.id : null),
    [manifestSnapshots],
  );

  useEffect(() => {
    setStage2Selection(strategy.strategy_lab_context?.director_stage2_domains ?? []);
  }, [strategy.strategy_lab_context?.director_stage2_domains]);

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
  ]);

  const handleBuildPack = useCallback(async () => {
    if (!manifestSnapshotId) return;
    let idToRun = latestManifestSnapshotId ?? manifestSnapshotId;
    if (!latestManifestSnapshotId) {
      try {
        const { snapshot } = await api.getRoadmapManifestSnapshotLatest(auditId);
        if (snapshot?.id) idToRun = snapshot.id;
      } catch {
        // keep idToRun; server will reject if stale
      }
    }
    if (latestManifestSnapshotId && latestManifestSnapshotId !== manifestSnapshotId) {
      toast.info(ORCHESTRATION_UI_COPY.buildUsesLatestSnapshot);
    }
    setWorking(true);
    try {
      const res = await api.postOrchestratorRun(auditId, { manifest_snapshot_id: idToRun });
      if (idToRun !== manifestSnapshotId) {
        setManifestSnapshotId(idToRun);
        hydratedManifestSnapshotId.current = null;
      }
      setLastPostRevision({ roadmap_version: res.roadmap_version, diff: res.last_revision_diff });
      setPlanGovernance(res.plan_governance);
      toast.success(ORCHESTRATION_UI_COPY.packBuilt);
      onReload();
    } catch (e) {
      const pg = extractPlanGovernanceFromPackApiError(e);
      if (pg) setPlanGovernance(pg);
      const { message, description } = formatOrchestrationPackRunErrorMessage(e, ORCHESTRATION_UI_COPY.packBuildFailed);
      toast.error(message, description ? { description, duration: 14_000 } : { duration: 6_000 });
    } finally {
      setWorking(false);
    }
  }, [auditId, latestManifestSnapshotId, manifestSnapshotId, onReload]);

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

      {/* CTA hierarchy: Build pack (primary, lg, with icon) + Save snapshot (outline, secondary). */}
      <div className="space-y-2">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            disabled={working}
            onClick={() => void handleSaveManifest()}
            aria-label={STRATEGY_LAB_COPY.panel.saveSnapshotSecondaryAria}
          >
            {ORCHESTRATION_UI_COPY.confirmSaveManifest}
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={working || !manifestSnapshotId || hasUnsavedManifestChanges}
            onClick={() => void handleBuildPack()}
            aria-label={STRATEGY_LAB_COPY.panel.buildPackPrimaryAria}
            aria-describedby={hasUnsavedManifestChanges ? buildPackHintId : undefined}
            className="w-full sm:w-auto"
          >
            <Path className="h-4 w-4" aria-hidden />
            {ORCHESTRATION_UI_COPY.buildPack}
          </Button>
        </div>
        {hasUnsavedManifestChanges && (
          <p id={buildPackHintId} className="text-muted-foreground text-xs max-w-prose">
            {ORCHESTRATION_UI_COPY.buildPackNeedsManifestSync}
          </p>
        )}
      </div>

      {roadmapVersionToShow > 0 && (
        <p className="text-muted-foreground text-xs">
          {ORCHESTRATION_UI_COPY.roadmapVersionLabel}: {roadmapVersionToShow}
        </p>
      )}

      {/* Plan diagnostics (flat, no <details>). Visible whenever there's something to inspect. */}
      {hasPlanDiagnostics ? (
        <OrchestrationPanelDiagnosticsSection
          planGovernance={planGovernance}
          governanceHints={governanceHints}
          pack={pack}
          showRevisionHistorySubsection={showRevisionHistorySubsection}
          revisionHistory={revisionHistory}
          selectedRevisionDiff={selectedRevisionDiff}
          roadmapVersionToShow={roadmapVersionToShow}
          revisionDiffCandidates={revisionDiffCandidates}
          selectedRevisionDiffKey={selectedRevisionDiffKey}
          setSelectedRevisionDiffKey={setSelectedRevisionDiffKey}
          titleById={titleById}
          analysisDepthFilter={analysisDepthFilter}
          setAnalysisDepthFilter={setAnalysisDepthFilter}
          depthFilteredNodes={depthFilteredNodes}
          synthesisConflicts={synthesisConflicts}
        />
      ) : null}

      {/* Advanced settings: single accordion grouping Stage-2 intent + snapshot history + commercial offers.
       * Trigger keeps an always-visible preview line so capabilities stay discoverable without expanding. */}
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
          <AccordionContent className="border-border space-y-5 border-t p-3 pt-4">
            <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">
              {STRATEGY_LAB_COPY.orchestrationDisclosure.advancedHint}
            </p>

          {APP_FEATURE_FLAGS.strategyLabDirectorStage2IntentEnabled ? (
            <section aria-labelledby={advancedStage2HeadingId} className="space-y-2">
              <h4 id={advancedStage2HeadingId} className="text-foreground text-xs font-semibold">
                {STRATEGY_LAB_COPY.orchestrationDisclosure.directorStage2Summary}
              </h4>
              <div className="text-muted-foreground text-xs font-semibold">{STRATEGY_LAB_COPY.directorStage2Intent.title}</div>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">{STRATEGY_LAB_COPY.directorStage2Intent.body}</p>
              <div className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.directorStage2Intent.domainsLabel}</div>
              <ul className="flex flex-col gap-1">
                {executionPlan.selected_domains.map(d => (
                  <li key={d}>
                    <label className="text-foreground flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={stage2Selection.includes(d)}
                        onChange={() => toggleStage2Domain(d)}
                        className="border-border rounded border"
                      />
                      <span>{DOMAIN_LABELS[d] ?? d}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={stage2Working}
                  onClick={() => void handleSaveStage2Intent()}
                >
                  {stage2Working ? STRATEGY_LAB_COPY.directorStage2Intent.saving : STRATEGY_LAB_COPY.directorStage2Intent.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={stage2Working}
                  onClick={() => void handleClearSavedStage2Intent()}
                >
                  {STRATEGY_LAB_COPY.directorStage2Intent.clear}
                </Button>
              </div>
              {(strategy.strategy_lab_context?.director_stage2_domains?.length ?? 0) > 0 ? (
                <p className="text-muted-foreground text-xs max-w-prose">
                  {STRATEGY_LAB_COPY.directorStage2Intent.selectedSummary}:{' '}
                  {(strategy.strategy_lab_context?.director_stage2_domains ?? [])
                    .map(d => DOMAIN_LABELS[d] ?? d)
                    .join(', ')}
                </p>
              ) : null}
            </section>
          ) : null}

          <hr className="border-border" />

          <section aria-labelledby={advancedSnapshotHeadingId} className="space-y-2">
            <h4 id={advancedSnapshotHeadingId} className="text-foreground text-xs font-semibold">
              {ORCHESTRATION_UI_COPY.snapshotHistoryTitle}
            </h4>
            {manifestSnapshots.length > 0 ? (
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.snapshotHistoryLabel}</span>
                <select
                  className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                  value={manifestSnapshotId ?? ''}
                  onChange={e => {
                    const nextId = e.target.value;
                    const next = manifestSnapshots.find(row => row.id === nextId);
                    setManifestSnapshotId(nextId);
                    hydratedManifestSnapshotId.current = null;
                    if (next) {
                      setScenario(next.payload.change_scenario);
                      setSeason(next.payload.season_preset);
                      setPlanHorizonStart(next.payload.plan_horizon?.start_date ?? '');
                      setPlanHorizonEnd(next.payload.plan_horizon?.end_date ?? '');
                      applySignatureFromManifestPayload(next.payload);
                      hydratedManifestSnapshotId.current = nextId;
                    }
                  }}
                >
                  {manifestSnapshots.map(row => (
                    <option key={row.id} value={row.id}>
                      {formatAppMediumDateTime(row.created_at)} · {ORCHESTRATION_SCENARIO_LABELS[row.payload.change_scenario]} ·{' '}
                      {ORCHESTRATION_SEASON_LABELS[row.payload.season_preset]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.snapshotHistoryEmpty}</p>
            )}
            <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.snapshotVersionHint}</p>
          </section>

          <hr className="border-border" />

          <section aria-labelledby={advancedCommercialHeadingId} className="space-y-2">
            <h4 id={advancedCommercialHeadingId} className="text-foreground text-xs font-semibold">
              {ORCHESTRATION_UI_COPY.commercialOfferTitle}
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={commercialWorking}
              onClick={() => void handleProbeCommercialOffer()}
            >
              {commercialWorking ? ORCHESTRATION_UI_COPY.commercialChecking : ORCHESTRATION_UI_COPY.commercialCheckCta}
            </Button>
            {commercialOffer?.offers.length ? (
              <ul className="text-foreground space-y-3 text-xs">
                {commercialOffer.offers.map(row => {
                  const isPending = pendingAcceptDomain === row.domain;
                  const inlineId = isPending ? `${inlineConfirmId}-${row.domain}` : undefined;
                  return (
                    <li key={row.domain} className="list-none rounded-md border border-border px-3 py-2 max-w-prose">
                      <div className="font-medium">
                        {row.value_message} ({row.estimated_incremental_effort_weeks}w)
                      </div>
                      <div className="text-muted-foreground mt-1 text-[length:var(--text-2xs)] font-semibold">
                        {ORCHESTRATION_UI_COPY.commercialWhyNowTitle}
                      </div>
                      <ul className="mt-1 list-inside list-disc text-[length:var(--text-2xs)]">
                        {row.why_now_bullets.map((line, i) => (
                          <li key={`${row.domain}-why-${i}`}>{line}</li>
                        ))}
                      </ul>
                      {isPending ? (
                        <div
                          id={inlineId}
                          role="group"
                          aria-labelledby={`${inlineId}-title`}
                          aria-describedby={`${inlineId}-desc`}
                          className="bg-card border-border mt-2 space-y-2 rounded-md border px-3 py-2"
                          onKeyDown={e => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelInlineAccept();
                            }
                          }}
                        >
                          <h5
                            id={`${inlineId}-title`}
                            className="text-foreground text-xs font-semibold"
                          >
                            {ORCHESTRATION_UI_COPY.commercialConfirmAcceptTitle}
                          </h5>
                          <p
                            id={`${inlineId}-desc`}
                            className="text-muted-foreground text-xs leading-relaxed max-w-prose"
                          >
                            {ORCHESTRATION_UI_COPY.commercialConfirmAcceptDescription}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              autoFocus
                              onClick={() => handleConfirmInlineAccept(row.domain)}
                            >
                              {ORCHESTRATION_UI_COPY.commercialConfirmAcceptConfirm}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelInlineAccept}
                            >
                              {ORCHESTRATION_UI_COPY.commercialConfirmAcceptCancel}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          aria-haspopup="dialog"
                          onClick={() => handleRequestAcceptDomain(row.domain)}
                        >
                          {ORCHESTRATION_UI_COPY.commercialAcceptCta}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {commercialOffer?.base_preview ? (
              <div className="text-muted-foreground space-y-2 text-xs">
                <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.commercialBeforeAfterTitle}</div>
                <div className="max-w-prose">
                  <span className="font-medium">{ORCHESTRATION_UI_COPY.commercialBeforeLabel}: </span>
                  {commercialOffer.base_preview.lanes_included
                    .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
                    .join(', ')}
                </div>
                {commercialOffer.recalculated_preview ? (
                  <div className="max-w-prose">
                    <span className="font-medium">{ORCHESTRATION_UI_COPY.commercialAfterLabel}: </span>
                    {commercialOffer.recalculated_preview.lanes_included
                      .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
                      .join(', ')}
                  </div>
                ) : null}
              </div>
            ) : null}
            {commercialOffer?.accepted_domain && commercialOffer.recalculated_preview?.lanes_included ? (
              <p className="text-muted-foreground text-xs max-w-prose">
                {ORCHESTRATION_UI_COPY.commercialRecalculatedPrefix}{' '}
                {DOMAIN_LABELS[commercialOffer.accepted_domain] ?? commercialOffer.accepted_domain}:{' '}
                {commercialOffer.recalculated_preview.lanes_included
                  .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
                  .join(', ')}
                {commercialOffer.accepted_pack_result?.roadmap_version
                  ? ` · v${commercialOffer.accepted_pack_result.roadmap_version}`
                  : ''}
              </p>
            ) : null}
            {commercialOffer?.accepted_pack_result ? (
              <div className="border-border space-y-2 rounded-md border px-3 py-2">
                <p className="text-muted-foreground m-0 text-xs max-w-prose">{ORCHESTRATION_UI_COPY.commercialAcceptedReviewTimeline}</p>
                <p className="text-muted-foreground m-0 text-[length:var(--text-2xs)] max-w-prose">
                  {ORCHESTRATION_UI_COPY.commercialAcceptedCompareHint}
                </p>
                <TimelineLinkButton auditId={auditId} />
              </div>
            ) : null}
          </section>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
