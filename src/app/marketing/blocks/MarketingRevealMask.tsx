import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  MARKETING_MASK_REVEAL,
  MARKETING_MOTION_EASE_PREMIUM,
  MARKETING_SECTION_MOTION,
} from '../../config/marketing-motion';
import { cn } from '../../components/ui/utils';

/**
 * Large-block reveal: clip-path “curtain” + light opacity (premium calm, not bounce).
 * Respects reduced motion — renders a static wrapper.
 */
export function MarketingRevealMask({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const r = MARKETING_MASK_REVEAL.cornerRadiusPx;
  const hidden = `inset(0 0 100% 0 round ${r}px)`;
  const shown = `inset(0 0 0% 0 round ${r}px)`;

  if (reduce) {
    return <div className={cn('overflow-hidden', className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn('overflow-hidden', className)}
      initial={{ clipPath: hidden, opacity: 0.92 }}
      whileInView={{ clipPath: shown, opacity: 1 }}
      viewport={{ once: true, margin: MARKETING_SECTION_MOTION.viewportMargin }}
      transition={{
        duration: MARKETING_MASK_REVEAL.durationSec,
        ease: MARKETING_MOTION_EASE_PREMIUM,
      }}
    >
      {children}
    </motion.div>
  );
}
