import {
  apiAuditsOrchestrationSprintExport,
  apiAuditsPlanBoard,
  apiAuditsPlanBoardCard,
  apiAuditsPlanBoardCardsBatch,
  apiAuditsPlanBoardColumnPolicy,
  apiAuditsPlanBoardReconcilePreview,
} from '../../config/api-paths';
import { API_URL, apiFetch, createTraceparent, getAuthHeaders } from '../api-http';
import { ApiError } from '../api-error';
import type {
  PlanBoardCardBatchPatchBody,
  PlanBoardCardDeleteBody,
  PlanBoardCardPatchBody,
  PlanBoardColumnPolicyPatchBody,
  PlanBoardGetBody,
  PlanBoardReconcilePreviewDto,
} from './orchestration-types';

export const auditsOrchestrationArtifactsApi = {
  async getPlanBoard(auditId: string) {
    return apiFetch<PlanBoardGetBody>(apiAuditsPlanBoard(auditId), { method: 'GET' });
  },

  async patchPlanBoardColumnPolicy(auditId: string, body: PlanBoardColumnPolicyPatchBody) {
    return apiFetch<{ ok: boolean }>(apiAuditsPlanBoardColumnPolicy(auditId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async patchPlanBoardCard(
    auditId: string,
    cardId: string,
    body: PlanBoardCardPatchBody,
  ) {
    return apiFetch<{ pack_version_used: number; ok: boolean }>(apiAuditsPlanBoardCard(auditId, cardId), {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });
  },

  async patchPlanBoardCardsBatch(
    auditId: string,
    body: PlanBoardCardBatchPatchBody,
  ) {
    return apiFetch<{ ok: boolean; updated_count: number; pack_version_used: number; pack_version_actual: number }>(
      apiAuditsPlanBoardCardsBatch(auditId),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
  },

  async postPlanBoardManualCard(
    auditId: string,
    body: { title: string; lane: string; column_id?: string },
  ) {
    return apiFetch<{ card_id: string; pack_version_used: number }>(`${apiAuditsPlanBoard(auditId)}/cards`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postPlanBoardReconcile(auditId: string) {
    return apiFetch<{ ok: boolean; orchestration_pack_version: number }>(`${apiAuditsPlanBoard(auditId)}/reconcile`, {
      method: 'POST',
    });
  },

  async postPlanBoardReconcilePreview(auditId: string) {
    return apiFetch<PlanBoardReconcilePreviewDto>(apiAuditsPlanBoardReconcilePreview(auditId), {
      method: 'POST',
    });
  },

  async deletePlanBoardCard(auditId: string, cardId: string, body: PlanBoardCardDeleteBody) {
    return apiFetch<{ pack_version_used: number; ok: boolean }>(apiAuditsPlanBoardCard(auditId, cardId), {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  },

  /**
   * CSV sprint export: orchestration graph + optional latest execution pack tasks
   * (`GET /api/audits/:id/orchestration/sprint-export?format=csv`).
   */
  async downloadOrchestrationSprintExportCsv(auditId: string): Promise<string> {
    const path = apiAuditsOrchestrationSprintExport(auditId, { format: 'csv' });
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: {
        traceparent: createTraceparent(),
        'x-operation-id': crypto.randomUUID(),
        ...authHeaders,
      },
    });
    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      throw new ApiError(
        errBody.error ?? `API error: ${response.status}`,
        response.status,
        typeof errBody.code === 'string' ? errBody.code : undefined,
      );
    }
    return response.text();
  },
};
