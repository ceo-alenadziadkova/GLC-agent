import { motion, useReducedMotion } from 'motion/react';

export type TimelineStep = { title: string; detail: string };

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
        <h3 className="mb-6 font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]/90">
          {title}
        </h3>
      )}
      <ol className="relative space-y-0">
        {steps.map((s, i) => (
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
            <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xs font-semibold text-[var(--text-primary)] shadow-sm backdrop-blur-md">
              {i + 1}
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {s.title}
              </p>
              <p className="ds-marketing-text-muted mt-2 text-sm leading-relaxed">
                {s.detail}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
