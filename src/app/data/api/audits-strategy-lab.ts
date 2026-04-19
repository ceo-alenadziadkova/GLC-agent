import {
  apiAuditsStrategyExecutionPack,
  apiAuditsStrategyExecutionPacks,
  apiAuditsStrategyLabContext,
} from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { StrategyExecutionPackResponse } from '../audit/contracts/report/strategy-lab.types';

export type StrategyLabContextPatchBody = {
  company_stage?: string | null;
  budget_band?: string | null;
  team_scale?: string | null;
};

export const auditsStrategyLabApi = {
  async patchStrategyLabContext(auditId: string, body: StrategyLabContextPatchBody) {
    return apiFetch<{ strategy_lab_context: Record<string, string> }>(apiAuditsStrategyLabContext(auditId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
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
