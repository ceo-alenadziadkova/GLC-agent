import type { Variants } from 'motion/react';
import {
  MARKETING_CARD_MOTION,
  MARKETING_LIST_STAGGER,
  MARKETING_MOTION_EASE_PREMIUM,
} from '../../../config/marketing-motion';

export const homeTrustLineVariants: Variants = {
  hidden: { opacity: 0, y: MARKETING_LIST_STAGGER.itemHiddenY },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * MARKETING_LIST_STAGGER.itemDelaySec,
      duration: MARKETING_LIST_STAGGER.itemDurationSec,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  }),
};

export const homeOutcomeCardVariants: Variants = {
  hidden: { opacity: 0, y: MARKETING_CARD_MOTION.hiddenY },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * MARKETING_CARD_MOTION.staggerSec,
      duration: MARKETING_CARD_MOTION.durationSec,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  }),
};

export const homeHeroVisualFloatVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.2,
      duration: 0.8,
      ease: MARKETING_MOTION_EASE_PREMIUM,
    },
  },
};
