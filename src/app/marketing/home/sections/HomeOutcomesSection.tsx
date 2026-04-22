import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../components/ui/utils';
import {
  MARKETING_CARD_MOTION,
  MARKETING_IN_VIEW_MARGIN,
  MARKETING_MOTION_EASE_PREMIUM,
  MARKETING_SPRING_PREMIUM,
} from '../../../config/marketing-motion';
import { homeOutcomeCardVariants } from '../motion/home-motion';
import { SectionHeading } from '../components/SectionHeading';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeOutcomesSectionProps = {
  data: MarketingHomeViewModel['outcomes'];
  reduceMotion: boolean;
};

export function HomeOutcomesSection({ data, reduceMotion }: HomeOutcomesSectionProps) {
  const [activeRoleId, setActiveRoleId] = useState(data.roleLenses[0]?.id ?? 'founder');
  const activeLens = useMemo(
    () => data.roleLenses.find((lens) => lens.id === activeRoleId) ?? data.roleLenses[0],
    [activeRoleId, data.roleLenses],
  );

  const specimenBody = activeLens?.specimenBody ?? data.specimenBody;
  const primaryBody = activeLens?.primaryBody ?? data.primary.body;
  const secondaryBodies = activeLens?.secondaryBodies;
  const roleMotionProps = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: undefined }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <>
      <SectionHeading variant="minimal" size="display" title={data.title} description={data.description} />
      {data.roleLenses.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6" role="group" aria-label={data.roleExplorerLabel}>
          {data.roleLenses.map((lens) => {
            const isActive = lens.id === activeRoleId;
            return (
              <button
                key={lens.id}
                type="button"
                className={cn(
                  'px-3.5 py-1.5 text-xs font-medium transition-all duration-300 sm:text-sm',
                  'ds-marketing-outcome-pill',
                  isActive && 'ds-marketing-outcome-pill--active',
                )}
                aria-pressed={isActive}
                onClick={() => setActiveRoleId(lens.id)}
              >
                {lens.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        {activeLens?.summary ? (
          <motion.p
            key={`summary-${activeLens.id}`}
            className="mt-3 max-w-[66ch] text-sm leading-relaxed text-[var(--text-secondary)]"
            {...roleMotionProps}
            transition={{ duration: 0.16, ease: MARKETING_MOTION_EASE_PREMIUM }}
          >
            {activeLens.summary}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <div className="ds-marketing-outcome-specimen relative mt-12 grid gap-4 p-6 sm:mt-16 sm:gap-6 sm:p-10">
        <div className="ds-marketing-outcome-specimen-glow" aria-hidden />
        <p className="relative z-10 text-xs font-bold uppercase tracking-[var(--marketing-kicker-track)] text-[var(--glc-blue)]">
          {data.specimenEyebrow}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={`specimen-${activeLens?.id ?? 'default'}`}
            className="relative z-10 max-w-[50ch] text-lg font-medium leading-relaxed text-[var(--text-primary)] sm:text-2xl"
            {...roleMotionProps}
            transition={{ ...MARKETING_SPRING_PREMIUM }}
          >
            {specimenBody}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-12 lg:gap-6">
        <motion.article
          className="ds-marketing-outcome-glass-card relative flex flex-col justify-between p-6 sm:p-12 lg:col-span-7 will-change-transform"
          variants={homeOutcomeCardVariants}
          custom={0}
          initial={reduceMotion ? false : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={{ once: true, margin: MARKETING_IN_VIEW_MARGIN.card }}
          whileHover={
            reduceMotion
              ? undefined
              : {
                  y: -MARKETING_CARD_MOTION.hoverLift,
                  transition: {
                    duration: MARKETING_CARD_MOTION.hoverDurationSec,
                    ease: MARKETING_MOTION_EASE_PREMIUM,
                  },
                }
          }
          whileTap={
            reduceMotion
              ? undefined
              : { scale: 0.992, transition: { duration: 0.12, ease: MARKETING_MOTION_EASE_PREMIUM } }
          }
        >
          <div>
            <h3 className="font-display text-4xl font-semibold leading-none tracking-[var(--marketing-section-heading-track)] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              {data.primary.title}
            </h3>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`primary-${activeLens?.id ?? 'default'}`}
                className="ds-marketing-text-muted mt-6 max-w-[40ch] text-base leading-relaxed sm:text-lg lg:text-xl"
                {...roleMotionProps}
                transition={{ ...MARKETING_SPRING_PREMIUM }}
              >
                {primaryBody}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.article>
        <div className="flex flex-col gap-6 lg:col-span-5">
          {data.secondary.map((item, cardIdx) => (
            <motion.article
              key={item.title}
              className="ds-marketing-outcome-glass-card relative flex-1 p-6 sm:p-10 will-change-transform"
              variants={homeOutcomeCardVariants}
              custom={cardIdx + 1}
              initial={reduceMotion ? false : 'hidden'}
              whileInView={reduceMotion ? undefined : 'visible'}
              viewport={{ once: true, margin: MARKETING_IN_VIEW_MARGIN.card }}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      y: -MARKETING_CARD_MOTION.hoverLift,
                      transition: {
                        duration: MARKETING_CARD_MOTION.hoverDurationSec,
                        ease: MARKETING_MOTION_EASE_PREMIUM,
                      },
                    }
              }
              whileTap={
                reduceMotion
                  ? undefined
                  : { scale: 0.992, transition: { duration: 0.12, ease: MARKETING_MOTION_EASE_PREMIUM } }
              }
            >
              <h3 className="font-display text-2xl font-semibold tracking-[var(--marketing-section-heading-track)] text-[var(--text-primary)] sm:text-3xl">
                {item.title}
              </h3>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`secondary-${cardIdx}-${activeLens?.id ?? 'default'}`}
                  className="ds-marketing-text-muted mt-4 text-base leading-relaxed"
                  {...roleMotionProps}
                  transition={{ ...MARKETING_SPRING_PREMIUM }}
                >
                  {secondaryBodies?.[cardIdx] ?? item.body}
                </motion.p>
              </AnimatePresence>
            </motion.article>
          ))}
        </div>
      </div>
    </>
  );
}
