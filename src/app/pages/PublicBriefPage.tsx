import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { MarketingTextReveal } from '../marketing/blocks/MarketingTextReveal';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { api, ApiError } from '../data/apiService';
import { ROUTE_LABELS, type MarketingRecommendedRoute } from '../marketing/brief-logic';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import { usePublicBrand } from '../marketing/PublicBrandContext';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import {
  MARKETING_FORM_FIELD_BORDER,
  MARKETING_FORM_FIELD_FOCUS,
  MARKETING_PRIMARY_CTA,
} from '../config/marketing-surface-tokens';

type FormValues = {
  name: string;
  company: string;
  website: string;
  no_website: boolean;
  concern: string;
  improve: string;
  contact_method: string;
  unsure_choice: boolean;
  preferred_coverage_package: 'starter' | 'pro' | 'complete';
};

const PB = WORKSPACE_PAGE_COPY.publicBrief;
const ROUTE_LABEL_FALLBACKS: Record<MarketingRecommendedRoute, string> = {
  '/snapshot': 'Snapshot',
  '/starter': 'Starter',
  '/pro': 'Pro',
  '/complete': 'Complete',
  '/discovery': 'Discovery',
};
const BRIEF_CONTROL_STYLE = {
  borderColor: MARKETING_FORM_FIELD_BORDER.borderColor,
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
} as const;

