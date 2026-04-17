import { motion, useReducedMotion } from 'motion/react';
import {
  MARKETING_CARD_MOTION,
  MARKETING_IN_VIEW_MARGIN,
  MARKETING_MOTION_EASE_PREMIUM,
} from '../../config/marketing-motion';
import workspacePackaging from '../../data/marketing-workspace-packaging.en.json';
/**
 * Static skeleton-style tiles shown before a scan completes — product narrative, not live data.
 */
const PREVIEW_ITEMS = workspacePackaging.snapshot_preview_cards;

const STATUS_TONE_BADGE_CLASS = {
  danger: 'text-[var(--score-1)] border-[var(--score-1-border)] bg-[var(--score-1-bg)]',
  warning: 'text-[var(--score-2)] border-[var(--score-2-border)] bg-[var(--score-2-bg)]',
  neutral: 'text-[var(--text-tertiary)] border-[var(--border-default)] bg-[var(--bg-muted)]',
  success: 'text-[var(--glc-green-dark)] border-[var(--score-5-border)] bg-[var(--score-5-bg)]',
} as const;

type SnapshotStatusTone = keyof typeof STATUS_TONE_BADGE_CLASS;

export function SnapshotIdlePreviewCards() {
  const reduce = useReducedMotion();

  return (
    <div
      className="mt-10 w-full lg:col-span-12 lg:mt-14"
      aria-hidden
    >
      <p className="mb-3 text-center text-[length:var(--text-2xs)] font-semibold uppercase tracking-[0.16em] text-[var(--text-quaternary)] lg:text-left">
        Preview of what you will see
      </p>
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
        initial={reduce ? false : 'hidden'}
        whileInView={reduce ? undefined : 'visible'}
        viewport={{ once: true, margin: MARKETING_IN_VIEW_MARGIN.tight }}
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: MARKETING_CARD_MOTION.staggerSec,
            },
          },
        }}
      >
        {PREVIEW_ITEMS.map(item => {
          const tone = item.status_tone as SnapshotStatusTone;
          return (
          <motion.div
            key={item.title}
            className="rounded-[var(--radius-xl)] border border-[color-mix(in_oklab,var(--overlay-white-20)_42%,var(--border-subtle))] bg-[linear-gradient(170deg,color-mix(in_oklab,var(--bg-surface)_94%,var(--glc-blue-muted))_0%,color-mix(in_oklab,var(--bg-muted)_84%,var(--bg-surface))_100%)] p-4 shadow-[var(--shadow-sm)]"
            variants={{
              hidden: { opacity: 0, y: MARKETING_CARD_MOTION.hiddenY },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{
              duration: MARKETING_CARD_MOTION.durationSec,
              ease: MARKETING_MOTION_EASE_PREMIUM,
            }}
            whileHover={
              reduce
                ? undefined
                : {
                    y: -MARKETING_CARD_MOTION.hoverLift,
                    boxShadow: 'var(--shadow-md)',
                    transition: {
                      duration: MARKETING_CARD_MOTION.hoverDurationSec,
                      ease: MARKETING_MOTION_EASE_PREMIUM,
                    },
                  }
            }
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="h-2 w-10 rounded-full bg-[color-mix(in_oklab,var(--border-default)_55%,transparent)]" />
              <span
                className={`rounded-full border px-2 py-0.5 text-[length:var(--text-2xs)] font-semibold uppercase tracking-wide ${STATUS_TONE_BADGE_CLASS[tone]}`}
              >
                {item.status}
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{item.title}</p>
            <p className="mt-1 text-[length:var(--text-xs)] leading-relaxed text-[var(--text-secondary)]">
              {item.example}
            </p>
          </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
