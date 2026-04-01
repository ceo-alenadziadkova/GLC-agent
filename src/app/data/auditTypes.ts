// ─── Types matching the backend/DB schema ──────────────────

export type ProductMode = 'free_snapshot' | 'express' | 'full';

export type UserRole = 'consultant' | 'client';
export type BriefResponseSource = 'client' | 'consultant' | 'recon_confirmed' | 'unknown';
export type IntakeReadinessBadge = 'low' | 'medium' | 'high';
export type IntakeNextBestAction = 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';
export type BriefResponseValue = string | string[] | number | boolean | null;

export interface BriefResponseEntry {
  value: BriefResponseValue;
  source: BriefResponseSource;
}

export type AuditRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'delivered';

export interface IntakeBrief {
  id: string;
  audit_id: string;
  responses: Record<string, BriefResponseValue | BriefResponseEntry>;
  status: 'draft' | 'submitted';
  layer_completed: 0 | 1 | 2 | 3;
  collected_by: 'client' | 'consultant';
  collection_mode: 'self_serve' | 'interview' | 'pre_brief';
  data_quality_score: number;
  sla_met: boolean;
  answered_required: number;
  answered_recommended: number;
  answered_optional: number;
  total_required: number;
  total_recommended: number;
  total_optional: number;
  recon_prefills: Record<string, unknown>;
  post_audit_questions: Array<Record<string, unknown>>;
  progress_pct: number;
  readiness_badge: IntakeReadinessBadge;
  next_best_action: IntakeNextBestAction;
  responses_format: 1 | 2;
  created_at: string;
  updated_at: string;
}

export interface AuditRequest {
  id: string;
  client_id: string;
  audit_id: string | null;
  url: string;
  industry: string | null;
  product_mode: 'express' | 'full';
  status: AuditRequestStatus;
  brief_snapshot: Record<string, unknown>;
  client_notes: string | null;
  consultant_note: string | null;
  created_at: string;
  updated_at: string;
}

// Free Snapshot result (public, no auth)
export interface FreeSnapshotPreview {
  audit_id: string;
  snapshot_token: string;
  status: 'running' | 'completed' | 'failed';
  company_url: string;
  company_name: string | null;
  tech_stack: Record<string, string[]>;
  location: string | null;
  ux_score: number | null;
  ux_label: string | null;
  ux_summary: string | null;
  issues: Array<{ id: string; severity: string; title: string; description: string; impact: string }>;
  quick_wins: Array<{ id: string; title: string; description: string; effort: string; timeframe: string }>;
}

export const DOMAIN_KEYS = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  tech_infrastructure: 'Tech Infrastructure',
  security_compliance: 'Security & Compliance',
  seo_digital: 'SEO & Digital',
  ux_conversion: 'UX & Conversion',
  marketing_utp: 'Marketing & Positioning',
  automation_processes: 'Automation & Processes',
};

export const SCORE_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'Needs Work',
  3: 'Moderate',
  4: 'Good',
  5: 'Excellent',
};

export const SCORE_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#22C55E',
  5: '#0ECF82',
};

// ─── Data structures ───────────────────────────────────────

export interface AuditMeta {
  id: string;
  user_id: string;
  client_id: string | null;
  company_url: string;
  company_name: string | null;
  industry: string | null;
  status: string;
  current_phase: number;
  overall_score: number | null;
  product_mode: ProductMode;
  token_budget: number;
  tokens_used: number;
  snapshot_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconData {
  id: string;
  audit_id: string;
  status: string;
  company_name: string | null;
  industry: string | null;
  location: string | null;
  languages: string[];
  tech_stack: Record<string, string[]>;
  social_profiles: Record<string, string>;
  contact_info: { emails: string[]; phones: string[]; addresses: string[] };
  pages_crawled: CrawledPage[];
  brief: string | null;
  interview_answers: string | null;
}

export interface CrawledPage {
  url: string;
  title: string;
  status: number;
  meta_description: string | null;
  h1: string[];
  structured_data: string[];
  images: { total: number; with_alt: number; missing_alt: number; lazy_loaded: number };
}

// ─── Finding Provenance (Sprint 14) ───────────────────────
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DataSource = 'auto_detected' | 'from_brief' | 'inferred';

export interface EvidenceRef {
  type: string;
  url?: string;
  finding: string;
}

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: ConfidenceLevel;
  evidence_refs: EvidenceRef[];
  data_source: DataSource;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_cost: string;
  estimated_time: string;
  impact: string;
}

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
}

export interface ConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface DomainData {
  id: string;
  audit_id: string;
  domain_key: DomainKey;
  phase_number: number;
  status: string;
  score: number | null;
  label: string | null;
  version: number;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  issues: AuditIssue[];
  quick_wins: QuickWin[];
  recommendations: Recommendation[];
  unknown_items: string[];
  confidence_distribution: ConfidenceDistribution | null;
  raw_data: Record<string, unknown>;
}

export interface StrategyInitiative {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export interface StrategyRoadmap {
  id: string;
  audit_id: string;
  status: string;
  executive_summary: string | null;
  overall_score: number | null;
  quick_wins: StrategyInitiative[];
  medium_term: StrategyInitiative[];
  strategic: StrategyInitiative[];
  scorecard: ScorecardEntry[];
}

export interface ScorecardEntry {
  domain_key: DomainKey;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
}

export interface ReviewPoint {
  id: string;
  audit_id: string;
  after_phase: number;
  status: 'pending' | 'approved';
  consultant_notes: string | null;
  interview_notes: string | null;
  approved_at: string | null;
}

export interface PipelineEvent {
  id: number;
  audit_id: string;
  phase: number;
  event_type: string;
  message: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

// ─── Quality Gate (Sprint 16) ──────────────────────────────

export interface QualityFlag {
  id: string;
  /** 'warning' — must acknowledge before approving; 'info' — informational only */
  severity: 'warning' | 'info';
  domain_key: string | null;
  rule: string;
  message: string;
}

export interface QualityGateReport {
  /** True when there are no 'warning'-level flags */
  passed: boolean;
  flags: QualityFlag[];
  checked_at: string;
}

// ─── Full audit state ──────────────────────────────────────

export interface AuditState {
  meta: AuditMeta;
  recon: ReconData | null;
  domains: Record<string, DomainData | null>;
  strategy: StrategyRoadmap | null;
  reviews: ReviewPoint[];
}
