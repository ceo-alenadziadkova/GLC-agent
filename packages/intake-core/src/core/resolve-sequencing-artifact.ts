import sequencingPilot from '../artifacts/intake-sequencing-pilot-1.0.0.json' with { type: 'json' };
import type { DomainKey } from '../audit-contract.js';
import type {
  IntakeBridgeQuestionLifecycleState,
  IntakeBridgeQuestionOwner,
} from '../config/intake-bridge-governance-policy.js';

export interface SequencingPilotTransitionV1 {
  id: string;
  semanticCause: string;
}

/**
 * Deterministic dependency hints for pilot sequencing trace (ADR Phase-1 explainability).
 * Does not change `visible`; validates prerequisite bank cells for documentation / support.
 */
export interface SequencingDependencyRuleV1 {
  id: string;
  /** Links to `transitionTypes[].id` for trace correlation. */
  transitionId: string;
  /** All must be answered (non-unknown intake semantics) before the transition is considered satisfied. */
  requiresAnsweredBankIds: string[];
  semanticCause: string;
  lifecycle: {
    owner: IntakeBridgeQuestionOwner;
    kpiMetric: string;
    state: IntakeBridgeQuestionLifecycleState;
    reviewByIsoDate: string;
  };
}

export interface SequencingPilotArtifactV1 {
  version: string;
  maxTransitionTypes: number;
  pilotIndustryLabels: string[];
  transitionTypes: SequencingPilotTransitionV1[];
  /** Optional: evaluated only when pilot sequencing applies; sorted by `id` for stable traces. */
  dependencyRules?: SequencingDependencyRuleV1[];
  askSlotContract?: Record<
    string,
    {
      unlocksSignals: string[];
      guardDomain: DomainKey | 'strategy';
      transitionRuleRef?: string;
      sourcesByPriority?: string[];
      unknownPolicy?: 'allow_flow_only' | 'allow_with_caveat' | 'block_audit_ready';
      conflictRuleRef?: string;
    }
  >;
  remediationAllowedBankIds: string[];
  strictRecommendedOrderWhenPilot: string[];
}

const PILOT = sequencingPilot as SequencingPilotArtifactV1;

export function resolveSequencingPilotArtifact(sequencingVersion: string): SequencingPilotArtifactV1 | null {
  if (sequencingVersion === PILOT.version) return PILOT;
  return null;
}
