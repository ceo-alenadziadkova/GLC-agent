import type { DomainKey } from '../audit-contract.js';

/**
 * Question bank ids (v1) used to build director deep-dive client_context from brief answers.
 * Keep in sync with question-bank when mapping expands.
 */
export const DEEP_DIVE_CONTEXT_GOAL_QUESTION_IDS = ['f1', 'e3', 'c2'] as const;
export const DEEP_DIVE_CONTEXT_CONSTRAINT_QUESTION_IDS = ['f6', 'f8', 'f9', 'b5', 'b6'] as const;
export const DEEP_DIVE_CONTEXT_TIMEFRAME_QUESTION_IDS = ['f4', 'f5'] as const;

/**
 * Per-domain key: which question ids to prefer (first match wins for goals/constraints).
 */
export const DEEP_DIVE_CONTEXT_BY_DOMAIN: Readonly<
  Record<string, { goals: readonly string[]; constraints: readonly string[]; timeframe: readonly string[] }>
> = {
  marketing_utp: {
    goals: ['f1', 'b1', 'e3', 'c2', 'a1'],
    constraints: ['f6', 'f8', 'f9'],
    timeframe: ['f4', 'f5'],
  },
  ux_conversion: {
    goals: ['f1', 'e3', 'c2'],
    constraints: ['f6', 'f8', 'f9'],
    timeframe: ['f4', 'f5'],
  },
  automation_processes: {
    goals: ['f1', 'b1', 'e3', 'c2'],
    constraints: ['f6', 'f8', 'f9', 'b7'],
    timeframe: ['f4', 'f5'],
  },
  security_compliance: {
    goals: ['f1', 'e3', 'c2'],
    constraints: ['f6', 'f8', 'f9', 'b5', 'b6'],
    timeframe: ['f4', 'f5'],
  },
  default: {
    goals: [...DEEP_DIVE_CONTEXT_GOAL_QUESTION_IDS],
    constraints: [...DEEP_DIVE_CONTEXT_CONSTRAINT_QUESTION_IDS],
    timeframe: [...DEEP_DIVE_CONTEXT_TIMEFRAME_QUESTION_IDS],
  },
} as const;

export function getDeepDiveExtractionIdLists(domainKey: DomainKey | string | undefined): {
  goals: readonly string[];
  constraints: readonly string[];
  timeframe: readonly string[];
} {
  const d = (domainKey ?? 'default') as string;
  const row = DEEP_DIVE_CONTEXT_BY_DOMAIN[d] ?? DEEP_DIVE_CONTEXT_BY_DOMAIN.default;
  return { goals: row.goals, constraints: row.constraints, timeframe: row.timeframe };
}
