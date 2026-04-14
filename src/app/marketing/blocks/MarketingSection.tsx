import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MARKETING_MOTION_EASE_PREMIUM, MARKETING_SECTION_MOTION } from '../../config/marketing-motion';
import { cn } from '../../components/ui/utils';

export function MarketingSection({
  id,
  'aria-label': ariaLabel,
  children,
  className,
  delay = 0,
}: {
  id?: string;
  'aria-label'?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const y = MARKETING_SECTION_MOTION.hiddenY;
  return (
    <motion.section
      id={id}
      aria-label={ariaLabel}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: MARKETING_SECTION_MOTION.viewportMargin }}
      transition={{
        duration: MARKETING_SECTION_MOTION.durationSec,
        delay,
        ease: MARKETING_MOTION_EASE_PREMIUM,
      }}
      className={cn('scroll-mt-28', className)}
    >
      {children}
    </motion.section>
  );
}
