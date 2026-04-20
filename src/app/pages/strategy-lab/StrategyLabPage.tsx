import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  Lightning, TrendUp, MapTrifold, ArrowRight, Check,
  Target, ArrowsClockwise, ChartBar, CaretDown, ListBullets, SlidersHorizontal,
  Path,
} from '@phosphor-icons/react';
import { AppShell } from '../../components/AppShell';
import { SectionLabel } from '../../components/glc/SectionLabel';
import { useAudit } from '../../hooks/useAudit';
import { useProfile } from '../../hooks/useProfile';
import type { StrategyInitiative } from '../../data/auditTypes';
import { DOMAIN_KEYS, DOMAIN_LABELS } from '../../data/auditTypes';
import type { DomainBenchmarkSnapshot } from '../../data/api/benchmarks';
import { api } from '../../data/apiService';
import { ApiError } from '../../data/api-error';
import { COLOR_TOKENS } from '../../../design-system/tokens/colors';
import {
  STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
  STRATEGY_LAB_DOMAIN_FILTER_ALL,
  STRATEGY_LAB_EXECUTION_PACK_POLICY,
  STRATEGY_LAB_INITIATIVE_DOMAIN_KEYS,
  STRATEGY_LAB_LAYOUT_POLICY,
  STRATEGY_LAB_ROADMAP_EXPORT_POLICY,
  STRATEGY_LAB_SORT_MODES,
  STRATEGY_LAB_TAB_DESCRIPTIONS,
  type StrategyLabDomainFilter,
  type StrategyLabRoadmapTimeframe,
  type StrategyLabSortMode,
} from '../../config/strategy-lab';
import {
  STRATEGY_LAB_UI_BUDGET_BANDS,
  STRATEGY_LAB_UI_COMPANY_STAGES,
  STRATEGY_LAB_UI_TEAM_SCALES,
} from '../../config/strategy-lab-constraints';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import {
  ORCHESTRATION_LAB_FOCUS_QUERY_KEY,
  ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE,
  ORCHESTRATION_PANEL_DOM_ID,
} from '../../config/orchestration-ui-limits';
import { buildAppRoute } from '../../config/route-paths';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { StrategyLabOrchestrationPanel } from './StrategyLabOrchestrationPanel';
import {
  StrategyLabOrchestratorListBody,
  type StrategyLabOrchestratorTabId,
} from './StrategyLabOrchestratorListBody';
import { OrchestrationNodeDetailCard } from './OrchestrationNodeDetailCard';
import { cn } from '../../components/ui/utils';
import { Button } from '../../components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import { useIsMobile } from '../../components/ui/use-mobile';
import { toast } from 'sonner';
import {
  buildStrategyLabRoadmapMarkdown,
  downloadTextFile,
  strategyLabRoadmapExportFileName,
} from '../../lib/strategy-lab-roadmap-export';
import { sortStrategyInitiatives } from '../../lib/strategy-lab-sort';
import type { StrategyExecutionPackResponse } from '../../data/audit/contracts/report/strategy-lab.types';

const TABS: {
  key: StrategyLabRoadmapTimeframe;
  label: string;
  icon: typeof Lightning;
  toneClass: string;
  desc: string;
}[] = [
  { key: 'quick', label: STRATEGY_LAB_COPY.tabLabels.quick, icon: Lightning, toneClass: 'text-warning', desc: STRATEGY_LAB_TAB_DESCRIPTIONS.quick },
  { key: 'medium', label: STRATEGY_LAB_COPY.tabLabels.medium, icon: TrendUp, toneClass: 'text-info', desc: STRATEGY_LAB_TAB_DESCRIPTIONS.medium },
  { key: 'strategic', label: STRATEGY_LAB_COPY.tabLabels.strategic, icon: MapTrifold, toneClass: 'text-violet-500', desc: STRATEGY_LAB_TAB_DESCRIPTIONS.strategic },
];

function normalizeAuditIndustryKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return t.length > 0 ? t : null;
}

const EFFORT_CLASS: Record<string, string> = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-destructive',
};

