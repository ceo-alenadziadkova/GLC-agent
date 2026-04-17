import type { ReportProfile } from '@glc/intake-core';

export type { ReportProfile };

export interface AuditRow {
  company_url: string;
  created_at: string;
  overall_score: number | null;
  industry?: string | null;
  execution_plan?: {
    selected_domains?: string[];
  } | null;
}

export interface ReconRow {
  company_name?: string | null;
  industry?: string | null;
  location?: string | null;
}

export interface DomainRow {
  domain_key: string;
  score: number | null;
  label: string | null;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  issues:
    | Array<{
        id: string;
        severity: string;
        title: string;
        description: string;
        impact: string;
        confidence?: string;
      }>
    | null;
  quick_wins:
    | Array<{
        id: string;
        title: string;
        description: string;
        effort?: string;
        timeframe?: string;
      }>
    | null;
  recommendations:
    | Array<{
        id: string;
        title: string;
        description: string;
        priority: string;
        estimated_cost?: string;
        estimated_time?: string;
        impact?: string;
      }>
    | null;
  status: string;
  phase_number: number;
}

export interface StrategyRow {
  executive_summary?: string | null;
  overall_score?: number | null;
  quick_wins?:
    | Array<{ id: string; title: string; description: string; effort?: string; impact?: string }>
    | null;
  medium_term?:
    | Array<{ id: string; title: string; description: string; effort?: string; impact?: string }>
    | null;
  strategic?:
    | Array<{ id: string; title: string; description: string; effort?: string; impact?: string }>
    | null;
  scorecard?:
    | Array<{
        domain_key: string;
        label: string;
        score: number;
        weight: number;
        weighted_score: number;
      }>
    | null;
}

export interface ReportInput {
  audit: AuditRow;
  recon: ReconRow | null;
  domains: DomainRow[];
  strategy: StrategyRow | null;
}

export interface MarkdownReportCoverage {
  covered_domains: string[];
  not_covered_domains: string[];
  coverage_ratio: number;
  coverage_adjusted_score: number | null;
  comparability_note: string;
}

export interface MarkdownReport {
  profile: ReportProfile;
  profile_label: string;
  company: string;
  generated_at: string;
  markdown: string;
  coverage: MarkdownReportCoverage;
}
