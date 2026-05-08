import { motion } from 'motion/react';
import { SquaresFour, Pulse, TrendUp, Warning } from '@phosphor-icons/react';
import { SectionLabel } from './SectionLabel';
import type { DashboardKpis } from '../../data/apiService';

interface KpiStripProps {
  kpis: DashboardKpis | undefined;
  loading: boolean;
}

const EASE_GLC = [0.16, 1, 0.3, 1] as const;

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_GLC } },
};

interface Card {
  label: string;
  value: string;
  sub: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: 'info' | 'warning' | 'success' | 'muted';
}

function buildCards(kpis: DashboardKpis | undefined): Card[] {
  return [
    {
      label: 'Total Audits',
      value: kpis ? String(kpis.total_audits) : '—',
      sub: 'All time',
      Icon: SquaresFour,
      tone: 'info',
    },
    {
      label: 'Active',
      value: kpis ? String(kpis.active_audits) : '—',
      sub: 'In pipeline',
      Icon: Pulse,
      tone: 'warning',
    },
    {
      label: 'Avg Score',
      value: kpis?.avg_score != null ? String(kpis.avg_score) : '—',
      sub: 'Completed audits',
      Icon: TrendUp,
      tone: 'success',
    },
    {
      label: 'Awaiting Review',
      value: kpis ? String(kpis.awaiting_review) : '—',
      sub: 'Gates pending',
      Icon: Warning,
      tone: kpis && kpis.awaiting_review > 0 ? 'warning' : 'muted',
    },
  ];
}

const KPI_ICON_TONE_CLASS: Record<Card['tone'], { container: string; icon: string }> = {
  info: {
    container: 'bg-[color:color-mix(in_oklab,var(--text-blue)_18%,transparent)]',
    icon: 'text-[var(--text-blue)]',
  },
  warning: {
    container: 'bg-[color:color-mix(in_oklab,var(--text-accent)_18%,transparent)]',
    icon: 'text-[var(--text-accent)]',
  },
  success: {
    container: 'bg-[color:color-mix(in_oklab,var(--score-5)_18%,transparent)]',
    icon: 'text-[var(--score-5)]',
  },
  muted: {
    container: 'bg-[color:color-mix(in_oklab,var(--text-tertiary)_18%,transparent)]',
    icon: 'text-[var(--text-tertiary)]',
  },
};

export function KpiStrip({ kpis, loading }: KpiStripProps) {
  const cards = buildCards(kpis);

  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="ds-card h-[90px] animate-pulse rounded-[var(--radius-xl)] p-4"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="ds-glass-strip grid grid-cols-2 gap-3 p-3 sm:grid-cols-4"
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((m) => (
        <motion.div
          key={m.label}
          variants={itemVariants}
          whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
          transition={{ duration: 0.18 }}
          className="ds-card cursor-default rounded-[var(--radius-xl)] p-4"
        >
          {/** tone classes keep icon/background token-driven without inline style */}
          {(() => {
            const tone = KPI_ICON_TONE_CLASS[m.tone];
            return (
          <div className="flex items-start justify-between mb-3">
            <SectionLabel>{m.label}</SectionLabel>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${tone.container}`}>
              <m.Icon className={`h-3.5 w-3.5 ${tone.icon}`} />
            </div>
          </div>
            );
          })()}
          <div className="font-bold tabular-nums [font-family:var(--font-display)] text-[length:var(--text-3xl)] leading-[1] tracking-[var(--tracking-tight)] text-[var(--text-primary)]">
            {m.value}
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-tertiary)]">{m.sub}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
