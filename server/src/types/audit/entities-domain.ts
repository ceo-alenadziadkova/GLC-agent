import type { DomainKey } from '@glc/intake-core';

import type { GlcDirectorOrchestrationSlice } from '../../schemas/glc-director-orchestration-slice.js';
import type { PhaseStatus } from './phase-status.js';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DataSource = 'auto_detected' | 'from_brief' | 'inferred';

/**
 * A raw data point that backs a finding.
 * type: short key describing the check ('http_header_scan', 'page_crawl', 'html_meta_tag', etc.)
 * url:  the page URL where the evidence was observed (optional for site-wide checks)
 * finding: the raw value / observation (e.g. header name, tag content, metric value)
 */
export interface EvidenceRef {
  type: string;
  url?: string;
  finding: string;
}

/**
 * Optional cross-phase premise link (Phase 8 causal DAG).
 * `phase_id` must be a known pipeline phase; `claim_id` is 1-based within that phase's CONTROL_OBJECT issues.
 */
export interface AuditIssuePremiseRef {
  phase_id: string;
  claim_id: number;
}

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  /** How confident the agent is that this finding is accurate. */
  confidence: ConfidenceLevel;
  /** Raw data points that back this finding. At least one ref required. */
  evidence_refs: EvidenceRef[];
  /** Where the finding data came from. */
  data_source: DataSource;
  /**
   * When FEATURE_CAUSAL_DAG is enabled, links this finding to prior-phase claims it builds on.
   * Omitted in most runs until prompts teach the model to populate it.
   */
  premise_refs?: AuditIssuePremiseRef[];
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

export interface DomainResult {
  score: number;
  label: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  issues: AuditIssue[];
  quick_wins: QuickWin[];
  recommendations: Recommendation[];
  /**
   * Areas the agent could not evaluate due to missing/unavailable data.
   * E.g. ["Page speed data unavailable — server-side crawl only", "No pricing page found"]
   */
  unknown_items: string[];
  /** Machine-readable Director bundle for orchestration merge (optional; from Claude when enabled). */
  glc_director_execution?: GlcDirectorOrchestrationSlice;
  /** Computed by BaseAgent after fact-check — not provided by Claude directly. */
  confidence_distribution?: ConfidenceDistribution;
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
