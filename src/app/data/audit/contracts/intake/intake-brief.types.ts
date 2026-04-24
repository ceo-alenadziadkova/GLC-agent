export type BriefResponseSource = 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
export type IntakeReadinessBadge = 'low' | 'medium' | 'high';
export type IntakeNextBestAction = 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';
export type IntakeBriefCollectionMode = 'self_serve' | 'interview' | 'pre_brief' | 'discovery';

/** Bank / policy / layout / resolver versions persisted with brief saves (ADR unified intake). */
export interface IntakeVersionTuple {
  questionBankVersion: string;
  policyVersion: string;
  layoutVersion: string;
  resolverVersion: string;
  sequencingVersion: string;
}

export type BriefResponseValue = string | string[] | number | boolean | null;

export interface BriefResponseEntry {
  value: BriefResponseValue;
  source: BriefResponseSource;
}

export interface ReconConflict {
  questionId: string;
  detectedValue: string;
  clientValue: string;
  status: 'open' | 'resolved';
  resolvedAt?: string;
  notes?: string;
}

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
  intake_versions?: IntakeVersionTuple | null;
  created_at: string;
  updated_at: string;
}
