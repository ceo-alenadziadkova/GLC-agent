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
        <h3 className="mb-6 font-display text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
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
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px"
                style={{ backgroundColor: 'var(--border-default)' }}
                aria-hidden
              />
            )}
            <div
              className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: 'var(--gradient-brand)',
                color: 'var(--primary-foreground)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {i + 1}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {s.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {s.detail}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
