import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams } from 'react-router';
import {
  Server, Shield, Globe, MousePointer, Target, Zap, Map, Search,
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ScoreBadge, ScoreBar, ScoreRing } from '../components/glc/ScoreBadge';
import { SectionLabel } from '../components/glc/SectionLabel';
import { StatusPill } from '../components/glc/StatusPill';
import { QuickWinTag } from '../components/glc/QuickWinTag';

interface Domain {
  id: string; label: string; score: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  investment: string; roi: string;
  strengths: string[]; issues: { label: string; severity: 'high' | 'medium' | 'low' }[];
  recommendations: { label: string; effort: string; impact: string; quickWin?: boolean; time?: string; cost?: string }[];
}

const DOMAINS: Domain[] = [
  {
    id: 'tech', label: 'Tech Infrastructure', score: 3,
    icon: Server, investment: '€4,500', roi: '+22% performance',
    strengths: ['Cloudflare CDN partially configured', 'SSL certificate valid until 2027', 'GA4 tracking correctly set up'],
    issues: [
      { label: 'WordPress 5.8 EOL — 12 known CVEs unpatched', severity: 'high'   },
      { label: 'No image optimisation pipeline (avg image 2.1MB)', severity: 'high' },
      { label: 'No staging environment for deployments', severity: 'medium' },
      { label: 'Missing cache headers on static assets', severity: 'low'    },
    ],
    recommendations: [
      { label: 'Compress & convert images to WebP', effort: 'Low', impact: 'High', quickWin: true, time: '2h', cost: '€0' },
      { label: 'Migrate WordPress → modern stack (Vite/Next)', effort: 'High', impact: 'High', time: '6 wks', cost: '€4.5K' },
      { label: 'Set up Cloudflare page rules for caching', effort: 'Low', impact: 'Medium', quickWin: true, time: '30m', cost: '€0' },
    ],
  },
  {
    id: 'security', label: 'Security & Compliance', score: 2,
    icon: Shield, investment: '€1,200', roi: 'Legal compliance',
    strengths: ['HTTPS enforced on main domain', 'No exposed admin paths found', 'Basic rate limiting in place'],
    issues: [
      { label: 'Missing Content Security Policy (CSP) header',  severity: 'high'   },
      { label: 'No GDPR-compliant cookie consent banner',        severity: 'high'   },
      { label: 'Verifactu fiscal compliance not implemented',    severity: 'high'   },
      { label: 'WordPress admin reachable from any IP',          severity: 'medium' },
    ],
    recommendations: [
      { label: 'Add CSP, X-Frame-Options and HSTS headers', effort: 'Low', impact: 'High', quickWin: true, time: '1h', cost: '€0' },
      { label: 'Install GDPR consent banner (Cookiebot or similar)', effort: 'Low', impact: 'High', quickWin: true, time: '1h', cost: '€120/yr' },
      { label: 'Implement Verifactu via certified provider', effort: 'Medium', impact: 'High', time: '2 wks', cost: '€800' },
    ],
  },
  {
    id: 'seo', label: 'SEO & Digital Presence', score: 3,
    icon: Globe, investment: '€2,800', roi: '+34% organic traffic',
    strengths: ['robots.txt and sitemap.xml present', 'Google Search Console connected', 'Core Web Vitals: LCP under 4s on desktop'],
    issues: [
      { label: 'No JSON-LD structured data (LocalBusiness, Hotel)', severity: 'high'   },
      { label: 'Missing hreflang tags for multi-language',           severity: 'medium' },
      { label: 'Title tags duplicated across 8 pages',               severity: 'medium' },
    ],
    recommendations: [
      { label: 'Add JSON-LD LocalBusiness & Hotel schema', effort: 'Low', impact: 'High', quickWin: true, time: '2h', cost: '€0' },
      { label: 'Content cluster: 10 blog posts targeting long-tail', effort: 'Medium', impact: 'High', time: '8 wks', cost: '€2K' },
      { label: 'Fix duplicate meta titles and missing descriptions', effort: 'Low', impact: 'Medium', quickWin: true, time: '3h', cost: '€0' },
    ],
  },
  {
    id: 'ux', label: 'UX & Conversion', score: 4,
    icon: MousePointer, investment: '€600', roi: '+18% conversions',
    strengths: ['Mobile responsive across all breakpoints', 'Clear CTA hierarchy above the fold', 'Booking flow completion rate: 4.2% (sector avg 2.8%)'],
    issues: [
      { label: 'Booking form has 9 fields (optimal: 4–5)', severity: 'medium' },
      { label: 'No exit-intent modal for abandonment recovery', severity: 'low' },
    ],
    recommendations: [
      { label: 'Reduce booking form to 5 essential fields', effort: 'Low', impact: 'High', quickWin: true, time: '4h', cost: '€200' },
      { label: 'A/B test hero CTA copy ("Book Now" vs "Check Availability")', effort: 'Low', impact: 'Medium', time: '2 wks', cost: '€0' },
    ],
  },
  {
    id: 'marketing', label: 'Marketing & УТП', score: 3,
    icon: Target, investment: '€3,500', roi: '+28% brand reach',
    strengths: ['Clear seasonal offers visible on homepage', 'Active on Google Ads with €800/mo budget', 'TripAdvisor rating 4.4 / 5 (180+ reviews)'],
    issues: [
      { label: 'No email marketing funnel or newsletter',     severity: 'high'   },
      { label: 'Weak value proposition vs. competitors',       severity: 'medium' },
      { label: 'Missing Google Business Profile photos (< 10)',severity: 'low'    },
    ],
    recommendations: [
      { label: 'Set up Mailchimp/Brevo welcome email sequence', effort: 'Low', impact: 'High', quickWin: true, time: '3h', cost: '€0' },
      { label: 'Update Google Business Profile with 20+ photos', effort: 'Low', impact: 'Medium', quickWin: true, time: '1h', cost: '€0' },
    ],
  },
  {
    id: 'automation', label: 'Automation', score: 2,
    icon: Zap, investment: '€2,200', roi: '–60% admin time',
    strengths: ['Basic booking confirmation emails in place', 'Channel manager connected to 3 OTAs'],
    issues: [
      { label: 'No automated review request after checkout',   severity: 'high'   },
      { label: 'Manual pricing updates (no dynamic pricing)',   severity: 'high'   },
      { label: 'No CRM for guest data and repeat booking',     severity: 'medium' },
    ],
    recommendations: [
      { label: 'Automate post-stay review requests (TripAdvisor + Google)', effort: 'Low', impact: 'High', quickWin: true, time: '2h', cost: '€0' },
      { label: 'Implement dynamic pricing via RMS (e.g. Duetto)', effort: 'High', impact: 'High', time: '6 wks', cost: '€1.8K' },
    ],
  },
  {
    id: 'finance', label: 'Financial Health', score: 4,
    icon: Map, investment: '€0', roi: 'Baseline established',
    strengths: ['RevPAR above regional average by 12%', 'ADR trending upward Q1 2026 vs Q1 2025', 'OTA dependency reduced from 78% → 65% direct bookings'],
    issues: [
      { label: 'No forecasting model for seasonal demand', severity: 'medium' },
    ],
    recommendations: [
      { label: 'Build 12-month revenue forecast in Sheets/Notion', effort: 'Low', impact: 'Medium', time: '4h', cost: '€0' },
    ],
  },
  {
    id: 'strategy', label: 'Strategy & Roadmap', score: 3,
    icon: Search, investment: '€0', roi: 'Direction clarity',
    strengths: ['Clear seasonal offer strategy', 'Owner actively engaged in digital transition', 'Competitive positioning defined in target market'],
    issues: [
      { label: 'No documented digital strategy or OKRs', severity: 'medium' },
      { label: 'No brand differentiation beyond "family hotel"', severity: 'medium' },
    ],
    recommendations: [
      { label: 'Define 3 strategic digital OKRs for 2026', effort: 'Low', impact: 'High', time: '2h', cost: '€0' },
      { label: 'Develop a unique brand story for the property', effort: 'Medium', impact: 'High', time: '4 wks', cost: '€2K' },
    ],
  },
];

