/**
 * Motion defaults for public marketing surfaces.
 * UPDATED: Moving to Overdrive (Spring physics / Fluid Cinematic).
 * Used by MarketingSection and key landing blocks — keep timings here, not inline in pages.
 */
export const MARKETING_MOTION_EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

/** Hero / billboard blocks (matches prior home hero curve). */
export const MARKETING_MOTION_EASE_BILLBOARD = [0.16, 1, 0.3, 1] as const;

/** OVERDRIVE: Fluid spring animation base for UI elements */
export const MARKETING_SPRING_PREMIUM = { type: 'spring', stiffness: 100, damping: 16, mass: 0.9 } as const;

/** OVERDRIVE: Bouncy / snappy spring for cards and hover states */
export const MARKETING_SPRING_BOUNCY = { type: 'spring', stiffness: 260, damping: 18, mass: 0.8 } as const;

/** OVERDRIVE: Snug interactive spring for buttons/toggles */
export const MARKETING_SPRING_INTERACTIVE = { type: 'spring', stiffness: 400, damping: 14, mass: 0.5 } as const;

/**
 * Motion `whileInView` passes `margin` to `IntersectionObserver`.
 * Chromium requires pixel (or strictly valid) rootMargin strings — percentage values throw at construction time.
 * These `px` literals are browser API constraints, not UI design tokens (see design-system-enforcement-check).
 */
export const MARKETING_IN_VIEW_MARGIN = {
  /** Section / text reveal — approx. former `-12% 0 -8% 0`. */
  section: '-120px 0px -80px 0px',
  /** Tighter trigger — approx. former `-5% 0px`. */
  tight: '-50px 0px',
  /** Card blocks — approx. former `-8% 0px`. */
  card: '-80px 0px',
} as const;

export const MARKETING_SECTION_MOTION = {
  hiddenY: 22,
  durationSec: 0.64,
  /** Slightly earlier trigger so content feels “alive” before fully centered. */
  viewportMargin: MARKETING_IN_VIEW_MARGIN.section,
} as const;

export const MARKETING_LIST_STAGGER = {
  itemDelaySec: 0.08,
  itemDurationSec: 0.6,
  itemHiddenY: 30, // Deeper drop
} as const;

export const MARKETING_CARD_MOTION = {
  hiddenY: 40, // Dramatic card entry
  durationSec: 0.65,
  staggerSec: 0.12,
  hoverLift: 8, // More magnetic/bouncy
  hoverDurationSec: 0.3,
} as const;

export const MARKETING_BLOCK_REVEAL = {
  hiddenY: 22,
  hiddenScale: 0.988,
  durationSec: 0.56,
} as const;

/** Clip-path “curtain” reveal for large panels (matches --radius-2xl). */
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
  staggerChildrenSec: 0.12, // slightly longer stagger for dramatic effect
  delayChildrenSec: 0.08,
  itemHiddenY: 40,
  itemDurationSec: 0.7,
} as const;

/** Home hero cockpit — scroll-driven parallax (input scrollY, px ranges; values live here for DS raw-value audit). */
export const MARKETING_HOME_HERO_COCKPIT_PARALLAX = {
  scrollInputRange: [0, 800] as const,
  yPx: [0, -100] as const,
  rotateXDeg: [15, 0] as const,
  scale: [1.15, 0.9] as const,
} as const;

/** Package hero 3D decor — static tilt when motion is allowed. */
export const MARKETING_PACKAGE_HERO_3D = {
  perspectivePx: 1200,
  decorTiltRotateXDeg: 5,
  decorTiltScale: 0.95,
} as const;

