import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ArrowRight, CheckCircle, Warning, Lightning, CaretRight, Shield, Check, X, Equals } from '@phosphor-icons/react';
import type { SnapshotCompetitorComparison } from '../data/auditTypes';
import type { FreeSnapshotPreview } from '../data/auditTypes';
import { GlcLogo } from '../components/GlcLogo';
import { SyncPathLoader } from '../components/SyncPathLoader';
import { ThemeToggle } from '../components/ThemeToggle';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type Stage = 'idle' | 'submitting' | 'running' | 'done' | 'error';

const SCORE_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#22C55E',
  5: '#0ECF82',
};

const SCORE_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'Needs Work',
  3: 'Moderate',
  4: 'Good',
  5: 'Excellent',
};

function competitorComparisonCaption(c: SnapshotCompetitorComparison, competitorLabel: string): { kind: 'client' | 'competitor' | 'tie'; text: string } {
  if (c.metric === 'https') {
    if (c.winner === 'tie') return { kind: 'tie', text: 'Both sites use HTTPS' };
    if (c.winner === 'client') return { kind: 'client', text: 'HTTPS is in use on your site' };
    return { kind: 'competitor', text: `${competitorLabel} uses HTTPS; check your redirect` };
  }
  if (c.metric === 'mobile_viewport') {
    if (c.winner === 'tie') return { kind: 'tie', text: 'Both include a mobile viewport meta tag' };
    if (c.winner === 'client') return { kind: 'client', text: 'Your homepage declares a mobile viewport' };
    return { kind: 'competitor', text: `${competitorLabel} declares a mobile viewport — yours may not` };
  }
  if (c.metric === 'hreflang_count') {
    const cn = Number(c.client_val);
    const tn = Number(c.comp_val);
    if (c.winner === 'tie') return { kind: 'tie', text: `Both expose ${cn} hreflang alternate(s)` };
    if (c.winner === 'client') return { kind: 'client', text: `You show more hreflang alternates (${cn} vs ${tn})` };
    return { kind: 'competitor', text: `${competitorLabel} shows more hreflang alternates (${tn} vs ${cn})` };
  }
  if (c.metric === 'structured_data') {
    if (c.winner === 'tie') return { kind: 'tie', text: 'Both homepages include JSON-LD structured data' };
    if (c.winner === 'client') return { kind: 'client', text: 'Your homepage includes JSON-LD structured data' };
    return { kind: 'competitor', text: `${competitorLabel} includes JSON-LD — yours may not` };
  }
  return { kind: 'tie', text: c.label };
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high:     'var(--score-2)',
  medium:   'var(--score-3)',
  low:      'var(--score-4)',
};

const PHASE_LABELS = [
  'Crawling website...',
  'Analysing tech stack...',
  'Evaluating UX & conversion...',
  'Generating insights...',
];

