/**
 * Mode C — Discovery flow (public, no auth required).
 *
 * Sequential branching questionnaire for businesses without a public website.
 * After answering, shows personalised business findings (wow effect) and a
 * teaser of what the full audit would reveal.
 *
 * Answers use bank IDs (a2, a4, d1, c_nosite_1, etc.) so they carry directly
 * into IntakeBankWizard when the client registers — no mapping needed.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, CheckCircle, Check, Warning,
  ChartBar, ArrowLeft, PaperPlaneRight,
  Spinner, CurrencyCircleDollar, Clock, Eye, TrendUp,
  Gear, ChartLineUp, MagnifyingGlass, Star, Buildings,
  Users, HandshakeSimple, Robot,
} from '@phosphor-icons/react';
import {
  buildQuestionSequence,
  computeFindings,
  computeScore,
  getQuestion,
  type DiscoveryAnswers,
  type DiscoveryFinding,
} from '../lib/discovery-flow';
import { api } from '../data/apiService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAnswered(val: DiscoveryAnswers[string]): boolean {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

function summarise(val: DiscoveryAnswers[string]): string {
  if (!isAnswered(val)) return '—';
  if (Array.isArray(val)) return val.join(', ');
  return String(val).trim();
}

// ── Answer input ──────────────────────────────────────────────────────────────

function QuestionInput({
  qId,
  value,
  onChange,
}: {
  qId: string;
  value: DiscoveryAnswers[string];
  onChange: (v: DiscoveryAnswers[string]) => void;
}) {
  const q = getQuestion(qId);
  if (!q) return null;

  const strVal = typeof value === 'string' ? value : '';
  const arrVal = Array.isArray(value) ? value : [];

  if (q.type === 'free_text') {
    return (
      <textarea
        autoFocus
        rows={3}
        value={strVal}
        onChange={e => onChange(e.target.value || null)}
        placeholder="Your answer…"
        className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
        style={{
          background: 'var(--input-background)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--glc-blue)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      />
    );
  }

  if (q.type === 'single_choice' && q.options) {
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map(opt => {
          const sel = strVal === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(sel ? null : opt)}
              className="px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: sel ? 'var(--callout-info-bg)' : 'var(--bg-muted)',
                border: sel ? '1px solid var(--callout-info-border-strong)' : '1px solid var(--border-default)',
                color: sel ? 'var(--glc-blue)' : 'var(--text-secondary)',
                fontWeight: sel ? 500 : 400,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'multi_choice' && q.options) {
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map(opt => {
          const sel = arrVal.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                const next = sel ? arrVal.filter(v => v !== opt) : [...arrVal, opt];
                onChange(next.length ? next : null);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: sel ? 'var(--callout-info-bg)' : 'var(--bg-muted)',
                border: sel ? '1px solid var(--callout-info-border-strong)' : '1px solid var(--border-default)',
                color: sel ? 'var(--glc-blue)' : 'var(--text-secondary)',
                fontWeight: sel ? 500 : 400,
              }}
            >
              {sel && <Check size={12} weight="bold" />}
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

// ── Finding card ──────────────────────────────────────────────────────────────

const HOOK_META: Record<
  DiscoveryFinding['hook'],
  { Icon: React.ComponentType<{ size: number; weight: string; style?: React.CSSProperties }>; label: string; color: string }
> = {
  revenue:    { Icon: CurrencyCircleDollar, label: 'Revenue at risk',   color: '#EF4444' },
  time:       { Icon: Clock,               label: 'Hours recoverable',  color: '#F59E0B' },
  visibility: { Icon: Eye,                 label: 'Visibility gap',     color: '#8B5CF6' },
  risk:       { Icon: Warning,             label: 'Growth risk',        color: '#F97316' },
  scale:      { Icon: TrendUp,             label: 'Scale blocker',      color: '#6366F1' },
};

function FindingCard({ finding }: { finding: DiscoveryFinding }) {
  const isHigh = finding.impact === 'high';
  const meta = HOOK_META[finding.hook];
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: isHigh ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
        border: isHigh ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(245,158,11,0.22)',
      }}
    >
      <div className="flex items-start gap-2.5 mb-2">
        {isHigh
          ? <Warning size={15} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
          : <meta.Icon size={15} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />}
        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: isHigh ? 'var(--score-1)' : 'var(--callout-warning-icon)' }}
          >
            {finding.zone}
          </span>
          <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {finding.headline}
          </p>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 23 }}>
        {finding.detail}
      </p>
      {/* Impact tag */}
      <div className="flex items-center gap-1 mt-2.5" style={{ paddingLeft: 23 }}>
        <meta.Icon size={11} weight="fill" style={{ color: meta.color, opacity: 0.8 }} />
        <span style={{ fontSize: '10px', color: meta.color, fontWeight: 600, opacity: 0.9, letterSpacing: '0.03em' }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

// ── Full-audit teaser ─────────────────────────────────────────────────────────

const INDUSTRY_TEASER: Record<string, { Icon: React.ComponentType<{ size: number; weight: string; style?: React.CSSProperties }>; text: string }> = {
  'Hospitality':          { Icon: Star,                text: 'Reputation management — how to build reviews on autopilot' },
  'Food & Beverage':      { Icon: Star,                text: 'Booking and review automation — consistent tables, consistent stars' },
  'Healthcare':           { Icon: Users,               text: 'Appointment automation — fewer no-shows, fuller calendar' },
  'Real Estate':          { Icon: HandshakeSimple,     text: 'Pipeline visibility — tracking every lead from first contact to deal' },
  'Professional Services':{ Icon: ChartLineUp,         text: 'Proposal and follow-up automation — close more without chasing' },
  'Marine':               { Icon: Robot,               text: 'Seasonal ops automation — peak season systems that scale without stress' },
};

function AuditTeaser({ industry }: { industry: string | null }) {
  const specific = industry ? INDUSTRY_TEASER[industry] : null;

  const bullets: { Icon: React.ComponentType<{ size: number; weight: string; style?: React.CSSProperties }>; text: string }[] = [
    { Icon: Gear,              text: 'Automation roadmap — which manual tasks to eliminate first and in what order' },
    { Icon: ChartLineUp,       text: 'Conversion analysis — where you lose clients in your pipeline and how to fix it' },
    { Icon: MagnifyingGlass,   text: 'Digital presence strategy — fastest path from invisible to findable' },
    specific ?? { Icon: Robot, text: 'Tech stack review — what to keep, replace, and connect for maximum efficiency' },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
        What a full audit would show you
      </p>
      <div className="space-y-3">
        {bullets.map(({ Icon, text }, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <Icon
              size={14}
              weight="fill"
              style={{ color: 'rgba(28,189,255,0.65)', marginTop: 2, flexShrink: 0 }}
            />
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoverPage() {
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [draft, setDraft] = useState<DiscoveryAnswers[string]>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Session persistence
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Contact form
  const [contactName,    setContactName]    = useState('');
  const [contactEmail,   setContactEmail]   = useState('');
  const [contactPhone,   setContactPhone]   = useState('');
  const [contactSaving,  setContactSaving]  = useState(false);
  const [contactSaved,   setContactSaved]   = useState(false);
  const [contactError,   setContactError]   = useState<string | null>(null);

  const sequence   = buildQuestionSequence(answers);
  const currentId  = sequence[currentIdx] ?? null;
  const currentQ   = currentId ? getQuestion(currentId) : null;
  const answeredIds = sequence.slice(0, currentIdx);

  // Re-compute draft when question changes
  useEffect(() => {
    setDraft(currentId ? (answers[currentId] ?? null) : null);
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll new question into view
  useEffect(() => {
    if (!showResults) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }, [currentIdx, showResults]);

  // Optional questions allow advancing without an answer
  const canAdvance = Boolean(currentQ?.optional) || isAnswered(draft);
  const allDone    = currentIdx >= sequence.length;

  const findings = computeFindings(answers);
  const industry = answers['a2'] as string | null;
  const teamSize = answers['a4'] as string | null;

  function handleNext() {
    if (!currentId) return;
    const q = getQuestion(currentId);
    let valueToSave: DiscoveryAnswers[string] = draft;
    if (q?.optional && typeof draft === 'string' && !draft.trim()) {
      valueToSave = null;
    }
    const committed = { ...answers, [currentId]: valueToSave };
    setAnswers(committed);
    const nextSequence = buildQuestionSequence(committed);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= nextSequence.length) {
      const finalFindings = computeFindings(committed);
      const saveTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000),
      );
      Promise.race([
        api.saveDiscoverySession({
          answers: committed,
          maturity_level: computeScore(committed),
          findings: finalFindings,
        }),
        saveTimeout,
      ]).then(({ token }) => {
        setSessionToken(token);
      }).catch(() => {
        // Timeout or network error — results are still shown, session token not available
      });
      setShowResults(true);
    } else {
      setCurrentIdx(nextIdx);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim()) return;
    setContactSaving(true);
    setContactError(null);
    try {
      if (sessionToken) {
        await api.saveDiscoveryContact(sessionToken, {
          contact_name:  contactName.trim()  || undefined,
          contact_email: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
        });
      }
      setContactSaved(true);
    } catch {
      setContactError('Could not save — please email us directly.');
    } finally {
      setContactSaving(false);
    }
  }

  function handleBack() {
    if (showResults) {
      setShowResults(false);
      setCurrentIdx(sequence.length - 1);
      setDraft(answers[sequence[sequence.length - 1]] ?? null);
      return;
    }
    if (currentIdx === 0) return;
    const prevIdx = currentIdx - 1;
    const prevId  = sequence[prevIdx];
    setCurrentIdx(prevIdx);
    setDraft(answers[prevId] ?? null);
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (showResults) {
    const industryStr = industry ?? 'your industry';
    const teamStr     = teamSize ?? '';

    return (
      <div
        className="min-h-screen flex flex-col items-center py-12 px-5"
        style={{ background: 'linear-gradient(135deg, #0A0F1A 0%, #0D1626 60%, #0A1020 100%)' }}
      >
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(28,189,255,0.10) 0%, transparent 70%)', zIndex: 0 }} />

        <div className="relative w-full max-w-lg z-10">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <ChartBar size={16} weight="bold" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>GLC Audit</span>
          </div>

          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Header */}
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)' }}>
                  <CheckCircle size={13} weight="fill" style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', letterSpacing: '0.04em' }}>ANALYSIS COMPLETE</span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  Here is what we found in your business
                </h1>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 6, lineHeight: 1.6 }}>
                  {answeredIds.length + 1} signals analysed
                  {industryStr && industryStr !== 'your industry' ? ` — ${industryStr}` : ''}
                  {teamStr ? `, ${teamStr.toLowerCase()}` : ''}
                </p>
              </div>

              {/* Findings */}
              {findings.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    {findings.length} area{findings.length > 1 ? 's' : ''} to address
                  </p>
                  <div className="space-y-3">
                    {findings.map((f, i) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.07 }}
                      >
                        <FindingCard finding={f} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)' }}>
                  <CheckCircle size={22} weight="fill" className="mx-auto mb-2" style={{ color: '#10B981' }} />
                  <p className="font-semibold text-sm" style={{ color: '#10B981' }}>Strong operational foundation</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>
                    No critical gaps detected from your answers. The full audit will surface deeper optimisation opportunities.
                  </p>
                </div>
              )}

              {/* Full-audit teaser */}
              <AuditTeaser industry={industry} />

              {/* Primary CTA */}
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(28,189,255,0.07)', border: '1px solid rgba(28,189,255,0.22)' }}
              >
                <Buildings size={22} className="mx-auto mb-2" style={{ color: 'rgba(28,189,255,0.70)' }} />
                <p className="font-bold mb-1" style={{ fontSize: 15, color: '#fff' }}>
                  Continue and get your full audit
                </p>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, marginBottom: 16 }}>
                  Free. Takes 15 minutes. Your answers carry over — no need to start over.
                </p>
                <a
                  href={sessionToken ? `/login?discovery=${sessionToken}` : '/login'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #1CBDFF, #0066CC)', color: '#fff', textDecoration: 'none' }}
                >
                  <Users size={15} />
                  Get your full audit
                  <ArrowRight size={14} />
                </a>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
                  No card required. We reply within one business day.
                </p>
              </div>
            </motion.div>

            {/* Contact form — save results / continue later */}
            {!contactSaved ? (
              <form
                onSubmit={handleContactSubmit}
                className="rounded-2xl p-5 space-y-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <p className="font-semibold mb-0.5" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                    Save your results
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', lineHeight: 1.55 }}>
                    Add your details so we can keep your answers on file — you will pick up exactly where you left off after signing up.
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    { placeholder: 'Your name',              value: contactName,  setter: setContactName,  type: 'text'  },
                    { placeholder: 'Email address',          value: contactEmail, setter: setContactEmail, type: 'email' },
                    { placeholder: 'Phone / WhatsApp',       value: contactPhone, setter: setContactPhone, type: 'tel'   },
                  ].map(({ placeholder, value, setter, type }) => (
                    <input
                      key={placeholder}
                      type={type}
                      placeholder={placeholder}
                      value={value}
                      onChange={e => setter(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        background: 'var(--input-background)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--glc-blue)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                    />
                  ))}
                </div>
                {contactError && (
                  <p style={{ fontSize: 11, color: 'var(--score-1)' }}>{contactError}</p>
                )}
                <button
                  type="submit"
                  disabled={contactSaving || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim())}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm"
                  style={{
                    background: (contactSaving || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim()))
                      ? 'rgba(255,255,255,0.08)'
                      : 'linear-gradient(135deg, #1CBDFF44, #0066CC44)',
                    color: (contactSaving || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim()))
                      ? 'rgba(255,255,255,0.30)'
                      : 'rgba(255,255,255,0.80)',
                    border: '1px solid rgba(28,189,255,0.25)',
                    cursor: (contactSaving || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim()))
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                >
                  <span key={contactSaving ? 'saving' : 'idle'} className="inline-flex items-center justify-center gap-2">
                    {contactSaving ? (
                      <>
                        <Spinner size={14} className="animate-spin" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      <>
                        <PaperPlaneRight size={14} aria-hidden />
                        Save and continue later
                      </>
                    )}
                  </span>
                </button>
              </form>
            ) : (
              <div
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{ background: 'var(--glc-green-muted)', border: '1px solid rgba(14,207,130,0.28)' }}
              >
                <CheckCircle size={20} weight="fill" className="flex-shrink-0" style={{ color: 'var(--glc-green-dark)' }} />
                <div>
                  <p className="font-semibold" style={{ fontSize: 13, color: '#10B981' }}>Details saved</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5 }}>
                    We will be in touch within one business day.
                  </p>
                </div>
              </div>
            )}

            {/* Back */}
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm mx-auto"
              style={{ color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={14} /> Review answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Questionnaire screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-5" style={{ background: 'var(--bg-canvas)' }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'var(--mesh-brand)', zIndex: 0 }}
        aria-hidden
      />

      <div className="relative w-full max-w-lg z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <ChartBar size={16} weight="bold" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>GLC Audit</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {currentIdx + 1} / {sequence.length}
          </span>
        </div>

        <div className="rounded-full overflow-hidden mb-8" style={{ height: 2, background: 'var(--bg-muted)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-brand)' }}
            animate={{ width: `${((currentIdx + (canAdvance ? 1 : 0)) / sequence.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* Intro copy (first question only) */}
        {currentIdx === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center"
          >
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Let's understand your business
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
              {sequence.length} quick questions — no account needed.
              We'll show you exactly where the biggest opportunities are.
            </p>
          </motion.div>
        )}

        {/* Answered thread */}
        {answeredIds.length > 0 && (
          <div className="space-y-2 mb-5">
            {answeredIds.map(id => {
              const q = getQuestion(id);
              if (!q) return null;
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <CheckCircle size={14} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--glc-green-dark)' }} />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: 1 }}>{q.question}</p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {summarise(answers[id])}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Current question */}
        {currentQ && (
          <motion.div
            key={currentId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  width: 20, height: 20,
                  background: 'var(--gradient-brand)',
                  color: 'var(--primary-foreground)',
                }}
              >
                {currentIdx + 1}
              </span>
              {currentQ.type === 'multi_choice' && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                  SELECT ALL THAT APPLY
                </span>
              )}
            </div>

            <label className="block font-semibold" style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentQ.question}
            </label>

            {currentQ.hint && (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: -4 }}>
                {currentQ.hint}
              </p>
            )}

            <QuestionInput qId={currentId!} value={draft} onChange={setDraft} />

            <div className="flex items-center gap-3 pt-1">
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    color: 'var(--text-tertiary)',
                    background: 'transparent',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:hover:scale-100 disabled:active:scale-100"
                style={{
                  background: canAdvance
                    ? 'var(--gradient-brand)'
                    : 'var(--bg-muted)',
                  color: canAdvance ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
                  border: 'none',
                  cursor: canAdvance ? 'pointer' : 'not-allowed',
                  boxShadow: canAdvance ? '0 4px 14px rgba(28,189,255,0.28)' : 'none',
                }}
              >
                {currentIdx < sequence.length - 1 ? (
                  <>Continue <ArrowRight size={15} /></>
                ) : (
                  <>See my findings <ArrowRight size={15} /></>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Edge case: all done but showResults not yet set */}
        {allDone && !showResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer' }}
            >
              <CheckCircle size={16} /> View my findings
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />

        <p className="text-center mt-8" style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
          GLC Audit Platform — free discovery assessment
        </p>
      </div>
    </div>
  );
}
