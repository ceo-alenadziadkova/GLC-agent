import { z } from 'zod';

export const CmoVoiceOutputSchema = z
  .object({
    tone_label: z.string().trim().min(3),
    voice_principles: z.array(z.string().trim().min(8)).min(2).max(5),
    forbidden_phrases: z.array(z.string().trim().min(3)).min(1).max(5),
    vocabulary_do: z.array(z.string().trim().min(3)).min(1).max(5),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
