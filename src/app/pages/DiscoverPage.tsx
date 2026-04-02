/**
 * Mode C — Discovery flow (public, no auth required).
 *
 * Sequential branching questionnaire for businesses without a public website.
 * After answering, shows a tech-maturity level and up to 4 improvement findings.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, CheckCircle, Check, Circle, Warning,
  ChartBar, Lightbulb, Users, Buildings, ArrowLeft,
} from '@phosphor-icons/react';
import {
  buildQuestionSequence,
  computeMaturity,
  computeFindings,
  getQuestion,
  type DiscoveryAnswers,
  type DiscoveryFinding,
} from '../lib/discovery-flow';

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

// ── Answer input ─────────────────────────────────────────────────────────────

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
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
          lineHeight: 1.6,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(28,189,255,0.55)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
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
                background: sel ? 'rgba(28,189,255,0.18)' : 'rgba(255,255,255,0.06)',
                border: sel ? '1px solid rgba(28,189,255,0.50)' : '1px solid rgba(255,255,255,0.14)',
                color: sel ? '#7DD3FC' : 'rgba(255,255,255,0.78)',
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
                background: sel ? 'rgba(28,189,255,0.18)' : 'rgba(255,255,255,0.06)',
                border: sel ? '1px solid rgba(28,189,255,0.50)' : '1px solid rgba(255,255,255,0.14)',
                color: sel ? '#7DD3FC' : 'rgba(255,255,255,0.78)',
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

// ── Maturity badge ────────────────────────────────────────────────────────────

function MaturityBadge({ level, label, description, color }: ReturnType<typeof computeMaturity>) {
  return (
    <div
      className="flex items-start gap-4 rounded-2xl p-5"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}40`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: 52,
          height: 52,
          background: `${color}22`,
          border: `2px solid ${color}55`,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{level}</span>
      </div>
      <div>
        <p className="font-bold mb-1" style={{ color, fontSize: '15px' }}>{label}</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>{description}</p>
      </div>
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────

function FindingCard({ finding }: { finding: DiscoveryFinding }) {
  const isHigh = finding.impact === 'high';
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: isHigh ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
        border: isHigh ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(245,158,11,0.25)',
      }}
    >
      <div className="flex items-start gap-2.5 mb-2">
        {isHigh
          ? <Warning size={15} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
          : <Lightbulb size={15} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />}
        <div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: isHigh ? '#EF4444' : '#F59E0B' }}
          >
            {finding.zone}
          </span>
          <p className="font-semibold text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
            {finding.headline}
          </p>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.6, paddingLeft: 23 }}>
        {finding.detail}
      </p>
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

  const sequence = buildQuestionSequence(answers);
  const currentId = sequence[currentIdx] ?? null;
  const currentQ = currentId ? getQuestion(currentId) : null;
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

  const canAdvance = isAnswered(draft);
  const allDone = currentIdx >= sequence.length;

  const maturity = computeMaturity(answers);
  const findings = computeFindings(answers);

  function handleNext() {
    if (!currentId) return;
    // Commit draft to answers
    const committed = { ...answers, [currentId]: draft };
    setAnswers(committed);
    const nextSequence = buildQuestionSequence(committed);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= nextSequence.length) {
      setShowResults(true);
    } else {
      setCurrentIdx(nextIdx);
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
    const prevId = sequence[prevIdx];
    setCurrentIdx(prevIdx);
    setDraft(answers[prevId] ?? null);
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (showResults) {
    return (
      <div
        className="min-h-screen flex flex-col items-center py-12 px-5"
        style={{
          background: 'linear-gradient(135deg, #0A0F1A 0%, #0D1626 60%, #0A1020 100%)',
        }}
      >
        {/* Mesh */}
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(28,189,255,0.10) 0%, transparent 70%)', zIndex: 0 }} />

        <div className="relative w-full max-w-lg z-10">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1CBDFF, #0066CC)' }}>
              <ChartBar size={16} weight="bold" style={{ color: '#fff' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>GLC Audit</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="space-y-5">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)' }}>
                <CheckCircle size={13} weight="fill" style={{ color: '#10B981' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', letterSpacing: '0.04em' }}>ANALYSIS COMPLETE</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                Here is what we found
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, lineHeight: 1.6 }}>
                Based on your answers — {answeredIds.length + 1} signals analysed
              </p>
            </div>

            {/* Maturity */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Technology maturity
              </p>
              <MaturityBadge {...maturity} />
            </div>

            {/* Findings */}
            {findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {findings.length} area{findings.length > 1 ? 's' : ''} to address
                </p>
                <div className="space-y-3">
                  {findings.map(f => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      <FindingCard finding={f} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(28,189,255,0.07)', border: '1px solid rgba(28,189,255,0.22)' }}
            >
              <Buildings size={22} className="mx-auto mb-2" style={{ color: 'rgba(28,189,255,0.70)' }} />
              <p className="font-bold mb-1" style={{ fontSize: 15, color: '#fff' }}>
                Want to dig deeper?
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 16 }}>
                A GLC consultant can walk through each area with you, prioritise what matters most, and give you an action plan — not just a list of problems.
              </p>
              <a
                href="mailto:hello@glc-audit.com?subject=Discovery%20consultation%20request"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg, #1CBDFF, #0066CC)', color: '#fff', textDecoration: 'none' }}
              >
                <Users size={15} />
                Request a consultation
              </a>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 10 }}>
                No commitment. We reply within one business day.
              </p>
            </div>

            {/* Back */}
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm mx-auto"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={14} /> Review answers
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Questionnaire screen ────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center py-10 px-5"
      style={{
        background: 'linear-gradient(135deg, #0A0F1A 0%, #0D1626 60%, #0A1020 100%)',
      }}
    >
      {/* Mesh */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(28,189,255,0.08) 0%, transparent 70%)', zIndex: 0 }} />

      <div className="relative w-full max-w-lg z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1CBDFF, #0066CC)' }}>
              <ChartBar size={16} weight="bold" style={{ color: '#fff' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>GLC Audit</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {currentIdx + 1} / {sequence.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="rounded-full overflow-hidden mb-8" style={{ height: 2, background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #1CBDFF, #0066CC)' }}
            animate={{ width: `${((currentIdx + (canAdvance ? 1 : 0)) / sequence.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* Intro copy (only on first question) */}
        {currentIdx === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center"
          >
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Let's understand your business
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 8, lineHeight: 1.6 }}>
              {sequence.length} quick questions — no account needed.
              We'll show you where the biggest opportunities are.
            </p>
          </motion.div>
        )}

        {/* Answered questions (collapsed thread) */}
        {answeredIds.length > 0 && (
          <div className="space-y-2 mb-5">
            {answeredIds.map(id => {
              const q = getQuestion(id);
              if (!q) return null;
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <CheckCircle size={14} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', marginBottom: 1 }}>{q.question}</p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.75)',
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
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={currentId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {/* Step pill */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    width: 20, height: 20,
                    background: 'linear-gradient(135deg, #1CBDFF, #0066CC)',
                    color: '#fff',
                  }}
                >
                  {currentIdx + 1}
                </span>
                {currentQ.type === 'multi_choice' && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)', letterSpacing: '0.04em' }}>
                    SELECT ALL THAT APPLY
                  </span>
                )}
              </div>

              <label className="block font-semibold" style={{ fontSize: 15, color: '#fff', lineHeight: 1.4 }}>
                {currentQ.question}
              </label>

              {currentQ.hint && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: -4 }}>
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
                      color: 'rgba(255,255,255,0.40)',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance}
                  whileHover={canAdvance ? { scale: 1.02 } : {}}
                  whileTap={canAdvance ? { scale: 0.97 } : {}}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm"
                  style={{
                    background: canAdvance
                      ? 'linear-gradient(135deg, #1CBDFF, #0066CC)'
                      : 'rgba(255,255,255,0.08)',
                    color: canAdvance ? '#fff' : 'rgba(255,255,255,0.30)',
                    border: 'none',
                    cursor: canAdvance ? 'pointer' : 'not-allowed',
                    boxShadow: canAdvance ? '0 4px 14px rgba(28,189,255,0.30)' : 'none',
                  }}
                >
                  {currentIdx < sequence.length - 1 ? (
                    <>Continue <ArrowRight size={15} /></>
                  ) : (
                    <>
                      <Circle size={14} weight="fill" style={{ opacity: 0.7 }} />
                      See my results
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All done / auto-advance edge case */}
        {allDone && !showResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, #1CBDFF, #0066CC)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <CheckCircle size={16} /> View my assessment
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />

        {/* Footer */}
        <p className="text-center mt-8" style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
          GLC Audit Platform — free discovery assessment
        </p>
      </div>
    </div>
  );
}
