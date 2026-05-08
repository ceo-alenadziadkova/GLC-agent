/**
 * SLA / flow helpers for {@link evaluateIntakeReadinessEnvelope} — keeps the envelope module thin.
 */
import type {
  IntakeBriefCollectionMode,
  IntakeReadinessTraceEntry,
  IntakeVersionTuple,
  ProductMode,
} from '../audit-contract.js';
import { INTAKE_PRE_BRIEF_SNAPSHOT_MIN_ANSWERED_RATIO } from '../config/intake-readiness-policy.js';
import { getPreBriefSubmitSlotIds, isPreBriefSubmitSlotSatisfied } from '../brief-gates.js';
import { isIntakeAnsweredIncludingChoiceSpecify } from '../unwrap.js';

import { buildIntakePlan } from './build-intake-plan.js';
import type { IntakeSurface } from './types.js';

export function missingRequiredForMode(
  responses: Record<string, unknown>,
  mode: ProductMode,
  collectionMode: IntakeBriefCollectionMode | undefined,
  surface: IntakeSurface | undefined,
  intakeVersionTuple: IntakeVersionTuple | undefined,
): string[] {
  const plan = buildIntakePlan({
    responses,
    productMode: mode,
    collectionMode,
    surface,
    intakeVersionTuple,
  });
  return plan.required.filter(id => !isIntakeAnsweredIncludingChoiceSpecify(responses, id));
}

/**
 * Flow readiness (coherence on the current surface): pre-brief slot ratio vs express SLA-visible required.
 */
export function evaluateFlowReadinessBlocked(args: {
  responses: Record<string, unknown>;
  collectionMode: IntakeBriefCollectionMode | undefined;
  surface: IntakeSurface | undefined;
  intakeVersionTuple: IntakeVersionTuple | undefined;
}): { flowBlocked: boolean; traces: IntakeReadinessTraceEntry[] } {
  const traces: IntakeReadinessTraceEntry[] = [];
  const { responses, collectionMode, surface, intakeVersionTuple } = args;
  let flowBlocked = false;

  if (collectionMode === 'pre_brief') {
    const slots = getPreBriefSubmitSlotIds(responses, collectionMode, intakeVersionTuple);
    const missingPre = slots.filter(id => !isPreBriefSubmitSlotSatisfied(id, responses));
    const minPreBriefAnswered = Math.ceil(slots.length * INTAKE_PRE_BRIEF_SNAPSHOT_MIN_ANSWERED_RATIO);
    const answeredPreBrief = slots.length - missingPre.length;
    flowBlocked = answeredPreBrief < minPreBriefAnswered;
    if (flowBlocked) {
      traces.push({
        code: 'flow_blocked_pre_brief_slots',
        semanticCause: 'Pre-brief link flow has not reached the minimum answered ratio for coherent handoff',
        detail: { missingPreBriefIds: missingPre, minPreBriefAnswered, submitSlotCount: slots.length },
      });
    }
  } else {
    const missingExpressFlow = missingRequiredForMode(
      responses,
      'express',
      collectionMode,
      surface,
      intakeVersionTuple,
    );
    flowBlocked = missingExpressFlow.length > 0;
    if (flowBlocked) {
      traces.push({
        code: 'flow_blocked_express_required',
        semanticCause: 'Express SLA-visible required questions are unanswered for flow coherence',
        detail: { missingRequiredIds: missingExpressFlow },
      });
    }
  }

  return { flowBlocked, traces };
}
