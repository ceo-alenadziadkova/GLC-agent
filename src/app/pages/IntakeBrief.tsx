import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ArrowRight, CheckCircle, Warning } from '@phosphor-icons/react';
import { BriefField } from '../components/BriefField';
import { api, ApiError } from '../data/apiService';
import type { BriefQuestion, BriefResponses, BriefResponseEntry } from '../data/briefQuestions';
import { PRE_BRIEF_QUESTION_IDS, countAnswered } from '../data/briefQuestions';
// @ts-ignore
import Logo from '../assets/logo-white.svg';

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

export function IntakeBrief() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = rawToken?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [responses, setResponses] = useState<BriefResponses>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const orderedQuestions = useMemo(
    () => PRE_BRIEF_QUESTION_IDS.map(id => questions.find(q => q.id === id)).filter((q): q is BriefQuestion => q != null),
    [questions]
  );

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
        setMetadata(data.metadata ?? {});
        setSubmittedAt(data.submitted_at);
        setResponses(normalizeStoredResponses(data.responses ?? {}));
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

  const answered = countAnswered(responses, PRE_BRIEF_QUESTION_IDS);
  const total = PRE_BRIEF_QUESTION_IDS.length;

  function handleChange(id: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [id]: { value, source: 'client' } }));
  }

  function handleUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.submitIntakeResponses(token, responses);
      setDone(true);
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

  const companyName = (metadata.company_name as string)?.trim() || '';
  const message = (metadata.message as string)?.trim() || '';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'var(--mesh-brand)', opacity: 0.4 }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <img src={Logo} alt="GLC Audit Platform" className="h-9 w-auto" />
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
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 w-full"
              >
                <CheckCircle className="w-12 h-12 mx-auto" style={{ color: 'var(--glc-green)' }} weight="fill" />
                <p style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                  All done — {(metadata.consultant_name as string)?.trim() || 'your consultant'} will be in touch.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="w-full space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--gradient-brand)' }}>
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
                    {companyName || 'Pre-brief'}
                  </h1>
                  {message && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
                  )}
                </div>

                {submittedAt && (
                  <p className="text-xs text-center px-3 py-2 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    You already answered on {new Date(submittedAt).toLocaleString()}. You can update your answers below before the call.
                  </p>
                )}

                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Progress</span>
                    <span>{answered} / {total}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%`, background: 'var(--gradient-brand)' }} />
                  </div>
                </div>

                <div className="glc-card p-5 space-y-6" style={{ borderRadius: 'var(--radius-xl)' }}>
                  {orderedQuestions.map(q => (
                    <BriefField
                      key={q.id}
                      q={q}
                      value={responses[q.id]}
                      onChange={v => handleChange(q.id, v)}
                      onSetUnknown={() => handleUnknown(q.id)}
                    />
                  ))}
                </div>

                {submitError && (
                  <p className="text-sm text-center" style={{ color: 'var(--score-1)' }}>{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || answered < total}
                  className="w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl text-sm"
                  style={{
                    background: answered >= total && !submitting ? 'var(--gradient-brand)' : 'var(--border-default)',
                    color: '#fff',
                    border: 'none',
                    cursor: answered >= total && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Sending…' : <>Submit <ArrowRight className="w-4 h-4" /></>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
