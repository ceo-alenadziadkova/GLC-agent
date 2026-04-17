export type {
  BriefPriority,
  BriefQuestion,
  BriefResponseEntry,
  BriefResponseSource,
  BriefResponseValue,
  BriefRevenueSignal,
  IntakeBriefCollectionMode,
  IntakeReadinessBadge,
  IntakeVersionMigration,
  IntakeVersionTuple,
  ReconConflict,
} from '@glc/intake-core';

import type {
  BriefResponseEntry,
  BriefResponseValue,
  IntakeBriefCollectionMode,
  IntakeReadinessBadge,
  IntakeVersionMigration,
  IntakeVersionTuple,
  ReconConflict,
} from '@glc/intake-core';

export type IntakeNextBestAction = 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';

export interface IntakeBrief {
  id: string;
  audit_id: string;
  responses: Record<string, BriefResponseValue | BriefResponseEntry>;
  status: 'draft' | 'submitted';
  layer_completed: 0 | 1 | 2 | 3;
  collected_by: 'client' | 'consultant';
  collection_mode: IntakeBriefCollectionMode;
  data_quality_score: number;
  sla_met: boolean;
  answered_required: number;
  answered_recommended: number;
  answered_optional: number;
  total_required: number;
  total_recommended: number;
  total_optional: number;
  recon_prefills: Record<string, unknown>;
  recon_conflicts: ReconConflict[];
  post_audit_questions: Array<Record<string, unknown>>;
  progress_pct: number;
  readiness_badge: IntakeReadinessBadge;
  next_best_action: IntakeNextBestAction;
  responses_format: 2;
  /** Null if row predates migration 027; validation uses current engine. */
  intake_versions?: IntakeVersionTuple | null;
  /** Last intake_versions migration (upgrade or repair of unsupported stored tuple). */
  intake_version_migration?: IntakeVersionMigration | null;
  created_at: string;
  updated_at: string;
}
