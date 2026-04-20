/**
 * Policy for Director → orchestrator input (persisted slice under `audit_domains.raw_data`).
 * No business literals in merge services — import from here.
 */

import type { DomainKey } from '@glc/intake-core';

import type { OrchestrationGraphNodeAnalysisDepth } from './orchestration-graph-policy.js';
import {
  ORCHESTRATION_EFFORT_WEIGHTS,
  ORCHESTRATION_IMPACT_WEIGHTS,
  ORCHESTRATION_PRIORITY_WEIGHTS,
} from './orchestration-graph-policy.js';

/** Key inside `audit_domains.raw_data` for the versioned director execution bundle. */
export const GLC_DIRECTOR_EXECUTION_RAW_DATA_KEY = 'glc_director_execution' as const;

export const GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION = 1 as const;

export const DIRECTOR_ORCHESTRATION_ALLOWED_PHASES = [1, 2, 3, 4, 5, 6] as const;
export const DIRECTOR_ORCHESTRATION_STRICT_PHASES = [1, 2, 4, 5, 6] as const;
export type DirectorOrchestrationPersistenceMode = 'best_effort' | 'strict_for_selected_domains';

const ALLOWED_PHASE_SET = new Set<number>(DIRECTOR_ORCHESTRATION_ALLOWED_PHASES);
const STRICT_PHASE_SET = new Set<number>(DIRECTOR_ORCHESTRATION_STRICT_PHASES);

export function isDirectorOrchestrationPhaseAllowed(phase: number): boolean {
  return ALLOWED_PHASE_SET.has(phase);
}

export function directorOrchestrationPersistenceModeForPhase(phase: number): DirectorOrchestrationPersistenceMode {
  return STRICT_PHASE_SET.has(phase) ? 'strict_for_selected_domains' : 'best_effort';
}

/** Cap actions per wave bundle before graph merge (safety). */
export const DIRECTOR_ORCHESTRATION_MAX_ACTIONS_PER_WAVE = 32;

/** Stable id segment for orchestration graph nodes sourced from strategy initiatives. */
export const ORCHESTRATION_NODE_SOURCE_STRATEGY = 'strategy' as const;
export const ORCHESTRATION_NODE_SOURCE_DIRECTOR = 'director' as const;
export const DIRECTOR_ORCHESTRATION_ADAPTER_REGISTRY = {
  default: 'v1_domain_bundle',
} as const;

export const DIRECTOR_ACTION_SCORE_TIERS = {
  /** impact / urgency: >= this → high */
  highMin: 4,
  /** >= this and < highMin → medium */
  mediumMin: 3,
} as const;

/**
 * Builds a stable graph node id for a director action (avoids collisions with strategy initiative ids).
 */
export function makePrefixedDirectorOrchestrationNodeId(
  domainKey: DomainKey,
  wave: OrchestrationGraphNodeAnalysisDepth,
  actionId: string,
): string {
  return `dir:${domainKey}:${wave}:${actionId}`;
}

type ImpactKey = keyof typeof ORCHESTRATION_IMPACT_WEIGHTS;
type EffortKey = keyof typeof ORCHESTRATION_EFFORT_WEIGHTS;
type PriorityKey = keyof typeof ORCHESTRATION_PRIORITY_WEIGHTS;

function numericToHighMediumLow(score: number): 'high' | 'medium' | 'low' {
  if (score >= DIRECTOR_ACTION_SCORE_TIERS.highMin) return 'high';
  if (score >= DIRECTOR_ACTION_SCORE_TIERS.mediumMin) return 'medium';
  return 'low';
}

/** Maps Director 1–5 scores into orchestration weight enums (deterministic). */
export function directorNumericScoresToOrchestrationWeighting(input: {
  impact: number;
  effort: number;
  urgency: number;
}): { impact: ImpactKey; effort: EffortKey; priority: PriorityKey } {
  const impact = numericToHighMediumLow(input.impact) as ImpactKey;
  const effort = numericToHighMediumLow(input.effort) as EffortKey;
  let priority: PriorityKey = 'low';
  if (input.urgency >= 5) priority = 'critical';
  else if (input.urgency >= 4) priority = 'high';
  else if (input.urgency >= 3) priority = 'medium';
  return { impact, effort, priority };
}
