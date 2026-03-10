import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  Zap, TrendingUp, Map, CheckSquare, Square, ArrowRight,
  DollarSign, Clock, BarChart2, Download
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { SectionLabel } from '../components/glc/SectionLabel';
import { QuickWinTag } from '../components/glc/QuickWinTag';
import { strategyRoadmap } from '../data/auditData';

type Timeframe = 'quick-win' | 'medium-term' | 'strategic';
type Impact    = 'high' | 'medium' | 'low';

const TF_CONFIG: Record<Timeframe, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  'quick-win':   { label: 'Quick Wins',     color: 'var(--glc-orange)',    bg: 'var(--glc-orange-xlight)', icon: Zap        },
  'medium-term': { label: 'Medium-Term',    color: 'var(--glc-blue)',      bg: 'var(--glc-blue-xlight)',   icon: TrendingUp },
  'strategic':   { label: 'Strategic (1–3m)',color: 'var(--glc-green-dark)',bg: 'var(--glc-green-xlight)', icon: Map        },
};

const IMPACT_DOT: Record<Impact, string> = {
  high:   'var(--score-1)',
  medium: 'var(--score-3)',
  low:    'var(--glc-green)',
};

function InitCard({
  item, selected, onToggle
}: {
  item: typeof strategyRoadmap[0];
  selected: boolean;
  onToggle: () => void;
}) {
  const tf = TF_CONFIG[item.timeframe];
  const Ic = tf.icon;
  const impactDot = IMPACT_DOT[item.impact as Impact] ?? 'var(--text-tertiary)';

  return (
    <div
      className="glc-card p-4 cursor-pointer transition-all"
      style={{
        borderLeft: `3px solid ${selected ? tf.color : 'var(--border-subtle)'}`,
        backgroundColor: selected ? tf.bg : 'var(--bg-surface)',
      }}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0" style={{ color: selected ? tf.color : 'var(--text-tertiary)' }}>
          {selected
            ? <CheckSquare className="w-4 h-4" />
            : <Square className="w-4 h-4" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: impactDot }} />
              <span className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{item.impact} impact</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
          {item.timeframe === 'quick-win' && (
            <div className="mt-2"><QuickWinTag /></div>
          )}
          {item.dependencies && item.dependencies.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <ArrowRight className="w-3 h-3" />
              Depends on: {item.dependencies.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoadmapLane({ tf, items, selected, onToggle }: {
  tf: Timeframe;
  items: typeof strategyRoadmap;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const cfg = TF_CONFIG[tf];
  const I = cfg.icon;
  const selCount = items.filter(i => selected.has(i.id)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <I className="w-4 h-4" style={{ color: cfg.color }} />
          <SectionLabel>{cfg.label}</SectionLabel>
        </div>
        {selCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            {selCount} selected
          </span>
        )}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <InitCard
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function StrategyLab() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(strategyRoadmap.filter(i => i.timeframe === 'quick-win').map(i => i.id))
  );

  const toggle = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selItems = strategyRoadmap.filter(i => selected.has(i.id));
  const byTF = (tf: Timeframe) => selItems.filter(i => i.timeframe === tf).length;

  const highImpact = selItems.filter(i => i.impact === 'high').length;
  const byEffort = (e: string) => selItems.filter(i => i.effort === e).length;

  return (
    <AppShell
      title="Strategy Lab"
      subtitle="Hotel XYZ · Build your implementation roadmap"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {selected.size} of {strategyRoadmap.length} selected
          </span>
          <button className="glc-btn-secondary">
            <Download className="w-4 h-4" /> Export Plan
          </button>
          <button className="glc-btn-primary">
            <Map className="w-4 h-4" /> Save Roadmap
          </button>
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
        {/* ── Initiative picker ─────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <div className="max-w-2xl mx-auto px-7 py-6 space-y-8">
            {(['quick-win', 'medium-term', 'strategic'] as Timeframe[]).map(tf => (
              <RoadmapLane
                key={tf}
                tf={tf}
                items={strategyRoadmap.filter(i => i.timeframe === tf)}
                selected={selected}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>

        {/* ── Plan summary panel ────────────────── */}
        <aside
          className="w-[280px] flex-shrink-0 overflow-y-auto flex flex-col"
          style={{ borderLeft: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Summary */}
          <div className="px-5 py-5 space-y-4">
            <SectionLabel>Plan Summary</SectionLabel>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Quick Wins',    val: byTF('quick-win'),   color: 'var(--glc-orange)'    },
                { label: 'Medium-Term',   val: byTF('medium-term'), color: 'var(--glc-blue)'      },
                { label: 'Strategic',     val: byTF('strategic'),   color: 'var(--glc-green-dark)' },
                { label: 'High Impact',   val: highImpact,          color: 'var(--score-1)'        },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}
                >
                  <div className="font-bold text-xl" style={{ color, letterSpacing: '-0.02em' }}>{val}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Effort distribution */}
            <div>
              <SectionLabel className="mb-2">Effort Mix</SectionLabel>
              {[
                { label: 'Low effort',    val: byEffort('low'),    color: 'var(--glc-green)' },
                { label: 'Medium effort', val: byEffort('medium'), color: 'var(--score-3)'   },
                { label: 'High effort',   val: byEffort('high'),   color: 'var(--score-1)'   },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Selected items list */}
            {selItems.length > 0 && (
              <div>
                <SectionLabel className="mb-2">Selected Initiatives</SectionLabel>
                <div className="space-y-1.5">
                  {selItems.map(item => {
                    const tf = TF_CONFIG[item.timeframe];
                    return (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: tf.color }} />
                        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom CTA */}
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full glc-btn-primary justify-center"
              disabled={selected.size === 0}
              style={{ opacity: selected.size === 0 ? 0.5 : 1 }}
            >
              <BarChart2 className="w-4 h-4" />
              Generate Roadmap
            </motion.button>
            <Link
              to="/reports"
              className="mt-2 w-full glc-btn-ghost justify-center text-xs"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Back to Report
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
