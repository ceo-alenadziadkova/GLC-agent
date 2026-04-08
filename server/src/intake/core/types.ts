/**
 * Intake plan types — contract for buildIntakePlan (ADR: unified question bank).
 * Phase 0: used by fixtures and snapshot tests; resolver fills these in Phase 2.
 */

export interface IntakeVersionTuple {
  questionBankVersion: string;
  policyVersion: string;
  layoutVersion: string;
  resolverVersion: string;
}

/** Product intake scenario (policy axis; not identical to DB product_mode). */
export type IntakeScenarioMode = 'full' | 'express' | 'discovery' | 'pre_brief';

/** UI / entry surface (layout axis; orthogonal to scenario in ADR). */
export type IntakeSurface =
  | 'consultant_interview'
  | 'client_form'
  | 'client_portal'
  | 'internal_review'
  | 'public_discovery';

export interface IntakePlanContext {
  mode: IntakeScenarioMode;
  surface?: IntakeSurface;
}

/** Per-question classification trace (explainability). */
export interface QuestionReason {
  questionId: string;
  layer: 'canon' | 'policy' | 'layout';
  state: 'eligible' | 'hidden' | 'visible' | 'deferred' | 'required';
  code: string;
  detail?: string;
}

export interface DebugTraceEntry {
  layer: 'canon' | 'policy' | 'layout' | 'resolver';
  level: 'info' | 'warn' | 'error';
  code: string;
  message: string;
}

export interface StepPlanEntry {
  stepId: string;
  label?: string;
  questionIds: string[];
}

/**
 * Resolver output (ADR). Phase 2+ populates all fields; Phase 0 snapshots only
 * materialize subset: eligible, visible, required, hidden, deferred.
 */
export interface IntakePlan {
  eligible: string[];
  visible: string[];
  required: string[];
  hidden: string[];
  deferred: string[];
  layoutSlots?: Record<string, string | null>;
  stepPlan?: StepPlanEntry[] | null;
  reasonsById?: Record<string, QuestionReason[]>;
  debugTrace?: DebugTraceEntry[];
  versions: IntakeVersionTuple;
}
