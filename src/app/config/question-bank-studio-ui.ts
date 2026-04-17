import type { TracePlanStatus, TraceRole } from '../components/question-bank-studio/types';
import { COLOR_TOKENS } from '../../design-system/tokens/colors';

export const TRACE_RING_COLORS: Record<TraceRole, string> = {
  required: 'var(--ui-intake-node-required-stroke)',
  visible: 'var(--ui-intake-node-visible-stroke)',
  deferred: 'var(--ui-intake-node-deferred-stroke)',
  hidden: 'var(--ui-intake-node-hidden-stroke)',
};

export const TRACE_RING_COLOR_DEFAULT = 'transparent';

export const STATUS_PILL_STYLES: Record<
  TracePlanStatus,
  { label: string; fg: string; bg: string; border: string }
> = {
  required: {
    label: 'Required',
    fg: COLOR_TOKENS.semantic.uiSemantic.dangerFgStrong,
    bg: COLOR_TOKENS.semantic.uiSemantic.dangerBgPale,
    border: COLOR_TOKENS.semantic.uiSemantic.danger,
  },
  visible: {
    label: 'Visible',
    fg: 'var(--ui-intake-node-visible-stroke)',
    bg: 'var(--ui-intake-node-visible-text)',
    border: 'var(--ui-intake-node-visible-stroke)',
  },
  deferred: {
    label: 'Deferred',
    fg: 'var(--ui-intake-node-deferred-stroke)',
    bg: 'var(--ui-intake-node-deferred-text)',
    border: 'var(--ui-intake-node-deferred-stroke)',
  },
  hidden: {
    label: 'Hidden',
    fg: 'var(--ui-intake-node-hidden-stroke)',
    bg: 'var(--ui-intake-node-hidden-text)',
    border: 'var(--ui-intake-node-hidden-stroke)',
  },
  unknown: {
    label: 'Unknown',
    fg: 'var(--ui-intake-node-other-stroke)',
    bg: 'var(--ui-intake-node-other-text)',
    border: 'var(--ui-intake-node-other-stroke)',
  },
};

export const SHORT_USER_LABEL_MAX_LEN = 78;
export const SHORT_USER_LABEL_TRIM_LEN = 75;
export const SHORT_USER_LABEL_SUFFIX = '...';

export const LEGEND_FONT_SIZE_PX = 10;
export const LEGEND_LINE_HEIGHT = 1.5;
export const LEGEND_TEXT_COLOR_VAR = 'var(--text-quaternary)';

export const NOW_VISIBLE_PREVIEW_MAX_ITEMS = 8;
export const WHY_PREVIEW_MAX_ITEMS = 6;

