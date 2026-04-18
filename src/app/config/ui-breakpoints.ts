/**
 * Pixel width for JS-driven layout (`matchMedia`, charts, `useIsMobile`-style hooks).
 * CSS and Tailwind should use `tokens.css` breakpoints and the `mobile` variant instead; coexistence and when to use which are documented in `docs/design-system/current.md` (Layout — Breakpoint implementation).
 */
export const UI_BREAKPOINTS = {
  mobile: 768,
} as const;
