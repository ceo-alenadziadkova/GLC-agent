import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, Globe, Lightning } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { Callout } from '../../../components/ui/callout';
import { SNAPSHOT_COMMAND_SHELL_OUTLINE } from '../../../config/snapshot-marketing-ui';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../config/snapshot-landing-copy.en';
import { marketingHeroBillboardMotion } from '../../../config/marketing-motion-variants';
import { SnapshotIdlePreviewCards } from '..';
import { SNAPSHOT_LANDING_HERO_COPY as Copy } from '../../../config/snapshot-landing-copy.en';
import type { SnapshotLandingStage } from '../../snapshot-landing/hooks/useSnapshotLandingController';

type HeroMotion = ReturnType<typeof marketingHeroBillboardMotion>;

type RateLimitDetail = { limit: number; remaining: number };
type QuotaPreview = { remaining: number; limit: number };

export function SnapshotLandingHeroForm(props: {
  stage: SnapshotLandingStage;
  reduceMotion: boolean;
  heroMotion: HeroMotion;
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  handleSubmit: (e: FormEvent) => Promise<void>;
  hasFullAccount: boolean;
  errorMsg: string;
  rateLimitDetail: RateLimitDetail | null;
  quotaPreview: QuotaPreview | null;
}) {
  const {
    stage,
    reduceMotion,
    heroMotion,
    url,
    setUrl,
    handleSubmit,
    hasFullAccount,
    errorMsg,
    rateLimitDetail,
    quotaPreview,
  } = props;

  return (
    <motion.div
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
          <motion.section
            aria-labelledby="snapshot-hero-heading"
            className="relative flex flex-col items-stretch gap-4 overflow-hidden  px-4 py-4 lg:gap-4 lg:border-l-2 lg:border-[color-mix(in_oklab,var(--glc-blue)_45%,var(--border-subtle))] lg:px-0 lg:py-0 lg:pl-6 mobile:gap-3"
            variants={heroMotion.container}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
          >
            <motion.div className="flex justify-center lg:justify-start" variants={heroMotion.item}>
              <div
                className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide mobile:py-1.5 mobile:pl-3 mobile:pr-3.5 mobile:text-[11px] mobile:leading-tight"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,189,255,0.12) 0%, rgba(242,79,29,0.08) 100%)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--glc-blue)',
                  letterSpacing: '0.06em',
                }}
              >
                <Lightning className="h-3.5 w-3.5 shrink-0" weight="fill" /> {SNAPSHOT_LANDING_HERO_COPY.quickRuleBasedScanBadge}
              </div>
            </motion.div>

            <motion.h1
              id="snapshot-hero-heading"
              variants={heroMotion.item}
              className="mx-auto w-full max-w-[min(100%,22rem)] text-balance tracking-[-0.025em] lg:mx-0 lg:max-w-xl lg:tracking-[-0.035em]"
              style={{
                fontSize: 'clamp(2.05rem, 9.25vw, 4rem)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.04,
              }}
            >
              <span className="block lg:max-w-[15ch]">{Copy.titleLead}</span>
              <span className="glc-gradient-text-flow mt-2 block lg:mt-2.5 mobile:mt-2 lg:max-w-[14ch]">
                {Copy.titleAccent}
              </span>
            </motion.h1>
          </motion.section>

          {/* Mobile: subcopy + trust in one calm band; desktop: unwrapped flow */}
          <motion.div
            className="flex flex-col gap-3 text-center lg:contents lg:text-left"
            variants={heroMotion.container}
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
          >
            <motion.p
              className="mx-auto max-w-md text-pretty leading-snug lg:mx-0 mobile:max-w-none mobile:text-[0.8125rem] mobile:leading-relaxed"
              style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8125rem, 2.85vw, 0.975rem)' }}
              variants={heroMotion.item}
            >
              {Copy.subtitle}
            </motion.p>

            <motion.div
              className="mx-auto flex w-full max-w-md items-center justify-center gap-2 py-1 text-sm font-medium lg:mx-0 lg:w-auto lg:max-w-none lg:justify-start"
              style={{ color: 'var(--text-tertiary)' }}
              variants={heroMotion.item}
            >
              <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green)' }} weight="fill" />
              {hasFullAccount ? WORKSPACE_PAGE_COPY.snapshotLanding.trustSignedIn : WORKSPACE_PAGE_COPY.snapshotLanding.trustAnonymous}
            </motion.div>
          </motion.div>
        </div>

        <div className="order-2 w-full lg:order-none lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:self-start lg:pt-1">
          <div
            className="glc-light-snapshot-shell rounded-[var(--radius-2xl)] p-px shadow-[var(--shadow-sm)]"
            style={{ background: SNAPSHOT_COMMAND_SHELL_OUTLINE }}
          >
            <div
              className="glc-light-snapshot-shell-inner p-6 lg:p-7 mobile:p-5 mobile:shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
              style={{
                borderRadius: 'calc(var(--radius-2xl) - 1px)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p
                className="mb-4 hidden text-left text-xs font-semibold tracking-wide lg:hidden"
                style={{ color: 'var(--text-primary)' }}
              >
                {SNAPSHOT_LANDING_HERO_COPY.websiteFieldLabel}
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
                    placeholder={SNAPSHOT_LANDING_HERO_COPY.websiteInputPlaceholder}
                    required
                    disabled={stage === 'submitting'}
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="glc-field-control glc-light-snapshot-input w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-transparent py-3 pl-10 pr-4 text-sm outline-none transition-[border-color,box-shadow] mobile:min-h-12 mobile:py-3.5 mobile:text-base"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  layout={false}
                  disabled={!url.trim() || stage === 'submitting'}
                  whileHover={url.trim() ? { scale: 1.015 } : {}}
                  whileTap={url.trim() ? { scale: 0.985 } : {}}
                  className="glc-light-snapshot-cta flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] py-3 text-sm font-semibold text-white mobile:min-h-12"
                  style={{
                    background:
                      url.trim()
                        ? 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-deeper) 100%)'
                        : 'linear-gradient(135deg, color-mix(in oklab, var(--glc-blue) 72%, var(--bg-muted)) 0%, color-mix(in oklab, var(--glc-blue-deeper) 66%, var(--bg-muted)) 100%)',
                    border: 'none',
                    cursor: url.trim() && stage !== 'submitting' ? 'pointer' : 'not-allowed',
                    boxShadow:
                      url.trim()
                        ? '0 8px 22px color-mix(in oklab, var(--glc-blue) 36%, transparent)'
                        : '0 3px 10px color-mix(in oklab, var(--glc-blue) 18%, transparent)',
                  }}
                >
                  {stage === 'submitting' ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      {SNAPSHOT_LANDING_HERO_COPY.ctaStart}
                    </>
                  ) : (
                    <>
                      {SNAPSHOT_LANDING_HERO_COPY.ctaIdle} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>

              {stage === 'error' && errorMsg && (
                <div className="mt-3 space-y-1 text-center mobile:text-left">
                  <Callout intent="danger">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-[var(--score-1)]"
                    >
                      {errorMsg}
                    </motion.p>
                  </Callout>
                  {rateLimitDetail && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {SNAPSHOT_LANDING_HERO_COPY.rateLimitUsagePrefix} {rateLimitDetail.remaining} of {rateLimitDetail.limit}.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {quotaPreview !== null && (
          <div className="order-3 w-full max-w-md lg:order-none lg:col-span-7 lg:row-start-2 lg:max-w-none">
            <div
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:mx-0 mobile:mx-0 mobile:max-w-full mobile:rounded-none mobile:border-0 mobile:border-t mobile:border-[var(--border-subtle)] mobile:bg-transparent mobile:px-0 mobile:pb-0 mobile:pt-6 mobile:shadow-none"
            >
              <div className="mb-2.5 flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider mobile:text-[10px] mobile:tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  {SNAPSHOT_LANDING_HERO_COPY.quotaTitle}
                </span>
                <span className="text-base font-bold tabular-nums mobile:text-[0.9375rem]" style={{ color: 'var(--text-primary)' }}>
                  {quotaPreview.remaining} / {quotaPreview.limit} left
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }} aria-hidden>
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, Math.round((quotaPreview.remaining / Math.max(1, quotaPreview.limit)) * 100))}%`,
                    background: 'linear-gradient(90deg, var(--glc-blue), var(--glc-green))',
                  }}
                />
              </div>

              <p className="mt-2.5 text-center text-xs leading-snug lg:text-left mobile:mt-3 mobile:text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {SNAPSHOT_LANDING_HERO_COPY.quotaFootnote}
              </p>
            </div>
          </div>
        )}

        <SnapshotIdlePreviewCards />
      </div>
    </motion.div>
  );
}

