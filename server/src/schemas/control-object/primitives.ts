import type { DomainKey } from '../../types/audit.js';

export type DecisionHint = 'accept' | 'accept_with_warnings' | 'refine';
export type GovernanceProfile = 'narrow' | 'full';
export type ExecutionMode = 'normal' | 'safe';
export type TruthSource =
  | 'internal_metrics'
  | 'user_brief'
  | 'external_api'
  | 'external_search'
  | 'document_feed';

export type AssumptionSource =
  | 'inferred_from_brief'
  | 'inferred_from_pattern'
  | 'manual_input'
  | 'external_data';

export type PhaseId = DomainKey | 'recon' | 'strategy';
