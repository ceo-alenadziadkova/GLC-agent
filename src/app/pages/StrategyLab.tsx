import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router';
import {
  Lightning, TrendUp, MapTrifold, ArrowRight, Check,
  Target, Sparkle, ArrowsClockwise, ChartBar,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { SectionLabel } from '../components/glc/SectionLabel';
import { useAudit } from '../hooks/useAudit';
import type { StrategyInitiative } from '../data/auditTypes';
import { DOMAIN_KEYS, DOMAIN_LABELS } from '../data/auditTypes';
import type { DomainBenchmarkSnapshot } from '../data/api/benchmarks';
import { api } from '../data/apiService';
import { COLOR_TOKENS } from '../../design-system/tokens/colors';
import {
  STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
  STRATEGY_LAB_TAB_DESCRIPTIONS,
} from '../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import { cn } from '../components/ui/utils';
import { Button } from '../components/ui/button';

type Timeframe = 'quick' | 'medium' | 'strategic';

const TABS: { key: Timeframe; label: string; icon: typeof Lightning; toneClass: string; desc: string }[] = [
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
  const { audit, loading, error } = useAudit(id);
  const [activeTab, setActiveTab] = useState<Timeframe>('quick');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [domainBenchmarks, setDomainBenchmarks] = useState<
    Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>
  >({});

  useEffect(() => {
    if (!audit?.strategy) return;
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
  }, [audit?.strategy, audit?.meta?.industry]);

  const initiatives = useMemo(() => {
    if (!audit?.strategy) return { quick: [], medium: [], strategic: [] };
    return {
      quick: audit.strategy.quick_wins || [],
      medium: audit.strategy.medium_term || [],
      strategic: audit.strategy.strategic || [],
    };
  }, [audit?.strategy]);

  const visible = initiatives[activeTab];
  const allInitiatives = [...initiatives.quick, ...initiatives.medium, ...initiatives.strategic];
  const allSelected = allInitiatives.filter(i => selected.has(i.id));

  function toggle(initId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(initId) ? next.delete(initId) : next.add(initId);
      return next;
    });
  }

  const activeTabCfg = TABS.find(t => t.key === activeTab)!;

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
        <div className="flex items-center gap-2">
          <span className="text-success text-xs font-mono font-semibold">
            {selected.size} {STRATEGY_LAB_COPY.panel.selectedSuffix}
          </span>
          <Button type="button" variant="default">
            <Sparkle className="w-4 h-4" /> {STRATEGY_LAB_COPY.panel.generateRoadmap}
          </Button>
        </div>
      }
    >
      <div className="flex ds-audit-workspace-main-h">

        {/* ── Initiative picker ─────────────────────── */}
        <div className="bg-background flex-1 overflow-y-auto border-r">
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
          {/* Tabs */}
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
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm transition-all',
                    active ? 'text-foreground bg-card shadow-sm' : 'text-muted-foreground border-transparent bg-transparent',
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

          {/* Initiative list */}
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
                {visible.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">
                      {STRATEGY_LAB_COPY.panel.noInitiativesInCategory}
                    </p>
                  </div>
                )}
                {visible.map((init: StrategyInitiative, i: number) => {
                  const sel = selected.has(init.id);
                  return (
                    <motion.button
                      key={init.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.045, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => toggle(init.id)}
                      className={cn(
                        'w-full rounded-xl border p-4 text-left transition-all',
                        sel ? 'border-primary/40 bg-primary/10 shadow-xs ring-2 ring-primary/10' : 'border-border bg-card shadow-xs',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
                            sel ? 'border-primary bg-primary' : 'border-border bg-muted',
                          )}
                        >
                          {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span
                              className="text-foreground text-sm font-medium"
                            >
                              {init.title}
                            </span>
                          </div>

                          {init.description && (
                            <p className="text-muted-foreground mb-2 text-xs leading-relaxed">
                              {init.description}
                            </p>
                          )}

                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                            <span
                              className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[length:var(--text-2xs)] font-semibold"
                            >
                              {init.impact} impact
                            </span>
                            <span
                              className={cn('text-xs font-semibold', EFFORT_CLASS[init.effort] ?? 'text-muted-foreground')}
                            >
                              {init.effort} effort
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Plan summary ──────────────────────────── */}
        <div className="bg-card flex ds-strategy-lab-plan-column flex-shrink-0 flex-col overflow-y-auto">
          <div className="p-5 flex-1 space-y-5">
            <div>
              <SectionLabel>{STRATEGY_LAB_COPY.panel.yourRoadmap}</SectionLabel>
              <p className="text-muted-foreground mt-1 text-xs">
                {selected.size} {STRATEGY_LAB_COPY.panel.initiativesSelectedSuffix}
              </p>
            </div>

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

            {/* Effort mix */}
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

            {/* Selected list */}
            {allSelected.length > 0 && (
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
            <motion.div
              whileHover={selected.size > 0 ? { scale: 1.01 } : {}}
              whileTap={selected.size  > 0 ? { scale: 0.99 } : {}}
            >
              <Button
                type="button"
                variant="default"
                className={cn('w-full justify-center py-2.5', selected.size === 0 ? 'opacity-40' : '')}
                disabled={selected.size === 0}
              >
                <Sparkle className="w-4 h-4" />
                {STRATEGY_LAB_COPY.panel.generateRoadmap}
              </Button>
            </motion.div>
            <Button asChild variant="ghost" className="w-full justify-center py-2">
              <Link to={`/reports/${id}`}>
                {STRATEGY_LAB_COPY.panel.viewReport} <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
