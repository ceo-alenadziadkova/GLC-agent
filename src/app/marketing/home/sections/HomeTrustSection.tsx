import { motion } from 'motion/react';
import { MARKETING_IN_VIEW_MARGIN } from '../../../config/marketing-motion';
import { homeTrustLineVariants } from '../motion/home-motion';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeTrustSectionProps = {
  data: MarketingHomeViewModel['trustStrip'];
  reduceMotion: boolean;
  /** Tighter spacing when stacked directly under metrics in one section. */
  density?: 'default' | 'compact';
  maxLines?: number;
};

export function HomeTrustSection({ data, reduceMotion, density = 'default', maxLines }: HomeTrustSectionProps) {
  const listClass =
    density === 'compact'
      ? 'mt-5 grid gap-6 sm:mt-6 sm:grid-cols-3 sm:gap-8'
      : 'mt-8 grid gap-10 sm:grid-cols-3 sm:gap-12';
  const trustLines = typeof maxLines === 'number' ? data.lines.slice(0, maxLines) : data.lines;

  return (
    <>
      <p className="text-xs font-semibold uppercase ds-home-trust-caps text-[var(--text-tertiary)]">
        {data.title}
      </p>
      <ul className={listClass}>
        {trustLines.map((line, i) => (
          <motion.li
            key={line}
            className="rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed text-[var(--text-secondary)] transition-[border-color,background-color] duration-200 hover:border-[var(--border-subtle)] hover:bg-[color-mix(in_oklab,var(--bg-surface)_82%,var(--bg-muted))]"
            variants={homeTrustLineVariants}
            custom={i}
            initial={reduceMotion ? false : 'hidden'}
            whileInView={reduceMotion ? undefined : 'visible'}
            viewport={{ once: true, margin: MARKETING_IN_VIEW_MARGIN.tight }}
          >
            {line}
          </motion.li>
        ))}
      </ul>
    </>
  );
}
