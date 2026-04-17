import { motion, useReducedMotion } from 'motion/react';
import {
  MARKETING_CARD_MOTION,
  MARKETING_MOTION_EASE_PREMIUM,
} from '../../config/marketing-motion';
import { cn } from '../../components/ui/utils';

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-2 rounded-full"
      style={{
        width,
        backgroundColor: 'color-mix(in oklab, var(--border-default) 55%, transparent)',
      }}
    />
  );
}

/**
 * Decorative “audit cockpit” for marketing hero — no live data; subtle hover motion only.
 */
export function HomeHeroCockpit({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const hover = reduce
    ? undefined
    : {
        y: -MARKETING_CARD_MOTION.hoverLift,
        transition: {
          duration: MARKETING_CARD_MOTION.hoverDurationSec,
          ease: MARKETING_MOTION_EASE_PREMIUM,
        },
      };

  const panel =
    'overflow-hidden border p-4 shadow-[var(--shadow-xs)] transition-[border-color] duration-200 hover:border-[var(--border-default)]';

  return (
    <div className={cn('relative ds-home-hero-cockpit-wrap', className)} aria-hidden>
      <div className="relative ds-home-hero-cockpit-stage">
        <motion.div
          className={cn('absolute left-0 top-6 w-[90%]', panel)}
          style={{
            borderRadius: 'var(--radius-xl)',
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            transform: 'rotate(-2.5deg)',
            transformOrigin: 'center top',
            zIndex: 1,
            opacity: 0.92,
          }}
          whileHover={hover}
        >
          <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider ds-text-tertiary" >
            Workspace
          </p>
          <div className="mt-3 space-y-2">
            <SkeletonLine width="72%" />
            <SkeletonLine width="54%" />
            <SkeletonLine width="88%" />
          </div>
        </motion.div>

        <motion.div
          className={cn('absolute right-0 ds-home-hero-cockpit-panel-offset w-[86%]', panel)}
          style={{
            borderRadius: 'var(--radius-xl)',
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            transform: 'rotate(1.2deg)',
            zIndex: 2,
          }}
          whileHover={hover}
        >
          <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider ds-text-tertiary" >
            Coverage map
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="aspect-square rounded-md ds-home-hero-cockpit-cell"
                style={{
                  backgroundColor:
                    i % 3 === 0
                      ? 'color-mix(in oklab, var(--glc-blue-muted) 80%, transparent)'
                      : 'color-mix(in oklab, var(--bg-muted) 90%, transparent)',
                }}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          className={cn('absolute bottom-0 left-[6%] w-[82%] ds-home-hero-cockpit-floating-panel', panel)}
          style={{
            transform: 'rotate(-0.8deg)',
            zIndex: 3,
          }}
          whileHover={hover}
        >
          <p className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-wider ds-text-tertiary" >
            Next actions
          </p>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full ds-marketing-hero-dot-green-dark" />
              <SkeletonLine width="64%" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full ds-marketing-hero-signal-dot" />
              <SkeletonLine width="52%" />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full ds-marketing-hero-bar-muted" />
              <SkeletonLine width="70%" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
