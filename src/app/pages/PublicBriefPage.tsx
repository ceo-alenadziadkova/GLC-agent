import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { api, ApiError } from '../data/apiService';
import { ROUTE_LABELS, type MarketingRecommendedRoute } from '../marketing/brief-logic';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import { GLC_SUPPORT_EMAIL } from '../lib/support-email';

type FormValues = {
  name: string;
  company: string;
  website: string;
  no_website: boolean;
  concern: string;
  improve: string;
  contact_method: string;
  unsure_choice: boolean;
  preferred_audit_depth: 'express' | 'full';
};

const CONTACT_OPTIONS = ['Email', 'Phone / WhatsApp', 'Either is fine'];

export function PublicBriefPage() {
  const [done, setDone] = useState<{ route: MarketingRecommendedRoute; id: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      company: '',
      website: '',
      no_website: false,
      concern: '',
      improve: '',
      contact_method: CONTACT_OPTIONS[0],
      unsure_choice: false,
      preferred_audit_depth: 'express',
    },
  });

  const noWebsite = watch('no_website');
  const unsure = watch('unsure_choice');
  const showDepthChoice = !unsure && !noWebsite;

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const res = await api.submitMarketingBrief({
        name: values.name.trim(),
        company: values.company.trim() || undefined,
        website: values.no_website ? undefined : values.website.trim(),
        no_website: values.no_website,
        concern: values.concern.trim(),
        improve: values.improve.trim(),
        contact_method: values.contact_method,
        unsure_choice: values.unsure_choice,
        preferred_audit_depth:
          values.unsure_choice || values.no_website ? undefined : values.preferred_audit_depth,
      });
      setDone({ route: res.recommended_route as MarketingRecommendedRoute, id: res.id });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : `Could not submit. Try again later or email ${GLC_SUPPORT_EMAIL}`;
      setSubmitError(msg);
    }
  }

  return (
    <MarketingLayout
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Brief' },
      ]}
    >
      <MarketingSection>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Want help from a specialist?
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          A short brief without tech jargon. We suggest a next step by format: a quick Snapshot, Discovery when there is no
          public site yet, or an audit path chosen by <strong>depth of analysis</strong> (Express = focused scope, Full =
          broadest coverage)—not by how fast you need an answer.
        </p>
      </MarketingSection>

      {done ? (
        <MarketingSection className="mt-10">
          <div
            className="glc-card max-w-2xl p-6 sm:p-8"
            style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--glc-green-dark)' }}>
              Sent
            </p>
            <h2 className="mt-2 font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              We suggest starting with: {ROUTE_LABELS[done.route]}
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The link below opens that path. We will reach out via your preferred channel.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={done.route}
                className="inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
                style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)' }}
              >
                Go to: {ROUTE_LABELS[done.route]}
              </Link>
              <Link
                to="/snapshot"
                className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                Snapshot
              </Link>
              <Link
                to="/express-audit"
                className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                Express
              </Link>
              <Link
                to="/audit"
                className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                Full audit
              </Link>
              <Link
                to="/discovery"
                className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                Discovery
              </Link>
            </div>
            <p className="mt-6 text-xs" style={{ color: 'var(--text-quaternary)' }}>
              Ref: {done.id}
            </p>
          </div>
        </MarketingSection>
      ) : (
        <MarketingSection className="mt-10">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="glc-card max-w-2xl space-y-5 p-6 sm:p-8"
            style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Name *</span>
              <input
                {...register('name', { required: 'Please enter your name' })}
                className="rounded-lg border px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
              {errors.name && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.name.message}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Company</span>
              <input
                {...register('company')}
                className="rounded-lg border px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </label>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" {...register('no_website')} />
                No public site yet
              </label>
              {!noWebsite && (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Website (URL)</span>
                  <input
                    {...register('website', {
                      validate: v =>
                        noWebsite || (v && v.trim().length > 0) || 'Enter a URL or check “no public site yet”',
                    })}
                    placeholder="https://"
                    className="rounded-lg border px-3 py-2.5 outline-none"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />
                  {errors.website && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.website.message}</span>}
                </label>
              )}
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>What is bothering you right now?</span>
              <textarea
                {...register('concern', { required: 'Please add a short description' })}
                rows={3}
                className="resize-y rounded-lg border px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
              {errors.concern && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.concern.message}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>What do you want to improve?</span>
              <textarea
                {...register('improve', { required: 'Please add a short description' })}
                rows={3}
                className="resize-y rounded-lg border px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
              {errors.improve && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.improve.message}</span>}
            </label>

            {showDepthChoice && (
              <fieldset className="flex flex-col gap-2 text-sm">
                <legend style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  How deep should the first audit path go?
                </legend>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                  Express = focused scope and fewer domains. Full = maximum coverage across the programme. This is about
                  depth of analysis, not delivery speed.
                </p>
                <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <input type="radio" value="express" {...register('preferred_audit_depth')} />
                  Express — enough to see the picture and first steps
                </label>
                <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <input type="radio" value="full" {...register('preferred_audit_depth')} />
                  Full — broadest audit depth
                </label>
              </fieldset>
            )}

            <label className="flex flex-col gap-1.5 text-sm">
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Preferred contact</span>
              <select
                {...register('contact_method')}
                className="rounded-lg border px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                {CONTACT_OPTIONS.map(o => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" {...register('unsure_choice')} />
              I am not sure what to choose—suggest a format (Snapshot if I have a site, Discovery if not)
            </label>

            {unsure && (
              <p className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: 'var(--callout-info-bg)', color: 'var(--text-secondary)' }}>
                We will recommend Snapshot when you have a public URL to scan, or Discovery when you do not. The server
                decides the exact route after submit.
              </p>
            )}

            {submitError && <p style={{ color: 'var(--score-1)', fontSize: 14 }}>{submitError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--gradient-accent)', color: 'var(--primary-foreground)' }}
            >
              {isSubmitting ? 'Sending…' : 'Submit brief'}
            </button>
          </form>
        </MarketingSection>
      )}

      <div className="mt-14">
        <NextStepsCta
          steps={[
            { to: '/faq', label: 'FAQ', hint: 'Answers before you reach out.' },
            { to: '/snapshot', label: 'Snapshot', hint: 'If you want a fast automated read first.' },
            { to: LOGIN_PATH, label: 'Sign in', hint: 'Already a client.' },
          ]}
        />
      </div>
    </MarketingLayout>
  );
}
