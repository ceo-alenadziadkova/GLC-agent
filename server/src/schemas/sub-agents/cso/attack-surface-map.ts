import { z } from 'zod';

export const CsoAttackSurfaceMapOutputSchema = z
  .object({
    attack_surface_summary: z.string().trim().min(20),
    exposure_points: z.array(z.string().trim().min(3)).min(1).max(12),
    monitoring_blind_spots: z.array(z.string().trim().min(3)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
