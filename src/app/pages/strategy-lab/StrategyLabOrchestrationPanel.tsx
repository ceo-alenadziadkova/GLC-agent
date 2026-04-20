import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Path } from '@phosphor-icons/react';

import type { DomainKey } from '@glc/intake-core';
import type { AuditMeta } from '../../data/audit/contracts/core/audit-meta.types';
import type { StrategyRoadmap } from '../../data/audit/contracts/report/report-domain.types';
import type { GlcOrchestrationPackRevisionDiffView } from '../../data/audit/contracts/report/orchestration-pack.types';
import type {
  OrchestrationCommercialOfferResponseDto,
  OrchestrationPlanGovernanceDto,
  OrchestrationPackRevisionHistoryItemDto,
  RoadmapManifestPreviewDto,
  RoadmapManifestSnapshotListItem,
} from '../../data/api/audits-orchestration';
import { api } from '../../data/apiService';
import { ApiError } from '../../data/api-error';
import { DOMAIN_LABELS } from '../../data/auditTypes';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  encodeManifestChangeSignature,
  ORCHESTRATION_CHANGE_SCENARIOS,
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  ORCHESTRATION_SEASON_PRESETS,
  parseOptionalOrchestrationPlanHorizon,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '../../config/orchestration-roadmap-manifest';
import { ORCHESTRATION_PANEL_DOM_ID, ORCHESTRATION_UI_LIMITS } from '../../config/orchestration-ui-limits';
import {
  ORCHESTRATION_LANE_LABELS,
  ORCHESTRATION_PREVIEW_COMPRESSION_LABELS,
  ORCHESTRATION_PREVIEW_DENSITY_LABELS,
  ORCHESTRATION_SCENARIO_LABELS,
  ORCHESTRATION_SEASON_LABELS,
  ORCHESTRATION_UI_COPY,
  type OrchestrationLaneId,
} from '../../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS } from '../../config/orchestration-plan-governance';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { orchestrationNodeTitleMap } from '../../lib/orchestration-timeline-projection';
import { formatAppMediumDateTime } from '../../lib/date-format';
import { useProfile } from '../../hooks/useProfile';
import { buildAppRoute } from '../../config/route-paths';

type ExecutionPlan = NonNullable<AuditMeta['execution_plan']>;

interface StrategyLabOrchestrationPanelProps {
  auditId: string;
  executionPlan: ExecutionPlan;
  strategy: StrategyRoadmap;
  onReload: () => void;
}

function TimelineLinkButton({ auditId }: { auditId: string }) {
  const { isClient } = useProfile();
  const to = isClient ? buildAppRoute.portalTimeline(auditId) : buildAppRoute.timeline(auditId);
  return (
    <Button asChild variant="outline" size="sm" className="no-underline">
      <Link to={to}>{ORCHESTRATION_UI_COPY.commercialAcceptedOpenTimeline}</Link>
    </Button>
  );
}

