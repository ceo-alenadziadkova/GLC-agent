import type { ComponentType } from 'react';
import { motion } from 'motion/react';
import { ChartLineUp, Compass, Rocket, Sparkle } from '@phosphor-icons/react';
import {
  MARKETING_CARD_MOTION,
  MARKETING_IN_VIEW_MARGIN,
  MARKETING_MOTION_EASE_PREMIUM,
} from '../../../config/marketing-motion';
import { HOME_SURFACE_CARD_STYLE } from '../config/home-ui.config';
import { homeOutcomeCardVariants } from '../motion/home-motion';
import { SectionHeading } from '../components/SectionHeading';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeOutcomesSectionProps = {
  data: MarketingHomeViewModel['outcomes'];
  reduceMotion: boolean;
};

type IconComponent = ComponentType<{ size?: number; weight?: 'bold' | 'regular'; 'aria-hidden'?: boolean }>;

const SECONDARY_ICONS: readonly IconComponent[] = [ChartLineUp, Rocket, Sparkle];

export function HomeOutcomesSection({ data, reduceMotion }: HomeOutcomesSectionProps) {
  const hoverLift = reduceMotion
    ? undefined
    : {
        y: -MARKETING_CARD_MOTION.hoverLift,
        transition: {
          duration: MARKETING_CARD_MOTION.hoverDurationSec,
          ease: MARKETING_MOTION_EASE_PREMIUM,
        },
      };

  return (
    <div className="-mx-4 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-12 sm:-mx-6 sm:px-6 sm:py-16">
      <SectionHeading variant="minimal" size="display" title={data.title} description={data.description} />
      <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <motion.article
          className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7 will-change-transform"
          style={HOME_SURFACE_CARD_STYLE}
          variants={homeOutcomeCardVariants}
          custom={0}
          initial={reduceMotion ? false : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={{ once: true, margin: MARKETING_IN_VIEW_MARGIN.card }}
          whileHover={hoverLift}
        >
          <div>
            <span
              className="ds-marketing-card-icon-well ds-marketing-card-icon-well--accent"
              aria-hidden
            >
              <Compass size={22} weight="bold" aria-hidden />
            </span>
            <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              {data.primary.title}
            </h3>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {data.primary.body}
            </p>
          </div>
        </motion.article>
        <div className="flex flex-col gap-6 lg:col-span-5">
          {data.secondary.map((item, cardIdx) => {
            const Icon = SECONDARY_ICONS[cardIdx] ?? Sparkle;
            return (
              <motion.article
                key={item.title}
                className="flex-1 p-5 sm:p-6 will-change-transform"
                style={HOME_SURFACE_CARD_STYLE}
                variants={homeOutcomeCardVariants}
                custom={cardIdx + 1}
                initial={reduceMotion ? false : 'hidden'}
                whileInView={reduceMotion ? undefined : 'visible'}
                viewport={{ once: true, margin: MARKETING_IN_VIEW_MARGIN.card }}
                whileHover={hoverLift}
              >
                <span className="ds-marketing-card-icon-well ds-marketing-card-icon-well--small" aria-hidden>
                  <Icon size={18} weight="bold" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.body}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
