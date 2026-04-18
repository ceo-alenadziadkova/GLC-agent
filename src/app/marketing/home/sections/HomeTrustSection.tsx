import { motion } from 'motion/react';
import { MARKETING_IN_VIEW_MARGIN } from '../../../config/marketing-motion';
import { homeTrustLineVariants } from '../motion/home-motion';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeTrustSectionProps = {
  data: MarketingHomeViewModel['trustStrip'];
  reduceMotion: boolean;
};

export function HomeTrustSection({ data, reduceMotion }: HomeTrustSectionProps) {
  return (
    <div className="ds-marketing-surface-inset-section px-6 py-10 sm:px-10 sm:py-14">
      <p className="text-xs font-semibold uppercase ds-home-trust-caps text-[var(--text-tertiary)]">
        {data.title}
      </p>
      <ul className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-12">
        {data.lines.map((line, i) => (
          <motion.li
            key={line}
            className="text-sm leading-relaxed text-[var(--text-secondary)]"
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
    </div>
  );
}
