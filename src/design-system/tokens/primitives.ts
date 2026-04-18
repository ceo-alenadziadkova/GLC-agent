/**
 * CSS variables used by shadcn/Radix primitives in `src/app/components/ui`.
 * Values are defined in `src/styles/tokens.css` (vendor parity; DS raw-values audit).
 */
export const PRIMITIVE_TOKENS = {
  focusRingWidth: 'var(--primitive-focus-ring-width)',
  popoverAnchorWidth: 'var(--primitive-popover-anchor-width)',
  switchTrackHeight: 'var(--primitive-switch-track-height)',
  commandDialogWidth: 'var(--primitive-command-dialog-width)',
  drawerDragHandleHeight: 'var(--primitive-drawer-drag-handle-height)',
  menubarViewportWidth: 'var(--primitive-menubar-viewport-width)',
  calendarCellTextSize: 'var(--primitive-calendar-cell-text-size)',
  /** Product `SectionLabel` tracking (see `tokens.css`) */
  sectionLabelTracking: 'var(--section-label-tracking)',
} as const;

export type PrimitiveTokens = typeof PRIMITIVE_TOKENS;
