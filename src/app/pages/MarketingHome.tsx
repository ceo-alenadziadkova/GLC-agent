import { Link } from 'react-router';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { DecisionPath } from '../marketing/blocks/DecisionPath';
import { HomeHeroCockpit } from '../marketing/blocks/HomeHeroCockpit';
import { MarketingComparisonShell } from '../marketing/blocks/MarketingComparisonShell';
import { MarketingMidCtaBand } from '../marketing/blocks/MarketingMidCtaBand';
import { MarketingRevealMask } from '../marketing/blocks/MarketingRevealMask';
import { usePublicBrand } from '../marketing/PublicBrandContext';
import marketingHomeCopy from '../data/marketing-home-copy.en.json';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { cn } from '../components/ui/utils';
import { marketingHeroBillboardMotion } from '../config/marketing-motion-variants';
import {
  MARKETING_CARD_MOTION,
  MARKETING_LIST_STAGGER,
  MARKETING_MOTION_EASE_PREMIUM,
} from '../config/marketing-motion';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]';

type HeadingVariant = 'bar' | 'rail' | 'minimal';
type HeadingSize = 'default' | 'display';

const DISPLAY_H2 =
  'font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]';
const DEFAULT_H2 = 'font-display text-2xl font-bold tracking-tight sm:text-3xl';