export function SnapshotLanding() {
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [quotaHint, setQuotaHint] = useState('');
  const [rateLimitDetail, setRateLimitDetail] = useState<{ limit: number; remaining: number } | null>(null);
  const [result, setResult] = useState<FreeSnapshotPreview | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string>('');
  const [quotaPreview, setQuotaPreview] = useState<{ remaining: number; limit: number } | null>(null);

  async function refreshQuotaPreview() {
    try {
      const res = await fetch(`${API_URL}/api/snapshot/quota`);
      if (!res.ok) return;
      const data = (await res.json()) as { remaining?: number; limit?: number };
      if (typeof data.remaining === 'number' && typeof data.limit === 'number') {
        setQuotaPreview({ remaining: data.remaining, limit: data.limit });
      }
    } catch {
      /* ignore — page still works without preview */
    }
  }

  useEffect(() => {
    void refreshQuotaPreview();
  }, []);

  // Cycle through phase labels while running
  useEffect(() => {
    if (stage !== 'running') return;
    const t = setInterval(() => {
      setPhaseIdx(i => (i + 1) % PHASE_LABELS.length);
    }, 4500);
    return () => clearInterval(t);
  }, [stage]);

  // Poll for result
  useEffect(() => {
    if (stage !== 'running') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/snapshot/${tokenRef.current}`);
        if (!res.ok) throw new Error('Poll failed');
        const data: FreeSnapshotPreview = await res.json();
        if (data.status === 'completed') {
          setResult(data);
          setStage('done');
        } else if (data.status === 'failed') {
          setErrorMsg('Analysis failed. Please try again.');
          setStage('error');
        }
      } catch {
        // Keep polling on transient errors
      }
    };

    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setStage('submitting');
    setErrorMsg('');
    setRateLimitDetail(null);

    try {
      const res = await fetch(`${API_URL}/api/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_url: trimmed }),
      });

      const data = (await res.json()) as {
        error?: string;
        limit?: number;
        remaining?: number;
        snapshot_token?: string;
      };

      if (!res.ok) {
        setErrorMsg(
          typeof data.error === 'string' ? data.error : 'Failed to start analysis'
        );
        if (
          res.status === 429 &&
          typeof data.limit === 'number'
        ) {
          setRateLimitDetail({
            limit: data.limit,
            remaining: typeof data.remaining === 'number' ? data.remaining : 0,
          });
        }
        void refreshQuotaPreview();
        setStage('error');
        return;
      }

      const lim = res.headers.get('RateLimit-Limit');
      const rem = res.headers.get('RateLimit-Remaining');
      if (lim != null && rem != null) {
        const l = parseInt(lim, 10);
        const r = parseInt(rem, 10);
        if (!Number.isNaN(l) && !Number.isNaN(r)) {
          setQuotaHint(`${r} of ${l} free checks left today on this connection.`);
        } else {
          setQuotaHint('');
        }
      } else {
        setQuotaHint('');
      }

      tokenRef.current = data.snapshot_token ?? '';
      void refreshQuotaPreview();
      setStage('running');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStage('error');
    }
  }

  function reset() {
    setStage('idle');
    setResult(null);
    setErrorMsg('');
    setQuotaHint('');
    setRateLimitDetail(null);
    setUrl('');
    setPhaseIdx(0);
    void refreshQuotaPreview();
  }

  const techEntries = result
    ? Object.entries(result.tech_stack).filter(([, vals]) => vals.length > 0)
    : [];

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Background mesh */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', opacity: 0.4 }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between gap-3 px-6 py-4 mobile:px-4 mobile:py-3"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GlcLogo className="h-9 mobile:h-8" />
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <Link
            to="/login"
            className="inline-flex items-center justify-end gap-1 rounded-lg text-sm font-medium mobile:min-h-11 mobile:min-w-11 mobile:px-2"
            style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
          >
            Sign in <CaretRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 mobile:justify-start mobile:px-4 mobile:py-8">
        <AnimatePresence mode="wait">

          {/* ── Idle / Submitting: URL form ──────────────────── */}
          {(stage === 'idle' || stage === 'submitting' || stage === 'error') && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full max-w-5xl"
            >
              {/* Desktop: hero + quota (col 7) | form span 2 rows. Mobile: vertical rhythm — hero, context, form, quota, includes. */}
              <div className="flex flex-col gap-8 mobile:gap-7 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 lg:gap-y-6">
                {/* HERO + context column */}
                <div className="order-1 flex flex-col gap-6 text-center lg:order-none lg:col-span-7 lg:row-start-1 lg:gap-6 lg:text-left mobile:gap-5">
                  <section
                    aria-labelledby="snapshot-hero-heading"
                    className="flex flex-col items-stretch gap-4 lg:gap-4 lg:border-l-2 lg:border-[color-mix(in_oklab,var(--glc-blue)_45%,var(--border-subtle))] lg:pl-6 mobile:gap-3"
                  >
                    <div className="flex justify-center lg:justify-start">
                      <div
                        className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide mobile:py-1.5 mobile:pl-3 mobile:pr-3.5 mobile:text-[11px] mobile:leading-tight"
                        style={{
                          background: 'linear-gradient(135deg, rgba(28,189,255,0.12) 0%, rgba(242,79,29,0.08) 100%)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--glc-blue)',
                          letterSpacing: '0.06em',
                        }}
                      >
                        <Lightning className="h-3.5 w-3.5 shrink-0" weight="fill" /> Free check ~90s
                      </div>
                    </div>

                    <h1
                      id="snapshot-hero-heading"
                      className="mx-auto w-full max-w-[min(100%,22rem)] text-balance tracking-[-0.025em] lg:mx-0 lg:max-w-xl lg:tracking-[-0.035em]"
                      style={{
                        fontSize: 'clamp(2.05rem, 9.25vw, 4rem)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.04,
                      }}
                    >
                      <span className="block lg:max-w-[15ch]">How well does your website</span>
                      <span className="glc-gradient-text-flow mt-2 block lg:mt-2.5 mobile:mt-2 lg:max-w-[14ch]">
                        convert visitors?
                      </span>
                    </h1>
                  </section>

                  {/* Mobile: subcopy + trust in one calm band; desktop: unwrapped flow */}
                  <div className="flex flex-col gap-3 text-center lg:contents lg:text-left">
                    <p
                      className="mx-auto max-w-md text-pretty leading-snug lg:mx-0 mobile:max-w-none mobile:text-[0.8125rem] mobile:leading-relaxed"
                      style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8125rem, 2.85vw, 0.975rem)' }}
                    >
                      Enter your site address for a quick, plain-language read on how it feels for real visitors — what works, what gets in the way, and where to focus first.
                    </p>

                    <div
                      className="mx-auto flex w-full max-w-md items-center justify-center gap-2 py-1 text-sm font-medium lg:mx-0 lg:w-auto lg:max-w-none lg:justify-start"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                      No sign-up required
                    </div>
                  </div>
                </div>

                <div className="order-2 w-full lg:order-none lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:self-start lg:pt-1">
                  {/* Only this block reads as a card on mobile — main CTA */}
                  <div
                    className="glc-card p-6 lg:p-7 mobile:p-5 mobile:shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
                    style={{ borderRadius: 'var(--radius-2xl)' }}
                  >
                <p
                  className="mb-4 hidden text-left text-xs font-semibold tracking-wide lg:hidden"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Your website
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Globe
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 mobile:left-3"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                    <input
                      type="text"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="yourcompany.com"
                      required
                      disabled={stage === 'submitting'}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-transparent py-3 pl-10 pr-4 text-sm outline-none transition-[border-color,box-shadow] mobile:min-h-12 mobile:py-3.5 mobile:text-base"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; e.target.style.boxShadow = 'var(--shadow-blue)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={!url.trim() || stage === 'submitting'}
                    whileHover={url.trim() ? { scale: 1.015 } : {}}
                    whileTap={url.trim() ? { scale: 0.985 } : {}}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] py-3 text-sm font-semibold text-white mobile:min-h-12"
                    style={{
                      background: url.trim() ? 'var(--gradient-accent)' : 'var(--border-default)',
                      border: 'none',
                      cursor: url.trim() && stage !== 'submitting' ? 'pointer' : 'not-allowed',
                      boxShadow: url.trim() ? '0 4px 14px rgba(242,79,29,0.28)' : 'none',
                    }}
                  >
                    {stage === 'submitting' ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Starting analysis...
                      </>
                    ) : (
                      <>Analyse my website <ArrowRight className="w-4 h-4" /></>
                    )}
                  </motion.button>
                </form>

                {stage === 'error' && errorMsg && (
                  <div className="mt-3 space-y-1 text-center mobile:text-left">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm"
                      style={{ color: 'var(--score-1)' }}
                    >
                      {errorMsg}
                    </motion.p>
                    {rateLimitDetail && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Free checks left today on this connection: {rateLimitDetail.remaining} of {rateLimitDetail.limit}.
                      </p>
                    )}
                  </div>
                )}
                  </div>
                </div>

                {quotaPreview !== null && (
                  <div
                    className="order-3 w-full max-w-md lg:order-none lg:col-span-7 lg:row-start-2 lg:max-w-none"
                  >
                    <div
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:mx-0 mobile:mx-0 mobile:max-w-full mobile:rounded-none mobile:border-0 mobile:border-t mobile:border-[var(--border-subtle)] mobile:bg-transparent mobile:px-0 mobile:pb-0 mobile:pt-6 mobile:shadow-none"
                    >
                      <div className="mb-2.5 flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider mobile:text-[10px] mobile:tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                          Today on this connection
                        </span>
                        <span className="text-base font-bold tabular-nums mobile:text-[0.9375rem]" style={{ color: 'var(--text-primary)' }}>
                          {quotaPreview.remaining} / {quotaPreview.limit} left
                        </span>
                      </div>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full"
                        style={{ background: 'var(--border-subtle)' }}
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, Math.round((quotaPreview.remaining / Math.max(1, quotaPreview.limit)) * 100))}%`,
                            background: 'linear-gradient(90deg, var(--glc-blue), var(--glc-green))',
                          }}
                        />
                      </div>
                      <p className="mt-2.5 text-center text-xs leading-snug lg:text-left mobile:mt-3 mobile:text-[11px]" style={{ color: 'var(--text-quaternary)' }}>
                        Rolling 24-hour limit from this connection.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* What's included — mobile: 2×2 grid; desktop: wrap row */}
              <div className="mt-10 grid w-full grid-cols-2 gap-x-4 gap-y-2.5 mobile:max-w-[20rem] mobile:mx-auto mobile:pt-1 lg:mx-0 lg:mt-14 lg:flex lg:max-w-none lg:flex-wrap lg:justify-start lg:gap-x-8 lg:gap-y-3">
                <p
                  className="col-span-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] lg:hidden"
                  style={{ color: 'var(--text-quaternary)' }}
                >
                  You will get
                </p>
                {['UX score', 'Top issues', 'Quick wins', 'Tech stack'].map(item => (
                  <div
                    key={item}
                    className="flex items-center justify-center gap-2 text-center text-xs text-[var(--text-tertiary)] lg:inline-flex lg:min-w-0 lg:max-w-full lg:justify-start lg:text-left"
                  >
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--glc-green)' }} />
                    <span className="leading-tight">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Running: progress ────────────────────────────── */}
          {stage === 'running' && (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-[min(100%,26rem)] flex-col items-center px-0 text-center mobile:px-1"
            >
              <SyncPathLoader
                layout="embedded"
                variant="indeterminate"
                showCaptions={false}
                loadingText="Analysing your website, please wait"
                durationSeconds={8}
                className="mb-4 px-2"
              />

              <h2
                className="text-balance text-xl font-bold mobile:px-1 mobile:text-lg"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                }}
              >
                Analysing your website
              </h2>

              <AnimatePresence mode="wait">
                <motion.p
                  key={phaseIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3"
                  style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}
                >
                  {PHASE_LABELS[phaseIdx]}
                </motion.p>
              </AnimatePresence>

              <p className="mt-6 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                Usually takes 60–120 seconds
              </p>
              {quotaHint && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {quotaHint}
                </p>
              )}
            </motion.div>
          )}

          {/* ── Done: results ────────────────────────────────── */}
          {stage === 'done' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full min-w-0 max-w-[min(100%,38.75rem)]"
            >
              {/* Company header */}
              <div className="mb-8 text-center mobile:mb-6">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
                >
                  <CheckCircle className="w-3 h-3" style={{ color: 'var(--glc-green)' }} /> Your check is ready
                </div>
                <h2
                  className="break-words text-2xl font-bold mobile:px-1 mobile:text-xl"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {result.company_name ?? new URL(result.company_url.startsWith('http') ? result.company_url : `https://${result.company_url}`).hostname}
                </h2>
                {result.location && (
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>{result.location}</p>
                )}
              </div>

              {/* UX Score card */}
              {result.ux_score !== null && (
                <div
                  className="glc-card mb-4 flex flex-row items-center justify-between p-6 mobile:flex-col mobile:gap-4 mobile:p-5"
                  style={{ borderRadius: 'var(--radius-xl)' }}
                >
                  <div className="min-w-0 shrink-0 text-left mobile:text-center">
                    <p className="mb-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      UX & Conversion Score
                    </p>
                    <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, fontFamily: 'var(--font-display)', color: SCORE_COLORS[result.ux_score] }}>
                      {result.ux_score}/5
                    </p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: SCORE_COLORS[result.ux_score] }}>
                      {SCORE_LABELS[result.ux_score]}
                    </p>
                  </div>
                  {result.ux_summary && (
                    <p className="min-w-0 max-w-[21rem] text-pretty text-sm leading-relaxed ml-6 mobile:ml-0 mobile:max-w-none" style={{ color: 'var(--text-secondary)' }}>
                      {result.ux_summary}
                    </p>
                  )}
                </div>
              )}

              {/* Issues + Quick Wins grid */}
              <div className="mb-4 grid grid-cols-2 gap-4 mobile:grid-cols-1">

                {/* Issues */}
                {result.issues.length > 0 && (
                  <div className="glc-card p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Warning className="w-4 h-4" style={{ color: 'var(--score-2)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Top Issues
                      </span>
                    </div>
                    <div className="space-y-3">
                      {result.issues.map((issue, i) => (
                        <div key={i} className="flex gap-3">
                          <div
                            className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: SEVERITY_COLOR[issue.severity] ?? 'var(--text-tertiary)', marginTop: 6 }}
                          />
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{issue.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{issue.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Wins */}
                {result.quick_wins.length > 0 && (
                  <div className="glc-card p-5" style={{ borderRadius: 'var(--radius-xl)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Lightning className="w-4 h-4" style={{ color: 'var(--glc-green)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Quick Wins
                      </span>
                    </div>
                    <div className="space-y-3">
                      {result.quick_wins.map((qw, i) => (
                        <div key={i} className="flex gap-3">
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-green)' }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{qw.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              {qw.effort} effort · {qw.timeframe}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tech stack */}
              {techEntries.length > 0 && (
                <div className="glc-card p-5 mb-6" style={{ borderRadius: 'var(--radius-xl)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Tech Stack Detected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {techEntries.flatMap(([, vals]) => vals).slice(0, 12).map((tech, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.competitor_mini && result.competitor_mini.comparisons.length > 0 && (
                <div className="glc-card p-5 mb-6" style={{ borderRadius: 'var(--radius-xl)' }}>
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Compared to {result.competitor_mini.competitor_name}
                  </p>
                  <ul className="space-y-2">
                    {result.competitor_mini.comparisons.map((row, i) => {
                      const { kind, text } = competitorComparisonCaption(row, result.competitor_mini!.competitor_name);
                      const Icon = kind === 'tie' ? Equals : kind === 'client' ? Check : X;
                      const color = kind === 'tie' ? 'var(--text-tertiary)' : kind === 'client' ? 'var(--glc-green)' : 'var(--score-1)';
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} weight="bold" />
                          <span>{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div
                className="glc-card p-6 text-center mobile:p-5"
                style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--glc-blue)', background: 'linear-gradient(135deg, rgba(28,189,255,0.06) 0%, transparent 60%)' }}
              >
                {quotaHint && (
                  <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {quotaHint}
                  </p>
                )}
                <h3
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Want the full picture?
                </h3>
                <p className="mt-2 text-pretty text-sm" style={{ color: 'var(--text-secondary)' }}>
                  The Express Audit covers all 6 business domains — Tech, Security, SEO, UX, Marketing & Automation —
                  with a full action plan and competitor benchmark.
                </p>
                <div className="mt-5 flex w-full flex-row items-center justify-center gap-3 mobile:flex-col mobile:items-stretch">
                  <Link
                    to="/login"
                    className="glc-btn-primary w-auto min-w-[10rem] justify-center mobile:min-h-12 mobile:w-full"
                    style={{ textDecoration: 'none' }}
                  >
                    Get Express Audit <ArrowRight className="w-4 h-4 inline ml-1" />
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-sm font-medium mobile:min-h-11"
                    style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Analyse another URL
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 px-6 py-4 text-center mobile:px-4"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
          Results are AI-generated and for informational purposes only. · {' '}
          <Link to="/login" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Sign in</Link>
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-quaternary)' }}>
          No website yet?{' '}
          <Link
            to="/discovery"
            style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
          >
            Try our discovery flow
          </Link>
          {' '}— get a free tech-maturity assessment without a URL.
        </p>
      </footer>
    </div>
  );
}
