import {
  API_PATHS,
  apiIntakeIntelligenceKpi,
  apiIntakeNextQuestion,
  apiIntakeNlDescribe,
  apiIntakePrefill,
  apiIntakeRespond,
  apiIntakeToken,
} from '../../config/api-paths';
import { apiFetch, publicApiFetch } from '../api-http';
import type { BriefQuestion, BriefResponses } from '../briefQuestions';
import {
  currentIntakeVersionTuple,
  type IntakeBriefCollectionMode,
  type IntakeSurface,
  type ProductMode,
} from '@glc/intake-core';

export const intakeTokensApi = {
  async createIntakeToken(data: { audit_id?: string; metadata?: Record<string, string> }) {
    return apiFetch<{ token: string; url: string; expires_at: string }>(API_PATHS.intake, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Tie a pre-brief token to an audit and merge any submitted client answers into intake_brief. */
  async linkIntakeTokenToAudit(token: string, auditId: string) {
    return apiFetch<{ ok: true }>(API_PATHS.intakeLinkAudit, {
      method: 'POST',
      body: JSON.stringify({ token, audit_id: auditId }),
    });
  },

  /** Consultant: client submissions via shareable pre-brief links (submitted_at set). */
  async listIntakeSubmissions() {
    return apiFetch<{
      submissions: Array<{
        token: string;
        metadata: Record<string, unknown>;
        responses: Record<string, unknown>;
        submitted_at: string;
        expires_at: string;
        audit_id: string | null;
        intake_url: string;
      }>;
    }>(API_PATHS.intakeSubmissions);
  },

  /** Consultant: load token answers for New Audit prefill even when the public link has expired. */
  async getIntakePrefillForConsultant(token: string) {
    return apiFetch<{
      metadata: Record<string, unknown>;
      questions: BriefQuestion[];
      responses: Record<string, unknown>;
      submitted_at: string | null;
      expires_at: string;
      link_expired?: boolean;
    }>(apiIntakePrefill(token));
  },

  async getIntakeToken(token: string) {
    return publicApiFetch<{
      metadata: Record<string, unknown>;
      questions: BriefQuestion[];
      responses: Record<string, unknown>;
      submitted_at: string | null;
      expires_at: string;
    }>(apiIntakeToken(token));
  },

  async submitIntakeResponses(token: string, responses: BriefResponses) {
    return publicApiFetch<{ ok: true; submitted_at: string }>(apiIntakeRespond(token), {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  },

  /**
   * Diagnostic intake KPI (question visibility / drop-off). Fire-and-forget; ignores network errors.
   * 404 when diagnostic pilot is disabled; `persisted: false` when the token is not linked to an audit.
   */
  async reportIntelligenceKpi(
    token: string,
    body: {
      event:
        | 'question_shown'
        | 'drop_off'
        | 'fast_pass_started'
        | 'fast_pass_completed'
        | 'precision_pass_started'
        | 'optional_details_opened'
        | 'optional_details_submitted';
      question_id?: string;
      client_session_id?: string;
      case_keys?: string[];
      /** Set when the weakest pilot signal tier increased vs the last `question_shown` in this session. */
      confidence_moved?: boolean;
    },
  ) {
    try {
      return await publicApiFetch<{ ok: true; persisted: boolean }>(apiIntakeIntelligenceKpi(token), {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    }
  },

  /**
   * NL describe — merges `authoritative.merged_responses` into the intake draft on the server;
   * client should also merge into local `responses` when `authoritative` is present.
   */
  async submitIntakeNlDescribe(token: string, text: string, idempotencyKey?: string) {
    return publicApiFetch<{
      ok: boolean;
      prefer_explicit_over_inferred: boolean;
      graphDraft: unknown;
      message: string;
      authoritative?: { merged_responses: Record<string, unknown>; persisted: boolean };
    }>(apiIntakeNlDescribe(token), {
      method: 'POST',
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      body: JSON.stringify({ text }),
    });
  },

  /**
   * F1 deterministic next-question (404 when server pilot/next-question flags off). Fire-and-forget from the hook; errors ignored.
   */
  async postIntakeNextQuestion(
    token: string,
    body: {
      responses: Record<string, unknown>;
      productMode?: ProductMode;
      collectionMode?: IntakeBriefCollectionMode;
      surface?: IntakeSurface;
      intakeVersionTuple?: ReturnType<typeof currentIntakeVersionTuple>;
    },
  ) {
    return publicApiFetch<{
      ok: true;
      action: 'ask' | 'stop';
      questionId: string | null;
      reason: string;
      source: string;
      caseKeys: string[];
    }>(apiIntakeNextQuestion(token), {
      method: 'POST',
      body: JSON.stringify({
        responses: body.responses,
        productMode: body.productMode ?? 'full',
        collectionMode: body.collectionMode ?? 'pre_brief',
        surface: body.surface ?? 'client_form',
        intakeVersionTuple: body.intakeVersionTuple ?? currentIntakeVersionTuple(),
      }),
    });
  },
};
