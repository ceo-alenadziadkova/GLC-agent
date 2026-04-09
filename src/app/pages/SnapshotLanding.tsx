import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import type { User } from '@supabase/supabase-js';
import {
  Globe,
  ArrowRight,
  CheckCircle,
  SealCheck,
  Warning,
  Lightning,
  CaretRight,
  Shield,
  Check,
  X,
  Equals,
  Binoculars,
  UserCircle,
} from '@phosphor-icons/react';
import type { FreeSnapshotPreview } from '../data/auditTypes';
import { GlcLogo } from '../components/GlcLogo';
import { SyncPathLoader } from '../components/SyncPathLoader';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { getSnapshotAccessToken, isAnonymousUser } from '../lib/snapshot-auth';
import { setPendingSnapshotToken } from '../lib/snapshot-pending-token';
import {
  AI_VISIBILITY_GAP_COPY,
  formatScanCoverageLine,
  getSnapshotAccessBlockedState,
} from '../lib/snapshot-diagnostics';
import { SnapshotAccessBlockedCallout } from '../components/snapshot/SnapshotAccessBlockedCallout';
import { toUiErrorMessage, type SnapshotApiErrorPayload } from '../lib/snapshot-api-errors';
import { snapshotPublicRequest } from '../data/apiService';
import {
  PHASE_LABELS,
  SCORE_COLORS,
  SCORE_LABELS,
  SEVERITY_COLOR,
  competitorComparisonCaption,
  donutFillFromLegacyBand,
  donutFillFromOverall,
  legacyUxBand,
  scoreColorFrom100,
  siteProfileSoftLine,
  snapshotClassificationExplainerLine,
} from '../lib/snapshot-landing-helpers';
import {
  CategoryBreakdownHint,
  SnapshotScoreContextNotes,
  SnapshotScoreDonut,
} from './snapshot-landing';

type Stage = 'idle' | 'submitting' | 'running' | 'done' | 'error';

