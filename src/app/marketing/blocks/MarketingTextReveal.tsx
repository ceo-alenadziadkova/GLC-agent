import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  MARKETING_MOTION_EASE_PREMIUM,
  MARKETING_SECTION_MOTION,
  MARKETING_TEXT_REVEAL,
} from '../../config/marketing-motion';
import { cn } from '../../components/ui/utils';

export function MarketingTextReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Extra delay in seconds (e.g. for staggered siblings). */
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: MARKETING_TEXT_REVEAL.hiddenY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: MARKETING_SECTION_MOTION.viewportMargin }}
      transition={{
        duration: MARKETING_TEXT_REVEAL.durationSec,
        delay,
        ease: MARKETING_MOTION_EASE_PREMIUM,
      }}
    >
      {children}
    </motion.div>
  );
}
