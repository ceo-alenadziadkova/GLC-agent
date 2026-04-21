/**
 * Intake plan types — contract for buildIntakePlan (ADR: unified question bank).
 * Phase 0: used by fixtures and snapshot tests; resolver fills these in Phase 2.
 */
import type {
  IntakeBriefCollectionMode,
  IntakeReadinessTraceEntry,
  IntakeVersionTuple,
  IntakeCriticalSignalConfidence,
  ProductMode,
} from '../audit-contract.js';

export type { IntakeVersionTuple };

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

/** Inputs for buildIntakePlan (audit product + collection + answers). */
export interface BuildIntakePlanInput {
  responses: Record<string, unknown>;
  productMode: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
  /**
   * Optional layout surface: `public_discovery` requires `collectionMode: 'discovery'`.
   * Consultant/client/portal surfaces apply whenever set (see `layout-rules.v1.json`).
   */
  surface?: IntakeSurface;
  /**
   * When set, policy/layout/bank JSON are loaded for this tuple (frozen bundles) instead of only the
   * live artifacts. Resolver **code** is always the current server build.
   */
  intakeVersionTuple?: IntakeVersionTuple;
  /**
   * Optional optimization hint: response keys changed since previous plan.
   * Used only when recomputing from a previous runtime state.
   */
  changedResponseKeys?: string[];
}

export interface IntakePlanRuntimeState {
  responses: Record<string, unknown>;
  canon: {
    branchPassByCondition: Record<string, boolean>;
    passById: Record<string, boolean>;
  };
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

/** Pipeline slice keys for `coverage.byDomain` (aligned with `QUESTION_FEED_ROLES`). */
export type IntakePlanCoverageDomain =
  | 'recon'
  | 'tech_infrastructure'
  | 'security_compliance'
  | 'seo_digital'
  | 'ux_conversion'
  | 'marketing_utp'
  | 'automation_processes'
  | 'strategy';

export interface IntakePlanDerivedFacts {
  aiReadinessScore: number;
  aiReadinessComponents: {
    base: number;
    exportData: number;
    governance: number;
    automationAttempt: number;
    d4aBonus: number;
    d2Bonus: number;
    penalties: number;
    scaleBonus: number;
  };
  segmentHints: {
    websiteGate: string;
  };
  /**
   * Canon `reportUse` tag → normalized answer string for visible, answered bank questions (first tag wins on collision).
   */
  reportAnchors?: Record<string, string>;
}

export interface IntakePlanCoverage {
  /**
   * Per domain: ratio of answered to total in-scope primary bank questions (0–1).
   * Key is absent (undefined) when no SLA questions are scoped for that domain —
   * do NOT treat absence as 0 or 1; render as "N/A" in UI.
   */
  byDomain: Partial<Record<IntakePlanCoverageDomain, number>>;
}

export interface IntakePlanConfidence {
  /** 0–1 blend of AI readiness and visible-stub data quality. */
  overall: number;
  rationale?: string[];
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
  /** Bank ids in play after canon + policy (includes deferred; layout order does not affect membership). */
  eligible: string[];
  visible: string[];
  required: string[];
  hidden: string[];
  deferred: string[];
  /**
   * Bank ids used to compute `required` (SLA). Equals policy-visible bank ids except for
   * `collectionMode === 'pre_brief'`, where the client surface is narrower but full/express SLA
   * still uses branch-wide bank visibility.
   */
  slaVisibleBankIds: string[];
  /**
   * Layout step id → ordered bank question ids placed in that step (subset of policy-visible set).
   * Keys match `stepPlan[].stepId`. Prefer this over scanning `stepPlan` when you need a flat map.
   */
  layoutSlots?: Record<string, string[]>;
  stepPlan?: StepPlanEntry[] | null;
  reasonsById?: Record<string, QuestionReason[]>;
  debugTrace?: DebugTraceEntry[];
  versions: IntakeVersionTuple;
  derivedFacts: IntakePlanDerivedFacts;
  coverage: IntakePlanCoverage;
  confidence: IntakePlanConfidence;
  /**
   * Domain slices where at least one SLA-visible primary-feed bank question is still unanswered
   * (report / agent input gap). Empty when every in-scope primary for those domains is answered.
   */
  missingForReport: IntakePlanCoverageDomain[];
  /**
   * Suggested next bank ids (wizard order): unanswered required first, then recommended,
   * then optional primaries for domains in `missingForReport`. UX / consultant hint only.
   */
  nextRecommended: string[];
  /** Internal runtime cache for incremental recompute paths. */
  runtimeState?: IntakePlanRuntimeState;
  /**
   * Pilot critical signals — `confidenceByKey` is ADR signal confidence (not `confidence.overall`).
   */
  criticalSignals?: {
    satisfied: boolean;
    confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
    trace: IntakeReadinessTraceEntry[];
  };
  /** Pilot remediation: suggested unanswered bank ids (eligible ∩ allow-list), max 2. */
  remediation?: {
    queue: string[];
    trace: IntakeReadinessTraceEntry[];
  };
}
