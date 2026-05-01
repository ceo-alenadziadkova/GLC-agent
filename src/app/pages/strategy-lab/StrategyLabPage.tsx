import { useMemo, useEffect, useCallback, useId, useState, type KeyboardEvent } from 'react';
import { useQueryClient } from '../../lib/tanstack-react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  MapTrifold, ArrowRight,
  ArrowsClockwise, SlidersHorizontal,
  Path,
} from '@phosphor-icons/react';
import { AppShell } from '../../components/AppShell';
import { SectionLabel } from '../../components/glc/SectionLabel';
import { useAudit } from '../../hooks/useAudit';
import { useBrowserOnline } from '../../hooks/useBrowserOnline';
import { useProfile } from '../../hooks/useProfile';
import { DOMAIN_KEYS, DOMAIN_LABELS } from '../../data/auditTypes';
import type { DomainBenchmarkSnapshot } from '../../data/api/benchmarks';
import { api } from '../../data/apiService';
import {
  STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
  STRATEGY_LAB_LAYOUT_POLICY,
  STRATEGY_LAB_PAGE_ANCHORS,
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
  ORCHESTRATION_UI_LIMITS,
} from '../../config/orchestration-ui-limits';
import { buildAppRoute } from '../../config/route-paths';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { applyStrategyLabContextPatchToAuditCache } from '../../lib/strategy-lab-context-cache';
import { StrategyLabOrchestrationPanel } from './StrategyLabOrchestrationPanel';
import { StrategyPlanningChrome } from './StrategyPlanningChrome';
import { useStrategyJourneyStepStatuses } from '../../hooks/useStrategyJourneyStepStatuses';
import {
  StrategyLabOrchestratorListBody,
  type StrategyLabOrchestratorTabId,
} from './StrategyLabOrchestratorListBody';
import { OrchestrationNodeDetailCard } from './OrchestrationNodeDetailCard';
import { cn } from '../../components/ui/utils';
import { Button } from '../../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { UI_BREAKPOINTS } from '../../config/ui-breakpoints';
import { toast } from 'sonner';
import { ApiError } from '../../data/api-error';
import type { StrategyLabContextView } from '../../data/audit/contracts/report/report-domain.types';

function normalizeAuditIndustryKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return t.length > 0 ? t : null;
}

