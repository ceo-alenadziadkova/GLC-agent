/**
 * Compact intake schema for a brief context — ADR Phase D (`brief-schema` API).
 */
import { getQuestionBankSchemaMeta } from '../question-bank.js';
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from '../../types/audit.js';

import { buildIntakePlan } from './build-intake-plan.js';
import type { IntakeSurface, StepPlanEntry } from './types.js';

export interface BriefSchemaQuestionRow {
  id: string;
  label: string;
  section: string;
  priority: string;
}

export interface BriefSchemaStepRow {
  step_id: string;
  label?: string;
  question_ids: string[];
}

export interface BriefSchemaSnapshot {
  intake_versions: IntakeVersionTuple;
  product_mode: ProductMode;
  collection_mode: IntakeBriefCollectionMode;
  /** Layout surface when applicable; `null` e.g. for `discovery` (no consultant/client layout). */
  surface: IntakeSurface | null;
  eligible: string[];
  visible: string[];
  required: string[];
  hidden: string[];
  deferred: string[];
  sla_visible_bank_ids: string[];
  step_plan: BriefSchemaStepRow[] | null;
  layout_slots: Record<string, string[]>;
  questions: BriefSchemaQuestionRow[];
  derived: {
    ai_readiness_score: number;
    confidence_overall: number;
    website_gate: string;
  };
}

function mapStepPlan(steps: StepPlanEntry[] | null | undefined): BriefSchemaStepRow[] | null {
  if (steps == null || steps.length === 0) return null;
  return steps.map(s => ({
    step_id: s.stepId,
    label: s.label,
    question_ids: [...s.questionIds],
  }));
}

/**
 * Build a versioned, compact plan + bank metadata for the given brief engine context.
 */
export function buildBriefSchemaSnapshot(args: {
  responses: Record<string, unknown>;
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode;
  surface: IntakeSurface | undefined;
  intakeVersionTuple: IntakeVersionTuple;
}): BriefSchemaSnapshot {
  const plan = buildIntakePlan({
    responses: args.responses,
    productMode: args.productMode,
    collectionMode: args.collectionMode,
    surface: args.surface,
    intakeVersionTuple: args.intakeVersionTuple,
  });

  const questions: BriefSchemaQuestionRow[] = [];
  for (const id of plan.visible) {
    const meta = getQuestionBankSchemaMeta(id);
    if (!meta) continue;
    questions.push({
      id,
      label: meta.label,
      section: meta.section,
      priority: meta.priority,
    });
  }

  const layoutSlots = plan.layoutSlots ?? {};

  return {
    intake_versions: plan.versions,
    product_mode: args.productMode,
    collection_mode: args.collectionMode,
    surface: args.surface ?? null,
    eligible: plan.eligible,
    visible: plan.visible,
    required: plan.required,
    hidden: plan.hidden,
    deferred: plan.deferred,
    sla_visible_bank_ids: plan.slaVisibleBankIds,
    step_plan: mapStepPlan(plan.stepPlan),
    layout_slots: { ...layoutSlots },
    questions,
    derived: {
      ai_readiness_score: plan.derivedFacts.aiReadinessScore,
      confidence_overall: plan.confidence.overall,
      website_gate: plan.derivedFacts.segmentHints.websiteGate,
    },
  };
}