export function PublicBriefPage() {
  const { supportEmail } = usePublicBrand();
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
      contact_method: PB.contactOptions[0],
      unsure_choice: false,
      preferred_coverage_package: 'pro',
    },
  });

  const noWebsite = watch('no_website');
  const unsure = watch('unsure_choice');
  const showDepthChoice = !unsure && !noWebsite;
  const recommendedRouteLabel = done
    ? (ROUTE_LABELS[done.route] ?? ROUTE_LABEL_FALLBACKS[done.route])
    : null;

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
        preferred_coverage_package:
          values.unsure_choice || values.no_website ? undefined : values.preferred_coverage_package,
      });
      setDone({ route: res.recommended_route as MarketingRecommendedRoute, id: res.id });
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

      {done ? (
        <MarketingSection className="mt-10">
          <div
            className="glc-card max-w-2xl p-6 sm:p-8"
            style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--glc-green-dark)' }}>
              {PB.sentBadge}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {PB.sentTitlePrefix} {ROUTE_LABELS[done.route]}
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {PB.sentBody}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={done.route}
                className="inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
                style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)' }}
              >
                {PB.goToPrefix} {recommendedRouteLabel}
              </Link>
              {done.route !== '/brief' && (
                <Link
                  to="/brief"
                  className="inline-flex rounded-xl border px-5 py-3 text-sm font-semibold"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                >
                  Adjust with specialist
                </Link>
              )}
            </div>
            <p className="mt-6 text-xs" style={{ color: 'var(--text-quaternary)' }}>
              {PB.refPrefix} {done.id}
            </p>
          </div>
        </MarketingSection>
      ) : (
        <MarketingSection className="mt-10">
          <form
            onSubmit={handleSubmit(onSubmit)}
            onFocusCapture={event => {
              const element = event.target as HTMLElement;
              if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
                element.style.borderColor = MARKETING_FORM_FIELD_FOCUS.borderColor;
                element.style.boxShadow = MARKETING_FORM_FIELD_FOCUS.boxShadow;
              }
            }}
            onBlurCapture={event => {
              const element = event.target as HTMLElement;
              if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
                element.style.borderColor = BRIEF_CONTROL_STYLE.borderColor;
                element.style.boxShadow = 'none';
              }
            }}
            className="glc-card glc-light-brief-shell max-w-3xl overflow-hidden border"
            style={{
              borderRadius: 'var(--radius-2xl)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-card)',
              backgroundColor: 'color-mix(in oklab, var(--bg-surface) 86%, transparent)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div
              className="border-b px-6 py-4 sm:px-8 sm:py-5"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}
            >
              <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl" style={{ color: 'var(--text-primary)' }}>
                {PB.formShellTitle}
              </h2>
            </div>

            <div className="space-y-10 p-6 sm:p-8">
              <MarketingTextReveal>
                <fieldset className="glc-light-brief-section space-y-5 border-0 p-0 m-0">
                  <legend className="mb-1 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                    {PB.sectionIdentityTitle}
                  </legend>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.formNameLabel}</span>
                    <input
                      {...register('name', { required: PB.formNameRequired })}
                      className="rounded-lg border px-3 py-2.5 outline-none"
                      style={BRIEF_CONTROL_STYLE}
                    />
                    {errors.name && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.name.message}</span>}
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.formCompanyLabel}</span>
                    <input
                      {...register('company')}
                      className="rounded-lg border px-3 py-2.5 outline-none"
                      style={BRIEF_CONTROL_STYLE}
                    />
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        {...register('no_website')}
                        className="h-4 w-4 rounded-[4px] border"
                        style={{
                          borderColor: BRIEF_CONTROL_STYLE.borderColor,
                          accentColor: 'var(--glc-blue)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      />
                      {PB.noPublicSiteYet}
                    </label>
                    {!noWebsite && (
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.websiteLabel}</span>
                        <input
                          {...register('website', {
                            validate: v =>
                              noWebsite || (v && v.trim().length > 0) || PB.websiteOrNoPublic,
                          })}
                          placeholder={PB.websitePlaceholder}
                          className="rounded-lg border px-3 py-2.5 outline-none"
                          style={BRIEF_CONTROL_STYLE}
                        />
                        {errors.website && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.website.message}</span>}
                      </label>
                    )}
                  </div>
                </fieldset>
              </MarketingTextReveal>

              <MarketingTextReveal delay={0.05}>
                <div className="glc-light-brief-section border-t pt-10" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                    {PB.sectionPainTitle}
                  </h3>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.concernLabel}</span>
                    <textarea
                      {...register('concern', { required: PB.concernRequired })}
                      rows={3}
                      className="resize-y rounded-lg border px-3 py-2.5 outline-none"
                      style={BRIEF_CONTROL_STYLE}
                    />
                    {errors.concern && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.concern.message}</span>}
                  </label>
                </div>
              </MarketingTextReveal>

              <MarketingTextReveal delay={0.1}>
                <div className="glc-light-brief-section border-t pt-10" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                    {PB.sectionOutcomeTitle}
                  </h3>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.improveLabel}</span>
                    <textarea
                      {...register('improve', { required: PB.improveRequired })}
                      rows={3}
                      className="resize-y rounded-lg border px-3 py-2.5 outline-none"
                      style={BRIEF_CONTROL_STYLE}
                    />
                    {errors.improve && <span style={{ color: 'var(--score-1)', fontSize: 12 }}>{errors.improve.message}</span>}
                  </label>
                </div>
              </MarketingTextReveal>

              {showDepthChoice && (
                <MarketingTextReveal delay={0.14}>
                  <div className="glc-light-brief-section border-t pt-10" style={{ borderColor: 'var(--border-subtle)' }}>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                      {PB.sectionDepthTitle}
                    </h3>
                    <fieldset className="flex flex-col gap-2 text-sm">
                      <legend className="sr-only">{PB.depthLegend}</legend>
                      <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {PB.depthLegend}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                        {PB.depthHint}
                      </p>
                      <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <input type="radio" value="starter" {...register('preferred_coverage_package')} style={{ accentColor: 'var(--glc-blue)' }} />
                        Starter (1 domain)
                      </label>
                      <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <input type="radio" value="pro" {...register('preferred_coverage_package')} style={{ accentColor: 'var(--glc-blue)' }} />
                        Pro (2-3 domains)
                      </label>
                      <label className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <input type="radio" value="complete" {...register('preferred_coverage_package')} style={{ accentColor: 'var(--glc-blue)' }} />
                        Complete (all domains)
                      </label>
                    </fieldset>
                  </div>
                </MarketingTextReveal>
              )}

              <MarketingTextReveal delay={0.18}>
                <div className="glc-light-brief-section border-t pt-10" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                    {PB.sectionContactTitle}
                  </h3>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{PB.preferredContactLabel}</span>
                    <select
                      {...register('contact_method')}
                      className="rounded-lg border px-3 py-2.5 outline-none"
                      style={BRIEF_CONTROL_STYLE}
                    >
                      {PB.contactOptions.map(o => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      {...register('unsure_choice')}
                      className="h-4 w-4 rounded-[4px] border"
                      style={{
                        borderColor: BRIEF_CONTROL_STYLE.borderColor,
                        accentColor: 'var(--glc-blue)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    />
                    {PB.unsureCheckbox}
                  </label>
                  {unsure && (
                    <p className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: 'var(--callout-info-bg)', color: 'var(--text-secondary)' }}>
                      {PB.unsureHelp}
                    </p>
                  )}
                </div>
              </MarketingTextReveal>

              {submitError && <p style={{ color: 'var(--score-1)', fontSize: 14 }}>{submitError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl py-3.5 text-sm font-semibold transition-[transform,box-shadow,background-color] duration-200 disabled:opacity-60"
                style={{
                  background: isSubmitting ? MARKETING_PRIMARY_CTA.disabledBackground : MARKETING_PRIMARY_CTA.background,
                  color: isSubmitting ? MARKETING_PRIMARY_CTA.disabledColor : MARKETING_PRIMARY_CTA.color,
                }}
                onMouseEnter={event => {
                  if (isSubmitting) return;
                  const element = event.currentTarget;
                  element.style.background = 'linear-gradient(135deg, var(--glc-blue-dark) 0%, var(--glc-blue-deeper) 100%)';
                  element.style.boxShadow = '0 10px 26px color-mix(in oklab, var(--glc-blue) 38%, transparent)';
                  element.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={event => {
                  const element = event.currentTarget;
                  element.style.background = isSubmitting ? MARKETING_PRIMARY_CTA.disabledBackground : MARKETING_PRIMARY_CTA.background;
                  element.style.boxShadow = 'none';
                  element.style.transform = 'translateY(0)';
                }}
              >
                {isSubmitting ? PB.submitSending : PB.submitButton}
              </button>
            </div>
          </form>
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