export function StrategyLab() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { audit, loading, error, reload } = useAudit(id);
  const { isClient } = useProfile();
  const [activeTab, setActiveTab] = useState<StrategyLabRoadmapTimeframe>('quick');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [domainFilter, setDomainFilter] = useState<StrategyLabDomainFilter>(STRATEGY_LAB_DOMAIN_FILTER_ALL);
  const [sortMode, setSortMode] = useState<StrategyLabSortMode>('roi');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orchestratorTab, setOrchestratorTab] = useState<StrategyLabOrchestratorTabId>('now');
  const [executionLoading, setExecutionLoading] = useState(false);
  const [lastPack, setLastPack] = useState<StrategyExecutionPackResponse | null>(null);
  const [domainBenchmarks, setDomainBenchmarks] = useState<
    Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>
  >({});
  const [constraintStageDraft, setConstraintStageDraft] = useState<string>('growth');
  const [constraintBudgetDraft, setConstraintBudgetDraft] = useState<string>('unknown');
  const [constraintTeamDraft, setConstraintTeamDraft] = useState<string>('unknown');
  const [constraintSaving, setConstraintSaving] = useState(false);

  const glcPackView = useMemo(() => {
    const raw = audit?.strategy?.glc_orchestration_pack;
    return isGlcOrchestrationPackView(raw) ? raw : null;
  }, [audit?.strategy?.glc_orchestration_pack]);

  const selectedPackNodeId = searchParams.get('node');

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

  useEffect(() => {
    const focus = searchParams.get(ORCHESTRATION_LAB_FOCUS_QUERY_KEY);
    if (
      focus !== ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE ||
      !APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled ||
      isClient
    ) {
      return;
    }
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete(ORCHESTRATION_LAB_FOCUS_QUERY_KEY);
        return next;
      },
      { replace: true },
    );
    window.setTimeout(() => {
      document.getElementById(ORCHESTRATION_PANEL_DOM_ID)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 150);
  }, [searchParams, setSearchParams, isClient]);

  useEffect(() => {
    if (!audit?.strategy || isClient) return;
    const ec = audit.strategy.effective_constraints;
    if (ec && typeof ec.company_stage === 'string') {
      setConstraintStageDraft(ec.company_stage);
      setConstraintBudgetDraft(ec.budget_band);
      setConstraintTeamDraft(ec.team_scale);
      return;
    }
    setConstraintStageDraft('growth');
    setConstraintBudgetDraft('unknown');
    setConstraintTeamDraft('unknown');
  }, [audit?.strategy, isClient]);

  useEffect(() => {
    if (!audit?.strategy || isClient) return;
    let cancelled = false;
    const ind = normalizeAuditIndustryKey(audit.meta?.industry);
    void (async () => {
      const entries = await Promise.all(
        DOMAIN_KEYS.map(async (dk) => {
          let snap = ind
            ? await api.getLatestSnapshot({ phase_id: dk, industry: ind, period: STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD })
            : null;
          if (!snap) {
            snap = await api.getLatestSnapshot({
              phase_id: dk,
              industry: 'all',
              period: STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
            });
          }
          return [dk, snap] as const;
        }),
      );
      if (!cancelled) {
        setDomainBenchmarks(Object.fromEntries(entries) as Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audit?.strategy, audit?.meta?.industry, isClient]);

  const initiatives = useMemo(() => {
    if (!audit?.strategy) return { quick: [], medium: [], strategic: [] };
    return {
      quick: audit.strategy.quick_wins || [],
      medium: audit.strategy.medium_term || [],
      strategic: audit.strategy.strategic || [],
    };
  }, [audit?.strategy]);

  const visible = initiatives[activeTab];
  const filteredVisible = useMemo(() => {
    const base = visible.filter(
      i => domainFilter === STRATEGY_LAB_DOMAIN_FILTER_ALL || i.domain === domainFilter,
    );
    return sortStrategyInitiatives(base, sortMode);
  }, [visible, domainFilter, sortMode]);

  const roadmapMarkdownPreview = useMemo(() => {
    if (!audit?.strategy || selected.size === 0) return null;
    const selectedByTimeframe = {
      quick: initiatives.quick.filter(i => selected.has(i.id)),
      medium: initiatives.medium.filter(i => selected.has(i.id)),
      strategic: initiatives.strategic.filter(i => selected.has(i.id)),
    };
    return buildStrategyLabRoadmapMarkdown({
      title: STRATEGY_LAB_COPY.export.documentTitle,
      companyLabel: STRATEGY_LAB_COPY.export.companyLabel,
      urlLabel: STRATEGY_LAB_COPY.export.urlLabel,
      auditIdLabel: STRATEGY_LAB_COPY.export.auditIdLabel,
      generatedOnLabel: STRATEGY_LAB_COPY.export.generatedOnLabel,
      executiveSummaryHeading: STRATEGY_LAB_COPY.export.executiveSummaryHeading,
      selectedHeading: STRATEGY_LAB_COPY.export.selectedInitiativesHeading,
      sectionLabels: {
        quick: STRATEGY_LAB_COPY.tabLabels.quick,
        medium: STRATEGY_LAB_COPY.tabLabels.medium,
        strategic: STRATEGY_LAB_COPY.tabLabels.strategic,
      },
      impactLabel: STRATEGY_LAB_COPY.export.impactLabel,
      effortLabel: STRATEGY_LAB_COPY.export.effortLabel,
      dependenciesLabel: STRATEGY_LAB_COPY.export.dependenciesLabel,
      missingFieldValue: STRATEGY_LAB_COPY.export.missingFieldValue,
      companyName: audit.meta.company_name,
      companyUrl: audit.meta.company_url,
      auditId: audit.meta.id,
      executiveSummary: audit.strategy.executive_summary,
      selectedByTimeframe,
    });
  }, [audit, initiatives, selected]);

  const allInitiatives = [...initiatives.quick, ...initiatives.medium, ...initiatives.strategic];
  const allSelected = allInitiatives.filter(i => selected.has(i.id));

  const handleGenerateRoadmap = useCallback(() => {
    if (!roadmapMarkdownPreview || !audit?.strategy) return;
    const fileName = strategyLabRoadmapExportFileName(audit.meta, new Date());
    downloadTextFile(fileName, roadmapMarkdownPreview, STRATEGY_LAB_ROADMAP_EXPORT_POLICY.markdownDownloadMimeType);
    toast.success(STRATEGY_LAB_COPY.toasts.roadmapDownloaded);
  }, [audit, roadmapMarkdownPreview]);

  const handleSaveConstraintOverrides = useCallback(async () => {
    if (!id) return;
    setConstraintSaving(true);
    try {
      await api.patchStrategyLabContext(id, {
        company_stage: constraintStageDraft,
        budget_band: constraintBudgetDraft,
        team_scale: constraintTeamDraft,
      });
      toast.success(STRATEGY_LAB_COPY.constraints.saveOk);
      reload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.constraints.saveFailed);
    } finally {
      setConstraintSaving(false);
    }
  }, [id, constraintStageDraft, constraintBudgetDraft, constraintTeamDraft, reload]);

  const handleClearConstraintOverrides = useCallback(async () => {
    if (!id) return;
    setConstraintSaving(true);
    try {
      await api.patchStrategyLabContext(id, {
        company_stage: null,
        budget_band: null,
        team_scale: null,
      });
      toast.success(STRATEGY_LAB_COPY.constraints.clearOk);
      reload();
    } catch {
      toast.error(STRATEGY_LAB_COPY.constraints.saveFailed);
    } finally {
      setConstraintSaving(false);
    }
  }, [id, reload]);

  const handleGenerateExecutionPlan = useCallback(async () => {
    if (!id || selected.size === 0) return;
    const initiative_ids = Array.from(selected);
    if (initiative_ids.length > STRATEGY_LAB_EXECUTION_PACK_POLICY.maxInitiativesPerRequest) {
      toast.error(
        STRATEGY_LAB_COPY.panel.executionPlanTooMany.replace(
          '{max}',
          String(STRATEGY_LAB_EXECUTION_PACK_POLICY.maxInitiativesPerRequest),
        ),
      );
      return;
    }
    setExecutionLoading(true);
    try {
      const res = await api.postStrategyExecutionPack(id, { initiative_ids });
      setLastPack(res);
      toast.success(STRATEGY_LAB_COPY.panel.executionPlanDone);
    } catch (e) {
      const detail =
        e instanceof ApiError && e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
          ? String((e.details as { detail?: unknown }).detail ?? '')
          : '';
      toast.error(
        detail ? `${STRATEGY_LAB_COPY.panel.executionPlanFailed} (${detail})` : STRATEGY_LAB_COPY.panel.executionPlanFailed,
      );
    } finally {
      setExecutionLoading(false);
    }
  }, [id, selected]);

  function toggle(initId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(initId) ? next.delete(initId) : next.add(initId);
      return next;
    });
  }

  if (loading && !audit) {
    return (
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.loadingSubtitle}>
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="text-info h-6 w-6 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.errorSubtitle}>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{error || STRATEGY_LAB_COPY.messages.auditNotFound}</p>
        </div>
      </AppShell>
    );
  }

  const orchestrationUiEnabled = APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;
  const clientOrchestrationLabReadOnlyEnabled = APP_FEATURE_FLAGS.clientOrchestrationLabReadOnlyEnabled;
  const orchestrationPackReady = glcPackView != null;
  const useOrchestratorPrimaryNav = orchestrationUiEnabled;
  const showLegacyRoadmapComposer = !useOrchestratorPrimaryNav;
  const executionPlanForRoadmap = audit.meta.execution_plan ?? null;
  const reportHref = id
    ? isClient
      ? buildAppRoute.portalReports(id)
      : buildAppRoute.reports(id)
    : isClient
      ? '/portal/reports'
      : '/reports';
  const timelineHref = id
    ? isClient
      ? buildAppRoute.portalTimeline(id)
      : buildAppRoute.timeline(id)
    : reportHref;

  if (!audit.strategy) {
    return (
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.unavailableSubtitle}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MapTrifold className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">{STRATEGY_LAB_COPY.messages.notGenerated}</p>
            <p className="text-muted-foreground mt-1 text-xs">{STRATEGY_LAB_COPY.messages.completePipeline}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={STRATEGY_LAB_COPY.appShell.title}
      subtitle={STRATEGY_LAB_COPY.appShell.subtitle}
      actions={
        !useOrchestratorPrimaryNav ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-success text-xs font-mono font-semibold">
              {selected.size} {STRATEGY_LAB_COPY.panel.selectedSuffix}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={selected.size === 0 || executionLoading}
              className={cn(selected.size === 0 ? 'opacity-40' : '')}
              onClick={handleGenerateExecutionPlan}
            >
              <ListBullets className="w-4 h-4" />
              {executionLoading ? STRATEGY_LAB_COPY.panel.executionPlanRunning : STRATEGY_LAB_COPY.panel.generateExecutionPlan}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={selected.size === 0}
              className={cn(selected.size === 0 ? 'opacity-40' : '')}
              onClick={handleGenerateRoadmap}
            >{STRATEGY_LAB_COPY.panel.generateRoadmap}
            </Button>
          </div>
        ) : null
      }
    >
      {orchestrationUiEnabled && isClient && glcPackView && clientOrchestrationLabReadOnlyEnabled ? (
        <div className="bg-card flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">{ORCHESTRATION_UI_COPY.clientTimelineReadOnlyHint}</p>
          <Button asChild variant="outline" size="sm" className="no-underline w-fit">
            <Link to={timelineHref}>{ORCHESTRATION_UI_COPY.clientOpenFullTimeline}</Link>
          </Button>
        </div>
      ) : orchestrationUiEnabled && isClient ? (
        <div className="text-muted-foreground border-b bg-card px-4 py-2 text-center text-xs">
          {ORCHESTRATION_UI_COPY.clientHidden}
        </div>
      ) : null}
      {orchestrationUiEnabled && !isClient && audit.strategy && executionPlanForRoadmap && (
        <StrategyLabOrchestrationPanel
          auditId={audit.meta.id}
          executionPlan={executionPlanForRoadmap}
          strategy={audit.strategy}
          onReload={reload}
        />
      )}
      <ResizablePanelGroup
        direction="horizontal"
        className="ds-audit-workspace-main-h"
        autoSaveId={STRATEGY_LAB_LAYOUT_POLICY.sidebarLayoutAutoSaveId}
      >

        {/* ── Initiative picker ─────────────────────── */}
        <ResizablePanel
          id="strategy-lab-main"
          order={1}
          defaultSize={isMobile
            ? 100 - STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMobileFixedSizePct
            : 100 - STRATEGY_LAB_LAYOUT_POLICY.summaryPanelDefaultSizePct}
          minSize={isMobile
            ? 100 - STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMobileFixedSizePct
            : STRATEGY_LAB_LAYOUT_POLICY.mainPanelMinSizePct}
          maxSize={isMobile
            ? 100 - STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMobileFixedSizePct
            : undefined}
          className="min-w-0"
        >
        <div className="bg-background h-full min-h-0 flex-1 overflow-y-auto">
          {!isClient && (
            <>
              {APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled ? (
                <div className="border-b bg-card px-4 py-3">
                  <p className="text-muted-foreground text-xs leading-relaxed">{STRATEGY_LAB_COPY.roles.timelineVsLab}</p>
                </div>
              ) : null}
              <div
                className="space-y-3 border-b bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <ChartBar className="text-info h-4 w-4" />
                  <span className="text-foreground text-sm font-semibold">
                    {STRATEGY_LAB_COPY.panel.domainBenchmarksTitle}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {STRATEGY_LAB_COPY.panel.domainBenchmarksHint}
                </p>
                <div className="space-y-2">
                  {DOMAIN_KEYS.map((dk) => {
                    const row = domainBenchmarks[dk];
                    const label = DOMAIN_LABELS[dk] ?? dk;
                    return (
                      <div
                        key={dk}
                        className="bg-background flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground font-mono tabular-nums">
                          {row
                            ? `p50 ${row.percentiles.p50} · n=${row.sample_count}`
                            : STRATEGY_LAB_COPY.panel.emptyBenchmarksValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3 border-b bg-card p-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="text-info h-4 w-4" />
                  <span className="text-foreground text-sm font-semibold">{STRATEGY_LAB_COPY.constraints.sectionTitle}</span>
                </div>
                <p className="text-muted-foreground text-xs">{STRATEGY_LAB_COPY.constraints.sectionHint}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.constraints.companyStage}</span>
                    <select
                      className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                      value={constraintStageDraft}
                      onChange={e => setConstraintStageDraft(e.target.value)}
                    >
                      {STRATEGY_LAB_UI_COMPANY_STAGES.map(s => (
                        <option key={s} value={s}>
                          {STRATEGY_LAB_COPY.constraints.optionLabels.stage[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.constraints.budgetBand}</span>
                    <select
                      className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                      value={constraintBudgetDraft}
                      onChange={e => setConstraintBudgetDraft(e.target.value)}
                    >
                      {STRATEGY_LAB_UI_BUDGET_BANDS.map(b => (
                        <option key={b} value={b}>
                          {STRATEGY_LAB_COPY.constraints.optionLabels.budget[b]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.constraints.teamScale}</span>
                    <select
                      className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                      value={constraintTeamDraft}
                      onChange={e => setConstraintTeamDraft(e.target.value)}
                    >
                      {STRATEGY_LAB_UI_TEAM_SCALES.map(t => (
                        <option key={t} value={t}>
                          {STRATEGY_LAB_COPY.constraints.optionLabels.team[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="default"
                    disabled={constraintSaving}
                    onClick={() => void handleSaveConstraintOverrides()}
                  >
                    {STRATEGY_LAB_COPY.constraints.save}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={constraintSaving}
                    onClick={() => void handleClearConstraintOverrides()}
                  >
                    {STRATEGY_LAB_COPY.constraints.useBrief}
                  </Button>
                </div>
              </div>
            </>
          )}
          {showLegacyRoadmapComposer ? (
            <div className="bg-background flex flex-wrap items-end gap-3 border-b px-4 py-3">
              <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.panel.filterDomainLabel}</span>
                <select
                  className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                  value={domainFilter}
                  onChange={e => setDomainFilter(e.target.value as StrategyLabDomainFilter)}
                >
                  <option value={STRATEGY_LAB_DOMAIN_FILTER_ALL}>{STRATEGY_LAB_COPY.panel.domainFilterAll}</option>
                  {STRATEGY_LAB_INITIATIVE_DOMAIN_KEYS.map(dk => (
                    <option key={dk} value={dk}>
                      {DOMAIN_LABELS[dk as keyof typeof DOMAIN_LABELS] ?? dk}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">{STRATEGY_LAB_COPY.panel.sortModeLabel}</span>
                <select
                  className="bg-card text-foreground border-border h-9 rounded-md border px-2 text-xs"
                  value={sortMode}
                  onChange={e => setSortMode(e.target.value as StrategyLabSortMode)}
                >
                  {STRATEGY_LAB_SORT_MODES.map(m => (
                    <option key={m} value={m}>
                      {STRATEGY_LAB_COPY.panel.sortModes[m]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          {/* Tabs */}
          {showLegacyRoadmapComposer ? (
            <div
              className="bg-background/90 sticky top-0 z-10 flex gap-2 border-b p-4 backdrop-blur"
            >
              {TABS.map(tab => {
                  const I = tab.icon;
                  const active = activeTab === tab.key;
                  const count = initiatives[tab.key].length;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'relative flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm transition-all',
                        active ? 'text-foreground bg-card shadow-sm' : 'text-muted-foreground border-transparent bg-transparent',
                        orchestrationUiEnabled && orchestrationPackReady && 'opacity-80',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="tab-indicator"
                          className={cn('absolute inset-0 rounded-xl border bg-current/10', tab.toneClass)}
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                        />
                      )}
                      <I className={cn('relative h-4 w-4', active ? tab.toneClass : 'text-current')} />
                      <span className="relative font-semibold text-xs">{tab.label} ({count})</span>
                      <span className={cn('relative text-[length:var(--text-2xs)]', active ? tab.toneClass : 'text-muted-foreground')}>
                        {tab.desc}
                      </span>
                    </button>
                  );
                })}
            </div>
          ) : null}

          {/* Initiative list */}
          {showLegacyRoadmapComposer ? (
            <div className="p-4 space-y-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                  <>
                      {filteredVisible.length === 0 && (
                        <div className="text-center py-10">
                          <p className="text-muted-foreground text-sm">
                            {STRATEGY_LAB_COPY.panel.noInitiativesInCategory}
                          </p>
                        </div>
                      )}
                      {filteredVisible.map((init: StrategyInitiative, i: number) => {
                  const sel = selected.has(init.id);
                  const expanded = expandedId === init.id;
                  return (
                    <motion.div
                      key={init.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.045, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        'w-full rounded-xl border text-left transition-all',
                        sel ? 'border-primary/40 bg-primary/10 shadow-xs ring-2 ring-primary/10' : 'border-border bg-card shadow-xs',
                      )}
                    >
                      <div className="flex items-start gap-2 p-4">
                        <button
                          type="button"
                          aria-pressed={sel}
                          onClick={() => toggle(init.id)}
                          className={cn(
                            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
                            sel ? 'border-primary bg-primary' : 'border-border bg-muted',
                          )}
                        >
                          {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </button>
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => toggle(init.id)}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-foreground text-sm font-medium">{init.title}</span>
                            {init.domain ? (
                              <span className="text-muted-foreground text-[length:var(--text-2xs)] font-mono uppercase">
                                {init.domain}
                              </span>
                            ) : null}
                          </div>
                          {init.description ? (
                            <p className="text-muted-foreground mb-2 text-xs leading-relaxed">{init.description}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[length:var(--text-2xs)] font-semibold">
                              {init.impact} {STRATEGY_LAB_COPY.panel.labels.impact}
                            </span>
                            <span className={cn('text-xs font-semibold', EFFORT_CLASS[init.effort] ?? 'text-muted-foreground')}>
                              {init.effort} {STRATEGY_LAB_COPY.panel.labels.effort}
                            </span>
                            {typeof init.evidence_verified === 'boolean' ? (
                              <span className={cn('text-[length:var(--text-2xs)] font-medium', init.evidence_verified ? 'text-success' : 'text-warning')}>
                                {init.evidence_verified ? STRATEGY_LAB_COPY.panel.labels.verified : STRATEGY_LAB_COPY.panel.labels.unverified}
                              </span>
                            ) : null}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          className="text-muted-foreground hover:text-foreground flex-shrink-0 p-1"
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedId(expanded ? null : init.id);
                          }}
                        >
                          <CaretDown className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : '')} />
                        </button>
                      </div>
                      {expanded ? (
                        <div className="text-muted-foreground space-y-2 border-t px-4 py-3 text-xs leading-relaxed">
                          {init.decision?.why_this?.length ? (
                            <div>
                              <p className="text-foreground mb-1 font-semibold">{STRATEGY_LAB_COPY.panel.labels.why}</p>
                              <ul className="list-inside list-disc space-y-0.5">
                                {init.decision.why_this.map((s, idx) => (
                                  <li key={`${init.id}-why-${idx}`}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {init.outcome?.description ? (
                            <div>
                              <p className="text-foreground mb-1 font-semibold">{STRATEGY_LAB_COPY.panel.labels.outcome}</p>
                              <p>{init.outcome.description}</p>
                            </div>
                          ) : null}
                          {init.scope?.includes?.length ? (
                            <div>
                              <p className="text-foreground mb-1 font-semibold">{STRATEGY_LAB_COPY.panel.labels.scopeIn}</p>
                              <ul className="list-inside list-disc space-y-0.5">
                                {init.scope.includes.map((s, idx) => (
                                  <li key={`${init.id}-in-${idx}`}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {init.execution_paths?.length ? (
                            <div>
                              <p className="text-foreground mb-1 font-semibold">{STRATEGY_LAB_COPY.panel.labels.paths}</p>
                              <ul className="space-y-1">
                                {init.execution_paths.map(p => (
                                  <li key={`${init.id}-${p.type}`}>
                                    <span className="text-foreground font-medium">{p.type}</span>
                                    {p.incompatible ? (
                                      <span className="text-warning ml-2">({STRATEGY_LAB_COPY.panel.labels.incompatible})</span>
                                    ) : null}
                                    : {p.description} ({p.time_estimate})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </motion.div>
                  );
                      })}
                    </>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-4">
              {glcPackView && !isClient ? (
                <div className="space-y-4">
                  <div
                    role="tablist"
                    aria-label={STRATEGY_LAB_COPY.orchestratorTabs.tablistAriaLabel}
                    className="flex flex-wrap gap-2 border-b border-border pb-3"
                  >
                    {(
                      [
                        ['now', STRATEGY_LAB_COPY.orchestratorTabs.now, STRATEGY_LAB_COPY.orchestratorTabs.nowDesc],
                        ['next', STRATEGY_LAB_COPY.orchestratorTabs.next, STRATEGY_LAB_COPY.orchestratorTabs.nextDesc],
                        [
                          'dependencies',
                          STRATEGY_LAB_COPY.orchestratorTabs.dependencies,
                          STRATEGY_LAB_COPY.orchestratorTabs.dependenciesDesc,
                        ],
                        ['risks', STRATEGY_LAB_COPY.orchestratorTabs.risks, STRATEGY_LAB_COPY.orchestratorTabs.risksDesc],
                      ] as const
                    ).map(([key, label, desc]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={orchestratorTab === key}
                        onClick={() => setOrchestratorTab(key)}
                        className={cn(
                          'flex min-w-[5.5rem] flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition-colors sm:min-w-0 sm:flex-none',
                          orchestratorTab === key
                            ? 'border-primary/40 bg-primary/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-[length:var(--text-2xs)] leading-snug opacity-90">{desc}</span>
                      </button>
                    ))}
                  </div>
                  <div role="tabpanel" aria-label={STRATEGY_LAB_COPY.orchestratorTabs[orchestratorTab]}>
                    <StrategyLabOrchestratorListBody
                      pack={glcPackView}
                      tab={orchestratorTab}
                      selectedNodeId={selectedPackNodeId}
                      onSelectNode={setSelectedPackNodeId}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-background rounded-xl border p-4">
                  <p className="text-foreground text-sm font-semibold">
                    {ORCHESTRATION_UI_COPY.timelineTitle}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {ORCHESTRATION_UI_COPY.timelineHint}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" className="no-underline">
                      <Link to={timelineHref}>
                        <Path className="h-4 w-4" />
                        {ORCHESTRATION_UI_COPY.clientOpenFullTimeline}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="no-underline">
                      <Link to={reportHref}>{STRATEGY_LAB_COPY.panel.viewReport}</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </ResizablePanel>

        {!isMobile && (
          <ResizableHandle
            aria-label={STRATEGY_LAB_COPY.panel.resizeHandle}
            title={STRATEGY_LAB_COPY.panel.resizeHint}
            className="w-1.5 bg-[var(--border-subtle)] after:w-1.5"
          />
        )}

        {/* ── Plan summary ──────────────────────────── */}
        <ResizablePanel
          id="strategy-lab-summary"
          order={2}
          defaultSize={isMobile
            ? STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMobileFixedSizePct
            : STRATEGY_LAB_LAYOUT_POLICY.summaryPanelDefaultSizePct}
          minSize={isMobile
            ? STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMobileFixedSizePct
            : STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMinSizePct}
          maxSize={isMobile
            ? STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMobileFixedSizePct
            : STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMaxSizePct}
          className="min-w-0"
        >
        <div className="bg-card flex h-full min-h-0 w-full flex-col overflow-y-auto">
          <div className="p-5 flex-1 space-y-5">
            <div>
              <SectionLabel>{STRATEGY_LAB_COPY.panel.yourRoadmap}</SectionLabel>
              <p className="text-muted-foreground mt-1 text-xs">
                {selected.size} {STRATEGY_LAB_COPY.panel.initiativesSelectedSuffix}
              </p>
            </div>

            {glcPackView && selectedPackNodeId ? (
              <OrchestrationNodeDetailCard
                pack={glcPackView}
                nodeId={selectedPackNodeId}
                onClear={() => setSelectedPackNodeId(null)}
              />
            ) : null}

            {glcPackView && !selectedPackNodeId ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs leading-relaxed">
                {STRATEGY_LAB_COPY.orchestratorTabs.pickNode}
              </p>
            ) : null}

            {!useOrchestratorPrimaryNav ? (
              <>
                <div className="space-y-2">
                  {[
                    { label: STRATEGY_LAB_COPY.panel.totalInitiatives, value: `${selected.size}`, color: 'var(--text-primary)' },
                    { label: STRATEGY_LAB_COPY.panel.quickWins, value: `${allSelected.filter(i => initiatives.quick.includes(i)).length}`, color: 'var(--glc-green)' },
                    { label: STRATEGY_LAB_COPY.panel.strategicItems, value: `${allSelected.filter(i => initiatives.strategic.includes(i)).length}`, color: COLOR_TOKENS.semantic.uiSemantic.strategicPurple },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-background flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <span className={cn('text-sm font-bold tabular-nums', color === 'var(--text-primary)' ? 'text-foreground' : color === 'var(--glc-green)' ? 'text-success' : 'text-violet-500')}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {!useOrchestratorPrimaryNav ? (
              <div className="space-y-2">
                <SectionLabel className="mb-1">{STRATEGY_LAB_COPY.panel.roadmapPreviewTitle}</SectionLabel>
                <p className="text-muted-foreground text-[length:var(--text-2xs)]">{STRATEGY_LAB_COPY.panel.roadmapPreviewHint}</p>
                {roadmapMarkdownPreview ? (
                  <div
                    className="bg-background max-h-[min(50vh,26rem)] overflow-auto rounded-lg border"
                    role="region"
                    aria-label={STRATEGY_LAB_COPY.panel.roadmapPreviewTitle}
                  >
                    <pre className="text-foreground whitespace-pre-wrap break-words p-3 font-mono text-[length:var(--text-2xs)] leading-relaxed">
                      {roadmapMarkdownPreview}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs leading-relaxed">
                    {STRATEGY_LAB_COPY.panel.roadmapPreviewEmpty}
                  </p>
                )}
              </div>
            ) : null}

            {/* Effort mix */}
            {!useOrchestratorPrimaryNav ? (
              <div>
                <SectionLabel className="mb-2">{STRATEGY_LAB_COPY.panel.effortMix}</SectionLabel>
              {(['low', 'medium', 'high'] as const).map(effort => {
                const count = allSelected.filter(i => i.effort === effort).length;
                const pct   = selected.size > 0 ? (count / selected.size) * 100 : 0;
                return (
                  <div key={effort} className="flex items-center gap-2 mb-2">
                    <span className="text-muted-foreground w-14 flex-shrink-0 text-xs capitalize">{effort}</span>
                    <div className="bg-border h-1 flex-1 overflow-hidden rounded-full">
                      <motion.div
                        className={cn('h-full rounded-full', effort === 'low' ? 'bg-success' : effort === 'medium' ? 'bg-warning' : 'bg-destructive')}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className={cn('w-6 flex-shrink-0 text-right font-mono text-xs tabular-nums', EFFORT_CLASS[effort])}>
                      {count}
                    </span>
                  </div>
                );
              })}
              </div>
            ) : null}

            {!useOrchestratorPrimaryNav && lastPack ? (
              <div>
                <SectionLabel className="mb-2">{STRATEGY_LAB_COPY.panel.lastExecutionPlan}</SectionLabel>
                <div className="space-y-3">
                  {lastPack.payload.packs.map(pack => (
                    <div key={pack.initiative_id} className="bg-background rounded-lg border px-3 py-2.5 text-xs">
                      <p className="text-foreground mb-1 font-mono font-semibold">{pack.initiative_id}</p>
                      <p className="text-muted-foreground mb-2 line-clamp-3">{pack.architecture}</p>
                      <ul className="text-muted-foreground list-inside list-decimal space-y-1">
                        {pack.tasks.slice(0, 6).map((t, idx) => (
                          <li key={`${pack.initiative_id}-t-${idx}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Selected list */}
            {!useOrchestratorPrimaryNav && allSelected.length > 0 && (
              <div>
                <SectionLabel className="mb-2">{STRATEGY_LAB_COPY.panel.selectedTitle}</SectionLabel>
                <div className="space-y-1.5">
                  {allSelected.slice(0, 8).map(init => (
                    <div
                      key={init.id}
                      className="bg-background flex items-start gap-2 rounded-lg border px-2 py-1.5 text-xs"
                    >
                      <Target className="text-info mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="text-muted-foreground leading-snug">{init.title}</span>
                    </div>
                  ))}
                  {allSelected.length > 8 && (
                    <p className="text-muted-foreground py-1 text-center text-xs">
                      +{allSelected.length - 8} {STRATEGY_LAB_COPY.panel.moreItemsSuffix}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-2 border-t p-4">
            {!useOrchestratorPrimaryNav ? (
              <motion.div
                whileHover={selected.size > 0 ? { scale: 1.01 } : {}}
                whileTap={selected.size  > 0 ? { scale: 0.99 } : {}}
              >
                <Button
                  type="button"
                  variant="default"
                  className={cn('w-full justify-center py-2.5', selected.size === 0 ? 'opacity-40' : '')}
                  disabled={selected.size === 0}
                  onClick={handleGenerateRoadmap}
                >
                  {STRATEGY_LAB_COPY.panel.generateRoadmap}
                </Button>
              </motion.div>
            ) : null}
            <Button asChild variant="ghost" className="w-full justify-center py-2">
              <Link to={reportHref}>
                {STRATEGY_LAB_COPY.panel.viewReport} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AppShell>
  );
}