export function StrategyLab() {
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
  const [domainBenchmarks, setDomainBenchmarks] = useState<
    Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>
  >({});
  const [constraintStageDraft, setConstraintStageDraft] = useState<string>('growth');
  const [constraintBudgetDraft, setConstraintBudgetDraft] = useState<string>('unknown');
  const [constraintTeamDraft, setConstraintTeamDraft] = useState<string>('unknown');
  const [constraintSaving, setConstraintSaving] = useState(false);
  /** Persisted until success or consultant dismiss — pairs with polite aria-live region (toast alone is unreliable for SR). */
  const [constraintOverridesSaveErrorMessage, setConstraintOverridesSaveErrorMessage] = useState<string | null>(null);
  /** Mobile-only Plan summary Sheet open state. On desktop the same content lives in a side `<ResizablePanel>` and this flag stays unused. */
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

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

  const selectedPackNodeId = searchParams.get('node');

  /**
   * Stacked layouts (narrow phone / tablet): Plan summary Sheet is easy to miss — auto-open
   * when the URL picks a pack node so the detail card reaches the consultant without extra taps.
   */
  useEffect(() => {
    if (!packSummaryStackedLayout || isClient) return;
    const rawPack = audit?.strategy?.glc_orchestration_pack;
    if (!isGlcOrchestrationPackView(rawPack)) return;
    if (!selectedPackNodeId) return;
    setIsSummarySheetOpen(true);
  }, [audit?.strategy?.glc_orchestration_pack, isClient, packSummaryStackedLayout, selectedPackNodeId]);

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

    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    let detachTimer: ReturnType<typeof window.setTimeout> | undefined;

    const scrollPanelIntoView = () => {
      document.getElementById(ORCHESTRATION_PANEL_DOM_ID)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    };

    window.requestAnimationFrame(() => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        let locateAttempts = 0;
        const maxLocateAttempts = 60;

        const tryLocatePanel = (): void => {
          if (cancelled) return;
          const el = document.getElementById(ORCHESTRATION_PANEL_DOM_ID);
          if (!el) {
            locateAttempts += 1;
            if (locateAttempts < maxLocateAttempts) {
              window.requestAnimationFrame(tryLocatePanel);
            }
            return;
          }
          scrollPanelIntoView();
          if (typeof IntersectionObserver === 'undefined') return;
          observer = new IntersectionObserver(
            entries => {
              if (cancelled || !entries[0]) return;
              if (!entries[0].isIntersecting) {
                scrollPanelIntoView();
              }
            },
            { root: null, threshold: 0.01 },
          );
          observer.observe(el);
          detachTimer = window.setTimeout(() => {
            if (cancelled) return;
            observer?.disconnect();
            observer = undefined;
          }, ORCHESTRATION_UI_LIMITS.orchestrationFocusScrollIntersectionWatchMs);
        };

        tryLocatePanel();
      });
    });

    return () => {
      cancelled = true;
      if (detachTimer != null) window.clearTimeout(detachTimer);
      observer?.disconnect();
    };
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
    const ac = new AbortController();
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
      if (!ac.signal.aborted) {
        setDomainBenchmarks(Object.fromEntries(entries) as Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>);
      }
    })();
    return () => {
      ac.abort();
    };
  }, [audit?.strategy, audit?.meta?.industry, isClient]);

  const handleOrchestratorTabListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const order: StrategyLabOrchestratorTabId[] = ['now', 'next', 'dependencies', 'risks'];
      const idx = order.indexOf(orchestratorTab);
      if (idx < 0) return;
      const focusTabButton = (key: StrategyLabOrchestratorTabId) => {
        window.requestAnimationFrame(() => {
          document.getElementById(`strategy-lab-orchestrator-tab-${key}`)?.focus();
        });
      };
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = order[(idx + 1) % order.length]!;
        setOrchestratorTab(next);
        focusTabButton(next);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = order[(idx - 1 + order.length) % order.length]!;
        setOrchestratorTab(next);
        focusTabButton(next);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        const next = order[0]!;
        setOrchestratorTab(next);
        focusTabButton(next);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        const next = order[order.length - 1]!;
        setOrchestratorTab(next);
        focusTabButton(next);
      }
    },
    [orchestratorTab],
  );

  const formatConstraintOverridesSaveErrorMessage = useCallback((e: unknown) => {
    const base = STRATEGY_LAB_COPY.constraints.saveFailed;
    if (!(e instanceof ApiError)) return base;
    const detail =
      e.details && typeof e.details === 'object' && e.details !== null && 'detail' in e.details
        ? String((e.details as { detail?: unknown }).detail ?? '')
        : '';
    return detail.trim() ? `${base} (${detail})` : base;
  }, []);

  const dismissConstraintOverridesSaveError = useCallback(() => {
    setConstraintOverridesSaveErrorMessage(null);
  }, []);

  const handleSaveConstraintOverrides = useCallback(async () => {
    if (!id) return;
    setConstraintSaving(true);
    try {
      const res = await api.patchStrategyLabContext(id, {
        company_stage: constraintStageDraft,
        budget_band: constraintBudgetDraft,
        team_scale: constraintTeamDraft,
      });
      setConstraintOverridesSaveErrorMessage(null);
      applyStrategyLabContextPatchToAuditCache(queryClient, id, res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.constraints.saveOk);
      reload();
    } catch (e) {
      const msg = formatConstraintOverridesSaveErrorMessage(e);
      setConstraintOverridesSaveErrorMessage(msg);
      toast.error(msg);
    } finally {
      setConstraintSaving(false);
    }
  }, [
    id,
    constraintStageDraft,
    constraintBudgetDraft,
    constraintTeamDraft,
    formatConstraintOverridesSaveErrorMessage,
    queryClient,
    reload,
  ]);

  const handleClearConstraintOverrides = useCallback(async () => {
    if (!id) return;
    setConstraintSaving(true);
    try {
      const res = await api.patchStrategyLabContext(id, {
        company_stage: null,
        budget_band: null,
        team_scale: null,
      });
      setConstraintOverridesSaveErrorMessage(null);
      applyStrategyLabContextPatchToAuditCache(queryClient, id, res.strategy_lab_context);
      toast.success(STRATEGY_LAB_COPY.constraints.clearOk);
      reload();
    } catch (e) {
      const msg = formatConstraintOverridesSaveErrorMessage(e);
      setConstraintOverridesSaveErrorMessage(msg);
      toast.error(msg);
    } finally {
      setConstraintSaving(false);
    }
  }, [id, formatConstraintOverridesSaveErrorMessage, queryClient, reload]);

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
    const loadErrorDescribedBy = [loadErrorSummaryId, !online ? loadOfflineHintId : '']
      .filter(Boolean)
      .join(' ');
    return (
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.errorSubtitle}>
        <div
          className="flex flex-col items-center justify-center gap-3 h-64 px-4 text-center"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <p id={loadErrorSummaryId} className="text-destructive max-w-prose">
            {error || STRATEGY_LAB_COPY.messages.auditNotFound}
          </p>
          {!online ? (
            <p id={loadOfflineHintId} className="text-muted-foreground text-sm max-w-prose">
              {STRATEGY_LAB_COPY.messages.offlineHint}
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => reload()}
            disabled={!online || isFetching}
            aria-busy={isFetching}
            aria-describedby={loadErrorDescribedBy}
          >
            {isFetching ? (
              <ArrowsClockwise className="text-info mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : null}
            {STRATEGY_LAB_COPY.messages.retryLoad}
          </Button>
        </div>
      </AppShell>
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
  const timelineHref = id
    ? isClient
      ? buildAppRoute.portalPlan(id, 'timeline')
      : buildAppRoute.plan(id, 'timeline')
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

  /** Consultants: always when orchestration UI is on. Clients: same journey IA when read-only orchestration lab is enabled (portal Plan already uses matching chrome). */
  const journeyStripVisible =
    orchestrationUiEnabled && (!isClient || clientOrchestrationLabReadOnlyEnabled);

  // Reference accordion preview: count benchmarks with data and describe constraint state.
  // Both lines are always-visible in the trigger so consultants can decide whether to expand without clicking.
  const benchmarksAvailableCount = DOMAIN_KEYS.reduce(
    (acc, dk) => (domainBenchmarks[dk] ? acc + 1 : acc),
    0,
  );
  const referencePreviewBenchmarks = STRATEGY_LAB_COPY.referenceDisclosure.previewBenchmarks
    .replace('{available}', String(benchmarksAvailableCount))
    .replace('{total}', String(DOMAIN_KEYS.length));

  const labContextOverrides = audit.strategy.strategy_lab_context;
  const hasOverride =
    !!labContextOverrides &&
    (typeof labContextOverrides.company_stage === 'string' ||
      typeof labContextOverrides.budget_band === 'string' ||
      typeof labContextOverrides.team_scale === 'string');
  const effectiveConstraints = audit.strategy.effective_constraints;
  const constraintsSummary = effectiveConstraints
    ? [
        STRATEGY_LAB_COPY.constraints.optionLabels.stage[
          effectiveConstraints.company_stage as keyof typeof STRATEGY_LAB_COPY.constraints.optionLabels.stage
        ] ?? effectiveConstraints.company_stage,
        STRATEGY_LAB_COPY.constraints.optionLabels.budget[
          effectiveConstraints.budget_band as keyof typeof STRATEGY_LAB_COPY.constraints.optionLabels.budget
        ] ?? effectiveConstraints.budget_band,
        STRATEGY_LAB_COPY.constraints.optionLabels.team[
          effectiveConstraints.team_scale as keyof typeof STRATEGY_LAB_COPY.constraints.optionLabels.team
        ] ?? effectiveConstraints.team_scale,
      ].join(' / ')
    : null;
  const referencePreviewConstraints = !constraintsSummary
    ? STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsUnknown
    : (hasOverride
        ? STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsOverridden
        : STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsFromBrief
      ).replace('{summary}', constraintsSummary);

  const inspectPackScrollInner = (
    <>
          {!isClient && (
            <section
              id={STRATEGY_LAB_PAGE_ANCHORS.reference}
              className="border-border bg-card scroll-mt-20 border-b"
            >
              <Accordion
                type="single"
                collapsible
                className="px-4 [&_[data-slot=accordion-item]]:border-b-0"
              >
                <AccordionItem value="reference">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <span className="flex flex-1 flex-col items-start gap-1 text-left">
                      <span className="text-foreground text-sm font-semibold">
                        {STRATEGY_LAB_COPY.referenceDisclosure.summary}
                      </span>
                      <span className="text-muted-foreground text-[length:var(--text-2xs)] font-normal leading-snug">
                        {referencePreviewBenchmarks} · {referencePreviewConstraints}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">
                    <p className="text-muted-foreground pb-4 text-xs leading-relaxed max-w-prose">{STRATEGY_LAB_COPY.referenceDisclosure.hint}</p>
                    <div className="space-y-3 border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="text-info h-4 w-4" aria-hidden />
                    <span className="text-foreground text-sm font-semibold">
                      {STRATEGY_LAB_COPY.panel.domainBenchmarksTitle}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs max-w-prose">{STRATEGY_LAB_COPY.panel.domainBenchmarksHint}</p>
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
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="text-info h-4 w-4" aria-hidden />
                    <span className="text-foreground text-sm font-semibold">{STRATEGY_LAB_COPY.constraints.sectionTitle}</span>
                  </div>
                  <p className="text-muted-foreground text-xs max-w-prose">{STRATEGY_LAB_COPY.constraints.sectionHint}</p>
                  {constraintOverridesSaveErrorMessage ? (
                    <div
                      id={constraintOverridesErrorRegionId}
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="bg-card flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <p className="text-destructive m-0 text-xs leading-relaxed max-w-prose">
                        {constraintOverridesSaveErrorMessage}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 text-xs"
                        onClick={dismissConstraintOverridesSaveError}
                      >
                        {STRATEGY_LAB_COPY.constraints.dismissSaveError}
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <label className="flex min-w-[length:var(--strategy-lab-form-field-min-width)] flex-1 flex-col gap-1">
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
                    <label className="flex min-w-[length:var(--strategy-lab-form-field-min-width)] flex-1 flex-col gap-1">
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
                    <label className="flex min-w-[length:var(--strategy-lab-form-field-min-width)] flex-1 flex-col gap-1">
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
                      aria-describedby={constraintOverridesSaveErrorMessage ? constraintOverridesErrorRegionId : undefined}
                      onClick={() => void handleSaveConstraintOverrides()}
                    >
                      {STRATEGY_LAB_COPY.constraints.save}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={constraintSaving}
                      aria-describedby={constraintOverridesSaveErrorMessage ? constraintOverridesErrorRegionId : undefined}
                      onClick={() => void handleClearConstraintOverrides()}
                    >
                      {STRATEGY_LAB_COPY.constraints.useBrief}
                    </Button>
                  </div>
                </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          )}

          <div className="p-4">
            {glcPackView && !isClient ? (
              <div className="space-y-4">
                <p id={orchestratorTablistOverviewId} className="sr-only">
                  {STRATEGY_LAB_COPY.orchestratorTabs.tablistAriaDescription}
                </p>
                <div
                  role="tablist"
                  aria-label={STRATEGY_LAB_COPY.orchestratorTabs.tablistAriaLabel}
                  aria-describedby={orchestratorTablistOverviewId}
                  className="flex flex-wrap gap-2 border-b border-border pb-3"
                  onKeyDown={handleOrchestratorTabListKeyDown}
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
                      id={`strategy-lab-orchestrator-tab-${key}`}
                      role="tab"
                      aria-selected={orchestratorTab === key}
                      aria-controls="strategy-lab-orchestrator-panel"
                      tabIndex={orchestratorTab === key ? 0 : -1}
                      onClick={() => setOrchestratorTab(key)}
                      className={cn(
                        'flex min-w-[length:var(--strategy-lab-orchestrator-tab-min-width)] flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition-colors sm:min-w-0 sm:flex-none',
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
                <div
                  role="tabpanel"
                  id="strategy-lab-orchestrator-panel"
                  aria-labelledby={`strategy-lab-orchestrator-tab-${orchestratorTab}`}
                >
                  <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {orchestratorPanelAnnouncement}
                  </span>
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
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed max-w-prose">
                  {ORCHESTRATION_UI_COPY.timelineHint}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="no-underline">
                    <Link to={timelineHref}>
                      <Path className="h-4 w-4" aria-hidden />
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
    </>
  );

  /** Node inspector + dashed empty state (shared desktop panel + mobile Sheet). */
  const planSummaryDetailBlock =
    glcPackView ? (
      <>
        {selectedPackNodeId ? (
          <OrchestrationNodeDetailCard
            pack={glcPackView}
            nodeId={selectedPackNodeId}
            onClear={() => setSelectedPackNodeId(null)}
          />
        ) : null}
        {!selectedPackNodeId ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs leading-relaxed max-w-prose">
            {STRATEGY_LAB_COPY.orchestratorTabs.pickNode}
          </p>
        ) : null}
      </>
    ) : null;

  const planSummaryFooter = (
    <div className="space-y-2 border-t border-border p-4">
      <Button asChild variant="ghost" className="w-full justify-center py-2">
        <Link to={reportHref}>
          {STRATEGY_LAB_COPY.panel.viewReport}{' '}
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </div>
  );

  /** Wraps roadmap heading + inspector; outer scroll chrome is added by callers. */
  const planSummaryDesktopChrome = (
    <>
      <div className="flex-1 space-y-5 p-5">
        <div>
          <SectionLabel>{STRATEGY_LAB_COPY.panel.yourRoadmap}</SectionLabel>
          <p className="text-muted-foreground mt-1 max-w-prose text-xs">{STRATEGY_LAB_COPY.panel.summaryHint}</p>
        </div>
        {planSummaryDetailBlock}
      </div>
      {planSummaryFooter}
    </>
  );

  /** Narrow / tablet widths (< packSummary breakpoint): roadmap summary Sheet so the orchestrator owns full width (avoids cramped ResizablePanel). */
  /** Tablet / narrow desktop: stacked sheet when audit strategy exists (summary still reachable without ResizablePanel quirks). */
  const consultantMobilePackSummarySheet =
    packSummaryStackedLayout && !isClient && Boolean(audit?.strategy);

  return (
    <AppShell
      title={STRATEGY_LAB_COPY.appShell.title}
      subtitle={STRATEGY_LAB_COPY.appShell.subtitle}
    >
      {orchestrationUiEnabled && isClient && glcPackView && clientOrchestrationLabReadOnlyEnabled ? (
        <div className="bg-card flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs max-w-prose">{ORCHESTRATION_UI_COPY.clientTimelineReadOnlyHint}</p>
          <Button asChild variant="outline" size="sm" className="no-underline w-fit">
            <Link to={timelineHref}>{ORCHESTRATION_UI_COPY.clientOpenFullTimeline}</Link>
          </Button>
        </div>
      ) : orchestrationUiEnabled && isClient ? (
        <div className="text-muted-foreground border-b bg-card px-4 py-2 text-center text-xs">
          {ORCHESTRATION_UI_COPY.clientHidden}
        </div>
      ) : null}

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
      {consultantMobilePackSummarySheet ? (
        <div className="bg-background ds-audit-workspace-main-h flex flex-col">
          <div
            id={STRATEGY_LAB_PAGE_ANCHORS.inspectPack}
            className="bg-background min-h-0 flex-1 overflow-y-auto scroll-mt-20"
          >
            {inspectPackScrollInner}
          </div>
          <div className="bg-card sticky bottom-0 z-10 shrink-0 border-t border-border px-4 py-3">
            <Sheet open={isSummarySheetOpen} onOpenChange={setIsSummarySheetOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex h-auto min-h-11 w-full flex-col gap-1 py-3"
                  aria-haspopup="dialog"
                  aria-expanded={isSummarySheetOpen}
                >
                  <span className="text-foreground text-sm font-semibold">
                    {STRATEGY_LAB_COPY.panel.summaryDrawerTriggerLabel}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {selectedPackNodeId
                      ? STRATEGY_LAB_COPY.panel.summaryDrawerNodeSelectedHint
                      : STRATEGY_LAB_COPY.panel.summaryDrawerNoSelectionHint}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex h-full flex-col gap-0 p-0 sm:max-w-sm">
                <SheetHeader className="border-border space-y-1 border-b px-4 py-4 text-left">
                  <SheetTitle>{STRATEGY_LAB_COPY.panel.summaryDrawerTitle}</SheetTitle>
                  <SheetDescription>{STRATEGY_LAB_COPY.panel.summaryHint}</SheetDescription>
                </SheetHeader>
                <div className="bg-card flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <div className="flex-1 space-y-5 p-5">{planSummaryDetailBlock}</div>
                  {planSummaryFooter}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      ) : isNarrowMobileLayout ? (
        <div className="bg-background ds-audit-workspace-main-h">
          <div
            id={STRATEGY_LAB_PAGE_ANCHORS.inspectPack}
            className="bg-background h-full min-h-0 overflow-y-auto scroll-mt-20"
          >
            {inspectPackScrollInner}
          </div>
        </div>
      ) : (
        <ResizablePanelGroup
          key="strategy-lab-layout-desktop"
          direction="horizontal"
          className="ds-audit-workspace-main-h"
          autoSaveId={`${STRATEGY_LAB_LAYOUT_POLICY.sidebarLayoutAutoSaveId}:lg`}
        >
          <ResizablePanel
            id="strategy-lab-main"
            order={1}
            defaultSize={100 - STRATEGY_LAB_LAYOUT_POLICY.summaryPanelDefaultSizePct}
            minSize={STRATEGY_LAB_LAYOUT_POLICY.mainPanelMinSizePct}
            className="min-w-0"
          >
            <div
              id={STRATEGY_LAB_PAGE_ANCHORS.inspectPack}
              className="bg-background h-full min-h-0 flex-1 scroll-mt-20 overflow-y-auto"
            >
              {inspectPackScrollInner}
            </div>
          </ResizablePanel>

          <ResizableHandle
            aria-label={STRATEGY_LAB_COPY.panel.resizeHandle}
            title={STRATEGY_LAB_COPY.panel.resizeHint}
            className="w-1.5 bg-[var(--border-subtle)] after:w-1.5"
          />

          <ResizablePanel
            id="strategy-lab-summary"
            order={2}
            defaultSize={STRATEGY_LAB_LAYOUT_POLICY.summaryPanelDefaultSizePct}
            minSize={STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMinSizePct}
            maxSize={STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMaxSizePct}
            className="min-w-0"
          >
            <div className="bg-card flex h-full min-h-0 w-full flex-col overflow-y-auto">
              {planSummaryDesktopChrome}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </AppShell>
  );
}
