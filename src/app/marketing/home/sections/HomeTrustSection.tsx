import { motion } from 'motion/react';
import { homeTrustLineVariants } from '../motion/home-motion';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeTrustSectionProps = {
  data: MarketingHomeViewModel['trustStrip'];
  reduceMotion: boolean;
};

export function HomeTrustSection({ data, reduceMotion }: HomeTrustSectionProps) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
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
            viewport={{ once: true, margin: '-5% 0px' }}
          >
            {line}
          </motion.li>
        ))}
      </ul>
    </>
  );
}
