import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { HomeHeroCockpit } from '../../blocks/HomeHeroCockpit';
import { cn } from '../../../components/ui/utils';
import { MARKETING_MOTION_EASE_PREMIUM } from '../../../config/marketing-motion';
import { marketingHeroBillboardMotion } from '../../../config/marketing-motion-variants';
import { HOME_CHIP_STYLE, HOME_FOCUS_RING } from '../config/home-ui.config';
import { homeHeroVisualFloatVariants, homeTrustLineVariants } from '../motion/home-motion';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeHeroSectionProps = {
  reduceMotion: boolean;
  data: MarketingHomeViewModel;
};

export function HomeHeroSection({ reduceMotion, data }: HomeHeroSectionProps) {
  const heroMv = marketingHeroBillboardMotion(reduceMotion);
  const { hero, brandName } = data;

  return (
    <motion.div
      className="relative grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)] lg:items-start lg:gap-10 xl:gap-14"
      variants={heroMv.container}
      initial={reduceMotion ? false : 'hidden'}
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
            {hero.headline.hasGradientSuffix ? (
              <>
                {hero.headline.plainBefore}{' '}
                <span className="font-bold" style={{ color: 'var(--glc-blue-deeper)' }}>
                  {hero.headline.gradientSuffix}
                </span>
              </>
            ) : (
              hero.headline.full
            )}
          </motion.h1>
          <motion.p
            variants={heroMv.item}
            className="glc-light-home-hero-subhead mt-8 max-w-[65ch] text-base leading-[1.6] sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {hero.subheadline}
          </motion.p>
          {hero.supportingLine ? (
            <motion.p
              variants={heroMv.item}
              className="glc-light-home-hero-support mt-4 max-w-[60ch] text-sm leading-relaxed sm:text-[0.95rem]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {hero.supportingLine}
            </motion.p>
          ) : null}
          <motion.div variants={heroMv.item} className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -1, opacity: 0.92 }}
              transition={{ duration: 0.22, ease: MARKETING_MOTION_EASE_PREMIUM }}
            >
              <Link
                to="/brief"
                data-testid="hero-cta-brief"
                className={cn(
                  'group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-[opacity,transform] duration-200 sm:w-auto',
                  HOME_FOCUS_RING,
                )}
                style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)', boxShadow: 'none', textDecoration: 'none' }}
              >
                {hero.ctas.primary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={reduceMotion ? undefined : { x: 2 }}
              transition={{ duration: 0.22, ease: MARKETING_MOTION_EASE_PREMIUM }}
            >
              <Link
                to="/#how-it-works"
                data-testid="hero-cta-how-it-works"
                className={cn(
                  'group inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold underline-offset-4 transition-colors hover:underline sm:w-auto sm:justify-start',
                  HOME_FOCUS_RING,
                )}
                style={{ color: 'var(--glc-blue)', textDecoration: 'none' }}
              >
                {hero.ctas.secondary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </motion.div>
          </motion.div>
          {hero.snapshotCaption ? (
            <motion.p variants={heroMv.item} className="mt-5 max-w-[65ch] text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {hero.snapshotCaption}
            </motion.p>
          ) : null}
          <motion.div
            variants={heroMv.item}
            className="mt-10 flex flex-wrap gap-2 sm:mt-12 sm:gap-3"
            role="list"
            aria-label={hero.trustPointsAriaLabel}
          >
            {hero.trustBullets.map((line, index) => (
              <motion.span
                key={line}
                role="listitem"
                className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-medium leading-snug sm:text-sm"
                style={HOME_CHIP_STYLE}
                variants={homeTrustLineVariants}
                custom={index}
              >
                <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--glc-green-dark)' }} weight="fill" aria-hidden />
                {line}
              </motion.span>
            ))}
          </motion.div>
        </div>
        <motion.div
          variants={reduceMotion ? heroMv.item : homeHeroVisualFloatVariants}
          className="glc-light-home-cockpit"
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <HomeHeroCockpit className="lg:pt-4" />
        </motion.div>
    </motion.div>
  );
}
