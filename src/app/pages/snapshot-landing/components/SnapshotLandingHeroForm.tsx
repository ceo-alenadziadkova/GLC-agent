import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, Globe, Lightning } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { Callout } from '../../../components/ui/callout';
import { Input } from '../../../../design-system/ui';
import { SNAPSHOT_LANDING_HERO_COPY } from '../../../config/snapshot-landing-copy.en';
import { marketingHeroBillboardMotion } from '../../../config/marketing-motion-variants';
import { SnapshotIdlePreviewCards } from '..';
import type { SnapshotLandingStage } from '../../snapshot-landing/hooks/useSnapshotLandingController';

const Copy = SNAPSHOT_LANDING_HERO_COPY;

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
                className="ds-bg-gradient-badge-blue-orange inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border-default)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[var(--tracking-snapshot-badge)] text-[var(--glc-blue)] mobile:py-1.5 mobile:pl-3 mobile:pr-3.5 mobile:text-xs mobile:leading-tight"
              >
                <Lightning className="h-3.5 w-3.5 shrink-0" weight="fill" /> {SNAPSHOT_LANDING_HERO_COPY.quickRuleBasedScanBadge}
              </div>
            </motion.div>

            <motion.h1
              id="snapshot-hero-heading"
              variants={heroMotion.item}
              className="mx-auto w-full max-w-[min(100%,var(--snapshot-hero-title-max-width))] text-balance text-[length:var(--snapshot-hero-title-size)] [font-family:var(--font-display)] font-bold leading-[1.04] text-[var(--text-primary)] tracking-[var(--tracking-snapshot-hero)] lg:mx-0 lg:max-w-xl lg:tracking-[var(--tracking-snapshot-hero-lg)]"
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
              className="mx-auto max-w-md text-pretty text-[length:var(--snapshot-hero-subtitle-size)] leading-snug lg:mx-0 mobile:max-w-none mobile:text-[length:var(--text-sm)] mobile:leading-relaxed"
              variants={heroMotion.item}
            >
              {Copy.subtitle}
            </motion.p>

            <motion.div
              className="mx-auto flex w-full max-w-md items-center justify-center gap-2 py-1 text-sm font-medium text-[var(--text-tertiary)] lg:mx-0 lg:w-auto lg:max-w-none lg:justify-start"
              variants={heroMotion.item}
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-[var(--glc-green)]" weight="fill" />
              {hasFullAccount ? WORKSPACE_PAGE_COPY.snapshotLanding.trustSignedIn : WORKSPACE_PAGE_COPY.snapshotLanding.trustAnonymous}
            </motion.div>
          </motion.div>
        </div>

        <div className="order-2 w-full lg:order-none lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:self-start lg:pt-1">
          <div className="glc-light-snapshot-shell ds-snapshot-command-shell-hairline rounded-[var(--radius-2xl)] p-px shadow-[var(--shadow-sm)]">
            <div className="glc-light-snapshot-shell-inner rounded-[var(--radius-2xl-inner)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:p-7 mobile:p-5 mobile:shadow-[var(--shadow-snapshot-shell-inner-mobile)]">
              <p
                className="mb-4 hidden text-left text-xs font-semibold tracking-wide text-[var(--text-primary)] lg:hidden"
              >
                {SNAPSHOT_LANDING_HERO_COPY.websiteFieldLabel}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)] mobile:left-3" />
                  <Input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder={SNAPSHOT_LANDING_HERO_COPY.websiteInputPlaceholder}
                    required
                    disabled={stage === 'submitting'}
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="glc-field-control glc-light-snapshot-input h-auto w-full min-h-10 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] mobile:min-h-12 mobile:py-3.5 mobile:text-base"
                  />
                </div>

                <motion.button
                  type="submit"
                  layout={false}
                  disabled={!url.trim() || stage === 'submitting'}
                  whileHover={url.trim() ? { scale: 1.015 } : {}}
                  whileTap={url.trim() ? { scale: 0.985 } : {}}
                  data-snapshot-cta-filled={url.trim() ? 'true' : 'false'}
                  className="glc-light-snapshot-cta flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] py-3 text-sm font-semibold text-white mobile:min-h-12"
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
                    <p className="text-xs text-[var(--text-secondary)]">
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
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mobile:text-[length:var(--text-2xs)] mobile:tracking-widest">
                  {SNAPSHOT_LANDING_HERO_COPY.quotaTitle}
                </span>
                <span className="text-base font-bold tabular-nums text-[var(--text-primary)] mobile:text-[length:var(--text-base)]">
                  {quotaPreview.remaining} / {quotaPreview.limit} left
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]" aria-hidden>
                <div
                  className="ds-snapshot-quota-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((quotaPreview.remaining / Math.max(1, quotaPreview.limit)) * 100))}%`,
                  }}
                />
              </div>

              <p className="mt-2.5 text-center text-xs leading-snug text-[var(--text-tertiary)] lg:text-left mobile:mt-3 mobile:text-xs">
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

