import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BriefField } from '../components/BriefField';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { api, ApiError } from '../data/apiService';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import { usePublicBrand } from '../marketing/PublicBrandContext';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { PUBLIC_BRIEF_SESSION_FLOW_ENABLED } from '../config/public-brief-flow';
import { toUiApiErrorMessage } from '../lib/api-error-ui';
import type { BriefQuestion, BriefResponses, BriefResponseValue } from '../data/briefQuestions';
import { groupBriefQuestionsBySection, unwrapResponse, WEBSITE_PRESENCE_NO_SITE_LABEL } from '../data/briefQuestions';
import { choiceValueNeedsSpecify } from '@glc/intake-core';

type FormValues = {
  contact_name: string;
  company_name: string;
  website_url: string;
  has_website: boolean;
  email: string;
  phone: string;
};

const PB = WORKSPACE_PAGE_COPY.publicBrief;

export function PublicBriefPage() {
  const { supportEmail } = usePublicBrand();
  const [sessionToken, setSessionToken] = useState<string>('');
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [responses, setResponses] = useState<BriefResponses>({});
  const [phase, setPhase] = useState<'identity' | 'questions' | 'success'>('identity');
  const [loadingSession, setLoadingSession] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const visibleQuestions = useMemo(
    () => questions.filter(q => !(q.id === 'a11' && unwrapResponse(responses.a5) === WEBSITE_PRESENCE_NO_SITE_LABEL)),
    [questions, responses],
  );
  const sections = useMemo(() => groupBriefQuestionsBySection(visibleQuestions), [visibleQuestions]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      contact_name: '',
      company_name: '',
      website_url: '',
      has_website: true,
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('session')?.trim();
    if (!token) return;
    setLoadingSession(true);
    void api.getBriefPublicSession(token)
      .then(data => {
        setSessionToken(data.session_token);
        setQuestions(data.questions);
        setResponses(data.responses as BriefResponses);
        setPhase(data.submitted_at ? 'success' : 'questions');
        setSubmittedAt(data.submitted_at ?? null);
      })
      .catch(() => undefined)
      .finally(() => setLoadingSession(false));
  }, []);

  async function onIdentitySubmit(values: FormValues) {
    setSubmitError(null);
    if (!PUBLIC_BRIEF_SESSION_FLOW_ENABLED) {
      try {
        await api.submitMarketingBrief({
          name: values.contact_name.trim(),
          company: values.company_name.trim() || undefined,
          website: values.has_website ? values.website_url.trim() : undefined,
          no_website: !values.has_website,
          concern: PB.legacyMarketingBriefPlaceholder,
          improve: PB.legacyMarketingBriefPlaceholder,
          contact_method: values.email.trim() ? 'Email' : 'Either is fine',
          unsure_choice: true,
        });
        setPhase('success');
      } catch (e) {
        setSubmitError(toUiApiErrorMessage(e));
      }
      return;
    }
    try {
      const res = await api.createBriefPublicSession({
        contact_name: values.contact_name.trim(),
        company_name: values.company_name.trim(),
        has_website: values.has_website,
        website_url: values.has_website ? values.website_url.trim() : undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
      });
      setSessionToken(res.session_token);
      setQuestions(res.questions);
      setResponses(res.responses as BriefResponses);
      setPhase('questions');
      const params = new URLSearchParams(window.location.search);
      params.set('session', res.session_token);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    } catch (e) {
      const email = supportEmail.trim();
      const emailPart =
        email !== '' ? PB.submitErrorEmailSuffix.replace('{{email}}', email) : '';
      const msg =
        e instanceof ApiError
          ? e.message
          : `${PB.submitErrorGeneric}${emailPart}`;
      setSubmitError(msg);
    }
  }

  function setAnswer(id: string, value: string | string[] | number | null) {
    setResponses(prev => {
      const next: BriefResponses = { ...prev, [id]: { value: value as BriefResponseValue, source: 'client' } };
      if (!choiceValueNeedsSpecify(value)) delete next[`${id}__other`];
      if (id === 'a2' && value !== 'Other') delete next.intake_industry_specify;
      return next;
    });
  }

  async function saveDraft() {
    if (!sessionToken) return;
    setSavingDraft(true);
    setSubmitError(null);
    try {
      const result = await api.saveBriefPublicSession(sessionToken, responses);
      setQuestions(result.questions);
      setResponses(result.responses as BriefResponses);
      setSavedAt(new Date().toISOString());
    } catch (e) {
      setSubmitError(toUiApiErrorMessage(e));
    } finally {
      setSavingDraft(false);
    }
  }

  async function submitFinal() {
    if (!sessionToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.submitBriefPublicSession(sessionToken, responses);
      setSubmittedAt(result.submitted_at);
      setPhase('success');
    } catch (e) {
      setSubmitError(toUiApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingLayout
      breadcrumbs={[
        { label: PB.breadcrumbsHome, to: '/' },
        { label: PB.breadcrumbsBrief },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          {PB.heroTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {PB.heroIntroBefore}
          <strong>{PB.heroIntroStrong}</strong>
          {PB.heroIntroAfter}
        </p>
      </MarketingSection>

      {phase === 'success' ? (
        <MarketingSection>
          <div
            className="glc-card max-w-2xl p-6 sm:p-8"
            style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--glc-green-dark)' }}>{PB.sentBadge}</p>
            <h2 className="mt-2 font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {PB.successTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {PB.successBody}
            </p>
            <p className="mt-6 text-xs" style={{ color: 'var(--text-quaternary)' }}>
              {PB.refPrefix} {sessionToken}
            </p>
            {submittedAt && (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>
                {PB.submittedAtPrefix} {new Date(submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        </MarketingSection>
      ) : (
        <MarketingSection>
          {loadingSession ? (
            <p style={{ color: 'var(--text-secondary)' }}>{PB.loadingSession}</p>
          ) : phase === 'identity' ? (
            <form onSubmit={handleSubmit(onIdentitySubmit)} className="glc-card max-w-3xl space-y-4 p-6">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{PB.formShellTitle}</h2>
              <label className="flex flex-col gap-1.5 text-sm">
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.formNameLabel}</span>
                <input {...register('contact_name', { required: PB.formNameRequired })} className="rounded-lg border px-3 py-2.5" />
                {errors.contact_name && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.contact_name.message}</span>}
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.formCompanyLabel}</span>
                <input {...register('company_name', { required: PB.formCompanyRequired })} className="rounded-lg border px-3 py-2.5" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('has_website')} />
                {PB.hasWebsiteLabel}
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.websiteLabel}</span>
                <input {...register('website_url')} placeholder={PB.websitePlaceholder} className="rounded-lg border px-3 py-2.5" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.emailLabel}</span>
                <input {...register('email')} className="rounded-lg border px-3 py-2.5" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.phoneLabel}</span>
                <input {...register('phone')} className="rounded-lg border px-3 py-2.5" />
              </label>
              {submitError && <p style={{ color: 'var(--score-1)', fontSize: 14 }}>{submitError}</p>}
              <button type="submit" disabled={isSubmitting} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)' }}>
                {isSubmitting ? PB.startLoading : PB.startButton}
              </button>
            </form>
          ) : (
            <div className="glc-card max-w-3xl space-y-6 p-6">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{PB.personalizedTitle}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{PB.personalizedSubtitle}</p>
              {sections.map(section => (
                <section key={section.section} className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase" style={{ color: 'var(--text-quaternary)' }}>{section.section}</h3>
                  {section.questions.map(q => (
                    <BriefField
                      key={q.id}
                      q={q}
                      value={responses[q.id]}
                      onChange={v => setAnswer(q.id, v)}
                      onSetUnknown={() => setAnswer(q.id, null)}
                      otherSpecify={
                        q.id === 'a2'
                          ? (unwrapResponse(responses.intake_industry_specify) as string | undefined) ?? ''
                          : (unwrapResponse(responses[`${q.id}__other`]) as string | undefined) ?? ''
                      }
                      onOtherSpecifyChange={
                        q.id === 'a2'
                          ? txt => setAnswer('intake_industry_specify', txt || null)
                          : txt => setAnswer(`${q.id}__other`, txt || null)
                      }
                    />
                  ))}
                </section>
              ))}
              {submitError && <p style={{ color: 'var(--score-1)', fontSize: 14 }}>{submitError}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => { void saveDraft(); }} disabled={savingDraft} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">
                  {savingDraft ? PB.saveDraftLoading : PB.saveDraftLabel}
                </button>
                <button type="button" onClick={() => { void submitFinal(); }} disabled={submitting} className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)' }}>
                  {submitting ? PB.submitBriefLoading : PB.submitBriefLabel}
                </button>
              </div>
              {savedAt && (
                <p className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                  {PB.savedAtPrefix} {new Date(savedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </MarketingSection>
      )}

      <div className="mt-14">
        <NextStepsCta
          steps={PB.nextSteps.map((s, i) =>
            i === 2 ? { ...s, to: LOGIN_PATH } : s,
          )}
        />
      </div>
    </MarketingLayout>
  );
}
