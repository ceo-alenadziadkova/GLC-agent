import { z } from 'zod';

export const CmoPositioningOutputSchema = z.object({
  core_problem: z.string().trim().min(12),
  unique_mechanism: z.string().trim().min(12),
  differentiation_axes: z.array(z.string().trim().min(4)).min(2).max(5),
  anti_positioning: z.string().trim().min(10),
  target_niche: z.string().trim().min(12),
  category_strategy: z.string().trim().min(12),
  positioning_statement: z.string().trim().min(20),
  confidence_score: z.number().min(0).max(1),
  evidence_basis: z.array(z.string().trim().min(8)).min(1).max(5),
  assumptions: z.array(z.string().trim().min(8)).min(1).max(5),
  open_questions: z.array(z.string().trim().min(8)).min(1).max(5),
  analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
}).strict();
