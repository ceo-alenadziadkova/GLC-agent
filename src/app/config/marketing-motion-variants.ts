import type { Variants } from 'motion/react';
import {
  MARKETING_HERO_BILLBOARD,
  MARKETING_SPRING_PREMIUM,
} from './marketing-motion';

export const marketingHeroBillboardContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: MARKETING_HERO_BILLBOARD.staggerChildrenSec,
      delayChildren: MARKETING_HERO_BILLBOARD.delayChildrenSec,
    },
  },
};

export const marketingHeroBillboardItemVariants: Variants = {
  hidden: { opacity: 0, y: MARKETING_HERO_BILLBOARD.itemHiddenY },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...MARKETING_SPRING_PREMIUM,
    },
  },
};

export function marketingHeroBillboardMotion(reduce: boolean) {
  if (reduce) {
    return {
      container: {
        hidden: {},
        visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
      } as const,
      item: {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0, transition: { duration: 0 } },
      } as const,
    };
  }
  return {
    container: marketingHeroBillboardContainerVariants,
    item: marketingHeroBillboardItemVariants,
  } as const;
}
