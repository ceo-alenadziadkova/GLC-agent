import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import {
  MARKETING_CARD_MOTION,
  MARKETING_IN_VIEW_MARGIN,
  MARKETING_MOTION_EASE_PREMIUM,
} from '../../config/marketing-motion';

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: MARKETING_CARD_MOTION.staggerSec,
      delayChildren: 0,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: MARKETING_CARD_MOTION.hiddenY },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MARKETING_CARD_MOTION.durationSec,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  },
};

const reducedVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

const EMPTY_VARIANTS: Variants = { hidden: {}, visible: {} };

type StaggerAs = 'div' | 'ul' | 'ol';
type ItemAs = 'div' | 'li' | 'article' | 'section';

/**
 * Wraps a group of child blocks with a single-shot viewport-triggered stagger.
 * Used for outcome grids, audience triads, timeline steps — turns a simultaneous
 * reveal into a sequenced narrative. Respects `prefers-reduced-motion`.
 *
 * Children must be wrapped in <MarketingStaggeredReveal.Item> to receive the stagger.
 */
export function MarketingStaggeredReveal({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: StaggerAs;
}) {
  const reduce = useReducedMotion();
  const variants = reduce ? EMPTY_VARIANTS : containerVariants;
  const initial = reduce ? false : 'hidden';
  const whileInView = reduce ? undefined : 'visible';
  const viewport = { once: true, margin: MARKETING_IN_VIEW_MARGIN.card };

  if (as === 'ul') {
    return (
      <motion.ul
        className={className}
        variants={variants}
        initial={initial}
        whileInView={whileInView}
        viewport={viewport}
      >
        {children}
      </motion.ul>
    );
  }
  if (as === 'ol') {
    return (
      <motion.ol
        className={className}
        variants={variants}
        initial={initial}
        whileInView={whileInView}
        viewport={viewport}
      >
        {children}
      </motion.ol>
    );
  }
  return (
    <motion.div
      className={className}
      variants={variants}
      initial={initial}
      whileInView={whileInView}
      viewport={viewport}
    >
      {children}
    </motion.div>
  );
}

function MarketingStaggeredRevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: ItemAs;
}) {
  const reduce = useReducedMotion();
  const variants = reduce ? reducedVariants : itemVariants;

  if (as === 'li') {
    return <motion.li className={className} variants={variants}>{children}</motion.li>;
  }
  if (as === 'article') {
    return <motion.article className={className} variants={variants}>{children}</motion.article>;
  }
  if (as === 'section') {
    return <motion.section className={className} variants={variants}>{children}</motion.section>;
  }
  return <motion.div className={className} variants={variants}>{children}</motion.div>;
}

MarketingStaggeredReveal.Item = MarketingStaggeredRevealItem;
