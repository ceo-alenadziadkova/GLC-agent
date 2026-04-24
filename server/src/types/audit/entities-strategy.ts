import type { DomainKey } from '@glc/intake-core';

import type { StrategyInitiative } from '../../schemas/domain-output.js';
import type { PhaseStatus } from './phase-status.js';

export type { StrategyInitiative } from '../../schemas/domain-output.js';

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
  /** 1 = legacy shape; 2 = initiative v2 fields. */
  schema_version?: number;
}

export interface ScorecardEntry {
  domain_key: DomainKey;
  label: string;
  score: number;
  weight: number;
  weighted_score: number;
}
