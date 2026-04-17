import {
  apiAuditsBriefHelpRequest,
  apiAuditsPipelineNext,
  apiAuditsPipelineRetry,
  apiAuditsPipelineStart,
  apiAuditsPipelineStop,
  apiAuditsPipelineStatus,
} from '../../config/api-paths';
import { apiFetch } from '../api-http';
import {
  assertPipelineMutationShape,
  assertPipelineStartShape,
  assertPipelineStatusShape,
} from '../api-payload-asserts';

export const auditsPipelineApi = {
  async startPipeline(id: string, opts?: { disable_auto_remediate?: boolean }) {
    const body =
      opts?.disable_auto_remediate === true ? JSON.stringify({ disable_auto_remediate: true }) : undefined;
    const payload = await apiFetch<{ status: string; phase: number; intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string } }>(
      apiAuditsPipelineStart(id),
      { method: 'POST', ...(body ? { body } : {}) },
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

  async runNextPhase(id: string, opts?: { disable_auto_remediate?: boolean }) {
    const body =
      opts?.disable_auto_remediate === true ? JSON.stringify({ disable_auto_remediate: true }) : undefined;
    const payload = await apiFetch<{ status: string; phase: number }>(apiAuditsPipelineNext(id), {
      method: 'POST',
      ...(body ? { body } : {}),
    });
    assertPipelineMutationShape(payload, 'pipeline next');
    return payload;
  },

  async stopPipeline(id: string) {
    const payload = await apiFetch<{ status: string; stopped: true }>(apiAuditsPipelineStop(id), {
      method: 'POST',
    });
    return payload;
  },

  async retryPhase(id: string, phase: number, opts?: { disable_auto_remediate?: boolean }) {
    const payload = await apiFetch<{ status: string; phase: number }>(apiAuditsPipelineRetry(id), {
      method: 'POST',
      body: JSON.stringify({
        phase,
        ...(opts?.disable_auto_remediate ? { disable_auto_remediate: true } : {}),
      }),
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
      execution_plan?: {
        selected_domains: string[];
        depth: string;
        source: string;
        coverage_package?: 'starter' | 'pro' | 'complete';
        include_strategy?: boolean;
      } | null;
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