export function SnapshotLanding(props?: { embedded?: boolean }) {
  const embedded = props?.embedded ?? false;
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [quotaHint, setQuotaHint] = useState('');
  const [rateLimitDetail, setRateLimitDetail] = useState<{ limit: number; remaining: number } | null>(null);
  const [result, setResult] = useState<FreeSnapshotPreview | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string>('');
  const pollFailuresRef = useRef(0);
  const [quotaPreview, setQuotaPreview] = useState<{ remaining: number; limit: number } | null>(null);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorLoadError, setCompetitorLoadError] = useState('');
  const [accountUser, setAccountUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    const syncUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setAccountUser(data.session?.user ?? null);
    };
    void syncUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function refreshQuotaPreview() {
    try {
      const res = await snapshotPublicRequest('/api/snapshot/quota');
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
        const res = await snapshotPublicRequest(`/api/snapshot/${tokenRef.current}`);
        const data = (await res.json()) as FreeSnapshotPreview & SnapshotApiErrorPayload;
        if (!res.ok) {
          throw new Error(toUiErrorMessage(res.status, data, 'Could not load snapshot status.'));
        }
        pollFailuresRef.current = 0;
        if (data.status === 'completed') {
          setResult(data);
          setStage('done');
        } else if (data.status === 'failed') {
          setErrorMsg('Analysis failed on the server. Please retry with the same URL in a few moments.');
          setStage('error');
        }
      } catch (err) {
        pollFailuresRef.current += 1;
        // Allow a couple of transient failures before surfacing an actionable message.
        if (pollFailuresRef.current >= 3) {
          setErrorMsg(err instanceof Error ? err.message : 'Could not fetch snapshot status. Please try again.');
          setStage('error');
        }
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
      const res = await snapshotPublicRequest('/api/snapshot', {
        method: 'POST',
        body: JSON.stringify({ company_url: trimmed }),
      });

      const data = (await res.json()) as SnapshotApiErrorPayload;

      if (!res.ok) {
        setErrorMsg(toUiErrorMessage(res.status, data, 'Could not start analysis.'));
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

      const st = data.snapshot_token ?? '';
      tokenRef.current = st;
      if (st) setPendingSnapshotToken(st);
      void refreshQuotaPreview();
      setStage('running');
    } catch {
      setErrorMsg('Network error: could not reach the server. Check your connection and try again.');
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
    setCompetitorLoading(false);
    setCompetitorLoadError('');
    void refreshQuotaPreview();
  }

  async function loadCompetitorComparison() {
    const token = tokenRef.current;
    if (!token) return;
    setCompetitorLoading(true);
    setCompetitorLoadError('');
    try {
      const bearer = await getSnapshotAccessToken();
      const headers: Record<string, string> = {};
      if (bearer) headers.Authorization = `Bearer ${bearer}`;
      const res = await snapshotPublicRequest(`/api/snapshot/${token}?compare=1`, { headers });
      if (!res.ok) {
        setCompetitorLoadError('Could not load comparison. Try again in a moment.');
        return;
      }
      const data = (await res.json()) as FreeSnapshotPreview;
      if (data.competitor_mini && data.competitor_mini.comparisons.length > 0) {
        setResult(prev =>
          prev ? { ...prev, competitor_mini: data.competitor_mini } : prev,
        );
      } else {
        setCompetitorLoadError(
          'We could not find a suitable external site linked from your homepage, or the check timed out.',
        );
      }
    } catch {
      setCompetitorLoadError('Network error while loading comparison.');
    } finally {
      setCompetitorLoading(false);
    }
  }

  const techEntries = result
    ? Object.entries(result.tech_stack).filter(([, vals]) => vals.length > 0)
    : [];

  const snapshotAccess =
    stage === 'done' && result ? getSnapshotAccessBlockedState(result) : null;
  const snapshotShowsAccessCallout = snapshotAccess?.showCallout ?? false;
  const snapshotAccessRobotsBlocked = snapshotAccess?.robotsBlocked ?? false;
  const snapshotAccessNoPages = snapshotAccess?.noPages ?? false;
  const snapshotAccessRobotsLimited = snapshotAccess?.robotsLimitedSample ?? false;
  const snapshotCalloutLimitations =
    stage === 'done' && result && snapshotAccessRobotsBlocked && !snapshotAccessRobotsLimited ? [] : (result?.limitations ?? []);

  const snapshotCoverageCaption =
    stage === 'done' && result ? formatScanCoverageLine(result.scan_coverage) : null;

  const snapshotClassificationExplainer =
    stage === 'done' && result ? snapshotClassificationExplainerLine(result) : null;

  const snapshotLimitations =
    stage === 'done' && result?.limitations && result.limitations.length > 0 && !snapshotShowsAccessCallout
      ? result.limitations
      : null;

  const snapshotInsightBlockCount =
    stage === 'done' && result
      ? Number(result.issues.length > 0) +
        Number(result.quick_wins.length > 0) +
        Number(techEntries.length > 0 || (result.tech_stack_tentative?.length ?? 0) > 0)
      : 0;

  const snapshotInsightGridClass =
    snapshotInsightBlockCount === 0
      ? ''
      : [
          'grid gap-4 lg:gap-6 mobile:grid-cols-1',
          snapshotInsightBlockCount === 3 ? 'lg:grid-cols-2 xl:grid-cols-3' : '',
          snapshotInsightBlockCount === 2 ? 'lg:grid-cols-2' : '',
        ]
          .filter(Boolean)
          .join(' ');

  const snapshotTechColClass =
    snapshotInsightBlockCount === 3 ? 'lg:col-span-2 xl:col-span-1' : '';

  const hasFullAccount = accountUser != null && !isAnonymousUser(accountUser);
  const workspaceEmail =
    hasFullAccount && accountUser.email && accountUser.email.trim().length > 0
      ? accountUser.email.trim()
      : null;

  return (
    <div
      className={embedded ? 'flex min-h-0 flex-col' : 'flex min-h-[100dvh] flex-col'}
      style={{ backgroundColor: embedded ? 'transparent' : 'var(--bg-canvas)' }}
    >
      {!embedded && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ background: 'var(--mesh-brand)', opacity: 0.4 }}
          />
          <header
            className="relative z-10 flex items-center justify-between gap-3 px-6 py-4 mobile:px-4 mobile:py-3"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link to="/" className="inline-flex items-center" aria-label="Go to home page">
                <GlcLogo className="h-9 mobile:h-8" />
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {hasFullAccount ? (
                <div className="flex min-w-0 max-w-[min(100%,22rem)] items-center gap-2 sm:gap-2.5">
                  <UserCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                  <span
                    className="hidden min-w-0 truncate text-xs font-medium sm:inline sm:max-w-[10rem] md:max-w-[13rem]"
                    style={{ color: 'var(--text-secondary)' }}
                    title={workspaceEmail ?? 'Signed in'}
                  >
                    {workspaceEmail ?? 'Signed in'}
                  </span>
                  <Link
                    to="/dashboard"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg text-sm font-medium mobile:min-h-11 mobile:px-2"
                    style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
                  >
                    Workspace <CaretRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                </div>
              ) : (
                <Link
                  to="/login?next=/snapshot"
                  className="inline-flex items-center justify-end gap-1 rounded-lg text-sm font-medium mobile:min-h-11 mobile:min-w-11 mobile:px-2"
                  style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
                >
                  Sign in <CaretRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              )}
            </div>
          </header>
        </>
      )}

      <main
        className={`relative z-10 flex flex-1 flex-col items-center px-6 py-12 mobile:px-4 mobile:py-8 ${
          stage === 'done' ? 'justify-start pt-8 pb-14 lg:pt-10 lg:pb-16' : 'justify-center mobile:justify-start'
        }`}
      >
        <AnimatePresence mode="wait">

          {/* ── Idle / Submitting: URL form ──────────────────── */}
          {(stage === 'idle' || stage === 'submitting' || stage === 'error') && (
            <motion.div
              key="form"
              layout={false}
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
                        <Lightning className="h-3.5 w-3.5 shrink-0" weight="fill" /> Quick rule-based scan
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
                      {hasFullAccount
                        ? 'Signed in — results save to your account. Use Workspace for the full Express Audit.'
                        : 'Try instantly — sign in anytime to unlock the full Express Audit'}
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
                    layout={false}
                    disabled={!url.trim() || stage === 'submitting'}
                    whileHover={url.trim() ? { scale: 1.015 } : {}}
                    whileTap={url.trim() ? { scale: 0.985 } : {}}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] py-3 text-sm font-semibold text-white mobile:min-h-12"
                    style={{
                      background:
                        url.trim()
                          ? 'var(--gradient-accent)'
                          : 'var(--border-default)',
                      border: 'none',
                      cursor:
                        url.trim() && stage !== 'submitting'
                          ? 'pointer'
                          : 'not-allowed',
                      boxShadow:
                        url.trim()
                          ? '0 4px 14px rgba(242,79,29,0.28)'
                          : 'none',
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
              layout={false}
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
                Usually takes a few seconds to about half a minute
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
              layout={false}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full min-w-0 max-w-[min(100%,38.75rem)] lg:max-w-6xl"
            >
              {/* Company header — mobile centered; desktop aligned with bento column */}
              <div className="mb-8 text-center mobile:mb-6 lg:mb-7 lg:text-left">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs lg:mb-3"
                  style={{
                    background:
                      snapshotShowsAccessCallout && snapshotAccessRobotsBlocked
                        ? 'color-mix(in oklab, var(--glc-green) 10%, var(--bg-surface))'
                        : 'var(--bg-surface)',
                    border:
                      snapshotShowsAccessCallout && snapshotAccessRobotsBlocked
                        ? '1px solid color-mix(in oklab, var(--glc-green) 38%, var(--border-subtle))'
                        : '1px solid var(--border-subtle)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {snapshotShowsAccessCallout ? (
                    snapshotAccessRobotsBlocked ? (
                      <>
                        <SealCheck className="w-3 h-3 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                        {snapshotAccessRobotsLimited
                          ? 'Preview limited — inner pages sampled'
                          : 'Preview limited — robots.txt policy'}
                      </>
                    ) : (
                      <>
                        <Warning className="w-3 h-3 shrink-0" style={{ color: 'var(--score-2)' }} weight="fill" />
                        Preview incomplete — pages not loaded
                      </>
                    )
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" style={{ color: 'var(--glc-green)' }} /> Your check is ready
                    </>
                  )}
                </div>
                <h2
                  className="break-words text-2xl font-bold tracking-tight mobile:px-1 mobile:text-xl lg:max-w-[22ch]"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {result.company_name ?? new URL(result.company_url.startsWith('http') ? result.company_url : `https://${result.company_url}`).hostname}
                </h2>
                {result.location && (
                  <p className="mt-1 text-sm lg:mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{result.location}</p>
                )}
              </div>

              <SnapshotAccessBlockedCallout
                robotsBlocked={snapshotAccessRobotsBlocked}
                noHtmlSample={snapshotAccessNoPages}
                robotsLimitedSample={snapshotAccessRobotsLimited}
                robotsFallbackSiteClass={snapshotAccess?.robotsFallbackSiteClass}
                robotsHeadHttpStatus={result.scan_coverage?.robots_head_probe?.status}
                limitations={snapshotCalloutLimitations}
              />

              {result.homepage_snippet &&
                (result.homepage_snippet.title.trim() || result.homepage_snippet.description.trim()) && (
                  <div
                    className="glc-card glc-snapshot-result-card mb-4 p-5 text-left lg:p-6"
                    style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-3"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      From your homepage
                    </p>
                    {result.homepage_snippet.title.trim() ? (
                      <p
                        className="text-sm font-semibold leading-snug mb-2"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                      >
                        {result.homepage_snippet.title}
                      </p>
                    ) : null}
                    {result.homepage_snippet.description.trim() ? (
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {result.homepage_snippet.description}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                      Taken from the HTML we fetched: page title, meta description, Open Graph text, or the first substantive paragraph when those are missing.
                    </p>
                  </div>
                )}

              {siteProfileSoftLine(result.site_profile) && (
                <div
                  className="glc-card glc-snapshot-result-card mb-4 p-5 text-left lg:p-6"
                  style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Site read (advisory)
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {siteProfileSoftLine(result.site_profile)}
                  </p>
                  {(result.classification_confidence_band || result.site_profile?.classificationConfidenceBand) && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                      Classification confidence: {result.classification_confidence_band ?? result.site_profile?.classificationConfidenceBand}
                    </p>
                  )}
                  {snapshotClassificationExplainer ? (
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                      {snapshotClassificationExplainer}
                    </p>
                  ) : null}
                </div>
              )}

              {/* Snapshot score: bento on lg when summary exists; else single card */}
              {(result.ux_score !== null || typeof result.overall_score === 'number') &&
                (result.ux_summary?.trim() ? (
                  <div className="mb-4 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-6">
                    <div
                      className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex min-h-0 flex-col items-center justify-center p-6 text-center lg:col-span-5 lg:mb-0 lg:min-h-[15rem] lg:p-8"
                      style={{ borderRadius: 'var(--radius-xl)' }}
                    >
                      <p
                        className="mb-3 text-xs font-medium"
                        style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        Snapshot score
                      </p>
                      {typeof result.overall_score === 'number' ? (
                        <>
                          <SnapshotScoreDonut
                            fillPercent={donutFillFromOverall(result.overall_score)}
                            accentColor={scoreColorFrom100(result.overall_score)}
                            size={180}
                            strokeWidth={12}
                          >
                            <p
                              style={{
                                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                                fontWeight: 800,
                                fontFamily: 'var(--font-display)',
                                color: scoreColorFrom100(result.overall_score),
                                lineHeight: 1.05,
                              }}
                            >
                              {result.overall_score}
                              <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: '0.45em' }}>/100</span>
                            </p>
                          </SnapshotScoreDonut>
                        </>
                      ) : (
                        <>
                          {(() => {
                            const band = legacyUxBand(result.ux_score);
                            const c = SCORE_COLORS[band];
                            return (
                              <SnapshotScoreDonut fillPercent={donutFillFromLegacyBand(band)} accentColor={c} size={180} strokeWidth={12}>
                                <p
                                  style={{
                                    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-display)',
                                    color: c,
                                    lineHeight: 1.05,
                                  }}
                                >
                                  {band}/5
                                </p>
                                <p className="mt-0.5 text-xs font-semibold sm:text-sm" style={{ color: c }}>
                                  {SCORE_LABELS[band]}
                                </p>
                              </SnapshotScoreDonut>
                            );
                          })()}
                        </>
                      )}
                      {result.scan_confidence_band && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                          Scan confidence: {result.scan_confidence_band}
                        </p>
                      )}
                    </div>
                    <div
                      className="glc-card glc-snapshot-result-card flex flex-col justify-center p-6 text-left lg:col-span-7 lg:p-8"
                      style={{ borderRadius: 'var(--radius-xl)' }}
                    >
                      <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral !mb-3">
                        <span className="glc-snapshot-section-h__rule" aria-hidden />
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                          Summary
                        </span>
                      </div>
                      <p className="text-pretty text-sm leading-relaxed lg:text-[0.9375rem]" style={{ color: 'var(--text-secondary)' }}>
                        {result.ux_summary}
                      </p>
                      <SnapshotScoreContextNotes result={result} />
                    </div>
                  </div>
                ) : (
                  <div
                    className="glc-card glc-snapshot-result-card glc-snapshot-surface-hero mb-4 flex flex-row items-center justify-between p-6 mobile:flex-col mobile:gap-4 mobile:p-5"
                    style={{ borderRadius: 'var(--radius-xl)' }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 mobile:w-full lg:flex-row lg:items-center lg:justify-center lg:gap-10">
                      <div className="flex w-full flex-col items-center text-center mobile:items-center lg:w-auto lg:shrink-0">
                        <p
                          className="mb-1 text-xs font-medium lg:sr-only"
                          style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                        >
                          Snapshot score
                        </p>
                        {typeof result.overall_score === 'number' ? (
                          <SnapshotScoreDonut
                            fillPercent={donutFillFromOverall(result.overall_score)}
                            accentColor={scoreColorFrom100(result.overall_score)}
                            size={148}
                            strokeWidth={10}
                          >
                            <p
                              style={{
                                fontSize: 'var(--text-3xl)',
                                fontWeight: 800,
                                fontFamily: 'var(--font-display)',
                                color: scoreColorFrom100(result.overall_score),
                                lineHeight: 1.05,
                              }}
                            >
                              {result.overall_score}
                              <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: '0.5em' }}>/100</span>
                            </p>
                          </SnapshotScoreDonut>
                        ) : (
                          (() => {
                            const band = legacyUxBand(result.ux_score);
                            const c = SCORE_COLORS[band];
                            return (
                              <SnapshotScoreDonut fillPercent={donutFillFromLegacyBand(band)} accentColor={c} size={148} strokeWidth={10}>
                                <p
                                  style={{
                                    fontSize: 'var(--text-3xl)',
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-display)',
                                    color: c,
                                    lineHeight: 1.05,
                                  }}
                                >
                                  {band}/5
                                </p>
                                <p className="mt-0.5 text-sm font-semibold" style={{ color: c }}>
                                  {SCORE_LABELS[band]}
                                </p>
                              </SnapshotScoreDonut>
                            );
                          })()
                        )}
                      </div>
                      <div className="w-full min-w-0 text-center mobile:text-center lg:flex-1 lg:text-left">
                        <p
                          className="mb-2 hidden text-xs font-medium lg:block"
                          style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                        >
                          Snapshot score
                        </p>
                        {typeof result.overall_score !== 'number' && result.ux_label ? (
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {result.ux_label}
                          </p>
                        ) : null}
                        {result.scan_confidence_band && (
                          <p className="mt-2 text-xs lg:mt-2" style={{ color: 'var(--text-quaternary)' }}>
                            Scan confidence: {result.scan_confidence_band}
                          </p>
                        )}
                        <SnapshotScoreContextNotes result={result} showTopDivider />
                      </div>
                    </div>
                  </div>
                ))}

              {snapshotCoverageCaption && (
                <p
                  className="mb-4 text-center text-xs px-2 lg:px-0 lg:text-left"
                  style={{ color: 'var(--text-quaternary)' }}
                >
                  {snapshotCoverageCaption}
                </p>
              )}

              {snapshotLimitations && (
                <div className="glc-snapshot-limitations mx-auto max-w-lg lg:mx-0 lg:max-w-none">
                  <ul className="list-disc space-y-1.5 pl-4 text-left text-xs" style={{ color: 'var(--callout-warning-fg)' }}>
                    {snapshotLimitations.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.category_scores && (
                <div
                  className="glc-card glc-snapshot-result-card glc-snapshot-surface-category mb-4 p-5 lg:p-6"
                  style={{ borderRadius: 'var(--radius-xl)' }}
                >
                  <div className="glc-snapshot-section-h glc-snapshot-section-h--neutral">
                    <span className="glc-snapshot-section-h__rule" aria-hidden />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                      Category breakdown
                    </span>
                  </div>
                  <ul className="space-y-4 text-sm lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-5 lg:space-y-0">
                    {(
                      [
                        ['UX clarity', 'ux_clarity', result.category_scores.ux_clarity],
                        ['Conversion readiness', 'conversion_readiness', result.category_scores.conversion_readiness],
                        ['AI readiness', 'ai_readiness', result.category_scores.ai_readiness],
                        ['Technical basics', 'technical_basics', result.category_scores.technical_basics],
                      ] as const
                    ).map(([label, key, val]) => {
                      const n = val as number;
                      const pct = Math.max(0, Math.min(100, n));
                      const barColor = scoreColorFrom100(n);
                      return (
                        <li key={key}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span
                              className="inline-flex items-center gap-1.5 min-w-0"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <span className="truncate">{label}</span>
                              <CategoryBreakdownHint label={label} categoryKey={key} />
                            </span>
                            <span className="font-semibold tabular-nums" style={{ color: barColor }}>
                              {n}/100
                            </span>
                          </div>
                          <div
                            className="h-2 w-full overflow-hidden rounded-full"
                            style={{ backgroundColor: 'var(--bg-muted)' }}
                            aria-hidden
                          >
                            <div
                              className="h-full rounded-full transition-[width] duration-500 ease-out"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: barColor,
                                opacity: 0.92,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {result.scan_basis && (
                    <p
                      className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed"
                      style={{ color: 'var(--text-quaternary)' }}
                    >
                      Based on: {result.scan_basis}
                    </p>
                  )}
                </div>
              )}

              {result.signals_found && result.signals_found.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-center text-[0.65rem] font-medium uppercase tracking-wider lg:text-left sm:text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Detected on your pages (this scan)
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                  {result.signals_found.map((s, i) => (
                    <span
                      key={i}
                      className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                      {s}
                    </span>
                  ))}
                  </div>
                </div>
              )}

              {/* Issues + Quick Wins + Tech (xl: three columns when all present) */}
              {snapshotInsightBlockCount > 0 && (
                <div className={`mb-6 ${snapshotInsightGridClass}`}>
                  {result.issues.length > 0 && (
                    <div className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
                      <div className="glc-snapshot-section-h glc-snapshot-section-h--warning">
                        <span className="glc-snapshot-section-h__rule" aria-hidden />
                        <Warning className="h-4 w-4 shrink-0" style={{ color: 'var(--score-2)' }} />
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Top Issues
                        </span>
                      </div>
                      <div className="space-y-1">
                        {result.issues.map((issue, i) => (
                          <div key={i} className="glc-snapshot-insight-row flex gap-3">
                            <div
                              className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor: SEVERITY_COLOR[issue.severity] ?? 'var(--text-tertiary)',
                                marginTop: 6,
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {issue.title}
                              </p>
                              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                {issue.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.quick_wins.length > 0 && (
                    <div className="glc-card glc-snapshot-result-card p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
                      <div className="glc-snapshot-section-h glc-snapshot-section-h--positive">
                        <span className="glc-snapshot-section-h__rule" aria-hidden />
                        <Lightning className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Quick Wins
                        </span>
                      </div>
                      <div className="space-y-1">
                        {result.quick_wins.map((qw, i) => (
                          <div key={i} className="glc-snapshot-insight-row flex gap-3">
                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--glc-green)' }} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {qw.title}
                              </p>
                              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                {qw.effort} effort · {qw.timeframe}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(techEntries.length > 0 || (result.tech_stack_tentative?.length ?? 0) > 0) && (
                    <div
                      className={`glc-card glc-snapshot-result-card p-5 lg:p-6 ${snapshotTechColClass}`}
                      style={{ borderRadius: 'var(--radius-xl)' }}
                    >
                      <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
                        <span className="glc-snapshot-section-h__rule" aria-hidden />
                        <Shield className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-blue)' }} />
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Tech stack detected
                        </span>
                      </div>
                      {techEntries.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {techEntries.flatMap(([, vals]) => vals).slice(0, 12).map((tech, i) => (
                            <span
                              key={i}
                              className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                              style={{
                                background: 'var(--bg-inset)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {(result.tech_stack_tentative?.length ?? 0) > 0 && (
                        <div className={techEntries.length > 0 ? 'mt-4' : ''}>
                          <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                            Possibly also (weak signals — this quick scan only reads initial HTML; frameworks inside
                            bundles may not be fingerprinted)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(result.tech_stack_tentative ?? []).slice(0, 8).map((t, i) => (
                              <span
                                key={i}
                                title={t.signal}
                                className="glc-snapshot-signal-pill rounded-full px-2.5 py-1 text-xs font-medium"
                                style={{
                                  background: 'transparent',
                                  border: '1px dashed var(--border-default)',
                                  color: 'var(--text-tertiary)',
                                }}
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(typeof result.overall_score === 'number' || result.ux_score !== null) && (
                <div
                  className="glc-card glc-snapshot-result-card mb-6 p-5 lg:p-6"
                  style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="glc-snapshot-section-h glc-snapshot-section-h--info !mb-3">
                    <span className="glc-snapshot-section-h__rule" aria-hidden />
                    <Binoculars className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-blue)' }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Neural-network visibility
                    </span>
                  </div>

                  <div className="space-y-3">
                    {result.ai_visibility && result.ai_visibility.gaps.length > 0 ? (
                      <>
                        <p className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                          For{' '}
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            your site
                          </span>
                          , how you expose crawl rules, discovery, and machine-readable facts looks like it{' '}
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            needs improvement
                          </span>
                          . Have your web or SEO owner verify the live setup—not generic best practice, but how it is wired
                          for you:
                        </p>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                          {result.ai_visibility.gaps.map(g => (
                            <li key={g}>{AI_VISIBILITY_GAP_COPY[g]}</li>
                          ))}
                        </ul>
                        <p className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Do this next:</span>{' '}
                          fix what applies, then line it up with Quick wins and Top issues above.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                        On a quick read we did not flag critical gaps for AI/search-facing signals on your side.
                        Still worth your web or SEO owner confirming robots, sitemap, and structured data match how you
                        actually operate.
                      </p>
                    )}

                    <p
                      className="border-t border-[var(--border-subtle)] pt-3 text-xs leading-snug"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Narrow snapshot only.{' '}
                      <Link
                        to="/login?next=/audit/new"
                        className="font-semibold"
                        style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
                      >
                        Sign in
                      </Link>{' '}
                      to run a full Express Audit with deeper checks once you add your details.
                    </p>
                  </div>
                </div>
              )}

              {!result.competitor_mini && (
                <div
                  className="glc-card glc-snapshot-result-card mb-6 p-5 text-left lg:p-6"
                  style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Optional benchmark
                  </p>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Compare your homepage to one external site we infer from a link on your page (HTTPS, viewport, hreflang, JSON-LD). This loads a third-party URL only if you opt in.
                  </p>
                  {competitorLoadError && (
                    <p className="mb-3 text-sm" style={{ color: 'var(--score-1)' }}>{competitorLoadError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void loadCompetitorComparison()}
                    disabled={competitorLoading}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold mobile:min-h-11 mobile:w-full"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      cursor: competitorLoading ? 'wait' : 'pointer',
                      opacity: competitorLoading ? 0.7 : 1,
                    }}
                  >
                    {competitorLoading ? 'Loading comparison…' : 'Compare to a linked site'}
                  </button>
                </div>
              )}

              {result.competitor_mini && result.competitor_mini.comparisons.length > 0 && (
                <div className="glc-card glc-snapshot-result-card mb-6 p-5 lg:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
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

              {/* CTA — ink band (GLC gradient-ink) */}
              <div
                className="glc-snapshot-cta-band overflow-hidden p-6 text-center mobile:p-5 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:p-8 lg:text-left"
                style={{
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--gradient-ink-rich)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: 'var(--shadow-ink)',
                }}
              >
                <div className="relative z-[1] min-w-0 flex-1">
                  {quotaHint && (
                    <p className="mb-3 text-xs lg:mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {quotaHint}
                    </p>
                  )}
                  <h3
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--text-inverse)',
                      letterSpacing: 'var(--tracking-tight)',
                    }}
                  >
                    Want the full picture?
                  </h3>
                  <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed lg:mt-2" style={{ color: 'rgba(255,255,255,0.76)' }}>
                    The Express Audit covers all 6 business domains — Tech, Security, SEO, UX, Marketing & Automation —
                    with a full action plan and competitor benchmark.
                  </p>
                </div>
                <div className="relative z-[1] mt-5 flex w-full shrink-0 flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:mt-0 lg:w-auto lg:flex-col lg:items-stretch">
                  <Link
                    to="/login?next=/audit/new"
                    className="glc-btn-primary w-auto min-w-[12rem] justify-center mobile:min-h-12 mobile:w-full lg:w-full"
                    style={{ textDecoration: 'none' }}
                  >
                    Get Express Audit <ArrowRight className="ml-1 inline h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg py-2 text-sm font-medium mobile:min-h-11"
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      cursor: 'pointer',
                    }}
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
          Results are AI-generated and for informational purposes only. ·{' '}
          {hasFullAccount ? (
            <Link to="/dashboard" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              Open workspace
            </Link>
          ) : (
            <Link to="/login?next=/snapshot" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              Sign in
            </Link>
          )}
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
