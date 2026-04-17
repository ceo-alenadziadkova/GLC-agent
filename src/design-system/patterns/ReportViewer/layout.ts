/**
 * Report viewer — layout composition only (no colors, shadows, or typography literals).
 * Visuals: tokens + `.ds-report-*` bridge classes in `src/styles/components.css`.
 */
export const REPORT_VIEWER_LAYOUT = {
  findingsGrid: 'grid grid-cols-1 gap-4 md:grid-cols-2',
} as const;
