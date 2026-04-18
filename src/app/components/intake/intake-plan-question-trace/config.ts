import type { QuestionReason } from '@glc/intake-core';

export const TRACE_LAYERS: QuestionReason['layer'][] = ['canon', 'policy', 'layout'];
export const TRACE_STATES: QuestionReason['state'][] = ['eligible', 'hidden', 'visible', 'deferred', 'required'];

export const TRACE_VIRTUALIZER_CONFIG = {
  rowThreshold: 20,
  estimateSizePx: 52,
  overscanRows: 8,
} as const;
