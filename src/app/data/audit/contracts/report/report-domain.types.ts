import type { DomainKey } from '@glc/intake-core';

import type { GlcOrchestrationPackRevisionDiffView, GlcOrchestrationPackView } from './orchestration-pack.types';

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

export interface StrategyInitiativeEvidenceSource {
  domain_key: DomainKey;
  issue_id?: string;
  signal?: string;
}

export interface StrategyInitiative {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  dependencies?: string[];
  domain?: string;
  stage?: string;
  priority?: string;
  confidence?: number;
  context?: { signals: string[]; problems?: string[]; risks?: string[] };
  outcome?: { description: string; timeframe?: string };
  scope?: { includes: string[]; excludes: string[] };
  execution_paths?: Array<{
    type: string;
    description: string;
    time_estimate: string;
    tools?: string[];
    architecture?: string;
    steps?: string[];
    incompatible?: boolean;
    incompatibility_reason?: string;
  }>;
  alternatives?: Array<{ name: string; type?: string; pros?: string[]; cons?: string[] }>;
  automation?: { level: string; tools?: string[] };
  constraints?: { budget?: string; team?: string; tech?: string };
  readiness?: { score: number; blockers?: string[] };
  decision?: { why_this: string[]; tradeoffs?: string[]; if_skipped?: string[] };
  evidence?: { sources: StrategyInitiativeEvidenceSource[] };
  evidence_verified?: boolean;
}

export interface ScorecardEntry {
  domain_key: DomainKey;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
}

/** Read model: merged brief + Strategy Lab overrides (server-computed on GET audit). */
export interface StrategyEffectiveConstraints {
  company_stage: string;
  budget_band: string;
  team_scale: string;
}

/** Persisted Strategy Lab JSON subset exposed on the audit strategy read model. */
export type StrategyLabContextView = Partial<StrategyEffectiveConstraints> & {
  director_stage2_domains?: DomainKey[];
};

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
  schema_version?: number;
  /** Persisted manual overrides (subset of constraint axes + orchestration intent). */
  strategy_lab_context?: StrategyLabContextView;
  effective_constraints?: StrategyEffectiveConstraints;
  /** GLC Orchestrator cross-domain pack when generated (see docs/ARCHITECTURE.md). */
  glc_orchestration_pack?: GlcOrchestrationPackView | null;
  orchestration_pack_version?: number;
  /** Last vN→vN+1 diff when pack was regenerated (server JSON). */
  glc_orchestration_last_revision_diff?: GlcOrchestrationPackRevisionDiffView | null;
}

export type { GlcOrchestrationPackRevisionDiffView, GlcOrchestrationPackView } from './orchestration-pack.types';
