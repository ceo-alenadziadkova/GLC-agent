/**
 * Subset of server audit types required by intake-core (no server/runtime imports).
 * Keep aligned with server/src/types/audit.ts.
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

export interface IntakeVersionTuple {
  questionBankVersion: string;
  policyVersion: string;
  layoutVersion: string;
  resolverVersion: string;
}

export interface IntakeVersionMigration {
  from: IntakeVersionTuple;
  to: IntakeVersionTuple;
  at: string;
  reason: 'client_upgrade' | 'unsupported_stored_repaired';
}
