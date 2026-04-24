import { z } from 'zod';

export const CsoCaseClassifierOutputSchema = z
  .object({
    case_label: z.enum(['A_zero_knowledge', 'B_regulated', 'C_data_heavy', 'D_incident']),
    scope_notes: z.string().trim().min(20),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
