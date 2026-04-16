import type { IntakePlan } from '@glc/intake-core';
import { getQuestionBankPromptLabel } from '@glc/intake-core';

import type { TracePlanStatus, TraceRole } from '../types';
import {
  SHORT_USER_LABEL_MAX_LEN,
  SHORT_USER_LABEL_SUFFIX,
  SHORT_USER_LABEL_TRIM_LEN,
  STATUS_PILL_STYLES,
  TRACE_RING_COLOR_DEFAULT,
  TRACE_RING_COLORS,
} from '../../../config/question-bank-studio-ui';

export function planTraceRoles(plan: IntakePlan): Map<string, TraceRole> {
  const m = new Map<string, TraceRole>();
  for (const id of plan.hidden) m.set(id, 'hidden');
  for (const id of plan.deferred) m.set(id, 'deferred');
  for (const id of plan.visible) if (!m.has(id)) m.set(id, 'visible');
  for (const id of plan.required) m.set(id, 'required');
  return m;
}

/** Bank / identity ids that appear anywhere in the resolver plan (for footprint view). */
export function idsInIntakePlan(plan: IntakePlan): Set<string> {
  return new Set([...plan.eligible, ...plan.visible, ...plan.required, ...plan.hidden, ...plan.deferred]);
}

export function traceRingColor(role: TraceRole): string {
  return TRACE_RING_COLORS[role] ?? TRACE_RING_COLOR_DEFAULT;
}

export function shortUserLabel(questionId: string): string {
  const raw = getQuestionBankPromptLabel(questionId) ?? questionId;
  const trimmed = raw.trim();
  if (trimmed.length <= SHORT_USER_LABEL_MAX_LEN) return trimmed;
  return `${trimmed.slice(0, SHORT_USER_LABEL_TRIM_LEN)}${SHORT_USER_LABEL_SUFFIX}`;
}

export function statusPill(status: TracePlanStatus): { label: string; fg: string; bg: string; border: string } {
  return STATUS_PILL_STYLES[status];
}

