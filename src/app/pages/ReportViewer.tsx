import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  ArrowUpRight, TrendingUp, AlertTriangle, Zap, ChevronRight,
  CheckCircle2, FileText, Clock, DollarSign, BarChart3
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreBar } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';
import { QuickWinTag } from '../components/glc/QuickWinTag';

const DOMAINS = [
  { id: 'tech',      label: 'Tech Infrastructure', score: 3 },
  { id: 'security',  label: 'Security & Compliance', score: 2 },
  { id: 'seo',       label: 'SEO & Digital',         score: 3 },
  { id: 'ux',        label: 'UX & Conversion',       score: 4 },
  { id: 'marketing', label: 'Marketing & UТП',       score: 3 },
  { id: 'automation',label: 'Automation',             score: 2 },
  { id: 'finance',   label: 'Financial Health',       score: 4 },
  { id: 'strategy',  label: 'Strategy & Roadmap',     score: 3 },
];

const QUICK_WINS = [
  { label: 'Add HTTPS redirect for www variant',                time: '30 min', cost: '€0',    impact: 'Security' },
  { label: 'Compress hero image (saves 1.2s load time)',        time: '1 hr',   cost: '€0',    impact: 'UX'       },
  { label: 'Add JSON-LD LocalBusiness schema',                  time: '2 hrs',  cost: '€0',    impact: 'SEO'      },
  { label: 'Set up Google Business Profile (missing)',          time: '1 hr',   cost: '€0',    impact: 'Marketing'},
];

