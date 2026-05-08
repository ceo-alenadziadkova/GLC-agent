/**
 * Report viewer — layout composition only (enforced by `audit:ds:patterns-lock`).
 * Visuals: tokens + `.ds-report-*` bridge classes in `src/styles/components/`.
 */
export const REPORT_VIEWER_LAYOUT = {
  findingsGrid: 'grid grid-cols-1 gap-4 md:grid-cols-2',
} as const;
