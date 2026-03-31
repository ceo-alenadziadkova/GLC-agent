import { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router';
import {
  ArrowUpRight, TrendUp, Warning, Lightning, CaretRight,
  CheckCircle, FileText, Clock, CurrencyDollar, ChartBar, ArrowsClockwise,
  DownloadSimple, User, Code, Megaphone, Article,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreBar } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { SectionLabel } from '../components/glc/SectionLabel';
import { QuickWinTag } from '../components/glc/QuickWinTag';
import { useAudit } from '../hooks/useAudit';
import { api } from '../data/apiService';
import { DOMAIN_KEYS, DOMAIN_LABELS } from '../data/auditTypes';
import type { DomainData } from '../data/auditTypes';

type ReportProfile = 'full' | 'owner' | 'tech' | 'marketing' | 'onepager';

const PROFILES: Array<{ id: ReportProfile; label: string; icon: React.ElementType; description: string }> = [
  { id: 'full',      label: 'Full Report',       icon: ChartBar,          description: 'All 6 domains — consulting team' },
  { id: 'owner',     label: 'Owner Summary',      icon: User,              description: 'Exec summary + roadmap + costs' },
  { id: 'tech',      label: 'Technical',          icon: Code,              description: 'Tech & Security deep-dive' },
  { id: 'marketing', label: 'Marketing & Growth', icon: Megaphone,         description: 'SEO, UX, Marketing analysis' },
  { id: 'onepager',  label: 'One-Pager',          icon: Article,           description: 'Summary + top findings, 1 page' },
];

// Mirrors server/src/services/report-profiler.ts PROFILE_DOMAINS
const PROFILE_DOMAIN_FILTER: Record<ReportProfile, string[] | 'all'> = {
  full:      'all',
  owner:     'all',
  tech:      ['tech_infrastructure', 'security_compliance'],
  marketing: ['seo_digital', 'ux_conversion', 'marketing_utp'],
  onepager:  'all',
};

// Max items to show per section per profile
const PROFILE_MAX_ITEMS: Record<ReportProfile, number> = {
  full:      999,
  owner:     5,
  tech:      999,
  marketing: 999,
  onepager:  3,
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export function ReportViewer() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading, error } = useAudit(id);
  const [profile, setProfile] = useState<ReportProfile>('full');
  const [csvLoading, setCsvLoading] = useState(false);

  const handleExportPdf = () => {
    window.print();
  };

  async function handleDownloadCsv() {
    if (!id) return;
    setCsvLoading(true);
    try {
      await api.downloadReportCsv(id, profile);
    } catch (e) {
      console.error(e);
    } finally {
      setCsvLoading(false);
    }
  }

  if (loading && !audit) {
    return (
      <AppShell title="Audit Report" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <ArrowsClockwise className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title="Audit Report" subtitle="Error">
        <div className="flex items-center justify-center h-64">
          <p style={{ color: 'var(--score-1)' }}>{error || 'Audit not found'}</p>
        </div>
      </AppShell>
    );
  }

  const companyName = audit.meta.company_name || audit.meta.company_url;
  const allDomains = DOMAIN_KEYS.map(key => ({
    key,
    label: DOMAIN_LABELS[key],
    data: audit.domains[key],
    score: audit.domains[key]?.score ?? 0,
  }));

  // Filter domains by active profile
  const domainFilter = PROFILE_DOMAIN_FILTER[profile];
  const domains = domainFilter === 'all'
    ? allDomains
    : allDomains.filter(d => (domainFilter as string[]).includes(d.key));

  const maxItems = PROFILE_MAX_ITEMS[profile];

  // Always use all domains for overall avg (hero card shows whole-company score)
  const allDomainEntries = allDomains.filter(d => d.data && d.data.score !== null);
  const avg = allDomainEntries.length > 0
    ? allDomainEntries.reduce((s, d) => s + d.score, 0) / allDomainEntries.length
    : 0;

  const domainEntries = domains.filter(d => d.data && d.data.score !== null);

  // Collect issues/strengths/quick wins scoped to visible domains
  const allIssues = domains.flatMap(d => d.data?.issues ?? []);
  const criticalIssues = allIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
  const allStrengths = domains.flatMap(d => (d.data?.strengths ?? []).map(s => ({ domain: d.label, text: s })));
  const allQuickWins = domains.flatMap(d => d.data?.quick_wins ?? []);

  const executiveSummary = audit.strategy?.executive_summary || null;

  return (
    <AppShell
      title="Audit Report"
      subtitle={`${companyName} · ${id?.slice(0, 8)}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status={audit.meta.status === 'completed' ? 'completed' : 'running'} />
          <button
            type="button"
            className="glc-btn-secondary"
            onClick={handleDownloadCsv}
            disabled={csvLoading}
            title="Download Action Plan as CSV"
          >
            <DownloadSimple className="w-4 h-4" />
            {csvLoading ? 'Generating…' : 'Action Plan CSV'}
          </button>
          <button type="button" className="glc-btn-secondary" onClick={handleExportPdf}>
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto px-7 py-6 space-y-6">

        {/* ── Profile selector ──────────────────────── */}
        <div
          className="flex items-start gap-2 flex-wrap p-1 rounded-xl"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          {PROFILES.map(p => {
            const active = profile === p.id;
            const I = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => setProfile(p.id)}
                title={p.description}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: '12px',
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'var(--font-display)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  background: active ? 'var(--gradient-accent)' : 'transparent',
                  border: active ? 'none' : '1px solid transparent',
                  boxShadow: active ? '0 2px 8px rgba(242,79,29,0.28)' : 'none',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                <I size={13} weight={active ? 'fill' : 'regular'} />
                {p.label}
              </button>
            );
          })}
          <span
            className="ml-auto text-xs self-center pr-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {PROFILES.find(p => p.id === profile)?.description}
          </span>
        </div>

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
                {companyName}
              </h2>

              <p className="mt-1" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'var(--text-sm)' }}>
                {audit.meta.industry || 'General'} · {new Date(audit.meta.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>

              {executiveSummary && (
                <p
                  className="mt-4 leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'var(--text-sm)', maxWidth: 480 }}
                >
                  {executiveSummary}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-5">
                {[
                  { icon: Warning,   label: `${criticalIssues.length} critical issues`,  color: 'var(--score-1)' },
                  { icon: Lightning, label: `${allQuickWins.length} quick wins`,          color: 'var(--glc-green)' },
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
              <ChartBar className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
              <SectionLabel>Domain Scorecard</SectionLabel>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {domainEntries.length} {domainFilter !== 'all' ? 'of 6' : ''} domains · avg {avg.toFixed(1)}/5
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {domains.map((d, i) => (
              <motion.div
                key={d.key}
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
                <div className="w-32">{d.score > 0 && <ScoreBar score={d.score} />}</div>
                {d.score > 0 ? <ScoreBadge score={d.score} size="sm" /> : <span className="text-xs" style={{ color: 'var(--text-quaternary)' }}>—</span>}
                <Link
                  to={`/audit/${id}/${d.key}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity glc-btn-icon"
                  style={{ width: 26, height: 26 }}
                >
                  <CaretRight className="w-3.5 h-3.5" />
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
              icon: CheckCircle,
              color: 'var(--glc-green)',
              bg: 'var(--glc-green-xlight)',
              border: 'rgba(14,207,130,0.20)',
              items: allStrengths.slice(0, Math.min(5, maxItems)).map(s => s.text),
            },
            {
              title: 'Critical Issues',
              icon: Warning,
              color: 'var(--score-1)',
              bg: 'var(--score-1-bg)',
              border: 'var(--score-1-border)',
              items: criticalIssues.slice(0, Math.min(5, maxItems)).map(i => i.title),
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
                {items.length > 0 ? items.map(item => (
                  <li
                    key={item}
                    className="text-xs leading-relaxed flex items-start gap-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {item}
                  </li>
                )) : (
                  <li className="text-xs" style={{ color: 'var(--text-quaternary)' }}>No data yet</li>
                )}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── Quick wins ────────────────────────────── */}
        {allQuickWins.length > 0 && (
          <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
            >
              <div className="flex items-center gap-2">
                <Lightning className="w-4 h-4" style={{ color: 'var(--glc-orange)', fill: 'var(--glc-orange)', stroke: 'none' }} />
                <SectionLabel>Quick Wins</SectionLabel>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {allQuickWins.slice(0, Math.min(8, maxItems)).map((qw, i) => (
                <motion.div
                  key={qw.id || i}
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
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{qw.title}</span>
                  {qw.timeframe && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock className="w-3 h-3" />{qw.timeframe}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy link */}
        {audit.strategy && (
          <div className="text-center">
            <Link
              to={`/strategy/${id}`}
              className="glc-btn-secondary inline-flex"
              style={{ textDecoration: 'none' }}
            >
              View Strategy Lab <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
