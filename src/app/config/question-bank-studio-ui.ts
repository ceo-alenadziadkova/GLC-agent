import type { TracePlanStatus, TraceRole } from '../components/question-bank-studio/types';
import { UI_SEMANTIC_COLORS } from './ui-semantic-colors';

export const TRACE_RING_COLORS: Record<TraceRole, string> = {
  required: '#f59e0b',
  visible: '#38bdf8',
  deferred: '#a78bfa',
  hidden: '#71717a',
};

export const TRACE_RING_COLOR_DEFAULT = 'transparent';

export const STATUS_PILL_STYLES: Record<
  TracePlanStatus,
  { label: string; fg: string; bg: string; border: string }
> = {
  required: {
    label: 'Required',
    fg: UI_SEMANTIC_COLORS.dangerFgStrong,
    bg: UI_SEMANTIC_COLORS.dangerBgPale,
    border: UI_SEMANTIC_COLORS.danger,
  },
  visible: { label: 'Visible', fg: '#1d4ed8', bg: '#dbeafe', border: '#60a5fa' },
  deferred: { label: 'Deferred', fg: '#6d28d9', bg: '#ede9fe', border: '#a78bfa' },
  hidden: { label: 'Hidden', fg: '#374151', bg: '#f3f4f6', border: '#9ca3af' },
  unknown: { label: 'Unknown', fg: '#334155', bg: '#e2e8f0', border: '#94a3b8' },
};

export const SHORT_USER_LABEL_MAX_LEN = 78;
export const SHORT_USER_LABEL_TRIM_LEN = 75;
export const SHORT_USER_LABEL_SUFFIX = '...';

export const LEGEND_FONT_SIZE_PX = 10;
export const LEGEND_LINE_HEIGHT = 1.5;
export const LEGEND_TEXT_COLOR_VAR = 'var(--text-quaternary)';

export const NOW_VISIBLE_PREVIEW_MAX_ITEMS = 8;
export const WHY_PREVIEW_MAX_ITEMS = 6;

