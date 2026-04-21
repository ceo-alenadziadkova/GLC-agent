/**
 * Compact intake schema for a brief context — ADR Phase D (`brief-schema` API).
 */
import { expandAnswerContractForApi, getQuestionBankAnswerContract, getQuestionBankSchemaMeta } from '../question-bank.js';
import { getQuestionBankLegalMetaForBankId, type QuestionBankLegalMetaRowV1 } from '../question-bank-legal-meta.v1.js';
import type { IntakeAnswerContract } from '../types.js';
import type {
  IntakeBriefCollectionMode,
  IntakeCriticalSignalConfidence,
  IntakeReadinessEnvelope,
  IntakeVersionTuple,
  ProductMode,
} from '../audit-contract.js';

import { buildIntakePlan } from './build-intake-plan.js';
import { evaluateIntakeReadinessEnvelope } from './intake-readiness-envelope.js';
import type { IntakeSurface, StepPlanEntry } from './types.js';

export interface BriefSchemaQuestionRow {
  id: string;
  label: string;
  section: string;
  priority: string;
  /** Canon answer contract; `optionsRef` expanded to `options` for clients. */
  answer?: IntakeAnswerContract;
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
    /** UX / resolver aggregate — not `signalConfidence` and not phase-level analysis confidence (ADR §3.2). */
    confidence_overall: number;
    website_gate: string;
    /** Canon `reportUse` → answer snippet when present on visible answered questions. */
    report_anchors?: Record<string, string>;
  };
  /** Domains with unanswered in-scope primary bank questions (SLA-visible set). */
  missing_for_report: string[];
  next_recommended: string[];
  /** ADR Diagnostic Adaptive Intake — execution / flow readiness (authoritative at enforcement points). */
  readiness: Pick<IntakeReadinessEnvelope, 'flowReadinessStatus' | 'auditReadinessStatus' | 'trace'>;
  /**
   * Pilot critical signals — `by_key` is ADR `signalConfidence` (not `derived.confidence_overall`).
   */
  critical_signals: {
    by_key: Record<string, IntakeCriticalSignalConfidence>;
    summary: { satisfied: boolean };
  };
  /** Pilot remediation suggestions (eligible ∩ allow-list), max 2; empty when none. */
  remediation_queue: string[];
  /** Per visible bank id: GDPR-oriented metadata (contract-first intake); see `question-bank-legal-meta.v1.ts`. */
  legal?: Record<string, QuestionBankLegalMetaRowV1>;
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
  /** Defaults to `productMode` — override when audit execution plan differs from schema product axis. */
  slaProductMode?: ProductMode;
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
    const ac = getQuestionBankAnswerContract(id);
    questions.push({
      id,
      label: meta.label,
      section: meta.section,
      priority: meta.priority,
      ...(ac ? { answer: expandAnswerContractForApi(ac) } : {}),
    });
  }

  const layoutSlots = plan.layoutSlots ?? {};

  const legal: Record<string, QuestionBankLegalMetaRowV1> = {};
  for (const row of questions) {
    const lm = getQuestionBankLegalMetaForBankId(row.id);
    if (lm) {
      legal[row.id] = lm;
    }
  }

  const slaMode = args.slaProductMode ?? args.productMode;
  const readiness = evaluateIntakeReadinessEnvelope({
    responses: args.responses,
    slaProductMode: slaMode,
    collectionMode: args.collectionMode,
    surface: args.surface,
    intakeVersionTuple: args.intakeVersionTuple,
  });

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
      ...(plan.derivedFacts.reportAnchors && Object.keys(plan.derivedFacts.reportAnchors).length > 0
        ? { report_anchors: { ...plan.derivedFacts.reportAnchors } }
        : {}),
    },
    missing_for_report: [...plan.missingForReport],
    next_recommended: [...plan.nextRecommended],
    readiness: {
      flowReadinessStatus: readiness.flowReadinessStatus,
      auditReadinessStatus: readiness.auditReadinessStatus,
      trace: readiness.trace,
    },
    critical_signals: {
      by_key: { ...(plan.criticalSignals?.confidenceByKey ?? {}) },
      summary: { satisfied: plan.criticalSignals?.satisfied ?? true },
    },
    remediation_queue: [...(plan.remediation?.queue ?? [])],
    legal: Object.keys(legal).length > 0 ? legal : undefined,
  };
}
