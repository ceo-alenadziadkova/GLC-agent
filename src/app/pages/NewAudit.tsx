import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, ArrowRight, ArrowLeft, MagnifyingGlass, HardDrives, Shield,
  Cursor, Target, Lightning, MapTrifold, CheckCircle, Warning,
  ClipboardText, Rocket, Circle, Copy, X,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { BriefField } from '../components/BriefField';
import { SectionLabel } from '../components/glc/SectionLabel';
import { api, ApiError } from '../data/apiService';
import {
  BRIEF_QUESTIONS, BRIEF_SECTIONS, REQUIRED_IDS, countAnswered,
  type BriefResponseEntry, type BriefResponses, type BriefQuestion,
} from '../data/briefQuestions';

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Basics',  icon: Globe },
  { label: 'Brief',   icon: ClipboardText },
  { label: 'Launch',  icon: Rocket },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8 justify-center">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: done
                    ? 'rgba(16,185,129,0.15)'
                    : active
                      ? 'var(--gradient-brand)'
                      : 'rgba(255,255,255,0.05)',
                  border: done
                    ? '1px solid rgba(16,185,129,0.35)'
                    : active
                      ? 'none'
                      : '1px solid rgba(255,255,255,0.10)',
                  boxShadow: active ? '0 0 12px rgba(28,189,255,0.30)' : 'none',
                }}
              >
                {done
                  ? <CheckCircle weight="fill" className="w-4 h-4" style={{ color: '#10B981' }} />
                  : <s.icon className="w-4 h-4" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.25)' }} />}
              </div>
              <span style={{ fontSize: '10px', color: active ? '#fff' : 'rgba(255,255,255,0.30)', letterSpacing: '0.04em' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-10 h-px mb-4"
                style={{ background: i < current ? 'rgba(16,185,129,0.40)' : 'rgba(255,255,255,0.08)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Domain pills (Step 1) ─────────────────────────────────────────────────────

const DOMAIN_PILLS = [
  { icon: MagnifyingGlass, label: 'Recon',      color: 'var(--glc-blue)'      },
  { icon: HardDrives,      label: 'Tech',        color: '#8B5CF6'              },
  { icon: Shield,          label: 'Security',    color: 'var(--score-1)'       },
  { icon: Globe,           label: 'SEO',         color: 'var(--glc-green)'     },
  { icon: Cursor,          label: 'UX',          color: 'var(--score-3)'       },
  { icon: Target,          label: 'Marketing',   color: 'var(--glc-orange)'    },
  { icon: Lightning,       label: 'Automation',  color: 'var(--glc-blue-dark)' },
  { icon: MapTrifold,      label: 'Strategy',    color: 'var(--glc-green-dark)'},
];

const NEXT_ACTION_TEXT: Record<string, string> = {
  complete_required: 'Complete required fields to start the audit.',
  add_recommended: 'Add a few recommended details to improve audit quality.',
  confirm_prefill: 'Confirm auto-detected prefill data before launch.',
  none: 'Your intake is ready.',
};

const INDUSTRIES = [
  'Hospitality', 'Real Estate', 'Marine', 'Healthcare',
  'E-commerce', 'SaaS / Software', 'Food & Beverage', 'Professional Services',
  'Retail', 'Finance', 'Education', 'Manufacturing', 'Other',
];

// ── Main component ────────────────────────────────────────────────────────────

function normalizeIntakeToResponses(raw: Record<string, unknown>): BriefResponses {
  const out: BriefResponses = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { value: (v as BriefResponseEntry).value, source: 'client' };
    } else {
      out[k] = { value: v as BriefResponseEntry['value'], source: 'client' };
    }
  }
  return out;
}

export function NewAudit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intakeTokenFromUrl = searchParams.get('intake')?.trim() ?? '';

  // Step 1 fields
  const [url,         setUrl]         = useState('');
  const [name,        setName]        = useState('');
  const [industry,    setIndustry]    = useState('');
  const [productMode, setProductMode] = useState<'full' | 'express'>('full');

  // Step 2 fields
  const [responses, setResponses] = useState<BriefResponses>({});
  const [intakePrefillActive, setIntakePrefillActive] = useState(false);

  // Pre-brief modal (Step 0)
  const [preBriefOpen, setPreBriefOpen] = useState(false);
  const [preBriefCompany, setPreBriefCompany] = useState('');
  const [preBriefMessage, setPreBriefMessage] = useState('');
  const [preBriefLink, setPreBriefLink] = useState<string | null>(null);
  const [preBriefLoading, setPreBriefLoading] = useState(false);
  const [preBriefErr, setPreBriefErr] = useState<string | null>(null);

  // UI state
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!intakeTokenFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getIntakeToken(intakeTokenFromUrl);
        if (cancelled) return;
        const fromToken = normalizeIntakeToResponses(data.responses ?? {});
        if (Object.keys(fromToken).length > 0) {
          setResponses(prev => ({ ...fromToken, ...prev }));
          setIntakePrefillActive(true);
        }
      } catch {
        /* invalid or expired token — ignore, user continues fresh */
      }
    })();
    return () => { cancelled = true; };
  }, [intakeTokenFromUrl]);

  // ── Validation ──────────────────────────────────────────
  function isValidUrl(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    try {
      const prefixed = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      return new URL(prefixed).hostname.includes('.');
    } catch { return false; }
  }

  const step1Valid = isValidUrl(url);

  const answeredRequired = countAnswered(responses, REQUIRED_IDS);
  const step2Complete    = answeredRequired === REQUIRED_IDS.length;
  const progressPct = Math.min(100, Math.round((answeredRequired / REQUIRED_IDS.length) * 100));
  const readinessBadge: 'low' | 'medium' | 'high' = progressPct >= 80 ? 'high' : progressPct >= 45 ? 'medium' : 'low';
  const nextBestAction = step2Complete ? 'add_recommended' : 'complete_required';

  // ── Handlers ───────────────────────────────────────────
  function handleResponseChange(id: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [id]: { value, source: 'client' } }));
  }

  function handleSetUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Create audit
      const audit = await api.createAudit(url, name || undefined, industry || undefined, productMode);

      // 2. Save brief (fire-and-forget on error — brief is best-effort, pipeline gate will catch)
      try {
        await api.saveBrief(audit.id, responses);
      } catch (briefErr) {
        console.warn('[NewAudit] Brief save failed (non-fatal):', briefErr);
      }

      // 3. Start pipeline
      await api.startPipeline(audit.id);

      navigate(`/pipeline/${audit.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setLoading(false);
    }
  }

  async function handlePreBriefCreate() {
    setPreBriefErr(null);
    setPreBriefLoading(true);
    setPreBriefLink(null);
    try {
      const { url } = await api.createIntakeToken({
        metadata: {
          ...(preBriefCompany.trim() ? { company_name: preBriefCompany.trim() } : {}),
          ...(preBriefMessage.trim() ? { message: preBriefMessage.trim() } : {}),
        },
      });
      setPreBriefLink(url);
    } catch (e) {
      setPreBriefErr((e as Error).message);
    } finally {
      setPreBriefLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <AppShell title="New Audit" subtitle="Start a comprehensive 8-domain business analysis">
      <div
        className="min-h-full flex flex-col items-center justify-center py-12 px-6 relative"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--mesh-brand)', opacity: 0.55 }} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
          style={{ maxWidth: step === 1 ? 640 : 460 }}
        >
          <StepIndicator current={step} />

          <AnimatePresence mode="wait">

            {/* ── Step 0: Basics ───────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.28 }}
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 8px 28px rgba(28,189,255,0.32)' }}
                  >
                    <Globe className="w-7 h-7 text-white" />
                  </motion.div>
                  <SectionLabel accent>GLC Audit Platform</SectionLabel>
                  <h1 className="mt-2" style={{ fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>
                    Start a New Audit
                  </h1>
                  <p className="mt-2.5" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Enter the company website and we'll analyze{' '}
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>8 business domains</strong> automatically.
                  </p>
                </div>

                {/* Domain pills */}
                <motion.div className="flex flex-wrap gap-1.5 justify-center mb-7" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }}>
                  {DOMAIN_PILLS.map(({ icon: I, label, color }) => (
                    <motion.span key={label} variants={{ hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } } }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px' }}
                    >
                      <I className="w-3 h-3" style={{ color }} />{label}
                    </motion.span>
                  ))}
                </motion.div>

                {/* Form */}
                <form onSubmit={e => { e.preventDefault(); if (step1Valid) setStep(1); }} className="glc-card p-6 space-y-5" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}>
                  {/* URL */}
                  <div className="space-y-1.5">
                    <label htmlFor="url" className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      Company Website <span style={{ color: 'var(--glc-orange)' }}>*</span>
                    </label>
                    <div className="flex items-center overflow-hidden" style={{ borderRadius: 'var(--radius-lg)', border: url ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)', boxShadow: url ? 'var(--shadow-blue)' : 'none', backgroundColor: 'var(--bg-surface)', transition: 'border-color var(--ease-fast)' }}>
                      <div className="flex items-center justify-center px-3 self-stretch flex-shrink-0" style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)', minWidth: 44 }}>
                        <Globe className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <input id="url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://company.com" required autoFocus className="flex-1 px-4 py-3 bg-transparent outline-none" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="cname" className="flex items-center gap-2 font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      Company Name <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>optional</span>
                    </label>
                    <input id="cname" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hotel XYZ"
                      className="w-full px-4 py-3 bg-transparent outline-none"
                      style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
                    />
                  </div>

                  {/* Industry */}
                  <div className="space-y-1.5">
                    <label htmlFor="industry" className="flex items-center gap-2 font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      Industry <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>tailors recommendations</span>
                    </label>
                    <select id="industry" value={industry} onChange={e => setIndustry(e.target.value)}
                      className="w-full px-4 py-3 outline-none appearance-none"
                      style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: industry ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>

                  {/* Product mode */}
                  <div className="space-y-2">
                    <label className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Audit Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['full', 'express'] as const).map(mode => {
                        const sel = productMode === mode;
                        return (
                          <button key={mode} type="button" onClick={() => setProductMode(mode)}
                            className="rounded-lg px-3 py-2.5 text-left text-xs transition-all"
                            style={{ backgroundColor: sel ? 'rgba(28,189,255,0.08)' : 'var(--bg-inset)', border: sel ? '1px solid rgba(28,189,255,0.30)' : '1px solid var(--border-subtle)' }}
                          >
                            <div className="font-semibold" style={{ color: sel ? '#fff' : 'var(--text-primary)' }}>{mode === 'full' ? 'Full Audit' : 'Express'}</div>
                            <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{mode === 'full' ? 'All 6 domains + strategy' : '4 key domains, faster'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glc-divider" />

                  <motion.button type="submit" disabled={!step1Valid}
                    whileHover={step1Valid ? { scale: 1.015 } : {}} whileTap={step1Valid ? { scale: 0.985 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                    style={{ borderRadius: 'var(--radius-lg)', background: step1Valid ? 'var(--gradient-brand)' : 'var(--border-default)', color: '#fff', cursor: step1Valid ? 'pointer' : 'not-allowed', fontSize: 'var(--text-sm)', border: 'none', boxShadow: step1Valid ? '0 4px 14px rgba(28,189,255,0.28)' : 'none' }}
                  >
                    Continue to Brief <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  <button
                    type="button"
                    className="w-full text-center text-sm pt-2"
                    style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setPreBriefOpen(true);
                      setPreBriefLink(null);
                      setPreBriefErr(null);
                    }}
                  >
                    Send pre-brief to client
                  </button>
                </form>

                {preBriefOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                    onClick={() => setPreBriefOpen(false)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setPreBriefOpen(false); }}
                    role="presentation"
                  >
                    <div
                      className="glc-card p-6 w-full max-w-md"
                      style={{ borderRadius: 'var(--radius-xl)' }}
                      onClick={e => e.stopPropagation()}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="prebrief-title"
                    >
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <h3 id="prebrief-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Send pre-brief link</h3>
                        <button type="button" aria-label="Close" onClick={() => setPreBriefOpen(false)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Optional context for your client. They complete six short questions on a page without logging in.</p>
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Company name (optional)</label>
                          <input value={preBriefCompany} onChange={e => setPreBriefCompany(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Message (optional)</label>
                          <textarea value={preBriefMessage} onChange={e => setPreBriefMessage(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                        </div>
                      </div>
                      {preBriefErr && <p className="text-sm mb-2" style={{ color: 'var(--score-1)' }}>{preBriefErr}</p>}
                      {preBriefLink ? (
                        <div className="space-y-2">
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Share this link:</p>
                          <div className="flex gap-2">
                            <input readOnly value={preBriefLink} className="flex-1 px-2 py-1.5 rounded text-xs" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text-primary)' }} />
                            <button type="button" className="px-2 py-1.5 rounded-lg text-xs" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer' }} onClick={() => { void navigator.clipboard.writeText(preBriefLink); }}>
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <button type="button" className="text-sm mt-2" style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setPreBriefOpen(false)}>Done</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={preBriefLoading}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold"
                          style={{ background: 'var(--gradient-brand)', color: '#fff', border: 'none', cursor: preBriefLoading ? 'wait' : 'pointer' }}
                          onClick={() => { void handlePreBriefCreate(); }}
                        >
                          {preBriefLoading ? 'Creating…' : 'Create link'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 1: Brief ─────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.28 }}
                className="glc-card p-6"
                style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Intake Brief</h2>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {answeredRequired} / {REQUIRED_IDS.length} required
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Audit readiness: {progressPct}%</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {readinessBadge.toUpperCase()}
                  </span>
                </div>
                {intakePrefillActive && (
                  <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.22)', color: 'var(--text-secondary)' }}>
                    Pre-filled from client&apos;s pre-brief answers. Review before launch.
                  </div>
                )}
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 20 }}>
                  These questions feed directly into the AI agents.{' '}
                  <strong className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Circle size={7} weight="fill" style={{ color: '#EF4444' }} />
                    Required
                  </strong>{' '}
                  questions must be answered to start the pipeline.
                </p>

                {/* Progress bar */}
                <div className="rounded-full overflow-hidden mb-6" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(answeredRequired / REQUIRED_IDS.length) * 100}%`, background: 'var(--gradient-brand)' }} />
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 14 }}>
                  {NEXT_ACTION_TEXT[nextBestAction]}
                </p>

                {/* Questions grouped by section */}
                <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-1">
                  {BRIEF_SECTIONS.map(section => {
                    const sectionQs = BRIEF_QUESTIONS.filter(q => q.section === section);
                    return (
                      <div key={section}>
                        <div className="px-2 py-1 mb-3 rounded" style={{ backgroundColor: 'rgba(28,189,255,0.05)', borderLeft: '2px solid rgba(28,189,255,0.25)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(28,189,255,0.7)', textTransform: 'uppercase' }}>
                            {section}
                          </span>
                        </div>
                        <div className="space-y-5">
                          {sectionQs.map(q => (
                            <BriefField
                              key={q.id}
                              q={q}
                              value={responses[q.id]}
                              onChange={v => handleResponseChange(q.id, v)}
                              onSetUnknown={() => handleSetUnknown(q.id)}
                              emphasizeClientSource={intakePrefillActive}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="glc-divider mt-5" />

                {/* Navigation */}
                <div className="flex items-center gap-3 mt-4">
                  <button type="button" onClick={() => setStep(0)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
                    style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button type="button" onClick={() => setStep(2)} disabled={!step2Complete}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: step2Complete ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.06)', color: step2Complete ? '#fff' : 'rgba(255,255,255,0.25)', cursor: step2Complete ? 'pointer' : 'not-allowed', border: 'none', boxShadow: step2Complete ? '0 4px 14px rgba(28,189,255,0.25)' : 'none' }}
                  >
                    {step2Complete
                      ? <><CheckCircle className="w-4 h-4" /> Review & Launch</>
                      : <><Warning className="w-4 h-4" /> Fill {REQUIRED_IDS.length - answeredRequired} more required</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Confirm ───────────────────────── */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.28 }}
                onSubmit={handleLaunch}
                className="glc-card p-6 space-y-5"
                style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="text-center mb-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 6px 20px rgba(28,189,255,0.30)' }}>
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Ready to Launch</h2>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 6 }}>
                    Review the details below and start the pipeline.
                  </p>
                </div>

                {/* Summary */}
                <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  {[
                    ['Website', url],
                    name ? ['Company', name] : null,
                    industry ? ['Industry', industry] : null,
                    ['Audit type', productMode === 'full' ? 'Full Audit (6 domains + strategy)' : 'Express (4 domains)'],
                    ['Brief', `${answeredRequired}/${REQUIRED_IDS.length} required answered`],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 90, paddingTop: 1 }}>{label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}>
                    <Warning className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
                    style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.015 } : {}} whileTap={!loading ? { scale: 0.985 } : {}}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gradient-accent)', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 14px rgba(242,79,29,0.30)' }}
                  >
                    <AnimatePresence mode="wait">
                      {loading
                        ? <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Starting...
                          </motion.span>
                        : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <Lightning className="w-4 h-4" /> Launch Audit
                          </motion.span>}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
