import { z } from 'zod';
import { STRATEGY_INITIATIVE_DOMAIN_KEYS } from '../config/strategy-initiative-policy.js';
import { DIRECTOR_OPERATING_MODES } from '../config/director-operating-modes.js';
import { DIRECTOR_SUB_AGENT_IDS } from '../config/director-sub-agents.js';

const domainTuple = [...STRATEGY_INITIATIVE_DOMAIN_KEYS] as [
  (typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number],
  ...(typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number][],
];

const modeTuple = [...DIRECTOR_OPERATING_MODES] as [
  (typeof DIRECTOR_OPERATING_MODES)[number],
  ...(typeof DIRECTOR_OPERATING_MODES)[number][],
];

export const DirectorDeepDiveRequestSchema = z.object({
  audit_id: z.string().uuid(),
  domain_key: z.enum(domainTuple),
  focus_areas: z.array(z.string().min(1)).max(5).optional(),
  client_context: z.object({
    goals: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string().min(1)).default([]),
    timeframe_days: z.number().int().positive().optional(),
  }),
  idempotency_key: z.string().min(8),
  operating_mode: z.enum(modeTuple).optional(),
  sub_agent_ids: z.array(z.enum(DIRECTOR_SUB_AGENT_IDS)).max(3).optional(),
});

export type DirectorDeepDiveRequest = z.infer<typeof DirectorDeepDiveRequestSchema>;
