import { motion } from 'motion/react';
import { SquaresFour, Pulse, TrendUp, Warning } from '@phosphor-icons/react';
import { SectionLabel } from './SectionLabel';
import type { DashboardKpis } from '../../data/apiService';

interface KpiStripProps {
  kpis: DashboardKpis | undefined;
  loading: boolean;
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

interface Card {
  label: string;
  value: string;
  sub: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

function buildCards(kpis: DashboardKpis | undefined): Card[] {
  return [
    {
      label: 'Total Audits',
      value: kpis ? String(kpis.total_audits) : '—',
      sub: 'All time',
      Icon: SquaresFour,
      color: 'var(--glc-blue)',
    },
    {
      label: 'Active',
      value: kpis ? String(kpis.active_audits) : '—',
      sub: 'In pipeline',
      Icon: Pulse,
      color: 'var(--glc-orange)',
    },
    {
      label: 'Avg Score',
      value: kpis?.avg_score != null ? String(kpis.avg_score) : '—',
      sub: 'Completed audits',
      Icon: TrendUp,
      color: 'var(--glc-green)',
    },
    {
      label: 'Awaiting Review',
      value: kpis ? String(kpis.awaiting_review) : '—',
      sub: 'Gates pending',
      Icon: Warning,
      color: kpis && kpis.awaiting_review > 0 ? 'var(--glc-orange)' : 'var(--text-tertiary)',
    },
  ];
}

export function KpiStrip({ kpis, loading }: KpiStripProps) {
  const cards = buildCards(kpis);

  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="glc-card p-4 animate-pulse"
            style={{ borderRadius: 'var(--radius-xl)', height: 90 }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-4 gap-3"
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
          className="glc-card p-4 cursor-default"
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <SectionLabel>{m.label}</SectionLabel>
            <div
              className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              style={{ background: `${m.color}18`, borderRadius: 'var(--radius-md)' }}
            >
              <m.Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
            </div>
          </div>
          <div
            className="font-bold tabular-nums"
            style={{
              fontSize: 'var(--text-3xl)',
              color: 'var(--text-primary)',
              letterSpacing: 'var(--tracking-tight)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1,
            }}
          >
            {m.value}
          </div>
          <div className="mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.sub}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