const INVESTMENTS = [
  { tier: 'Quick Wins',    price: '€800–2K',    timeline: '2–4 weeks',   items: 6,  color: 'var(--glc-green)',   desc: 'Immediate improvements with no infrastructure changes' },
  { tier: 'Core Growth',   price: '€5K–12K',    timeline: '2–3 months',  items: 4,  color: 'var(--glc-blue)',    desc: 'Core platform upgrade and marketing automation' },
  { tier: 'Transformation',price: '€18K–35K',   timeline: '4–6 months',  items: 3,  color: 'var(--glc-orange)',  desc: 'Full digital transformation with measurable ROI' },
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export function ReportViewer() {
  const avg = DOMAINS.reduce((s, d) => s + d.score, 0) / DOMAINS.length;

  return (
    <AppShell
      title="Audit Report"
      subtitle="Hotel XYZ · glc-2026-03-09"
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status="completed" />
          <button className="glc-btn-secondary">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto px-7 py-6 space-y-6">

        {/* ── Hero card ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden"
          style={{
            background: 'var(--gradient-ink-rich)',
            borderRadius: 'var(--radius-2xl)',
            padding: '32px 36px',
          }}
        >
          {/* Mesh glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--mesh-ink)', opacity: 0.7 }}
          />

          <div className="relative flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <SectionLabel className="opacity-50" style={{ color: '#fff' } as React.CSSProperties}>
                Executive Summary
              </SectionLabel>

              <h2
                className="mt-2"
                style={{
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-tight)',
                  lineHeight: 1.2,
                }}
              >
                Hotel XYZ
              </h2>

              <p className="mt-1" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'var(--text-sm)' }}>
                Hospitality · Mallorca, Spain · March 2026
              </p>

              <p
                className="mt-4 leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'var(--text-sm)', maxWidth: 480 }}
              >
                The audit reveals a business with strong UX foundations and solid conversion
                architecture, but held back by critical security vulnerabilities and an
                ageing tech stack. Addressing these systematically unlocks an estimated{' '}
                <strong style={{ color: 'var(--glc-green)', fontWeight: 600 }}>+34% organic growth</strong>{' '}
                and{' '}
                <strong style={{ color: 'var(--glc-blue)', fontWeight: 600 }}>+18% conversion rate</strong>{' '}
                within 6 months.
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                {[
                  { icon: AlertTriangle, label: '14 issues found',    color: 'var(--score-1)' },
                  { icon: Zap,          label: '6 quick wins',        color: 'var(--glc-green)' },
                  { icon: TrendingUp,   label: '+34% growth potential',color: 'var(--glc-blue)' },
                  { icon: Clock,        label: '~4 weeks to impact',   color: 'var(--score-3)'  },
                ].map(({ icon: I, label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.80)',
                    }}
                  >
                    <I className="w-3 h-3 flex-shrink-0" style={{ color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Score ring */}
            <div
              className="flex-shrink-0 flex flex-col items-center gap-2 px-6 py-5 rounded-2xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                minWidth: 120,
              }}
            >
              {/* SVG ring — inline for dark bg */}
              <svg width="72" height="72" style={{ flexShrink: 0 }}>
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
                <motion.circle
                  cx="36" cy="36" r="28" fill="none"
                  stroke="var(--glc-blue)" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - avg / 5) }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  transform="rotate(-90 36 36)"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(28,189,255,0.6))' }}
                />
                <text x="36" y="40" textAnchor="middle" fontSize="20" fontWeight="700" fill="white" fontFamily="var(--font-mono)">
                  {avg.toFixed(1)}
                </text>
              </svg>
              <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: '10px', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>
                Overall
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Scorecard ─────────────────────────────── */}
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="glc-card overflow-hidden"
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
              <SectionLabel>Domain Scorecard</SectionLabel>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>8 domains · avg {avg.toFixed(1)}/5</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {DOMAINS.map((d, i) => (
              <motion.div
                key={d.id}
                variants={itemVariants}
                className="flex items-center gap-4 px-5 py-3.5 group"
                style={{ transition: 'background var(--ease-fast)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
              >
                <span
                  className="font-mono text-xs flex-shrink-0 tabular-nums"
                  style={{ color: 'var(--text-quaternary)', width: 20 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="flex-1 font-medium text-sm"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
                >
                  {d.label}
                </span>
                <div className="w-32"><ScoreBar score={d.score} /></div>
                <ScoreBadge score={d.score} size="sm" />
                <Link
                  to={`/audit/${d.id}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity glc-btn-icon"
                  style={{ width: 26, height: 26 }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Findings ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              title: 'Key Strengths',
              icon: CheckCircle2,
              color: 'var(--glc-green)',
              bg: 'var(--glc-green-xlight)',
              border: 'rgba(14,207,130,0.20)',
              items: [
                'Mobile-responsive design with clear CTA hierarchy',
                'Booking flow optimised for conversion (4.2% above sector avg)',
                'Strong local brand recognition in Mallorca market',
              ],
            },
            {
              title: 'Critical Issues',
              icon: AlertTriangle,
              color: 'var(--score-1)',
              bg: 'var(--score-1-bg)',
              border: 'var(--score-1-border)',
              items: [
                'WordPress 5.8 EOL — 12 known CVEs unpatched',
                'No CSP header · No GDPR consent banner',
                'Missing Verifactu fiscal compliance (Spain 2026)',
              ],
            },
          ].map(({ title, icon: I, color, bg, border, items }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="p-5"
              style={{
                backgroundColor: bg,
                border: `1px solid ${border}`,
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <I className="w-4 h-4 flex-shrink-0" style={{ color }} />
                <span className="font-semibold text-sm" style={{ color, fontFamily: 'var(--font-display)' }}>{title}</span>
              </div>
              <ul className="space-y-2">
                {items.map(item => (
                  <li
                    key={item}
                    className="text-xs leading-relaxed flex items-start gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── Quick wins ────────────────────────────── */}
        <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--glc-orange)', fill: 'var(--glc-orange)', stroke: 'none' }} />
              <SectionLabel>Quick Wins</SectionLabel>
            </div>
            <QuickWinTag time="≤ 2 hrs each" cost="€0" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {QUICK_WINS.map((qw, i) => (
              <motion.div
                key={qw.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 + 0.15, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
                  style={{ backgroundColor: 'var(--glc-orange-xlight)', color: 'var(--glc-orange)', fontSize: '10px' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{qw.label}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-tertiary)', fontSize: '11px' }}
                  >
                    {qw.impact}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <Clock className="w-3 h-3" />{qw.time}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--glc-green)' }}>
                    <DollarSign className="w-3 h-3" />{qw.cost}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Investment tiers ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Investment Overview</SectionLabel>
            <Link to="/strategy" className="text-xs font-medium" style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}>
              View Strategy Lab <ArrowUpRight className="inline w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {INVESTMENTS.map((inv, i) => (
              <motion.div
                key={inv.tier}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 + 0.2, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2, transition: { duration: 0.18 } }}
                className="glc-card p-4 cursor-default"
                style={{ borderRadius: 'var(--radius-xl)', borderTop: `3px solid ${inv.color}` }}
              >
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {inv.tier}
                </div>
                <div
                  className="font-bold tabular-nums mb-2"
                  style={{ color: inv.color, fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-tight)' }}
                >
                  {inv.price}
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-tertiary)' }}>{inv.desc}</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>{inv.items}</strong> items</span>
                  <span>{inv.timeline}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
