// ─── Product Modes ─────────────────────────────────────────
export type ProductMode = 'free_snapshot' | 'express' | 'full';

export const PRODUCT_MODES: ProductMode[] = ['free_snapshot', 'express', 'full'];

// ─── Domain Keys ───────────────────────────────────────────
export const DOMAIN_KEYS = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

// ─── Phase Mapping ─────────────────────────────────────────
export const PHASE_DOMAIN_MAP: Record<number, DomainKey | 'recon' | 'strategy'> = {
  0: 'recon',
  1: 'tech_infrastructure',
  2: 'security_compliance',
  3: 'seo_digital',
  4: 'ux_conversion',
  5: 'marketing_utp',
  6: 'automation_processes',
  7: 'strategy',
};

export const REVIEW_AFTER_PHASES = [0, 4, 7] as const;

export type PhaseStatus = 'pending' | 'collecting' | 'analyzing' | 'completed' | 'failed';
export type AuditStatus = 'created' | 'recon' | 'auto' | 'analytic' | 'review' | 'completed' | 'failed';

// ─── Score System ──────────────────────────────────────────
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

// ─── Data Structures ───────────────────────────────────────
export interface AuditMeta {
  id: string;
  user_id: string | null;
  company_url: string;
  company_name: string | null;
  industry: string | null;
  status: AuditStatus;
  current_phase: number;
  overall_score: number | null;
  token_budget: number;
  tokens_used: number;
  product_mode: ProductMode;
  snapshot_token: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Free Snapshot Result ──────────────────────────────────
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
  issues: AuditIssue[];
  quick_wins: QuickWin[];
}

export interface ReconData {
  id: string;
  audit_id: string;
  status: PhaseStatus;
  company_name: string | null;
  industry: string | null;
  location: string | null;
  languages: string[];
  tech_stack: TechStack;
  social_profiles: Record<string, string>;
  contact_info: ContactInfo;
  pages_crawled: CrawledPage[];
  brief: string | null;
  interview_answers: string | null;
}

export interface TechStack {
  cms: string[];
  analytics: string[];
  hosting_cdn: string[];
  frameworks: string[];
  chat_support: string[];
  ecommerce: string[];
  email_marketing: string[];
  booking: string[];
}

export interface ContactInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
}

export interface CrawledPage {
  url: string;
  title: string;
  status: number;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  structured_data: string[];
  /** Field names match crawler.ts output exactly: total / with_alt / missing_alt / lazy_loaded */
  images: {
    total: number;
    with_alt: number;
    missing_alt: number;
    lazy_loaded: number;
  };
  links: { internal: string[]; external: string[] };
  content_length?: number;
  load_time_ms?: number;
}

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
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

export interface DomainResult {
  score: number;
  label: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  issues: AuditIssue[];
  quick_wins: QuickWin[];
  recommendations: Recommendation[];
}

export interface DomainData extends DomainResult {
  id: string;
  audit_id: string;
  domain_key: DomainKey;
  phase_number: number;
  status: PhaseStatus;
  version: number;
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
  status: PhaseStatus;
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

// ─── Intake Brief ──────────────────────────────────────────

export type BriefPriority = 'required' | 'recommended' | 'optional';

export interface BriefQuestion {
  id: string;
  priority: BriefPriority;
  /** Which agents this question feeds context to */
  domains: Array<DomainKey | 'all'>;
  question: string;
  hint?: string;
  /** free_text | single_choice | multi_choice | number */
  type: 'free_text' | 'single_choice' | 'multi_choice' | 'number';
  options?: string[];
}

export interface IntakeBrief {
  id: string;
  audit_id: string;
  responses: Record<string, string | string[] | number | null>;
  status: 'draft' | 'submitted';
  sla_met: boolean;
  answered_required: number;
  answered_recommended: number;
  created_at: string;
  updated_at: string;
}

// ─── Full Audit State (for API responses) ──────────────────
export interface AuditState {
  meta: AuditMeta;
  recon: ReconData | null;
  domains: Record<DomainKey, DomainData | null>;
  strategy: StrategyRoadmap | null;
  reviews: ReviewPoint[];
  events: PipelineEvent[];
  brief: IntakeBrief | null;
}
