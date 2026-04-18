import type { DomainResult } from '../../types/audit.js';

export interface BuildControlObjectGovernanceInput {
  riskProfile?: 'low' | 'medium' | 'high' | 'enterprise' | null;
  /** Bandit-selected variant id, including `default` when exploration uses the baseline arm. */
  selectedVariantId?: string;
}

export interface FactCheckResult {
  result: DomainResult;
  corrections: FactCorrection[];
  /** 0–1 overall confidence in the score, derived from corrections + finding confidences. */
  confidence: number;
}

export interface FactCorrection {
  field: string;
  issue: string;
  raw_evidence: string;
  action: 'flag' | 'override';
  original_value?: unknown;
  corrected_value?: unknown;
}

