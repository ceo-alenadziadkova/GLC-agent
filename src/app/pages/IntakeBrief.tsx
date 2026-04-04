import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle, Warning, PencilSimple, Clock } from '@phosphor-icons/react';
import { BriefField } from '../components/BriefField';
import { api, ApiError } from '../data/apiService';
import type { BriefQuestion, BriefResponses, BriefResponseEntry, BriefResponseValue } from '../data/briefQuestions';
import {
  countPreBriefSatisfied,
  formatBriefAnswerSummary,
  getPreBriefSubmitSlotIds,
  groupBriefQuestionsBySection,
  intakeIndustryIsOther,
} from '../data/briefQuestions';
import { GlcLogo } from '../components/GlcLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  parseIntakeClientMetadata,
  buildFollowUpExpectationLine,
  buildIntakeContactFooterLines,
  applyIntakeMetadataPrefill,
  hasIntakeConsultantPrefill,
} from '../lib/intake-client-copy';

function normalizeStoredResponses(raw: Record<string, unknown>): BriefResponses {
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

function stringAnswer(raw: BriefResponses[string] | undefined): string {
  if (raw == null) return '';
  if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    const v = (raw as BriefResponseEntry).value;
    return typeof v === 'string' ? v.trim() : '';
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

type Phase = 'form' | 'review' | 'success';

export function IntakeBrief() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = rawToken?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [metadataRecord, setMetadataRecord] = useState<Record<string, unknown>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [responses, setResponses] = useState<BriefResponses>({});
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmittedIso, setLastSubmittedIso] = useState<string | null>(null);

  const hadSubmissionOnLoadRef = useRef(false);

  const orderedQuestions = useMemo(
    () => questions.filter(q => q.id !== 'intake_industry_specify' || intakeIndustryIsOther(responses)),
    [questions, responses],
  );

  const questionSections = useMemo(
    () => groupBriefQuestionsBySection(orderedQuestions),
    [orderedQuestions],
  );

  const clientMeta = useMemo(() => parseIntakeClientMetadata(metadataRecord), [metadataRecord]);
  const consultantPrefilledIdentity = useMemo(() => hasIntakeConsultantPrefill(metadataRecord), [metadataRecord]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError('Invalid link');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setExpired(false);
      try {
        const data = await api.getIntakeToken(token);
        if (cancelled) return;
        setQuestions(data.questions);
        setMetadataRecord(data.metadata ?? {});
        setSubmittedAt(data.submitted_at);
        hadSubmissionOnLoadRef.current = !!data.submitted_at;
        setResponses(applyIntakeMetadataPrefill(
          normalizeStoredResponses(data.responses ?? {}),
          data.metadata ?? {},
        ));
        setPhase('form');
        setLastSubmittedIso(null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 410) {
          setExpired(true);
        } else {
          setLoadError((e as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const answered = countPreBriefSatisfied(responses);
  const total = getPreBriefSubmitSlotIds(responses).length;
  const formComplete = answered === total;

  function handleChange(id: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [id]: { value, source: 'client' } }));
  }

  function handleIndustryChange(value: string | string[] | number | null) {
    setResponses(prev => {
      const next: BriefResponses = {
        ...prev,
        intake_industry: { value: value as BriefResponseValue, source: 'client' },
      };
      if (value !== 'Other') {
        delete next.intake_industry_specify;
      }
      return next;
    });
  }

  function handleUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  function scrollToQuestion(id: string) {
    setPhase('form');
    window.requestAnimationFrame(() => {
      document.getElementById(`intake-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function handleConfirmSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await api.submitIntakeResponses(token, responses);
      setLastSubmittedIso(result.submitted_at);
      setSubmittedAt(result.submitted_at);
      setPhase('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setExpired(true);
      } else {
        setSubmitError((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const companyName = stringAnswer(responses.intake_company_name) || clientMeta.company_name || '';
  const message = clientMeta.message ?? '';
  const consultantLabel = clientMeta.consultant_name?.trim() || 'Your consultant';
  const followUpLine = buildFollowUpExpectationLine(clientMeta);
  const contactFooter = buildIntakeContactFooterLines(clientMeta);

  const successIsUpdate = hadSubmissionOnLoadRef.current;

  function formatSavedAt(iso: string): string {
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'var(--mesh-brand)', opacity: 0.4 }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <GlcLogo className="h-9" />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-10" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
        {loading && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
        )}

        {!loading && expired && (
          <div className="text-center space-y-3">
            <Warning className="w-10 h-10 mx-auto" style={{ color: 'var(--score-2)' }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>This link has expired</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Please contact your consultant for a new link.</p>
          </div>
        )}

        {!loading && loadError && !expired && (
          <div className="text-center space-y-4 w-full">
            <p style={{ color: 'var(--score-1)' }}>{loadError}</p>
            <button type="button" className="glc-btn-secondary text-sm" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && !expired && (
          <AnimatePresence mode="wait">
            {phase === 'success' && lastSubmittedIso ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-6 text-left"
              >
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-1" style={{ color: 'var(--glc-green)' }} weight="fill" />
                </div>

                <div
                  className="glc-card overflow-hidden"
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <div
                    className="px-5 py-4"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'linear-gradient(180deg, rgba(16,207,130,0.06) 0%, transparent 100%)',
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--glc-green)', marginBottom: 6 }}
                    >
                      {successIsUpdate ? 'Changes saved' : 'Submission received'}
                    </p>
                    <h2
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 'var(--text-xl)',
                        color: 'var(--text-primary)',
                        letterSpacing: 'var(--tracking-tight)',
                        lineHeight: 1.25,
                      }}
                    >
                      {successIsUpdate ? 'Your latest answers are on file' : 'Your pre-brief is on file'}
                    </h2>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div
                      className="flex items-start gap-3 rounded-xl px-3 py-3"
                      style={{
                        backgroundColor: 'var(--bg-inset)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                      >
                        <Clock className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--text-quaternary)', marginBottom: 2 }}
                        >
                          {successIsUpdate ? 'Saved at' : 'Submitted at'}
                        </p>
                        <p
                          className="text-sm font-medium tabular-nums"
                          style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatSavedAt(lastSubmittedIso)}
                        </p>
                      </div>
                    </div>

                    {successIsUpdate ? (
                      <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {clientMeta.consultant_name?.trim() || consultantLabel}
                        </span>
                        {' '}
                        now has this version on file. No further action needed.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                          {clientMeta.consultant_name?.trim() ? (
                            <>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {clientMeta.consultant_name.trim()}
                              </span>
                              {' '}
                              has received your answers and will use them to prepare.
                            </>
                          ) : (
                            <>Your answers have been received and are on file for your consultant.</>
                          )}
                        </p>
                        {followUpLine ? (
                          <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                            {followUpLine}
                          </p>
                        ) : (
                          <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                            {clientMeta.consultant_name?.trim()
                              ? `${clientMeta.consultant_name.trim()} will contact you within 24 hours unless they already agreed a different time with you.`
                              : 'Your consultant will contact you within 24 hours. If you do not hear back, reach out to them directly.'}
                          </p>
                        )}
                        {contactFooter.length > 0 && (
                          <div
                            className="rounded-xl px-3 py-3"
                            style={{
                              backgroundColor: 'var(--bg-inset)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <p
                              className="text-[10px] font-semibold uppercase tracking-wider m-0 mb-2"
                              style={{ color: 'var(--text-quaternary)' }}
                            >
                              Contact
                            </p>
                            <ul className="text-sm space-y-1.5 m-0 pl-0 list-none" style={{ color: 'var(--text-secondary)' }}>
                              {contactFooter.map(line => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : phase === 'review' ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full space-y-5"
              >
                <div className="text-center space-y-2">
                  <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
                    Review your answers
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Check everything before sending. You can edit any row or go back to the form.
                  </p>
                </div>

                <button
                  type="button"
                  className="text-sm font-medium"
                  style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setPhase('form')}
                >
                  Back to questions
                </button>

                <div className="glc-card overflow-hidden" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
                  {questionSections.map((block, blockIdx) => (
                    <div key={`intake-review-section-${blockIdx}`} className={blockIdx > 0 ? 'border-t' : ''} style={blockIdx > 0 ? { borderColor: 'var(--border-subtle)' } : undefined}>
                      <div
                        className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          background: 'var(--bg-muted)',
                          color: 'var(--text-quaternary)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {block.section}
                      </div>
                      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                        {block.questions.map(q => (
                          <div key={q.id} className="flex gap-3 px-4 py-3.5 items-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>{q.question}</p>
                              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatBriefAnswerSummary(q, responses[q.id])}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Edit: ${q.question}`}
                              className="shrink-0 p-2 rounded-lg"
                              style={{ border: '1px solid var(--border-subtle)', color: 'var(--glc-blue)', background: 'var(--bg-surface)', cursor: 'pointer' }}
                              onClick={() => scrollToQuestion(q.id)}
                            >
                              <PencilSimple className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {submitError && (
                  <p className="text-sm text-center" style={{ color: 'var(--score-1)' }}>{submitError}</p>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
                  style={{
                    background: !submitting ? 'var(--gradient-brand)' : 'var(--bg-muted)',
                    color: !submitting ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                    border: !submitting ? 'none' : '1px solid var(--border-subtle)',
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                  onClick={() => { void handleConfirmSubmit(); }}
                >
                  {submitting ? 'Sending…' : <>Confirm and submit <ArrowRight className="w-4 h-4" /></>}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full space-y-6"
              >
                <div className="text-center space-y-2">
                  <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
                    {companyName || 'Pre-brief'}
                  </h1>
                  {message && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
                  )}
                </div>

                {submittedAt && (
                  <p className="text-xs text-center px-3 py-2 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    You already submitted on {formatSavedAt(submittedAt)}. You can change your answers below and submit again — this link stays valid until it expires (typically 7 days).
                  </p>
                )}

                {consultantPrefilledIdentity && (
                  <p className="text-xs text-center px-3 py-2 rounded-lg" style={{ background: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.2)', color: 'var(--text-secondary)' }}>
                    Your consultant started company name, website, and/or industry for you. Please change anything that is not accurate.
                  </p>
                )}

                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Progress</span>
                    <span>{answered} / {total}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%`, background: 'var(--gradient-brand)' }} />
                  </div>
                </div>

                <div className="glc-card overflow-hidden p-5 space-y-8" style={{ borderRadius: 'var(--radius-xl)' }}>
                  {questionSections.map((block, blockIdx) => (
                    <section key={`intake-form-section-${blockIdx}`} className="space-y-6" aria-labelledby={`intake-section-${blockIdx}`}>
                      <h2
                        id={`intake-section-${blockIdx}`}
                        className="text-[11px] font-semibold uppercase tracking-[0.12em] m-0 pb-1"
                        style={{
                          color: 'var(--text-quaternary)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {block.section}
                      </h2>
                      <div className="space-y-6">
                        {block.questions.map(q => (
                          <div key={q.id} id={`intake-q-${q.id}`}>
                            <BriefField
                              q={q}
                              value={responses[q.id]}
                              onChange={q.id === 'intake_industry' ? v => handleIndustryChange(v) : v => handleChange(q.id, v)}
                              onSetUnknown={() => handleUnknown(q.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                {submitError && (
                  <p className="text-sm text-center" style={{ color: 'var(--score-1)' }}>{submitError}</p>
                )}

                <button
                  type="button"
                  disabled={!formComplete}
                  className="w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
                  style={{
                    background: formComplete ? 'var(--gradient-brand)' : 'var(--bg-muted)',
                    color: formComplete ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                    border: formComplete ? 'none' : '1px solid var(--border-subtle)',
                    cursor: formComplete ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => setPhase('review')}
                >
                  Review answers <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
