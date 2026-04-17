import { isPreBriefSubmitSlotSatisfied } from '@glc/intake-core';
import type { IntakeBriefCollectionMode } from '../../../types/audit.js';

export function unwrapAnswer(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    return (value as { value: unknown }).value;
  }
  return value;
}

export function isAnswered(value: unknown): boolean {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'source' in (value as Record<string, unknown>)) {
    const src = (value as { source?: string }).source;
    if (src === 'unknown') return true;
  }
  const raw = unwrapAnswer(value);
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (typeof raw === 'number') return true;
  if (typeof raw === 'boolean') return true;
  if (Array.isArray(raw)) return raw.length > 0;
  return false;
}

/** Pre-brief slot satisfied; industry Other + choice options that require clarification. */
export function isPreBriefIdSatisfied(
  id: string,
  responses: Record<string, unknown>,
  _collectionMode?: IntakeBriefCollectionMode,
): boolean {
  return isPreBriefSubmitSlotSatisfied(id, responses);
}