const SEV_COLOR: Record<string, string> = {
  high:   'var(--score-1)',
  medium: 'var(--score-3)',
  low:    'var(--text-tertiary)',
};
const SEV_BG: Record<string, string> = {
  high:   'var(--score-1-bg)',
  medium: 'var(--score-3-bg)',
  low:    'var(--bg-muted)',
};

export function AuditWorkspace() {
  const { domainId } = useParams<{ domainId?: string }>();
  const [openRec, setOpenRec]  = useState<number | null>(null);
  const [activeDomain, setActiveDomain] = useState(domainId ?? DOMAINS[0].id);

  const domain = DOMAINS.find(d => d.id === activeDomain) ?? DOMAINS[0];

  return (
    <AppShell
      title="Audit Workspace"
      subtitle={`Hotel XYZ · ${domain.label}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status="completed" />
          <Link to="/reports" className="glc-btn-secondary" style={{ textDecoration: 'none' }}>
            Full Report <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      }
    >
      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Domain binder sidebar ─────────────────── */}
        <aside
          className="w-[232px] flex-shrink-0 overflow-y-auto flex flex-col"
          style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Score overview */}
          <div
            className="p-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
          >
            <ScoreRing
              score={+(DOMAINS.reduce((s, d) => s + d.score, 0) / DOMAINS.length).toFixed(1)}
              size={48}
            />
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                Overall Score
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>8 domains analysed</p>
            </div>
          </div>

          {/* Domain nav */}
          <div className="px-2 py-2 space-y-0.5 flex-1">
            <div className="px-2 pb-1.5"><SectionLabel>Domains</SectionLabel></div>
            {DOMAINS.map(d => {
              const I = d.icon;
              const active = d.id === activeDomain;
              return (
                <motion.button
                  key={d.id}
                  onClick={() => setActiveDomain(d.id)}
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.14 }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left relative"
                  style={{
                    backgroundColor: active ? 'var(--glc-blue-xlight)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(28,189,255,0.22)' : 'transparent'}`,
                    borderLeft: `3px solid ${active ? 'var(--glc-blue)' : 'transparent'}`,
                    transition: 'all var(--ease-fast)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <I
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: active ? 'var(--glc-blue)' : 'var(--text-tertiary)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs truncate font-medium"
                      style={{ color: active ? 'var(--glc-blue-deeper)' : 'var(--text-secondary)' }}
                    >
                      {d.label}
                    </div>
                    <div className="mt-0.5"><ScoreBar score={d.score} /></div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* ── Domain detail ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl mx-auto px-7 py-6 space-y-6"
            >
              {/* Domain header */}
              <div className="flex items-start gap-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--gradient-brand)', boxShadow: '0 6px 20px rgba(28,189,255,0.25)' }}
                >
                  <domain.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: 'var(--tracking-tight)',
                    }}
                  >
                    {domain.label}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <ScoreBadge score={domain.score} showLabel size="md" />
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>·</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--glc-green)' }}>
                      Est. ROI: {domain.roi}
                    </span>
                  </div>
                </div>

                {/* Investment card */}
                <div
                  className="flex-shrink-0 px-4 py-3 rounded-xl text-center"
                  style={{
                    background: 'var(--gradient-surface)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                    minWidth: 90,
                  }}
                >
                  <div
                    className="text-xl font-bold"
                    style={{ color: 'var(--glc-orange)', fontFamily: 'var(--font-display)', letterSpacing: 'var(--tracking-tight)' }}
                  >
                    {domain.investment}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>investment</div>
                </div>
              </div>

              {/* Strengths */}
              <div className="glc-card p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--glc-green)' }} />
                  <SectionLabel>Strengths</SectionLabel>
                </div>
                <ul className="space-y-2">
                  {domain.strengths.map(s => (
                    <li key={s} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--gradient-success)' }}
                      />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Issues table */}
              <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>
                <div
                  className="flex items-center gap-2 px-5 py-3"
                  style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--score-1)' }} />
                  <SectionLabel>Issues Found</SectionLabel>
                  <span
                    className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'var(--score-1-bg)', color: 'var(--score-1)', fontSize: '10px' }}
                  >
                    {domain.issues.length}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {domain.issues.map((issue, i) => (
                    <motion.div
                      key={issue.label}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold capitalize flex-shrink-0"
                        style={{
                          backgroundColor: SEV_BG[issue.severity],
                          color: SEV_COLOR[issue.severity],
                          fontSize: '10px',
                          minWidth: 48,
                          textAlign: 'center',
                        }}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{issue.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel>Recommendations</SectionLabel>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {domain.recommendations.length} actions
                  </span>
                </div>

                {domain.recommendations.map((rec, i) => {
                  const open = openRec === i;
                  return (
                    <div
                      key={rec.label}
                      className="glc-card overflow-hidden"
                      style={{
                        borderRadius: 'var(--radius-xl)',
                        borderLeft: rec.quickWin ? `3px solid var(--glc-orange)` : '3px solid var(--border-default)',
                      }}
                    >
                      <button
                        onClick={() => setOpenRec(open ? null : i)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                        style={{ transition: 'background var(--ease-fast)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-canvas)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-medium"
                              style={{
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-display)',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {rec.label}
                            </span>
                            {rec.quickWin && <QuickWinTag time={rec.time} cost={rec.cost} />}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span>Effort: <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rec.effort}</strong></span>
                            <span>Impact: <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rec.impact}</strong></span>
                            {rec.time && <span>{rec.time}</span>}
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: open ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-shrink-0"
                        >
                          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div
                              className="px-4 pb-4 pt-1 text-sm leading-relaxed"
                              style={{
                                color: 'var(--text-secondary)',
                                borderTop: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--bg-canvas)',
                              }}
                            >
                              <p className="pt-3">
                                Implementation details for <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rec.label}</strong>.
                                This action requires <strong style={{ fontWeight: 600 }}>{rec.effort.toLowerCase()} effort</strong> and is expected to deliver{' '}
                                <strong style={{ fontWeight: 600 }}>{rec.impact.toLowerCase()} impact</strong> within the {domain.label} domain.
                                {rec.cost && ` Estimated cost: ${rec.cost}.`}
                                {rec.time && ` Estimated time: ${rec.time}.`}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
