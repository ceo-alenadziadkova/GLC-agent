import type { DomainKey } from '@glc/intake-core';

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

export interface ScorecardEntry {
  domain_key: DomainKey;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
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
