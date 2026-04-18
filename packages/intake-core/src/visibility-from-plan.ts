/**
 * Single visibility source: delegate to `buildIntakePlan` (ADR unified intake).
 * Kept separate from `data-quality.ts` to avoid a cycle with `plan-derived.ts`.
 */
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from './audit-contract.js';
import { buildIntakePlan } from './core/build-intake-plan.js';
import type { BuildIntakePlanInput, IntakeSurface } from './core/types.js';
import type { IntakeQuestionStub, IntakeResponsesMap, IntakeVisibilityContext } from './types.js';

/** Default plan input when scoring stored brief rows (consultant-led full bank). See docs/QUESTION_BANK.md §10. */
export const DATA_QUALITY_DEFAULT_PLAN_INPUT: Pick<
  BuildIntakePlanInput,
  'productMode' | 'collectionMode' | 'surface'
> = {
  productMode: 'full',
  collectionMode: undefined,
  surface: 'consultant_interview',
};

function briefCollectionModeFromVisibilityCtx(
  ctx?: IntakeVisibilityContext,
): IntakeBriefCollectionMode | undefined {
  if (ctx?.collectionMode === 'discovery') return 'discovery';
  return undefined;
}

function surfaceFromVisibilityCtx(ctx?: IntakeVisibilityContext): IntakeSurface | undefined {
  if (ctx?.collectionMode === 'discovery') return 'public_discovery';
  return DATA_QUALITY_DEFAULT_PLAN_INPUT.surface;
}

/**
 * Maps legacy `IntakeVisibilityContext` + optional overrides to resolver input.
 */
export function buildPlanInputFromVisibilityContext(
  responses: Record<string, unknown>,
  ctx?: IntakeVisibilityContext,
  opts?: {
    productMode?: ProductMode;
    collectionMode?: IntakeBriefCollectionMode;
    surface?: IntakeSurface;
    intakeVersionTuple?: IntakeVersionTuple;
  },
): BuildIntakePlanInput {
  const collectionMode = opts?.collectionMode ?? briefCollectionModeFromVisibilityCtx(ctx);
  const surface = opts?.surface ?? surfaceFromVisibilityCtx(ctx);
  return {
    responses,
    productMode: opts?.productMode ?? 'full',
    collectionMode,
    surface,
    intakeVersionTuple: opts?.intakeVersionTuple,
  };
}

/**
 * Visible stubs in `plan.visible` order, intersected with the provided `questions` list (same objects as input).
 */
export function filterVisibleQuestionsFromPlan(
  questions: IntakeQuestionStub[],
  responses: IntakeResponsesMap,
  ctx?: IntakeVisibilityContext,
  intakeVersionTuple?: IntakeVersionTuple,
): IntakeQuestionStub[] {
  const input = buildPlanInputFromVisibilityContext(responses, ctx, { intakeVersionTuple });
  const plan = buildIntakePlan(input);
  const byId = new Map(questions.map(q => [q.id, q] as const));
  const out: IntakeQuestionStub[] = [];
  for (const id of plan.visible) {
    const stub = byId.get(id);
    if (stub) out.push(stub);
  }
  return out;
}