export function StrategyLabOrchestrationPanel({
  auditId,
  executionPlan,
  strategy,
  onReload,
}: StrategyLabOrchestrationPanelProps) {
  const pack = isGlcOrchestrationPackView(strategy.glc_orchestration_pack) ? strategy.glc_orchestration_pack : null;

  const [scenario, setScenario] = useState<OrchestrationChangeScenario>('hybrid');
  const [season, setSeason] = useState<OrchestrationSeasonPreset>('rolling_90d');
  const [planHorizonStart, setPlanHorizonStart] = useState('');
  const [planHorizonEnd, setPlanHorizonEnd] = useState('');
  const [manifestSnapshotId, setManifestSnapshotId] = useState<string | null>(null);
  const hydratedManifestSnapshotId = useRef<string | null>(null);
  const [manifestSnapshots, setManifestSnapshots] = useState<RoadmapManifestSnapshotListItem[]>([]);
  const [savedManifestSignature, setSavedManifestSignature] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [manifestPreview, setManifestPreview] = useState<RoadmapManifestPreviewDto | null>(null);
  const [manifestPreviewError, setManifestPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lastPostRevision, setLastPostRevision] = useState<{
    roadmap_version: number;
    diff: GlcOrchestrationPackRevisionDiffView | null;
  } | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<OrchestrationPackRevisionHistoryItemDto[]>([]);
  const [selectedRevisionDiffKey, setSelectedRevisionDiffKey] = useState<string | null>(null);
  const [planGovernance, setPlanGovernance] = useState<OrchestrationPlanGovernanceDto | null>(null);
  const [commercialOffer, setCommercialOffer] = useState<OrchestrationCommercialOfferResponseDto | null>(null);
  const [commercialWorking, setCommercialWorking] = useState(false);
  const [analysisDepthFilter, setAnalysisDepthFilter] = useState<'all' | 'baseline' | 'deep'>('all');
  const [stage2Selection, setStage2Selection] = useState<DomainKey[]>(
    () => strategy.strategy_lab_context?.director_stage2_domains ?? [],
  );
  const [stage2Working, setStage2Working] = useState(false);

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
    let cancelled = false;
    if (isGlcOrchestrationPackView(strategy.glc_orchestration_pack)) return;
    void (async () => {
      try {
        const latest = await api.getRoadmapManifestSnapshotLatest(auditId);
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems,
        });
        if (cancelled) return;
        setManifestSnapshots(snapshots);
        if (manifestSnapshotId) return;
        const row = latest.snapshot ?? snapshots[0] ?? null;
        if (!row) return;
        hydratedManifestSnapshotId.current = null;
        setManifestSnapshotId(row.id);
        toast.success(ORCHESTRATION_UI_COPY.snapshotAutoSelected);
      } catch {
        if (!cancelled) {
          setManifestSnapshots([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditId, manifestSnapshotId, strategy.glc_orchestration_pack]);

  useEffect(() => {
    if (!isGlcOrchestrationPackView(strategy.glc_orchestration_pack)) return;
    let cancelled = false;
    void (async () => {
      try {
        const { snapshots } = await api.getRoadmapManifestSnapshots(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxManifestSnapshotHistoryItems,
        });
        if (cancelled) return;
        setManifestSnapshots(snapshots);
      } catch {
        if (!cancelled) setManifestSnapshots([]);
      }
    })();
    return () => {
      cancelled = true;
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
    setSavedManifestSignature(
      encodeManifestChangeSignature({
        change_scenario: row.payload.change_scenario,
        season_preset: row.payload.season_preset,
        plan_horizon: row.payload.plan_horizon,
      }),
    );
  }, [manifestSnapshotId, manifestSnapshots]);

  useEffect(() => {
    let cancelled = false;
    const planHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
    const body = {
      schema_version: ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
      selected_domains: executionPlan.selected_domains,
      change_scenario: scenario,
      season_preset: season,
      ...(planHorizon ? { plan_horizon: planHorizon } : {}),
    };
    const t = window.setTimeout(() => {
      setPreviewLoading(true);
      void (async () => {
        try {
          const { preview } = await api.postOrchestratorPreview(auditId, body);
          if (!cancelled) {
            setManifestPreview(preview);
            setManifestPreviewError(null);
          }
        } catch (e) {
          if (!cancelled) {
            setManifestPreview(null);
            const detail =
              e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
                ? String((e.details as { detail?: unknown }).detail ?? '')
                : '';
            setManifestPreviewError(detail || ORCHESTRATION_UI_COPY.previewFailed);
          }
        } finally {
          if (!cancelled) {
            setPreviewLoading(false);
          }
        }
      })();
    }, ORCHESTRATION_UI_LIMITS.manifestPreviewDebounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [auditId, executionPlan.selected_domains, scenario, season, planHorizonStart, planHorizonEnd]);

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
    let cancelled = false;
    void (async () => {
      try {
        const { items } = await api.getOrchestrationPackDiffHistory(auditId, {
          limit: ORCHESTRATION_UI_LIMITS.maxRevisionDiffHistoryItems,
        });
        if (cancelled) return;
        setRevisionHistory(items);
        if (items.length > 0) {
          const firstKey = `${items[0].from_version}:${items[0].to_version}`;
          setSelectedRevisionDiffKey(prev => prev ?? firstKey);
        }
      } catch {
        if (!cancelled) {
          setRevisionHistory([]);
        }
      }
    })();
    return () => {
      cancelled = true;
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
    return planGovernance.reason_codes.map((code) => ORCHESTRATION_PLAN_GOVERNANCE_REASON_HINTS[code]);
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
      setSavedManifestSignature(
        encodeManifestChangeSignature({
          change_scenario: scenario,
          season_preset: season,
          plan_horizon: planHorizon,
          plan_start_raw: planHorizonStart,
          plan_end_raw: planHorizonEnd,
        }),
      );
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
  }, [auditId, executionPlan.selected_domains, scenario, season, planHorizonStart, planHorizonEnd]);

  const handleBuildPack = useCallback(async () => {
    if (!manifestSnapshotId) return;
    setWorking(true);
    try {
      const res = await api.postOrchestratorRun(auditId, { manifest_snapshot_id: manifestSnapshotId });
      setLastPostRevision({ roadmap_version: res.roadmap_version, diff: res.last_revision_diff });
      setPlanGovernance(res.plan_governance);
      toast.success(ORCHESTRATION_UI_COPY.packBuilt);
      onReload();
    } catch {
      toast.error(ORCHESTRATION_UI_COPY.packBuildFailed);
    } finally {
      setWorking(false);
    }
  }, [auditId, manifestSnapshotId, onReload]);

  const handleFetchCommercialOffer = useCallback(
    async (accept_domain?: keyof typeof DOMAIN_LABELS) => {
      if (accept_domain) {
        const confirmed = window.confirm(ORCHESTRATION_UI_COPY.commercialConfirmAcceptPrompt);
        if (!confirmed) return;
      }
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
      } catch {
        setCommercialOffer(null);
      } finally {
        setCommercialWorking(false);
      }
    },
    [auditId, executionPlan.selected_domains, onReload, scenario, season, planHorizonStart, planHorizonEnd],
  );

  const toggleStage2Domain = useCallback((d: DomainKey) => {
    setStage2Selection(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }, []);

  const handleSaveStage2Intent = useCallback(async () => {
    setStage2Working(true);
    try {
      await api.patchStrategyLabContext(auditId, {
        director_stage2_domains: stage2Selection.length > 0 ? stage2Selection : null,
      });
      toast.success(STRATEGY_LAB_COPY.directorStage2Intent.saved);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.directorStage2Intent.saveFailed);
    } finally {
      setStage2Working(false);
    }
  }, [auditId, onReload, stage2Selection]);

  const handleClearSavedStage2Intent = useCallback(async () => {
    setStage2Working(true);
    setStage2Selection([]);
    try {
      await api.patchStrategyLabContext(auditId, { director_stage2_domains: null });
      toast.success(STRATEGY_LAB_COPY.directorStage2Intent.clearSaved);
      onReload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.directorStage2Intent.saveFailed);
    } finally {
      setStage2Working(false);
    }
  }, [auditId, onReload]);

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
  const currentManifestSignature = encodeManifestChangeSignature({
    change_scenario: scenario,
    season_preset: season,
    plan_horizon: parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd),
    plan_start_raw: planHorizonStart,
    plan_end_raw: planHorizonEnd,
  });
  const hasUnsavedManifestChanges =
    savedManifestSignature !== null && savedManifestSignature !== currentManifestSignature;
  const previewPlanHorizon = parseOptionalOrchestrationPlanHorizon(planHorizonStart, planHorizonEnd);
  const flowSteps = [
    { id: 'scope', label: ORCHESTRATION_UI_COPY.flowScope, done: executionPlan.selected_domains.length > 0 },
    { id: 'preview', label: ORCHESTRATION_UI_COPY.flowPreview, done: manifestPreview !== null && !manifestPreviewError },
    { id: 'confirm', label: ORCHESTRATION_UI_COPY.flowConfirm, done: savedManifestSignature === currentManifestSignature },
    {
      id: 'version',
      label: ORCHESTRATION_UI_COPY.flowVersion,
      done: (typeof strategy.orchestration_pack_version === 'number' && strategy.orchestration_pack_version > 0) || !!lastPostRevision,
    },
  ] as const;

  return (
    <div id={ORCHESTRATION_PANEL_DOM_ID} className="bg-card space-y-4 border-b p-4">
      <div className="flex items-center gap-2">
        <Path className="text-info h-4 w-4" />
        <span className="text-foreground text-sm font-semibold">{ORCHESTRATION_UI_COPY.sectionTitle}</span>
      </div>
      <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.sectionHint}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">{STRATEGY_LAB_COPY.roles.timelineVsLab}</p>

      <div className="bg-background space-y-2 rounded-lg border p-3">
        <div className="text-muted-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.flowTitle}</div>
        <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {flowSteps.map(step => (
            <li key={step.id} className="rounded-md border border-border px-2 py-1">
              <div className="text-foreground font-medium">{step.label}</div>
              <div className="text-muted-foreground">{step.done ? ORCHESTRATION_UI_COPY.flowDone : ORCHESTRATION_UI_COPY.flowPending}</div>
            </li>
          ))}
        </ol>
      </div>

      {APP_FEATURE_FLAGS.strategyLabDirectorStage2IntentEnabled ? (
        <div className="bg-background space-y-2 rounded-lg border p-3">
          <div className="text-muted-foreground text-xs font-semibold">{STRATEGY_LAB_COPY.directorStage2Intent.title}</div>
          <p className="text-muted-foreground text-xs leading-relaxed">{STRATEGY_LAB_COPY.directorStage2Intent.body}</p>
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
            <p className="text-muted-foreground text-xs">
              {STRATEGY_LAB_COPY.directorStage2Intent.selectedSummary}:{' '}
              {(strategy.strategy_lab_context?.director_stage2_domains ?? [])
                .map(d => DOMAIN_LABELS[d] ?? d)
                .join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.coverageLabel}</span>
          <p className="text-foreground mt-1 text-sm">{domainLabels}</p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.scenarioLabel}</span>
          <select
            className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
            value={scenario}
            onChange={e => setScenario(e.target.value as OrchestrationChangeScenario)}
          >
            {ORCHESTRATION_CHANGE_SCENARIOS.map(s => (
              <option key={s} value={s}>
                {ORCHESTRATION_SCENARIO_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.seasonLabel}</span>
          <select
            className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
            value={season}
            onChange={e => setSeason(e.target.value as OrchestrationSeasonPreset)}
          >
            {ORCHESTRATION_SEASON_PRESETS.map(s => (
              <option key={s} value={s}>
                {ORCHESTRATION_SEASON_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.planHorizonLabel}</span>
          <p className="text-muted-foreground text-[length:var(--text-2xs)] leading-relaxed">{ORCHESTRATION_UI_COPY.planHorizonHint}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground text-[length:var(--text-2xs)]">{ORCHESTRATION_UI_COPY.planHorizonStartLabel}</span>
              <input
                type="date"
                className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
                value={planHorizonStart}
                onChange={e => setPlanHorizonStart(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground text-[length:var(--text-2xs)]">{ORCHESTRATION_UI_COPY.planHorizonEndLabel}</span>
              <input
                type="date"
                className="bg-background text-foreground border-border h-9 rounded-md border px-2 text-xs"
                value={planHorizonEnd}
                onChange={e => setPlanHorizonEnd(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-background space-y-2 rounded-lg border p-3">
        <div className="text-muted-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.previewTitle}</div>
        {previewLoading && <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.previewLoading}</p>}
        {manifestPreviewError && <p className="text-danger text-xs">{manifestPreviewError}</p>}
        <ul className="text-foreground space-y-1 text-xs">
          <li>
            <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewDomains}: </span>
            {domainLabels}
          </li>
          <li>
            <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewScenario}: </span>
            {ORCHESTRATION_SCENARIO_LABELS[scenario]}
          </li>
          <li>
            <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewSeason}: </span>
            {ORCHESTRATION_SEASON_LABELS[season]}
          </li>
          {previewPlanHorizon ? (
            <li>
              <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.planHorizonLabel}: </span>
              {previewPlanHorizon.start_date} – {previewPlanHorizon.end_date}
            </li>
          ) : null}
          {manifestPreview && (
            <>
              <li>
                <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewCompression}: </span>
                {ORCHESTRATION_PREVIEW_COMPRESSION_LABELS[manifestPreview.execution_compression_hint]}
              </li>
              <li>
                <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.previewDensity}: </span>
                {ORCHESTRATION_PREVIEW_DENSITY_LABELS[manifestPreview.lane_density_band]}
              </li>
            </>
          )}
        </ul>
        {manifestPreview && (
          <div className="border-border space-y-2 border-t pt-2">
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.previewLanesIncluded}</div>
              <ul className="text-foreground list-inside list-disc text-xs">
                {manifestPreview.lanes_included.map(lane => (
                  <li key={lane}>{ORCHESTRATION_LANE_LABELS[lane]}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.previewLanesCut}</div>
              <ul className="text-foreground list-inside list-disc text-xs">
                {manifestPreview.lanes_cut.length === 0 && <li>—</li>}
                {manifestPreview.lanes_cut.map(lane => (
                  <li key={lane}>{ORCHESTRATION_LANE_LABELS[lane]}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.previewWaitingList}</div>
              <ul className="text-foreground list-inside list-disc text-xs">
                {manifestPreview.waiting_list_domains.length === 0 && <li>—</li>}
                {manifestPreview.waiting_list_domains.map(d => (
                  <li key={d}>{DOMAIN_LABELS[d] ?? d}</li>
                ))}
              </ul>
            </div>
            {manifestPreview.confidence_callouts.length > 0 && (
              <ul className="text-muted-foreground list-inside list-disc text-xs">
                {manifestPreview.confidence_callouts.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={working} onClick={() => void handleSaveManifest()}>
          {ORCHESTRATION_UI_COPY.confirmSaveManifest}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={working || !manifestSnapshotId || hasUnsavedManifestChanges}
          onClick={() => void handleBuildPack()}
        >
          {ORCHESTRATION_UI_COPY.buildPack}
        </Button>
      </div>
      {hasUnsavedManifestChanges && (
        <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.buildPackNeedsManifestSync}</p>
      )}
      <div className="bg-background space-y-2 rounded-lg border p-3">
        <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.snapshotHistoryTitle}</div>
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
                  setSavedManifestSignature(
                    encodeManifestChangeSignature({
                      change_scenario: next.payload.change_scenario,
                      season_preset: next.payload.season_preset,
                      plan_horizon: next.payload.plan_horizon,
                    }),
                  );
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
          <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.snapshotHistoryEmpty}</p>
        )}
        <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.snapshotVersionHint}</p>
      </div>

      <div className="bg-background space-y-2 rounded-lg border p-3">
        <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.commercialOfferTitle}</div>
        <Button
          type="button"
          variant="secondary"
          disabled={commercialWorking}
          onClick={() => void handleFetchCommercialOffer()}
        >
          {commercialWorking ? ORCHESTRATION_UI_COPY.commercialChecking : ORCHESTRATION_UI_COPY.commercialCheckCta}
        </Button>
        {commercialOffer?.offers.length ? (
          <ul className="text-foreground space-y-3 text-xs">
            {commercialOffer.offers.map(row => (
              <li key={row.domain} className="list-none rounded-md border border-border px-3 py-2">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => void handleFetchCommercialOffer(row.domain)}
                >
                  {ORCHESTRATION_UI_COPY.commercialAcceptCta}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {commercialOffer?.base_preview ? (
          <div className="text-muted-foreground space-y-2 text-xs">
            <div className="font-semibold text-foreground">{ORCHESTRATION_UI_COPY.commercialBeforeAfterTitle}</div>
            <div>
              <span className="font-medium">{ORCHESTRATION_UI_COPY.commercialBeforeLabel}: </span>
              {commercialOffer.base_preview.lanes_included
                .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
                .join(', ')}
            </div>
            {commercialOffer.recalculated_preview ? (
              <div>
                <span className="font-medium">{ORCHESTRATION_UI_COPY.commercialAfterLabel}: </span>
                {commercialOffer.recalculated_preview.lanes_included
                  .map(lane => ORCHESTRATION_LANE_LABELS[lane as OrchestrationLaneId] ?? lane)
                  .join(', ')}
              </div>
            ) : null}
          </div>
        ) : null}
        {commercialOffer?.accepted_domain && commercialOffer.recalculated_preview?.lanes_included ? (
          <p className="text-muted-foreground text-xs">
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
            <p className="text-muted-foreground m-0 text-xs">{ORCHESTRATION_UI_COPY.commercialAcceptedReviewTimeline}</p>
            <p className="text-muted-foreground m-0 text-[length:var(--text-2xs)]">
              {ORCHESTRATION_UI_COPY.commercialAcceptedCompareHint}
            </p>
            <TimelineLinkButton auditId={auditId} />
          </div>
        ) : null}
      </div>

      {roadmapVersionToShow > 0 && (
        <p className="text-muted-foreground text-xs">
          {ORCHESTRATION_UI_COPY.roadmapVersionLabel}: {roadmapVersionToShow}
        </p>
      )}

      {planGovernance && (
        <div className="bg-background space-y-2 rounded-lg border p-3">
          <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.governanceTitle}</div>
          <p className="text-muted-foreground text-xs">
            {ORCHESTRATION_UI_COPY.governanceDecisionHintLabel}: {planGovernance.decision_hint}
          </p>
          {pack?.input_quality && (
            <p className="text-muted-foreground text-xs">
              {ORCHESTRATION_UI_COPY.governanceInputHeaderLabel}: {pack.input_quality.input_gate_status} (
              {pack.input_quality.input_mode})
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Status: {planGovernance.status} ({planGovernance.decision}, mode: {planGovernance.rollout_mode})
          </p>
          <p className="text-muted-foreground text-xs">
            {ORCHESTRATION_UI_COPY.governanceScoresLabel}{' '}
            {Math.round(planGovernance.dependency_integrity_score * 100)}% /{' '}
            {Math.round(planGovernance.confidence_coverage_score * 100)}% /{' '}
            {Math.round(planGovernance.risk_coverage_score * 100)}%
          </p>
          <p className="text-muted-foreground text-xs">
            Plan scores: {Math.round(planGovernance.integrity_score * 100)}% /{' '}
            {Math.round(planGovernance.coverage_score * 100)}% /{' '}
            {Math.round(planGovernance.confidence_score * 100)}%
          </p>
          <p className="text-muted-foreground text-xs">
            {ORCHESTRATION_UI_COPY.governanceCriticalPathCoverageLabel}:{' '}
            {Math.round(planGovernance.critical_path_node_ratio * 100)}%
          </p>
          {planGovernance.warnings.length > 0 && (
            <ul className="text-foreground list-inside list-disc text-xs">
              {planGovernance.warnings.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {governanceHints.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">
                {ORCHESTRATION_UI_COPY.governanceReasonHintTitle}
              </div>
              <ul className="text-foreground list-inside list-disc text-xs">
                {governanceHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selectedRevisionDiff && roadmapVersionToShow > 1 && (
        <div className="bg-background space-y-3 rounded-lg border p-3">
          <div className="text-foreground text-xs font-semibold">{ORCHESTRATION_UI_COPY.revisionDiffTitle}</div>
          {revisionDiffCandidates.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">{ORCHESTRATION_UI_COPY.revisionCompareLabel}</span>
              <select
                className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                value={selectedRevisionDiffKey ?? revisionDiffCandidates[0]?.key ?? ''}
                onChange={e => setSelectedRevisionDiffKey(e.target.value)}
              >
                {revisionDiffCandidates.map(item => (
                  <option key={item.key} value={item.key}>
                    v{item.from_version} → v{item.to_version}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-muted-foreground text-xs">
            v{selectedRevisionDiff.from_version} → v{selectedRevisionDiff.to_version}
          </p>
          <ul className="text-foreground space-y-1 text-xs">
            {selectedRevisionDiff.nodes_added.length > 0 && (
              <li>
                <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.revisionNodesAdded}: </span>
                {selectedRevisionDiff.nodes_added.join(', ')}
              </li>
            )}
            {selectedRevisionDiff.nodes_removed.length > 0 && (
              <li>
                <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.revisionNodesRemoved}: </span>
                {selectedRevisionDiff.nodes_removed.join(', ')}
              </li>
            )}
            <li>
              {selectedRevisionDiff.critical_path_changed
                ? ORCHESTRATION_UI_COPY.revisionCriticalPathChanged
                : ORCHESTRATION_UI_COPY.revisionCriticalPathUnchanged}
            </li>
            <li>
              <span className="text-muted-foreground">{ORCHESTRATION_UI_COPY.revisionConflictsResolvedCounts}: </span>
              {selectedRevisionDiff.conflicts_resolved_before} → {selectedRevisionDiff.conflicts_resolved_after}
            </li>
          </ul>
          {selectedRevisionDiff.nodes_lane_changed.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.revisionLaneChanges}</div>
              <ul className="text-foreground list-inside list-disc space-y-1 text-xs">
                {selectedRevisionDiff.nodes_lane_changed
                  .slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffLaneChangesDisplayed)
                  .map(row => {
                    const fromL =
                      row.from_lane in ORCHESTRATION_LANE_LABELS
                        ? ORCHESTRATION_LANE_LABELS[row.from_lane as OrchestrationLaneId]
                        : row.from_lane;
                    const toL =
                      row.to_lane in ORCHESTRATION_LANE_LABELS
                        ? ORCHESTRATION_LANE_LABELS[row.to_lane as OrchestrationLaneId]
                        : row.to_lane;
                    return (
                      <li key={row.id}>
                        {titleById.get(row.id) ?? row.id}{' '}
                        <span className="text-muted-foreground">
                          ({ORCHESTRATION_UI_COPY.revisionLaneChangeRow}: {fromL} → {toL})
                        </span>
                      </li>
                    );
                  })}
              </ul>
              {selectedRevisionDiff.nodes_lane_changed.length >
                ORCHESTRATION_UI_LIMITS.maxRevisionDiffLaneChangesDisplayed && (
                <p className="text-muted-foreground mt-1 text-xs">{ORCHESTRATION_UI_COPY.revisionDiffTruncated}</p>
              )}
            </div>
          )}
          {(selectedRevisionDiff.edges_added.length > 0 || selectedRevisionDiff.edges_removed.length > 0) && (
            <div className="space-y-2 border-t border-border pt-2">
              {selectedRevisionDiff.edges_added.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.revisionEdgesAdded}</div>
                  <ul className="text-foreground list-inside list-disc space-y-1 text-xs">
                    {selectedRevisionDiff.edges_added
                      .slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed)
                      .map((e, i) => (
                        <li key={`a-${e.from}-${e.to}-${i}`}>
                          {titleById.get(e.from) ?? e.from}
                          <span className="text-muted-foreground"> → </span>
                          {titleById.get(e.to) ?? e.to}
                        </li>
                      ))}
                  </ul>
                  {selectedRevisionDiff.edges_added.length > ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed && (
                    <p className="text-muted-foreground mt-1 text-xs">{ORCHESTRATION_UI_COPY.revisionDiffTruncated}</p>
                  )}
                </div>
              )}
              {selectedRevisionDiff.edges_removed.length > 0 && (
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">{ORCHESTRATION_UI_COPY.revisionEdgesRemoved}</div>
                  <ul className="text-foreground list-inside list-disc space-y-1 text-xs">
                    {selectedRevisionDiff.edges_removed
                      .slice(0, ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed)
                      .map((e, i) => (
                        <li key={`r-${e.from}-${e.to}-${i}`}>
                          {titleById.get(e.from) ?? e.from}
                          <span className="text-muted-foreground"> → </span>
                          {titleById.get(e.to) ?? e.to}
                        </li>
                      ))}
                  </ul>
                  {selectedRevisionDiff.edges_removed.length > ORCHESTRATION_UI_LIMITS.maxRevisionDiffEdgesDisplayed && (
                    <p className="text-muted-foreground mt-1 text-xs">{ORCHESTRATION_UI_COPY.revisionDiffTruncated}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {pack ? (
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <div className="text-foreground text-xs font-semibold">{STRATEGY_LAB_COPY.orchestratorTabs.analysisDepth}</div>
            <p className="text-muted-foreground text-[length:var(--text-2xs)]">{STRATEGY_LAB_COPY.depthFilter.hint}</p>
            <div className="flex flex-wrap gap-2">
              {(['all', 'baseline', 'deep'] as const).map(mode => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={analysisDepthFilter === mode ? 'default' : 'outline'}
                  onClick={() => setAnalysisDepthFilter(mode)}
                >
                  {mode === 'all'
                    ? STRATEGY_LAB_COPY.depthFilter.all
                    : mode === 'baseline'
                      ? STRATEGY_LAB_COPY.depthFilter.baseline
                      : STRATEGY_LAB_COPY.depthFilter.deep}
                </Button>
              ))}
            </div>
            <ul className="text-muted-foreground list-inside list-disc text-xs">
              {depthFilteredNodes.length === 0 && <li>—</li>}
              {depthFilteredNodes.map(n => (
                <li key={n.id}>
                  {n.title}{' '}
                  <span className="text-[length:var(--text-2xs)]">
                    ({n.analysis_depth === 'deep' ? ORCHESTRATION_UI_COPY.nodeBadgeDeep : ORCHESTRATION_UI_COPY.nodeBadgeBaseline})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.labDetailLayerHint}</p>
          {synthesisConflicts.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-foreground mb-1 text-xs font-semibold">{ORCHESTRATION_UI_COPY.synthesisSectionTitle}</div>
              <p className="text-muted-foreground mb-2 text-xs">{ORCHESTRATION_UI_COPY.synthesisSectionHint}</p>
              <ul className="text-foreground space-y-2 text-xs">
                {synthesisConflicts.map(row => (
                  <li key={row.id} className="bg-background rounded-md border px-3 py-2">
                    <span className="text-muted-foreground font-medium">
                      {row.resolution === 'synthesis_applied'
                        ? ORCHESTRATION_UI_COPY.synthesisResolutionApplied
                        : ORCHESTRATION_UI_COPY.synthesisResolutionPending}
                      {': '}
                    </span>
                    {row.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.noPackYet}</p>
      )}
    </div>
  );
}
