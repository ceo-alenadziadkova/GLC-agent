/**
 * Intake engine types — aligned with docs/QUESTION_BANK.md (branching, slices, scores).
 */
import type { DomainKey } from '../types/audit.js';

/** Domains that consume intake slices (pipeline agents + recon/strategy). */
export type IntakeSliceDomain = DomainKey | 'recon' | 'strategy';

export type IntakePriority = 'required' | 'recommended' | 'optional';

export type CollectionMode = 'standard' | 'discovery';

/** Minimal question shape for visibility + data-quality (full bank JSON comes later). */
export interface IntakeQuestionStub {
  id: string;
  priority: IntakePriority;
  /** Key into BRANCH_RULES; omitted = always visible (subject to surface filters). */
  branchCondition?: string;
}

export type IntakeResponsesMap = Record<string, unknown>;

export interface DataQualityWeights {
  required: number;
  recommended: number;
  optional: number;
}

export interface DataQualityResult {
  score: number;
  requiredWeight: number;
  recommendedWeight: number;
  optionalWeight: number;
  visibleRequired: number;
  visibleRecommended: number;
  visibleOptional: number;
  answeredRequired: number;
  answeredRecommended: number;
  answeredOptional: number;
}

export interface AiReadinessResult {
  score: number;
  /** 0–1 breakdown for UI/debug (optional). */
  components: {
    base: number;
    exportData: number;
    governance: number;
    automationAttempt: number;
    penalties: number;
    scaleBonus: number;
  };
}
