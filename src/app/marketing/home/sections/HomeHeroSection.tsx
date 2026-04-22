import { Link } from 'react-router';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { HomeHeroCockpit } from '../../blocks/HomeHeroCockpit';
import { cn } from '../../../components/ui/utils';
import { MARKETING_HOME_HERO_COCKPIT_PARALLAX, MARKETING_SPRING_INTERACTIVE } from '../../../config/marketing-motion';
import { marketingHeroBillboardMotion } from '../../../config/marketing-motion-variants';
import { HOME_FOCUS_RING, HOME_HERO_TRUST_BULLETS_VISIBLE_MAX } from '../config/home-ui.config';
import { homeHeroVisualFloatVariants, homeTrustLineVariants } from '../motion/home-motion';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeHeroSectionProps = {
  reduceMotion: boolean;
  data: MarketingHomeViewModel;
};

export function HomeHeroSection({ reduceMotion, data }: HomeHeroSectionProps) {
  const heroMv = marketingHeroBillboardMotion(reduceMotion);
  const { hero, brandName } = data;
  const heroTrustBullets = hero.trustBullets.slice(0, HOME_HERO_TRUST_BULLETS_VISIBLE_MAX);

  const { scrollY } = useScroll();
  const par = MARKETING_HOME_HERO_COCKPIT_PARALLAX;
  const cockpitParallaxY = useTransform(scrollY, [...par.scrollInputRange], [...par.yPx]);
  const cockpitRotateX = useTransform(scrollY, [...par.scrollInputRange], [...par.rotateXDeg]);
  const cockpitScale = useTransform(scrollY, [...par.scrollInputRange], [...par.scale]);

  return (
    <motion.div
      className="ds-marketing-hero-billboard relative"
      variants={heroMv.container}
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
    >
      <div className="flex min-w-0 w-full flex-col items-center z-20">
        <motion.div
          variants={heroMv.item}
          className="ds-marketing-eyebrow-chip mb-8 sm:text-xs"
        >
          <div className="ds-marketing-eyebrow-shimmer" />
          <span className="relative z-10 flex items-center gap-2">
            <span className="text-[var(--text-tertiary)]">{brandName}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--glc-blue)]" />
            {hero.eyebrow}
          </span>
        </motion.div>
        <motion.h1 variants={heroMv.item} className="mt-2 text-[var(--text-primary)]">
          {hero.headline.hasGradientSuffix ? (
            <span className="ds-marketing-hero-display-title">
              {hero.headline.plainBefore}{' '}
              <span className="bg-gradient-to-r from-[var(--glc-blue)] to-[var(--glc-orange)] bg-clip-text text-transparent drop-shadow-sm">
                {hero.headline.gradientSuffix}
              </span>
            </span>
          ) : (
            <span className="ds-marketing-hero-display-title">{hero.headline.full}</span>
          )}
        </motion.h1>
        <motion.p
          variants={heroMv.item}
          className="ds-marketing-text-muted mt-8 max-w-[60ch] text-lg font-medium leading-relaxed sm:text-xl"
        >
          {hero.subheadline}
        </motion.p>
        {hero.supportingLine ? (
          <motion.p
            variants={heroMv.item}
            className="glc-light-home-hero-support ds-home-hero-supporting-line"
          >
            {hero.supportingLine}
          </motion.p>
        ) : null}
        <motion.div variants={heroMv.item} className="mt-10 flex w-full max-w-sm flex-col items-center gap-4 sm:max-w-none sm:flex-row sm:justify-center sm:gap-6">
          <motion.div
            className="w-full sm:w-auto"
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ ...MARKETING_SPRING_INTERACTIVE }}
          >
            <Link
              to="/brief"
              data-testid="hero-cta-brief"
              className={cn('group ds-marketing-cta-glass w-full sm:w-auto', HOME_FOCUS_RING)}
            >
              <div className="ds-marketing-cta-glow-sweep" />
              <span className="relative z-10 flex items-center gap-2">
                {hero.ctas.primary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
              </span>
            </Link>
          </motion.div>
          <motion.div
            className="w-full sm:w-auto"
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            transition={{ ...MARKETING_SPRING_INTERACTIVE }}
          >
            <Link
              to="/#how-it-works"
              data-testid="hero-cta-how-it-works"
              className={cn(
                'group inline-flex w-full sm:w-auto min-h-11 items-center justify-center gap-2 rounded-full border border-transparent px-6 py-3 text-sm font-medium transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]',
                'ds-marketing-text-muted',
                HOME_FOCUS_RING,
              )}
            >
              {hero.ctas.secondary}
              <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          </motion.div>
        </motion.div>
        {hero.snapshotCaption ? (
          <motion.p variants={heroMv.item} className="mt-5 max-w-[65ch] text-xs leading-relaxed text-[var(--text-tertiary)]">
            {hero.snapshotCaption}
          </motion.p>
        ) : null}
        <motion.div
          variants={heroMv.item}
          className="mt-8 flex flex-wrap justify-center gap-4 sm:mt-12"
          role="list"
          aria-label={hero.trustPointsAriaLabel}
        >
          {heroTrustBullets.map((line, index) => (
            <motion.span
              key={line}
              role="listitem"
              className="ds-marketing-text-muted inline-flex items-center gap-2 text-sm font-medium"
              variants={homeTrustLineVariants}
              custom={index}
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-[var(--glc-blue)]" weight="fill" aria-hidden />
              {line}
            </motion.span>
          ))}
        </motion.div>
      </div>
      <div className="ds-marketing-hero-cockpit-perspective relative z-10 mt-16 w-full lg:mt-24">
        <motion.div
          variants={reduceMotion ? heroMv.item : homeHeroVisualFloatVariants}
          className={cn(
            'glc-light-home-cockpit origin-bottom relative border border-white/10 bg-[var(--glc-ink)]/20 backdrop-blur-3xl',
            'ds-marketing-hero-cockpit-surface',
          )}
          style={{
            y: reduceMotion ? 0 : cockpitParallaxY,
            rotateX: reduceMotion ? 0 : cockpitRotateX,
            scale: reduceMotion ? 1 : cockpitScale,
          }}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <HomeHeroCockpit className="lg:pt-4" />
          <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-2xl)] ring-1 ring-white/10" />
        </motion.div>
      </div>
    </motion.div>
  );
}
