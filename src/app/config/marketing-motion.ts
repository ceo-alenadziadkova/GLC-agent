/**
 * Motion defaults for public marketing surfaces (Revolut-inspired: smooth ease-out, staggered reveals).
 * Used by MarketingSection and key landing blocks — keep timings here, not inline in pages.
 */
export const MARKETING_MOTION_EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

/** Hero / billboard blocks (matches prior home hero curve). */
export const MARKETING_MOTION_EASE_BILLBOARD = [0.16, 1, 0.3, 1] as const;

export const MARKETING_SECTION_MOTION = {
  hiddenY: 18,
  durationSec: 0.58,
  /** Slightly earlier trigger so content feels “alive” before fully centered. */
  viewportMargin: '-12% 0px -8% 0px',
} as const;

export const MARKETING_LIST_STAGGER = {
  itemDelaySec: 0.068,
  itemDurationSec: 0.5,
  itemHiddenY: 14,
} as const;

export const MARKETING_CARD_MOTION = {
  hiddenY: 20,
  durationSec: 0.52,
  staggerSec: 0.09,
  hoverLift: 3,
  hoverDurationSec: 0.22,
} as const;

export const MARKETING_BLOCK_REVEAL = {
  hiddenY: 22,
  hiddenScale: 0.988,
  durationSec: 0.56,
} as const;

/** Clip-path “curtain” reveal for large panels (matches --radius-2xl / 22px). */
export const MARKETING_MASK_REVEAL = {
  durationSec: 0.62,
  /** Pixel radius passed to `inset(... round Npx)` — keep aligned with `--radius-2xl`. */
  cornerRadiusPx: 22,
} as const;

/** Short copy / subheads: opacity + small translateY (Revolut-like calm reveal). */
export const MARKETING_TEXT_REVEAL = {
  hiddenY: 10,
  durationSec: 0.48,
} as const;

/** Stagger preset for home / package billboard heroes — keep in sync with motion variants. */
export const MARKETING_HERO_BILLBOARD = {
  staggerChildrenSec: 0.09,
  delayChildrenSec: 0.06,
  itemHiddenY: 28,
  itemDurationSec: 0.52,
} as const;

