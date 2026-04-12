import {
  apiAuditsBriefHelpRequest,
  apiAuditsPipelineNext,
  apiAuditsPipelineRetry,
  apiAuditsPipelineStart,
  apiAuditsPipelineStatus,
} from '../../config/api-paths';
import { apiFetch } from '../api-http';
import {
  assertPipelineMutationShape,
  assertPipelineStartShape,
  assertPipelineStatusShape,
} from '../api-payload-asserts';

export const auditsPipelineApi = {
  async startPipeline(id: string) {
    const payload = await apiFetch<{ status: string; phase: number; intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string } }>(
      apiAuditsPipelineStart(id),
      { method: 'POST' },
    );
    assertPipelineStartShape(payload);
    return payload;
  },

  /** Client-only: notify consultants that help with the brief is welcome (optional message). */
  async requestBriefHelp(auditId: string, message?: string) {
    return apiFetch<{ ok: boolean }>(apiAuditsBriefHelpRequest(auditId), {
      method: 'POST',
      body: JSON.stringify({ message: message?.trim() ?? '' }),
    });
  },

  async runNextPhase(id: string) {
    const payload = await apiFetch<{ status: string; phase: number }>(apiAuditsPipelineNext(id), { method: 'POST' });
    assertPipelineMutationShape(payload, 'pipeline next');
    return payload;
  },

  async retryPhase(id: string, phase: number) {
    const payload = await apiFetch<{ status: string; phase: number }>(apiAuditsPipelineRetry(id), {
      method: 'POST',
      body: JSON.stringify({ phase }),
    });
    assertPipelineMutationShape(payload, 'pipeline retry');
    return payload;
  },

  async getPipelineStatus(id: string) {
    const payload = await apiFetch<{
      status: string;
      current_phase: number;
      tokens_used: number;
      token_budget: number;
      product_mode: string;
      events: Array<{
        id: number;
        audit_id: string;
        phase: number;
        event_type: string;
        message: string | null;
        data: Record<string, unknown>;
        created_at: string;
      }>;
      reviews: Array<{ after_phase: number; status: string; consultant_notes: string | null; interview_notes: string | null }>;
    }>(apiAuditsPipelineStatus(id));
    assertPipelineStatusShape(payload);
    return payload;
  },
};
