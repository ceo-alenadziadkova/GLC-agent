/**
 * Shared audit / intake contracts consumed by intake-core and re-exported from the server
 * via `server/src/types/audit/` (no server/runtime imports in this file).
 */
export const DOMAIN_KEYS = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export type ProductMode = 'free_snapshot' | 'express' | 'full';

export type BriefPriority = 'required' | 'recommended' | 'optional';
export type BriefResponseSource = 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
export type BriefRevenueSignal = 'high' | 'medium' | 'low';

export interface BriefQuestion {
  id: string;
  priority: BriefPriority;
  importance?: 'red' | 'yellow' | 'green';
  intake_layer?: 0 | 1 | 2 | 3 | 'pre_brief';
  weight?: number;
  ux_group?: 'basics' | 'business' | 'tech' | 'audience' | 'goals';
  section?: string;
  domains: Array<DomainKey | 'all'>;
  question: string;
  hint?: string;
  consultant_hint?: string;
  revenue_signal?: BriefRevenueSignal;
  triggers_followup?: string[];
  type: 'free_text' | 'single_choice' | 'multi_choice' | 'number' | 'rating' | 'confirm';
  options?: string[];
}

export interface ReconConflict {
  questionId: string;
  detectedValue: string;
  clientValue: string;
  status: 'open' | 'resolved';
  resolvedAt?: string;
  notes?: string;
}

export type IntakeBriefCollectionMode = 'self_serve' | 'interview' | 'pre_brief' | 'discovery';

export type BriefResponseValue = string | string[] | number | boolean | null;

export interface BriefResponseEntry {
  value: BriefResponseValue;
  source: BriefResponseSource;
}

/**
 * ADR Diagnostic Adaptive Intake — canonical readiness tokens (snake_case API contract).
 * Do not merge with pipeline phase `analysisConfidence` / CONTROL_OBJECT confidence (ADR §3.2).
 */
export type FlowReadinessStatus = 'flow_ready' | 'blocked';

export type AuditReadinessStatus = 'audit_ready' | 'blocked' | 'ready_with_caveats';
export type IntakeReadinessCaveatClass =
  | 'full_scope_required_gaps'
  | 'unknown_source_signal_evidence'
  | 'surface_limited_context';

/**
 * Pilot critical-signal confidence (ADR §3.2) — orthogonal to UX `IntakePlan.confidence.overall`
 * and phase-level analysis confidence.
 */
export type IntakeCriticalSignalConfidence = 'high' | 'medium' | 'low' | 'unknown';

/** Compact explainability for sequencing / readiness / remediation (ADR §8, §13). */
export interface IntakeReadinessTraceEntry {
  code: string;
  /** Human-semantic cause for tests and support (not only bank question ids). */
  semanticCause: string;
  questionId?: string;
  signalKey?: string;
  detail?: Record<string, unknown>;
}

export interface IntakeReadinessEnvelope {
  flowReadinessStatus: FlowReadinessStatus;
  auditReadinessStatus: AuditReadinessStatus;
  /**
   * Optional caveats for `ready_with_caveats` (Phase-1 cap: max 3 classes).
   * Keep compact and policy-driven; never emit free-form UI copy here.
   */
  caveats?: IntakeReadinessCaveatClass[];
  trace: IntakeReadinessTraceEntry[];
}

export interface IntakeVersionTuple {
  questionBankVersion: string;
  policyVersion: string;
  layoutVersion: string;
  resolverVersion: string;
  /** Dedicated sequencing artifact version (ADR §4.2); not implied by resolver semver. */
  sequencingVersion: string;
}

export interface IntakeVersionMigration {
  from: IntakeVersionTuple;
  to: IntakeVersionTuple;
  at: string;
  reason: 'client_upgrade' | 'unsupported_stored_repaired';
}
