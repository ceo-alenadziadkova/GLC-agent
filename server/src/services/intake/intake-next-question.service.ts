import {
  buildIntakePlan,
  currentIntakeVersionTuple,
  decideIntakeNextQuestion,
  isSupportedIntakeArtifactTuple,
  loadIntakePolicy,
} from '@glc/intake-core';
import type { IntakeSurface, IntakeVersionTuple } from '@glc/intake-core';

import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';
import {
  DEFAULT_AUDIT_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
  type ProductMode,
} from '../../types/audit.js';

export async function runDeterministicIntakeNextQuestion(args: {
  responses: Record<string, unknown>;
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode;
  surface: IntakeSurface | undefined;
  intakeVersionTuple: IntakeVersionTuple | null;
  auditId: string | null;
}): Promise<{
  ok: true;
  decision: ReturnType<typeof decideIntakeNextQuestion>;
  caseKeys: string[];
}> {
  const tuple =
    args.intakeVersionTuple && isSupportedIntakeArtifactTuple(args.intakeVersionTuple)
      ? args.intakeVersionTuple
      : currentIntakeVersionTuple();
  const plan = buildIntakePlan({
    responses: args.responses,
    productMode: args.productMode,
    collectionMode: args.collectionMode,
    surface: args.surface,
    intakeVersionTuple: tuple,
  });
  const policy = loadIntakePolicy();
  const decision = decideIntakeNextQuestion({
    plan,
    policy: policy.intelligence?.minimumSufficientContext,
  });
  const caseKeys = plan.casePatternMatch?.caseKeys ?? [];
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.intakeIntelligenceNextQuestion,
    message: 'Intake: F1 deterministic next-question / stop (pilot)',
    data: {
      action: decision.action,
      reason: decision.reason,
      question_id: decision.questionId,
      case_keys: caseKeys.length ? caseKeys : null,
      source: decision.source,
    },
  });
  if (error) {
    logger.warn('intake.next_question_kpi_insert_failed', { message: error.message });
  }
  return { ok: true, decision, caseKeys };
}

export function defaultProductModeFromBody(raw: unknown): ProductMode {
  return typeof raw === 'string' ? (raw as ProductMode) : DEFAULT_AUDIT_PRODUCT_MODE;
}
