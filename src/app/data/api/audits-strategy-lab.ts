import {
  apiAuditsStrategyExecutionPack,
  apiAuditsStrategyExecutionPacks,
  apiAuditsStrategyLabContext,
} from '../../config/api-paths';
import { ApiError } from '../api-error';
import { apiFetch } from '../api-http';
import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';
import { z } from 'zod';

import type { StrategyExecutionPackResponse } from '../audit/contracts/report/strategy-lab.types';
import type { StrategyLabContextView } from '../audit/contracts/report/report-domain.types';

/** Alias for PATCH response body naming (same shape as read-model `StrategyLabContextView`). */
export type StrategyLabContext = StrategyLabContextView;

/** Response body for PATCH /api/audits/:id/strategy-lab-context (merged persisted context). */
export type StrategyLabContextPatchResponse = {
  strategy_lab_context: StrategyLabContext;
};

export type StrategyLabContextPatchBody = {
  company_stage?: string | null;
  budget_band?: string | null;
  team_scale?: string | null;
  director_stage2_domains?: DomainKey[] | null;
};

/** Runtime shape for PATCH `/api/audits/:id/strategy-lab-context` (prevents partial/bad JSON slipping into React Query cache). */
const domainKeysTuple = DOMAIN_KEYS as [DomainKey, ...DomainKey[]];

const strategyLabContextBodySchema = z
  .object({
    company_stage: z.string().optional(),
    budget_band: z.string().optional(),
    team_scale: z.string().optional(),
    director_stage2_domains: z.array(z.enum(domainKeysTuple)).optional(),
  })
  .passthrough();

export const strategyLabContextPatchResponseSchema = z.object({
  strategy_lab_context: strategyLabContextBodySchema,
});

export function parseStrategyLabContextPatchResponse(raw: unknown): StrategyLabContextPatchResponse {
  const parsed = strategyLabContextPatchResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('Invalid strategy_lab_context PATCH response', 0, 'MALFORMED_RESPONSE_BODY', parsed.error.flatten());
  }
  return parsed.data as StrategyLabContextPatchResponse;
}

export const auditsStrategyLabApi = {
  async patchStrategyLabContext(auditId: string, body: StrategyLabContextPatchBody): Promise<StrategyLabContextPatchResponse> {
    const raw = await apiFetch<unknown>(apiAuditsStrategyLabContext(auditId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return parseStrategyLabContextPatchResponse(raw);
  },

  async postStrategyExecutionPack(
    auditId: string,
    body: { initiative_ids: string[]; selected_path_type?: 'fast' | 'balanced' | 'scalable' },
  ) {
    return apiFetch<StrategyExecutionPackResponse>(apiAuditsStrategyExecutionPack(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async listStrategyExecutionPacks(auditId: string) {
    return apiFetch<{ items: Array<{ id: string; initiative_ids: string[]; selected_path_type: string | null; created_at: string }> }>(
      apiAuditsStrategyExecutionPacks(auditId),
    );
  },
};
