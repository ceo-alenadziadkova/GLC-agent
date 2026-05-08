import {
  apiAuditsBriefHelpRequest,
  apiAuditsPipelineNext,
  apiAuditsPipelineRetry,
  apiAuditsPipelineStart,
  apiAuditsPipelineStop,
  apiAuditsPipelineStatus,
  apiAuditsTokenBudget,
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

  async retryPhase(id: string, phase: number, opts?: { disable_auto_remediate?: boolean; retry_comment?: string }) {
    const retryComment = opts?.retry_comment?.trim();
    const payload = await apiFetch<{ status: string; phase: number }>(apiAuditsPipelineRetry(id), {
      method: 'POST',
      body: JSON.stringify({
        phase,
        ...(opts?.disable_auto_remediate ? { disable_auto_remediate: true } : {}),
        ...(retryComment ? { retry_comment: retryComment } : {}),
      }),
    });
    assertPipelineMutationShape(payload, 'pipeline retry');
    return payload;
  },

  /**
   * Platform admin only: increase the per-audit token budget.
   * Backend route: `PATCH /api/audits/:id/token-budget`
   * Errors: 403 PLATFORM_ADMIN_ONLY, 400 AUDITS_TOKEN_BUDGET_TOPUP_INVALID.
   */
  async patchAuditTokenBudget(
    auditId: string,
    payload: { delta_tokens: number; reason?: string },
  ) {
    const body: { delta_tokens: number; reason?: string } = { delta_tokens: payload.delta_tokens };
    const reason = payload.reason?.trim();
    if (reason) body.reason = reason;
    return apiFetch<{
      grant_id: string;
      previous_budget: number;
      token_budget: number;
      tokens_used: number;
      tokens_remaining: number;
    }>(apiAuditsTokenBudget(auditId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async getPipelineStatus(
    id: string,
    query?: {
      limit?: number;
      before?: string;
      phase?: number;
      event_type?: string;
      detail_level?: 'default' | 'debug';
    },
  ) {
    const search = new URLSearchParams();
    if (query?.limit) search.set('limit', String(query.limit));
    if (query?.before) search.set('before', query.before);
    if (query?.phase !== undefined) search.set('phase', String(query.phase));
    if (query?.event_type) search.set('event_type', query.event_type);
    if (query?.detail_level) search.set('detail_level', query.detail_level);
    const url = search.size > 0 ? `${apiAuditsPipelineStatus(id)}?${search.toString()}` : apiAuditsPipelineStatus(id);
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
      event_page?: { limit: number; next_before: string | null; detail_level: 'default' | 'debug' };
    }>(url);
    assertPipelineStatusShape(payload);
    return payload;
  },
};
