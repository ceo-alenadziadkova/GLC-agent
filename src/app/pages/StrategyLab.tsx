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
import { UI_SEMANTIC_COLORS } from '../config/ui-semantic-colors';
import {
  STRATEGY_LAB_DEFAULT_BENCHMARK_PERIOD,
  STRATEGY_LAB_TAB_DESCRIPTIONS,
} from '../config/strategy-lab';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';

type Timeframe = 'quick' | 'medium' | 'strategic';

const TABS: { key: Timeframe; label: string; icon: typeof Lightning; color: string; desc: string }[] = [
  { key: 'quick',    label: STRATEGY_LAB_COPY.tabLabels.quick,   icon: Lightning,  color: 'var(--glc-orange)', desc: STRATEGY_LAB_TAB_DESCRIPTIONS.quick },
  { key: 'medium',   label: STRATEGY_LAB_COPY.tabLabels.medium,  icon: TrendUp,    color: 'var(--glc-blue)',   desc: STRATEGY_LAB_TAB_DESCRIPTIONS.medium },
  { key: 'strategic',label: STRATEGY_LAB_COPY.tabLabels.strategic, icon: MapTrifold, color: UI_SEMANTIC_COLORS.strategicPurple, desc: STRATEGY_LAB_TAB_DESCRIPTIONS.strategic },
];

function normalizeAuditIndustryKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return t.length > 0 ? t : null;
}

const EFFORT_COLOR: Record<string, string> = {
  low:    'var(--glc-green)',
  medium: 'var(--score-3)',
  high:   'var(--score-1)',
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
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.errorSubtitle}>
        <div className="flex items-center justify-center h-64">
          <p style={{ color: 'var(--score-1)' }}>{error || STRATEGY_LAB_COPY.messages.auditNotFound}</p>
        </div>
      </AppShell>
    );
  }

  if (!audit.strategy) {
    return (
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.unavailableSubtitle}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <MapTrifold className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{STRATEGY_LAB_COPY.messages.notGenerated}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-quaternary)' }}>{STRATEGY_LAB_COPY.messages.completePipeline}</p>
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
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--glc-green)' }}>
            {selected.size} {STRATEGY_LAB_COPY.panel.selectedSuffix}
          </span>
          <button className="glc-btn-primary">
            <Sparkle className="w-4 h-4" /> {STRATEGY_LAB_COPY.panel.generateRoadmap}
          </button>
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Initiative picker ─────────────────────── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
        >
          <div
            className="p-4 space-y-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              <ChartBar className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {STRATEGY_LAB_COPY.panel.domainBenchmarksTitle}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {STRATEGY_LAB_COPY.panel.domainBenchmarksHint}
            </p>
            <div className="space-y-2">
              {DOMAIN_KEYS.map((dk) => {
                const row = domainBenchmarks[dk];
                const label = DOMAIN_LABELS[dk] ?? dk;
                return (
                  <div
                    key={dk}
                    className="flex items-center justify-between gap-3 text-xs rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
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
            className="flex gap-2 p-4 sticky top-0 z-10"
            style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-subtle)', backdropFilter: 'blur(8px)' }}
          >
            {TABS.map(tab => {
              const I = tab.icon;
              const active = activeTab === tab.key;
              const count = initiatives[tab.key].length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                    border: active ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    transition: 'all var(--ease-fast)',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: `${tab.color}08`, border: `1px solid ${tab.color}28` }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <I className="relative w-4 h-4" style={{ color: active ? tab.color : 'inherit' }} />
                  <span className="relative font-semibold text-xs">{tab.label} ({count})</span>
                  <span className="relative" style={{ fontSize: '10px', color: active ? tab.color : 'var(--text-quaternary)', opacity: active ? 0.8 : 1 }}>
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
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
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
                      className="w-full text-left p-4 rounded-xl transition-all"
                      style={{
                        backgroundColor: sel ? `${activeTabCfg.color}08` : 'var(--bg-surface)',
                        border: `1px solid ${sel ? `${activeTabCfg.color}30` : 'var(--border-subtle)'}`,
                        boxShadow: sel ? `0 0 0 3px ${activeTabCfg.color}10` : 'var(--shadow-xs)',
                        transition: 'all var(--ease-fast)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            backgroundColor: sel ? activeTabCfg.color : 'var(--bg-inset)',
                            border: `2px solid ${sel ? activeTabCfg.color : 'var(--border-default)'}`,
                            transition: 'all var(--ease-fast)',
                          }}
                        >
                          {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span
                              className="font-medium text-sm"
                              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
                            >
                              {init.title}
                            </span>
                          </div>

                          {init.description && (
                            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                              {init.description}
                            </p>
                          )}

                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${activeTabCfg.color}15`,
                                color: activeTabCfg.color,
                                fontSize: '10px',
                              }}
                            >
                              {init.impact} impact
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: EFFORT_COLOR[init.effort] || 'var(--text-tertiary)', fontSize: '11px' }}
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
        <div
          className="w-[280px] flex-shrink-0 overflow-y-auto flex flex-col"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="p-5 flex-1 space-y-5">
            <div>
              <SectionLabel>{STRATEGY_LAB_COPY.panel.yourRoadmap}</SectionLabel>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {selected.size} {STRATEGY_LAB_COPY.panel.initiativesSelectedSuffix}
              </p>
            </div>

            <div className="space-y-2">
              {[
                { label: STRATEGY_LAB_COPY.panel.totalInitiatives, value: `${selected.size}`, color: 'var(--text-primary)' },
                { label: STRATEGY_LAB_COPY.panel.quickWins, value: `${allSelected.filter(i => initiatives.quick.includes(i)).length}`, color: 'var(--glc-green)' },
                { label: STRATEGY_LAB_COPY.panel.strategicItems, value: `${allSelected.filter(i => initiatives.strategic.includes(i)).length}`, color: UI_SEMANTIC_COLORS.strategicPurple },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="font-bold tabular-nums text-sm" style={{ color, fontFamily: 'var(--font-mono)' }}>
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
                    <span className="text-xs w-14 flex-shrink-0 capitalize" style={{ color: 'var(--text-tertiary)' }}>{effort}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--border-subtle)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: EFFORT_COLOR[effort] }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums w-6 text-right flex-shrink-0" style={{ color: EFFORT_COLOR[effort] }}>
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
                      className="flex items-start gap-2 text-xs py-1.5 px-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)' }}
                    >
                      <Target className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-blue)' }} />
                      <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{init.title}</span>
                    </div>
                  ))}
                  {allSelected.length > 8 && (
                    <p className="text-xs text-center py-1" style={{ color: 'var(--text-quaternary)' }}>
                      +{allSelected.length - 8} {STRATEGY_LAB_COPY.panel.moreItemsSuffix}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <motion.button
              disabled={selected.size === 0}
              whileHover={selected.size > 0 ? { scale: 1.01 } : {}}
              whileTap={selected.size  > 0 ? { scale: 0.99 } : {}}
              className="w-full glc-btn-primary justify-center py-2.5"
              style={{ opacity: selected.size === 0 ? 0.4 : 1, fontSize: 'var(--text-sm)' }}
            >
              <Sparkle className="w-4 h-4" />
              {STRATEGY_LAB_COPY.panel.generateRoadmap}
            </motion.button>
            <Link
              to={`/reports/${id}`}
              className="w-full glc-btn-ghost justify-center py-2 block text-center"
              style={{ textDecoration: 'none', fontSize: 'var(--text-sm)' }}
            >
              {STRATEGY_LAB_COPY.panel.viewReport} <ArrowRight className="inline w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
