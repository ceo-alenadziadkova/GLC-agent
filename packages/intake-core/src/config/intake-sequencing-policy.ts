/**
 * Phase-1 sequencing pilot scope guardrails (ADR YAGNI boundaries).
 */
export const INTAKE_SEQUENCING_PILOT_POLICY = {
  maxPilotVerticals: 1,
  maxTransitionTypes: 6,
  maxBridgeQuestions: 3,
} as const;
