import type { DomainKey } from '@glc/intake-core';

export type ProductMode = 'free_snapshot' | 'express' | 'full';
export type AuditCoveragePackage = 'starter' | 'pro' | 'complete';
export type AuditDepth = 'light' | 'standard' | 'deep';
export type AuditOrigin =
  | 'snapshot'
  | 'discovery'
  | 'prebrief'
  | 'request_queue'
  | 'client_direct'
  | 'consultant_direct'
  | 'unknown';

export type UserRole = 'consultant' | 'client' | 'guest';

export type AuditRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'delivered';

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

export interface AuditMeta {
  id: string;
  user_id: string;
  client_id: string | null;
  company_url: string;
  no_public_website?: boolean;
  company_name: string | null;
  industry: string | null;
  status: string;
  current_phase: number;
  overall_score: number | null;
  product_mode: ProductMode;
  origin?: AuditOrigin;
  execution_plan?: {
    selected_domains: DomainKey[];
    depth: AuditDepth;
    source: 'user_selected' | 'system_default';
    recommended_domains?: DomainKey[];
    coverage_package?: AuditCoveragePackage;
    include_strategy?: boolean;
  } | null;
  token_budget: number;
  tokens_used: number;
  snapshot_token: string | null;
  created_at: string;
  updated_at: string;
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
