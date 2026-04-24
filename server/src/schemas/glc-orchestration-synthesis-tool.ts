import { z } from 'zod';

import { ORCHESTRATION_SYNTHESIS_CONTEXT_LIMITS } from '../config/orchestration-synthesis-policy.js';

const L = ORCHESTRATION_SYNTHESIS_CONTEXT_LIMITS;

const orchestrationSynthesisResolutionTuple = ['synthesis_applied', 'synthesis_pending'] as const;

/**
 * Single Claude tool output for optional orchestration synthesis (not the persisted pack shape).
 */
export const GlcOrchestrationSynthesisToolSchema = z.object({
  dominant_constraint: z.string().min(1).max(L.maxDominantConstraintChars),
  constraint_chain_notes: z
    .array(z.string().min(1).max(L.maxConstraintChainItemChars))
    .max(L.maxConstraintChainItems),
  orchestration_notes: z.string().max(L.maxOrchestrationNotesChars).optional(),
  conflicts_resolved: z
    .array(
      z.object({
        id: z.string().min(1).max(L.maxConflictRawIdChars),
        summary: z.string().min(1).max(L.maxConflictSummaryChars),
        resolution: z.enum(orchestrationSynthesisResolutionTuple),
      }),
    )
    .max(L.maxConflictsFromModel),
});

export type GlcOrchestrationSynthesisToolOutput = z.infer<typeof GlcOrchestrationSynthesisToolSchema>;
