import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ArrowRight, CheckCircle, Warning, Lightning, CaretRight, Shield } from '@phosphor-icons/react';
import type { FreeSnapshotPreview } from '../data/auditTypes';
// @ts-ignore
import Logo from '../assets/logo-white.svg';

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
  const [result, setResult] = useState<FreeSnapshotPreview | null>(null);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string>('');

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

    try {
      const res = await fetch(`${API_URL}/api/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to start analysis');
        setStage('error');
        return;
      }

      tokenRef.current = data.snapshot_token;
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
    setUrl('');
    setPhaseIdx(0);
  }

  const techEntries = result
    ? Object.entries(result.tech_stack).filter(([, vals]) => vals.length > 0)
    : [];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Background mesh */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', opacity: 0.4 }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
            <img
                src={Logo}
                alt="GLC Audit Platform"
                className="h-9 w-auto"
            />
        </div>
        <Link
          to="/login"
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
        >
          Sign in <CaretRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">

          {/* ── Idle / Submitting: URL form ──────────────────── */}
          {(stage === 'idle' || stage === 'submitting' || stage === 'error') && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
              style={{ maxWidth: 560 }}
            >
              {/* Hero text */}
              <div className="text-center mb-10">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--glc-blue)' }}
                >
                  <Lightning className="w-3 h-3" /> Free UX Snapshot — 90 seconds
                </div>
                <h1
                  style={{
                    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: 'var(--tracking-tight)',
                    lineHeight: 1.15,
                  }}
                >
                  How well does your website<br />convert visitors?
                </h1>
                <p className="mt-4" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
                  Enter your URL for an instant AI-powered UX audit.
                  <br />No sign-up required.
                </p>
              </div>

              {/* Form card */}
              <div className="glc-card p-6" style={{ borderRadius: 'var(--radius-2xl)' }}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Globe
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                    <input
                      type="text"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="yourcompany.com"
                      required
                      disabled={stage === 'submitting'}
                      className="w-full pl-10 pr-4 py-3 bg-transparent outline-none"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--text-sm)',
                        transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
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
                    className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold text-sm"
                    style={{
                      borderRadius: 'var(--radius-lg)',
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
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-center text-sm"
                    style={{ color: 'var(--score-1)' }}
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </div>

              {/* What's included */}
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {['UX score', 'Top issues', 'Quick wins', 'Tech stack'].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--glc-green)' }} />
                    {item}
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
              className="text-center"
              style={{ maxWidth: 420 }}
            >
              {/* Spinner */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div
                  className="absolute inset-0 rounded-full animate-spin"
                  style={{
                    border: '3px solid transparent',
                    borderTopColor: 'var(--glc-blue)',
                    borderRightColor: 'var(--glc-blue)',
                  }}
                />
                <div
                  className="absolute inset-2 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <Globe className="w-7 h-7" style={{ color: 'var(--glc-blue)' }} />
                </div>
              </div>

              <h2
                style={{
                  fontSize: 'var(--text-xl)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
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
            </motion.div>
          )}

          {/* ── Done: results ────────────────────────────────── */}
          {stage === 'done' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
              style={{ maxWidth: 620 }}
            >
              {/* Company header */}
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
                >
                  <CheckCircle className="w-3 h-3" style={{ color: 'var(--glc-green)' }} /> Snapshot complete
                </div>
                <h2
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
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
                  className="glc-card p-6 mb-4 flex items-center justify-between"
                  style={{ borderRadius: 'var(--radius-xl)' }}
                >
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      UX & Conversion Score
                    </p>
                    <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, fontFamily: 'var(--font-display)', color: SCORE_COLORS[result.ux_score] }}>
                      {result.ux_score}/5
                    </p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: SCORE_COLORS[result.ux_score] }}>
                      {SCORE_LABELS[result.ux_score]}
                    </p>
                  </div>
                  {result.ux_summary && (
                    <p className="text-sm ml-6" style={{ color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.6 }}>
                      {result.ux_summary}
                    </p>
                  )}
                </div>
              )}

              {/* Issues + Quick Wins grid */}
              <div className="grid grid-cols-1 gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

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

              {/* CTA */}
              <div
                className="glc-card p-6 text-center"
                style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--glc-blue)', background: 'linear-gradient(135deg, rgba(28,189,255,0.06) 0%, transparent 60%)' }}
              >
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
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  The Express Audit covers all 6 business domains — Tech, Security, SEO, UX, Marketing & Automation —
                  with a full action plan and competitor benchmark.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
                  <Link
                    to="/login"
                    className="glc-btn-primary"
                    style={{ textDecoration: 'none', minWidth: 160 }}
                  >
                    Get Express Audit <ArrowRight className="w-4 h-4 inline ml-1" />
                  </Link>
                  <button
                    onClick={reset}
                    className="text-sm font-medium"
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
      <footer className="relative z-10 text-center py-4 px-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
          Results are AI-generated and for informational purposes only. · {' '}
          <Link to="/login" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </footer>
    </div>
  );
}
