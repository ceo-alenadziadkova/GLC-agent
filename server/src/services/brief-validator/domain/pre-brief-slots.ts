import {
  getPreBriefSubmitSlotIds as resolveSharedPreBriefSubmitSlotIds,
} from '@glc/intake-core';
import type { IntakeBriefCollectionMode, IntakeVersionTuple } from '../../../types/audit.js';
import { isPreBriefIdSatisfied } from './answer-state.js';

export function effectiveBriefForSla(responses: Record<string, unknown>): Record<string, unknown> {
  return { ...responses };
}

export function getPreBriefSubmitSlotIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  expressRequiredBankIds?: string[],
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  const sharedIds = resolveSharedPreBriefSubmitSlotIds(responses, collectionMode, intakeVersionTuple);
  if (!expressRequiredBankIds) return sharedIds;
  const expressSet = new Set(expressRequiredBankIds);
  const identityAndConditional = sharedIds.filter((id) => !expressSet.has(id));
  return [...identityAndConditional, ...expressRequiredBankIds];
}

/** All pre-brief questions satisfied (used by public intake submit). */
export function arePreBriefSlotsSatisfied(responses: Record<string, unknown>): boolean {
  const effective = effectiveBriefForSla(responses);
  return getPreBriefSubmitSlotIds(effective).every((id) => isPreBriefIdSatisfied(id, effective));
}
