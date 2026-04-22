import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../../components/ui/utils';
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
                  'rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors sm:text-sm',
                  isActive &&
                    'border-[var(--glc-blue)] bg-[color-mix(in_oklab,var(--glc-blue)_14%,var(--bg-surface))] text-[var(--glc-blue)]',
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
      <div className="ds-home-outcome-specimen mt-8 grid gap-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-4 sm:mt-10 sm:gap-6 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{data.specimenEyebrow}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={`specimen-${activeLens?.id ?? 'default'}`}
            className="max-w-[70ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base"
            {...roleMotionProps}
            transition={{ duration: 0.16, ease: MARKETING_MOTION_EASE_PREMIUM }}
          >
            {specimenBody}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-12 lg:gap-8">
        <motion.article
          className="ds-home-outcome-card flex flex-col justify-between p-6 sm:p-8 lg:col-span-7 will-change-transform"
          style={HOME_SURFACE_CARD_STYLE}
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
            <h3 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {data.primary.title}
            </h3>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`primary-${activeLens?.id ?? 'default'}`}
                className="mt-4 max-w-[60ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base"
                {...roleMotionProps}
                transition={{ duration: 0.16, ease: MARKETING_MOTION_EASE_PREMIUM }}
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
              className="ds-home-outcome-card flex-1 p-5 sm:p-6 will-change-transform"
              style={HOME_SURFACE_CARD_STYLE}
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
              <h3 className="font-display text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
                {item.title}
              </h3>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`secondary-${cardIdx}-${activeLens?.id ?? 'default'}`}
                  className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]"
                  {...roleMotionProps}
                  transition={{ duration: 0.16, ease: MARKETING_MOTION_EASE_PREMIUM }}
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
