/**
 * String length bounds for Claude domain/strategy structured outputs.
 * Used by `schemas/domain-output.ts` (Zod + JSON Schema for tool_use).
 */

export const AGENT_OUTPUT_LIMITS = {
  domainSummaryMinChars: 50,
  domainSummaryMaxChars: 2000,
  strategyExecutiveSummaryMinChars: 100,
  strategyExecutiveSummaryMaxChars: 3000,
} as const;
