import type {
  IntakeBrief,
  IntakeBriefCollectionMode,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionMigration,
  IntakeVersionTuple,
} from '../../types/audit.js';

export interface BriefValidationResult {
  passed: boolean;
  sla_met: boolean;
  answered_required: number;
  total_required: number;
  answered_recommended: number;
  total_recommended: number;
  missing_required: Array<{ id: string; question: string }>;
}

export interface IntakeProgress {
  progressPct: number;
  readinessBadge: IntakeReadinessBadge;
  nextBestAction: IntakeNextBestAction;
}

export interface BriefGateResult {
  canStartSnapshot: boolean;
  canStartExpress: boolean;
  canStartFull: boolean;
  canStartPipeline: boolean;
  missingRequiredIds: string[];
  recommendedToImproveIds: string[];
  intakeProgress: IntakeProgress;
}

export interface SaveBriefResult {
  brief: IntakeBrief;
  validation: BriefValidationResult;
  gates: BriefGateResult;
}

export interface SaveBriefOptions {
  collection_mode?: IntakeBriefCollectionMode;
  /**
   * Which UX/layout lens to use for visible-based stats (recommended, progress weights).
   * Routes set this from audit access (consultant vs client); default consultant.
   */
  validation_perspective?: 'consultant' | 'client';
  /** Set by PUT /brief after validateIntakeVersionsForBriefWrite. */
  effective_intake_versions?: IntakeVersionTuple;
  /** When non-null, persisted to intake_version_migration on upsert. */
  intake_version_migration?: IntakeVersionMigration | null;
}
