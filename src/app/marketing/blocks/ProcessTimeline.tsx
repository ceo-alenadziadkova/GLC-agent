import { motion, useReducedMotion } from 'motion/react';
import type { ComponentType } from 'react';
import {
  ClipboardText,
  Binoculars,
  ChartLineUp,
  Sparkle,
  CheckCircle,
  Compass,
} from '@phosphor-icons/react';

export type TimelineStep = { title: string; detail: string };

type IconComponent = ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'duotone' | 'fill'; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/** Index-keyed step icons — context → discovery → synthesis → output → delivery. */
const TIMELINE_ICONS: readonly IconComponent[] = [
  ClipboardText,
  Binoculars,
  ChartLineUp,
  Sparkle,
  CheckCircle,
  Compass,
];

export function ProcessTimeline({
  steps,
  title,
}: {
  steps: TimelineStep[];
  title?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div>
      {title && (
        <h3 className="mb-6 font-display text-lg font-bold tracking-tight ds-text-primary">
          {title}
        </h3>
      )}
      <ol className="relative space-y-0">
        {steps.map((s, i) => {
          const Icon = TIMELINE_ICONS[i] ?? Sparkle;
          return (
            <motion.li
              key={s.title}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4 pb-8 pl-1 last:pb-0"
            >
              {i < steps.length - 1 && (
                <span className="ds-marketing-timeline-connector" aria-hidden />
              )}
              <span
                className="ds-marketing-card-icon-well ds-marketing-card-icon-well--small relative z-[1]"
                aria-hidden
              >
                <Icon size={18} weight="bold" aria-hidden />
              </span>
              <div className="min-w-0 pt-1">
                <p className="font-semibold ds-text-primary">
                  <span className="ds-text-brand-deeper mr-2 text-xs font-bold tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed ds-text-secondary">
                  {s.detail}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