function SectionHeading({
  title,
  description,
  className,
  variant = 'bar',
  size = 'default',
}: {
  title: string;
  description?: string;
  className?: string;
  variant?: HeadingVariant;
  /** Larger, Revolut-style section titles on the home page. */
  size?: HeadingSize;
}) {
  const h2Class = size === 'display' ? DISPLAY_H2 : DEFAULT_H2;

  if (variant === 'minimal') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <h2 className={h2Class} style={{ color: 'var(--text-primary)', letterSpacing: size === 'display' ? undefined : 'var(--tracking-tight)' }}>
          {title}
        </h2>
        {description ? (
          <p
            className="mt-3 max-w-[65ch] text-base leading-relaxed sm:text-[1.02rem]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <div className="flex items-center gap-3">
          <span className="h-px w-10 shrink-0 sm:w-14" style={{ backgroundColor: 'var(--glc-blue)' }} aria-hidden />
          <h2 className={h2Class} style={{ color: 'var(--text-primary)', letterSpacing: size === 'display' ? undefined : 'var(--tracking-tight)' }}>
            {title}
          </h2>
        </div>
        {description ? (
          <p
            className="mt-4 max-w-[65ch] pl-0 text-base leading-relaxed sm:pl-[3.25rem] sm:text-[1.02rem]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('max-w-3xl', className)}>
      <div
        className="mb-4 h-1 w-12 rounded-full sm:w-14"
        style={{ background: 'var(--gradient-brand)' }}
        aria-hidden
      />
      <h2 className={h2Class} style={{ color: 'var(--text-primary)', letterSpacing: size === 'display' ? undefined : 'var(--tracking-tight)' }}>
        {title}
      </h2>
      {description ? (
        <p
          className="mt-3 max-w-[65ch] text-base leading-relaxed sm:text-[1.02rem]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

const trustLineVariants: Variants = {
  hidden: { opacity: 0, y: MARKETING_LIST_STAGGER.itemHiddenY },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * MARKETING_LIST_STAGGER.itemDelaySec,
      duration: MARKETING_LIST_STAGGER.itemDurationSec,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  }),
};

const outcomeCardVariants: Variants = {
  hidden: { opacity: 0, y: MARKETING_CARD_MOTION.hiddenY },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * MARKETING_CARD_MOTION.staggerSec,
      duration: MARKETING_CARD_MOTION.durationSec,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  }),
};

const homeHeroVisualFloat: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.2,
      duration: 0.8,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  },
};

export function MarketingHome() {
  return (
    <MarketingLayout>
      <MarketingHomeInner />
    </MarketingLayout>
  );
}

function MarketingHomeInner() {
  const reduce = useReducedMotion();
  const heroMv = marketingHeroBillboardMotion(reduce);
  const { brandName } = usePublicBrand();
  const pack = workspacePackaging.marketing_home;
  const lm = pack.landmarks;
  const hero = pack.hero;
  const outcomesSection = pack.outcomes_section;
  const trustStrip = pack.trust_strip;
  const headSuffix = hero.headline_gradient_suffix;
  const headlinePlainBefore =
    hero.headline.endsWith(headSuffix) && headSuffix.length > 0
      ? hero.headline.slice(0, hero.headline.length - headSuffix.length).trimEnd()
      : hero.headline;
  const outcomeItems = outcomesSection.items;
  const [outcomePrimary, ...outcomeRest] = outcomeItems;

  return (
    <div data-testid="marketing-home" className="flex flex-col gap-16 sm:gap-20 lg:gap-24">
      <MarketingSection
        className="glc-light-home-hero relative -mx-4 align-top overflow-hidden px-4 pb-12 pt-6 sm:-mx-6 sm:px-6 sm:pb-20 sm:pt-10"
        aria-label={lm.hero}
      >
        <motion.div
          className="relative grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)] lg:items-start lg:gap-10 xl:gap-14"
          variants={heroMv.container}
          initial={reduce ? false : 'hidden'}
          animate="visible"
        >
          <div className="min-w-0 max-w-4xl">
          <motion.p
            variants={heroMv.item}
            className="mb-6 inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] sm:text-xs"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--bg-surface) 94%, transparent)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {brandName} · {hero.eyebrow}
          </motion.p>
          <motion.h1
            variants={heroMv.item}
            className="glc-light-home-hero-title max-w-[22ch] font-display text-[clamp(2.5rem,6.2vw,4.125rem)] font-bold leading-[1.04] tracking-[-0.03em] sm:max-w-none sm:tracking-[-0.02em]"
            style={{ color: 'var(--text-primary)' }}
          >
            {hero.headline.endsWith(headSuffix) && headSuffix ? (
              <>
                {headlinePlainBefore}{' '}
                <span className="font-bold" style={{ color: 'var(--glc-blue-deeper)' }}>
                  {headSuffix}
                </span>
              </>
            ) : (
              hero.headline
            )}
          </motion.h1>
          <motion.p
            variants={heroMv.item}
            className="glc-light-home-hero-subhead mt-8 max-w-[65ch] text-base leading-[1.6] sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {hero.subheadline}
          </motion.p>
          {hero.supporting_line ? (
            <motion.p
              variants={heroMv.item}
              className="glc-light-home-hero-support mt-4 max-w-[60ch] text-sm leading-relaxed sm:text-[0.95rem]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {hero.supporting_line}
            </motion.p>
          ) : null}

          <motion.div
            variants={heroMv.item}
            className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <motion.div
              whileHover={reduce ? undefined : { y: -1, opacity: 0.92 }}
              transition={{ duration: 0.22, ease: MARKETING_MOTION_EASE_PREMIUM }}
            >
              <Link
                to="/brief"
                data-testid="hero-cta-brief"
                className={cn(
                  'group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-[opacity,transform] duration-200 sm:w-auto',
                  FOCUS_RING,
                )}
                style={{
                  background: 'var(--gradient-brand)',
                  color: 'var(--primary-foreground)',
                  boxShadow: 'none',
                  textDecoration: 'none',
                }}
              >
                {hero.ctas.primary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={reduce ? undefined : { x: 2 }}
              transition={{ duration: 0.22, ease: MARKETING_MOTION_EASE_PREMIUM }}
            >
              <Link
                to="/#how-it-works"
                data-testid="hero-cta-how-it-works"
                className={cn(
                  'group inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold underline-offset-4 transition-colors hover:underline sm:w-auto sm:justify-start',
                  FOCUS_RING,
                )}
                style={{
                  color: 'var(--glc-blue)',
                  textDecoration: 'none',
                }}
              >
                {hero.ctas.secondary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </motion.div>
          </motion.div>
          {hero.snapshot_caption ? (
            <motion.p
              variants={heroMv.item}
              className="mt-5 max-w-[65ch] text-xs leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {hero.snapshot_caption}
            </motion.p>
          ) : null}
          <motion.div
            variants={heroMv.item}
            className="mt-10 flex flex-wrap gap-2 sm:mt-12 sm:gap-3"
            role="list"
            aria-label={marketingHomeCopy.trustPointsAriaLabel}
          >
            {hero.trust_bullets.map((line, index) => (
              <motion.span
                key={line}
                role="listitem"
                className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-medium leading-snug sm:text-sm"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'color-mix(in oklab, var(--bg-surface) 88%, transparent)',
                  color: 'var(--text-secondary)',
                }}
                variants={trustLineVariants}
                custom={index}
              >
                <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green-dark)' }} weight="fill" aria-hidden />
                {line}
              </motion.span>
            ))}
          </motion.div>
          </div>
          <motion.div
            variants={reduce ? heroMv.item : homeHeroVisualFloat}
            className="glc-light-home-cockpit"
            initial={reduce ? false : 'hidden'}
            animate="visible"
          >
            <HomeHeroCockpit className="lg:pt-4" />
          </motion.div>
        </motion.div>
      </MarketingSection>

      <MarketingSection delay={0.04} aria-label={marketingHomeCopy.trustMetricsLandmark}>
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-7 sm:py-9">
          <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-10 sm:text-left">
            {marketingHomeCopy.whoWeAreMetrics.map(item => (
              <div key={item.label} className="max-w-md sm:max-w-none">
                <p
                  className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-[1.65rem]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm leading-relaxed sm:mt-10 sm:text-[0.95rem]" style={{ color: 'var(--text-secondary)' }}>
            {marketingHomeCopy.trustMetricsTagline}
          </p>
        </div>
      </MarketingSection>

      {/* Who we are + What we do are intentionally hidden on Home to keep a tighter product-led flow. */}

      <MarketingSection
        id="how-it-works"
        className="scroll-mt-28"
        delay={0.1}
        aria-label={lm.how_it_works}
      >
        <SectionHeading
          size="display"
          title={marketingHomeCopy.chooseEntryTitle}
          description={marketingHomeCopy.chooseEntryDescription}
        />
        <MarketingRevealMask className="mt-12 will-change-transform">
          <MarketingComparisonShell padded>
            <DecisionPath flush variant="cards" />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      {/* Coverage tiers kept in code, hidden on Home for now. */}
      {/* 
      <MarketingSection className="mt-24 sm:mt-28" delay={0.14} aria-label={lm.coverage}>
        <SectionHeading
          variant="rail"
          size="display"
          title={marketingHomeCopy.coveragePackagesTitle}
          description={marketingHomeCopy.coveragePackagesDescription}
        />
        <MarketingRevealMask className="mt-12 will-change-transform">
          <MarketingComparisonShell>
            <AuditCompare compact />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>
      */}

      <MarketingSection className="mt-24 sm:mt-28" delay={0.15} aria-label={lm.outcomes}>
        <SectionHeading
          variant="minimal"
          size="display"
          title={outcomesSection.title}
          description={outcomesSection.description}
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <motion.article
            className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7 will-change-transform"
            style={{
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              boxShadow: 'none',
            }}
            variants={outcomeCardVariants}
            custom={0}
            initial={reduce ? false : 'hidden'}
            whileInView={reduce ? undefined : 'visible'}
            viewport={{ once: true, margin: '-8% 0px' }}
            whileHover={
              reduce
                ? undefined
                : {
                    y: -MARKETING_CARD_MOTION.hoverLift,
                    transition: {
                      duration: MARKETING_CARD_MOTION.hoverDurationSec,
                      ease: MARKETING_MOTION_EASE_PREMIUM,
                    },
                  }
            }
          >
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {outcomePrimary.title}
              </h3>
              <p className="mt-4 max-w-[60ch] text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {outcomePrimary.body}
              </p>
            </div>
          </motion.article>
          <div className="flex flex-col gap-6 lg:col-span-5">
            {outcomeRest.map((item, cardIdx) => (
              <motion.article
                key={item.title}
                className="flex-1 p-5 sm:p-6 will-change-transform"
                style={{
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  boxShadow: 'none',
                }}
                variants={outcomeCardVariants}
                custom={cardIdx + 1}
                initial={reduce ? false : 'hidden'}
                whileInView={reduce ? undefined : 'visible'}
                viewport={{ once: true, margin: '-8% 0px' }}
                whileHover={
                  reduce
                    ? undefined
                    : {
                        y: -MARKETING_CARD_MOTION.hoverLift,
                        transition: {
                          duration: MARKETING_CARD_MOTION.hoverDurationSec,
                          ease: MARKETING_MOTION_EASE_PREMIUM,
                        },
                      }
                }
              >
                <h3 className="font-display text-base font-bold tracking-tight sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection delay={0.155} aria-label={lm.trust}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
          {trustStrip.title}
        </p>
        <ul className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-12">
          {trustStrip.lines.map((line, i) => (
            <motion.li
              key={line}
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
              variants={trustLineVariants}
              custom={i}
              initial={reduce ? false : 'hidden'}
              whileInView={reduce ? undefined : 'visible'}
              viewport={{ once: true, margin: '-5% 0px' }}
            >
              {line}
            </motion.li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection className="mt-24 sm:mt-28" delay={0.16} aria-label={lm.faq}>
        <SectionHeading
          variant="minimal"
          size="display"
          title={marketingHomeCopy.questionsTitle}
          description={marketingHomeCopy.questionsDescription}
        />
        <MarketingRevealMask className="mt-10 max-w-3xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 will-change-transform sm:px-6 sm:py-3">
          <Accordion type="single" collapsible className="w-full">
            {marketingHomeCopy.faqPreview.map((item, i) => (
              <AccordionItem key={item.q} value={`p-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </MarketingRevealMask>
        <Link
          to="/faq"
          className={cn(
            'group mt-6 inline-flex items-center gap-1 text-sm font-semibold transition-[color,transform] duration-300 ease-out',
            FOCUS_RING,
            'rounded-md',
          )}
          style={{ color: 'var(--glc-blue)' }}
        >
          All questions and answers
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </MarketingSection>

      <MarketingSection delay={0.18}>
        <MarketingMidCtaBand
          landmarkLabel={lm.mid_cta}
          title={pack.mid_page_cta.title}
          body={pack.mid_page_cta.body}
          ctaLabel={pack.mid_page_cta.cta_label}
          ctaTo={pack.mid_page_cta.cta_to}
        />
      </MarketingSection>
    </div>
  );
}
