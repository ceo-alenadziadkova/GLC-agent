import { motion, useReducedMotion } from 'motion/react';
import { MARKETING_CARD_MOTION, MARKETING_MOTION_EASE_PREMIUM } from '../../config/marketing-motion';
import workspacePackaging from '../../data/marketing-workspace-packaging.en.json';
/**
 * Static skeleton-style tiles shown before a scan completes — product narrative, not live data.
 */
const PREVIEW_ITEMS = workspacePackaging.snapshot_preview_cards;

const STATUS_TONE_STYLE = {
  danger: { color: 'var(--score-1)', border: 'var(--score-1-border)', background: 'var(--score-1-bg)' },
  warning: { color: 'var(--score-2)', border: 'var(--score-2-border)', background: 'var(--score-2-bg)' },
  neutral: { color: 'var(--text-tertiary)', border: 'var(--border-default)', background: 'var(--bg-muted)' },
  success: { color: 'var(--glc-green-dark)', border: 'var(--score-5-border)', background: 'var(--score-5-bg)' },
} as const;

type SnapshotStatusTone = keyof typeof STATUS_TONE_STYLE;

export function SnapshotIdlePreviewCards() {
  const reduce = useReducedMotion();

  return (
    <div
      className="mt-10 w-full lg:mt-14"
      aria-hidden
    >
      <p
        className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] lg:text-left"
        style={{ color: 'var(--text-quaternary)' }}
      >
        Preview of what you will see
      </p>
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
        initial={reduce ? false : 'hidden'}
        whileInView={reduce ? undefined : 'visible'}
        viewport={{ once: true, margin: '-5% 0px' }}
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
            className="rounded-[var(--radius-xl)] border p-4"
            style={{
              borderColor: 'color-mix(in oklab, rgba(255,255,255,0.2) 42%, var(--border-subtle))',
              background:
                'linear-gradient(170deg, color-mix(in oklab, var(--bg-surface) 94%, var(--glc-blue-muted)) 0%, color-mix(in oklab, var(--bg-muted) 84%, var(--bg-surface)) 100%)',
              boxShadow: 'var(--shadow-sm)',
            }}
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
              <div className="h-2 w-10 rounded-full" style={{ backgroundColor: 'color-mix(in oklab, var(--border-default) 55%, transparent)' }} />
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: STATUS_TONE_STYLE[tone].color,
                  borderColor: STATUS_TONE_STYLE[tone].border,
                  backgroundColor: STATUS_TONE_STYLE[tone].background,
                }}
              >
                {item.status}
              </span>
            </div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {item.example}
            </p>
          </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
