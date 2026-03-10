import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  Download, FileText, TrendingUp, AlertTriangle, CheckCircle2,
  Zap, Map, ArrowRight, Star, DollarSign
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreRing } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { QuickWinTag } from '../components/glc/QuickWinTag';
import { auditDomains, strategyRoadmap } from '../data/auditData';

const overall = +(auditDomains.reduce((s, d) => s + d.score, 0) / auditDomains.length).toFixed(1);

const quickWins = strategyRoadmap.filter(i => i.timeframe === 'quick-win').slice(0, 4);

export function ReportViewer() {
  return (
    <AppShell
      title="Audit Report"
      subtitle="Hotel XYZ · hotelxyz.com · March 9, 2026"
      actions={
        <div className="flex items-center gap-2">
          <button className="glc-btn-secondary">
            <FileText className="w-4 h-4" /> Export MD
          </button>
          <button className="glc-btn-primary">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto px-7 py-6 space-y-8">

        {/* ── Executive Summary ─────────────────── */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl p-6"
            style={{
              background: `linear-gradient(135deg, var(--glc-ink) 0%, var(--glc-ink-3) 100%)`,
              color: '#fff',
            }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="glc-label" style={{ color: 'rgba(255,255,255,0.4)' }}>GLC AUDIT REPORT</div>
                <h1 className="mt-2 text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>
                  Hotel XYZ
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  hotelxyz.com · Mallorca, Spain · Hospitality
                </p>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: 540 }}>
                  Comprehensive 8-domain business and technology audit revealing critical security gaps,
                  significant SEO opportunities, and strong UX fundamentals. 5 quick wins identified
                  that can be implemented within one week at near-zero cost.
                </p>
              </div>
              <div className="text-center flex-shrink-0">
                <ScoreRing score={Math.round(overall)} size={80} />
                <div className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Overall Score</div>
              </div>
            </div>

            {/* Meta row */}
            <div
              className="grid grid-cols-4 gap-4 mt-6 pt-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            >
              {[
                { label: 'Audit Date', val: 'Mar 9, 2026' },
                { label: 'Domains Analyzed', val: '8' },
                { label: 'Issues Found', val: '14' },
                { label: 'Quick Wins', val: '5' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                  <div className="text-lg font-semibold mt-1">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Scorecard Overview ────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
            <SectionLabel>Scorecard Overview</SectionLabel>
          </div>
          <div className="glc-card overflow-hidden">
            <div
              className="grid text-xs font-semibold px-5 py-2.5"
              style={{
                gridTemplateColumns: '2fr 80px 1fr 100px',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-canvas)',
                borderBottom: '1px solid var(--border-subtle)',
                letterSpacing: 'var(--tracking-wider)',
                textTransform: 'uppercase',
              }}
            >
              <span>Domain</span><span>Score</span><span>Status</span><span>Issues</span>
            </div>
            {auditDomains.map((d, i) => (
              <Link
                key={d.id}
                to={`/audit/${d.id}`}
                className="grid items-center px-5 py-3 transition-colors group"
                style={{
                  gridTemplateColumns: '2fr 80px 1fr 100px',
                  borderBottom: i < auditDomains.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                <ScoreBadge score={d.score} size="sm" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {d.status.replace('-', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {d.issues.length} issue{d.issues.length !== 1 ? 's' : ''}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--glc-blue)' }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Key Findings ──────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--score-2)' }} />
            <SectionLabel>Key Findings</SectionLabel>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Critical */}
            <div className="glc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--score-1)' }} />
                <SectionLabel>Critical</SectionLabel>
              </div>
              {auditDomains
                .flatMap(d => d.issues.filter(i => i.severity === 'critical').map(i => ({ ...i, domain: d.name })))
                .slice(0, 3)
                .map(issue => (
                  <div key={issue.id} className="py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{issue.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {issue.domain} · {issue.impact}
                    </div>
                  </div>
                ))}
            </div>

            {/* Strengths */}
            <div className="glc-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--glc-green)' }} />
                <SectionLabel>Top Strengths</SectionLabel>
              </div>
              {auditDomains
                .filter(d => d.score >= 4)
                .flatMap(d => d.strengths.slice(0, 1).map(s => ({ s, domain: d.name })))
                .slice(0, 3)
                .map(({ s, domain }) => (
                  <div key={s} className="py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{domain}</div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* ── Quick Wins ────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: 'var(--glc-orange)' }} />
            <SectionLabel>Quick Wins — Do This Week</SectionLabel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickWins.map((qw, i) => (
              <div
                key={qw.id}
                className="p-4 rounded-xl"
                style={{
                  border: '1px solid var(--glc-orange-light)',
                  backgroundColor: 'var(--glc-orange-xlight)',
                  borderRadius: 'var(--radius-xl)',
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                    style={{ backgroundColor: 'var(--glc-orange)', borderRadius: 'var(--radius-sm)', lineHeight: 1 }}
                  >
                    {i + 1}
                  </span>
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{qw.title}</h4>
                </div>
                <p className="text-xs leading-relaxed pl-7" style={{ color: 'var(--text-secondary)' }}>{qw.description}</p>
                <div className="mt-2 pl-7">
                  <QuickWinTag />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Investment Overview ───────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
            <SectionLabel>Investment Overview</SectionLabel>
          </div>
          <div className="glc-card overflow-hidden">
            <div
              className="grid grid-cols-3 divide-x"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {[
                { label: 'Quick Wins', period: 'This week', range: '$0 – $2,000',   note: '5 items' },
                { label: 'Short-Term', period: '1–3 months', range: '$40K – $80K',  note: '7 initiatives' },
                { label: 'Strategic',  period: '3–12 months', range: '$80K – $150K', note: '4 initiatives' },
              ].map(({ label, period, range, note }) => (
                <div key={label} className="p-5">
                  <SectionLabel>{label}</SectionLabel>
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{period}</div>
                  <div className="mt-2 font-bold text-xl font-mono" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {range}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA strip ─────────────────────────── */}
        <div
          className="rounded-xl p-6 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, var(--glc-blue-xlight) 0%, var(--glc-green-xlight) 100%)',
            border: '1px solid var(--glc-blue-light)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Ready to build your action plan?
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Prioritize initiatives, estimate ROI, and build your implementation roadmap.
            </p>
          </div>
          <Link
            to="/strategy"
            className="glc-btn-primary flex-shrink-0"
            style={{ textDecoration: 'none' }}
          >
            Open Strategy Lab <Map className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
