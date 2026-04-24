import { buildIntakePlan, formatPlanTrace } from '@glc/intake-core';
import type { IntakeSurface } from '@glc/intake-core';

import type { IntakeBriefCollectionMode, ProductMode } from '../../types/audit.js';
import type { NlDescribeGraphDraft } from './nl-describe-graph-mapper.js';

type BriefAnswerCell = {
  value: string | boolean;
  source: 'unknown' | 'client' | 'consultant' | 'recon_confirmed';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function toAnswerCell(value: unknown): BriefAnswerCell | null {
  if (!isRecord(value)) return null;
  if ((value.source !== 'unknown' && value.source !== 'client' && value.source !== 'consultant' && value.source !== 'recon_confirmed') || !('value' in value)) {
    return null;
  }
  if (typeof value.value !== 'string' && typeof value.value !== 'boolean') {
    return null;
  }
  return { value: value.value, source: value.source };
}

export function mergeNlDraftIntoAuthoritativeResponses(args: {
  graphDraft: NlDescribeGraphDraft;
  existingResponses: unknown;
  minConfidence?: 'low' | 'medium';
}): {
  mergedResponses: Record<string, BriefAnswerCell | null>;
  appliedHints: Array<{ questionId: string; confidence: 'low' | 'medium'; rationale: string }>;
  skippedHints: Array<{ questionId: string; reason: string }>;
} {
  const confidenceRank = new Map<'low' | 'medium', number>([
    ['low', 1],
    ['medium', 2],
  ]);
  const threshold = args.minConfidence ?? 'medium';
  const thresholdRank = confidenceRank.get(threshold) ?? 2;

  const mergedResponses: Record<string, BriefAnswerCell | null> = {};
  const existing = isRecord(args.existingResponses) ? args.existingResponses : {};
  for (const [key, value] of Object.entries(existing)) {
    const cell = toAnswerCell(value);
    mergedResponses[key] = cell;
  }

  const appliedHints: Array<{ questionId: string; confidence: 'low' | 'medium'; rationale: string }> = [];
  const skippedHints: Array<{ questionId: string; reason: string }> = [];

  for (const hint of args.graphDraft.inferred) {
    const rank = confidenceRank.get(hint.confidence) ?? 0;
    if (rank < thresholdRank) {
      skippedHints.push({ questionId: hint.questionId, reason: 'below_min_confidence' });
      continue;
    }
    const existingCell = mergedResponses[hint.questionId];
    if (existingCell && existingCell.source !== 'unknown') {
      skippedHints.push({ questionId: hint.questionId, reason: 'explicit_answer_already_present' });
      continue;
    }
    mergedResponses[hint.questionId] = {
      value: hint.suggestedValue,
      source: 'unknown',
    };
    appliedHints.push({
      questionId: hint.questionId,
      confidence: hint.confidence,
      rationale: hint.rationale,
    });
  }

  return { mergedResponses, appliedHints, skippedHints };
}

export function buildAuthoritativePlanTrace(args: {
  responses: Record<string, BriefAnswerCell | null>;
  productMode: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
}) {
  const plan = buildIntakePlan({
    responses: args.responses,
    productMode: args.productMode,
    collectionMode: args.collectionMode,
    surface: args.surface,
  });
  const text = formatPlanTrace(plan, {
    productMode: args.productMode,
    collectionMode: args.collectionMode,
    surface: args.surface,
  });
  return { plan, text };
}
