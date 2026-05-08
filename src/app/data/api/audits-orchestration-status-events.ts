import {
  apiAuditsDirectorDeepDive,
  apiAuditsDirectorDeepDiveQuota,
  apiAuditsDirectorDeepDiveStatus,
  apiAuditsOrchestrationPack,
  apiAuditsOrchestrationPackDiff,
  apiAuditsOrchestrationPackDiffHistory,
  apiAuditsOrchestratorLatest,
  apiAuditsPipelinePhaseResult,
  apiAuditsPlanBoardCardComments,
  apiAuditsPlanBoardCardEvents,
  apiAuditsPlanBoardTelemetryViewOpened,
  apiAuditsTimeline,
} from '../../config/api-paths';
import { apiFetch, apiGetJsonOrNotModified } from '../api-http';
import type { DomainKey } from '../auditTypes';
import type {
  AuditTimelineDto,
  DirectorDeepDiveRequestBody,
  OrchestrationPackConditionalGetResult,
  OrchestrationPackGetBody,
  OrchestrationPackRevisionHistoryItemDto,
  OrchestrationPlanGovernanceDto,
  PipelinePhaseResultPatchBody,
  PlanTicketCommentDto,
  PlanTicketEventDto,
} from './orchestration-types';
import type {
  GlcOrchestrationPackRevisionDiffView,
  GlcOrchestrationPackView,
} from '../audit/contracts/report/orchestration-pack.types';

export const auditsOrchestrationStatusEventsApi = {
  /** `GET /api/audits/:id/orchestration/pack` — matches server JSON (governance, revision, optional revision_history). */
  async getOrchestrationPack(auditId: string) {
    return apiFetch<OrchestrationPackGetBody>(apiAuditsOrchestrationPack(auditId), { method: 'GET' });
  },

  /**
   * Same resource as `getOrchestrationPack` with optional `If-None-Match` (server ETag: `"orchestration-pack-v{version}"`).
   * On 304, returns `kind: 'not_modified'` — use cached React Query data.
   */
  async getOrchestrationPackConditional(
    auditId: string,
    ifNoneMatch: string | undefined,
  ): Promise<OrchestrationPackConditionalGetResult> {
    const path = apiAuditsOrchestrationPack(auditId);
    if (!ifNoneMatch) {
      const data = await apiFetch<OrchestrationPackGetBody>(path, { method: 'GET' });
      return { kind: 'ok' as const, data };
    }
    const r = await apiGetJsonOrNotModified<OrchestrationPackGetBody>(path, { ifNoneMatch });
    if (r.kind === 'not_modified') {
      return { kind: 'not_modified' as const };
    }
    return { kind: 'ok' as const, data: r.data };
  },

  async getOrchestrationPackDiffHistory(auditId: string, query?: { limit?: number; signal?: AbortSignal }) {
    const { signal, ...pathQuery } = query ?? {};
    return apiFetch<{
      items: OrchestrationPackRevisionHistoryItemDto[];
      latest_plan_governance: OrchestrationPlanGovernanceDto | null;
    }>(apiAuditsOrchestrationPackDiffHistory(auditId, pathQuery), {
      method: 'GET',
      ...(signal ? { signal } : {}),
    });
  },

  async getOrchestrationPackDiff(auditId: string, query: { from_version: number; to_version: number }) {
    return apiFetch<{
      item: OrchestrationPackRevisionHistoryItemDto;
    }>(apiAuditsOrchestrationPackDiff(auditId, query), { method: 'GET' });
  },

  async getOrchestratorLatest(auditId: string) {
    return apiFetch<{
      pack: GlcOrchestrationPackView | null;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: GlcOrchestrationPackRevisionDiffView | null;
      last_revision_diff_summary?: string | null;
      revision_history?: OrchestrationPackRevisionHistoryItemDto[];
      plan_governance: OrchestrationPlanGovernanceDto | null;
    }>(apiAuditsOrchestratorLatest(auditId), { method: 'GET' });
  },

  async getAuditTimeline(auditId: string) {
    return apiFetch<{ timeline: AuditTimelineDto }>(apiAuditsTimeline(auditId), { method: 'GET' });
  },

  async getPlanBoardCardEvents(auditId: string, cardId: string, query?: { limit?: number }) {
    return apiFetch<{ events: PlanTicketEventDto[] }>(apiAuditsPlanBoardCardEvents(auditId, cardId, query), {
      method: 'GET',
    });
  },

  async getPlanBoardCardComments(auditId: string, cardId: string, query?: { limit?: number }) {
    return apiFetch<{ comments: PlanTicketCommentDto[] }>(apiAuditsPlanBoardCardComments(auditId, cardId, query), {
      method: 'GET',
    });
  },

  async postPlanBoardCardComment(
    auditId: string,
    cardId: string,
    body: { body: string; mentions?: string[]; source_surface?: 'board' | 'table' | 'roadmap' | 'shape' | 'api' },
  ) {
    return apiFetch<{ ok: boolean; comment_id: string }>(apiAuditsPlanBoardCardComments(auditId, cardId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async patchPipelinePhaseResult(auditId: string, phase: number, body: PipelinePhaseResultPatchBody) {
    return apiFetch<{ ok: boolean; phase_number: number; updated: boolean }>(apiAuditsPipelinePhaseResult(auditId, phase), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async postPlanBoardViewOpenedTelemetry(auditId: string, body: { pack_version: number; has_pack: boolean }) {
    return apiFetch<void>(apiAuditsPlanBoardTelemetryViewOpened(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postDirectorDeepDive(auditId: string, domainKey: DomainKey, body: DirectorDeepDiveRequestBody) {
    return apiFetch<{ job_id: string; status: 'queued'; estimated_duration_minutes: number }>(
      apiAuditsDirectorDeepDive(auditId, domainKey),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  async getDirectorDeepDiveStatus(auditId: string, domainKey: DomainKey, jobId: string) {
    return apiFetch<{
      job_id: string;
      status: 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
      started_at: string | null;
      completed_at: string | null;
      error_code?: string;
      qa_block?: {
        coherence: string;
        feasibility: string;
        top_3_actions: string[];
        risks: string[];
        measurement: string[];
      };
    }>(apiAuditsDirectorDeepDiveStatus(auditId, domainKey, jobId), {
      method: 'GET',
    });
  },

  async getDirectorDeepDiveQuota(auditId: string, domainKey: DomainKey) {
    return apiFetch<{
      coverage_package: 'starter' | 'pro' | 'complete';
      per_domain_limit: number;
      used_count: number;
      remaining: number;
    }>(apiAuditsDirectorDeepDiveQuota(auditId, domainKey), { method: 'GET' });
  },
};
