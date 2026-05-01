import {
  API_PATHS,
  apiAuditsBriefCloneFrom,
  apiAuditsBriefIntelligenceSnapshot,
  apiAuditsBriefIntelligenceWording,
  apiAuditsClientProjectContext,
  apiAuditsIntakeFollowupSuggestions,
  apiPlatformAuditPipelineResumeCancelled,
} from '../../config/api-paths';
import { apiFetch, publicApiFetch } from '../api-http';
import { assertIntakePayloadShape } from '../api-payload-asserts';
import type { AuditCoveragePackage } from '../audit/contracts/core/audit-meta.types';
import type {
  IntakeBrief,
  IntakeBriefCollectionMode,
  IntakeVersionTuple,
} from '../audit/contracts/intake/intake-brief.types';
import type { BriefQuestion } from '../briefQuestions';
import type {
  ClientProjectAuditEnrichmentV1,
  ClientProjectContextV1,
} from '../audit/contracts/client-project-context.types';

/** Response of `postAuditsBriefIntelligenceSnapshot` (mirrors public intake intelligence snapshot). */
export type AuditBriefIntelligenceSnapshotResponse = {
  questions: BriefQuestion[];
  question_ids: string[];
  case_keys: string[];
  next_recommended: string[];
  deterministic_question_ids: string[];
  narrative: string | null;
  inferred_preview: Array<{
    questionId: string;
    confidence: 'low' | 'medium';
    rationale: string;
    suggestedValue: string | boolean;
  }>;
  merge_would_apply_count: number;
  snapshot_no_new_inferred: boolean;
  label_overrides: Record<string, string>;
  f2_source: 'llm' | 'deterministic' | 'llm_mixed';
  kpi: { invalid_f2_ids_filtered: number; f2_suggestion_length: number };
};

/** `POST /api/audits/:id/brief/intelligence-wording` — B1 client-facing phrasing (second LLM pass). */
export type AuditBriefIntelligenceWordingResponse = {
  label_overrides: Record<string, string>;
  hint_overrides: Record<string, string>;
  /** Parallel to canonical `options` per id; same length and order; persisted values stay canonical. */
  option_display_overrides: Record<string, string[]>;
  kpi: {
    allowed_wording_id_count: number;
    label_override_key_count: number;
    hint_override_key_count: number;
    option_display_id_count: number;
  };
};

/** `GET /api/audits/:id/brief/schema` — compact IntakePlan + bank labels (ADR Phase D). */
export type BriefSchemaSnapshot = {
  intake_versions: IntakeVersionTuple;
  product_mode: string;
  collection_mode: IntakeBriefCollectionMode;
  surface: string | null;
  eligible: string[];
  visible: string[];
  required: string[];
  hidden: string[];
  deferred: string[];
  sla_visible_bank_ids: string[];
  step_plan: Array<{ step_id: string; label?: string; question_ids: string[] }> | null;
  layout_slots: Record<string, string[]>;
  questions: Array<{ id: string; label: string; section: string; priority: string }>;
  derived: {
    ai_readiness_score: number;
    confidence_overall: number;
    website_gate: string;
    report_anchors?: Record<string, string>;
  };
  missing_for_report: string[];
  next_recommended: string[];
  readiness?: {
    flowReadinessStatus: 'flow_ready' | 'blocked';
    auditReadinessStatus: 'audit_ready' | 'blocked' | 'ready_with_caveats';
    signalPrioritization?: {
      bySignalKey: Record<
        string,
        { currentPriority: 'P0' | 'P1' | 'P2'; skipPolicy: 'ask_now' | 'defer' | 'skip'; reason: string }
      >;
      nextSignalKeys: string[];
    };
    trace: Array<{ code: string; semanticCause: string; questionId?: string; signalKey?: string }>;
  };
  critical_signals?: {
    by_key: Record<string, 'high' | 'medium' | 'low' | 'unknown'>;
    summary: { satisfied: boolean };
  };
  remediation_queue?: string[];
  legal?: Record<
    string,
    {
      purpose: string;
      legal_basis: 'contract' | 'consent' | 'legitimate_interest';
      sensitive: boolean;
      requires_dpa_client_ack: boolean;
    }
  >;
};

export type LegalConsentKey =
  | 'tos_acceptance'
  | 'privacy_acknowledgment'
  | 'marketing'
  | 'product_analytics'
  | 'case_study_use'
  | 'evaluation_internal'
  | 'dpa_acceptance';

export type LegalConsentSource = 'signup' | 'settings' | 'api' | 'import' | 'audit_create';

export type LegalConsentsResponse = {
  published: {
    bundle: string;
    terms_of_service: string;
    privacy_policy: string;
    data_processing_agreement: string;
    legal_notice: string;
    cookies_policy: string;
  };
  effective: Array<{
    consent_key: LegalConsentKey;
    accepted: boolean;
    created_at: string;
    document_bundle_version: string;
    tos_version: string | null;
    privacy_version: string | null;
    dpa_version: string | null;
    source: LegalConsentSource;
  }>;
};

export type BriefIntakeAnalyticsBatchPayload = {
  surface: 'consultant_interview' | 'client_form' | 'client_portal';
  client_session_id: string;
  experiment_variant?: 'A' | 'B';
  intake_versions?: Partial<IntakeVersionTuple>;
  events: Array<{
    event_type:
      | 'question_shown'
      | 'question_answered'
      | 'question_skipped'
      | 'wizard_completed'
      | 'results_viewed'
      | 'signal_confidence_changed'
      | 'readiness_blocked'
      | 'remediation_asked'
      | 'sequencing_transition_taken'
      | 'guard_question_triggered';
    question_id?: string;
    step_index?: number;
    client_ts?: string;
    signal_key?: string;
    transition_rule_ref?: string;
    audit_readiness_status?: 'audit_ready' | 'blocked' | 'ready_with_caveats';
    flow_readiness_status?: 'flow_ready' | 'blocked';
    trace_codes?: string[];
    remediation_bank_ids?: string[];
    next_recommended?: string[];
  }>;
};

export const briefProfilePlatformApi = {
  async getBriefSchema(auditId: string) {
    return apiFetch<BriefSchemaSnapshot>(`${API_PATHS.audits}/${auditId}/brief/schema`);
  },

  /**
   * Composed rolling context (intake + optional `collected_data` e.g. Lighthouse). `context` is null
   * if there is no `intake_brief` row. `precheck` is always built from `collected_data` (Lighthouse / site
   * scrape) for polling on New Audit before the first brief save. Use on New Audit / audit workspace when `auditId` is known.
   */
  async getClientProjectContext(auditId: string) {
    return apiFetch<{
      context: ClientProjectContextV1 | null;
      precheck: ClientProjectAuditEnrichmentV1;
    }>(apiAuditsClientProjectContext(auditId));
  },

  /**
   * Deterministic follow-up bank ids + labels (same engine as public tailored-questions; uses stored brief + `product_mode`).
   */
  async getIntakeFollowupSuggestions(auditId: string) {
    return apiFetch<{
      suggestions: {
        question_ids: string[];
        case_keys: string[];
        next_recommended: string[];
        questions: BriefQuestion[];
      } | null;
    }>(apiAuditsIntakeFollowupSuggestions(auditId));
  },

  /**
   * After pre-brief: optional LLM + F2 order for an authenticated audit (same body/response as public `POST .../intelligence-snapshot`).
   * Requires a prior `saveBrief` so `intake_brief.responses` is up to date.
   */
  async postAuditsBriefIntelligenceSnapshot(
    auditId: string,
    body?: { skip_llm?: boolean; early_capture?: boolean },
  ): Promise<AuditBriefIntelligenceSnapshotResponse> {
    return apiFetch<AuditBriefIntelligenceSnapshotResponse>(apiAuditsBriefIntelligenceSnapshot(auditId), {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },

  async postAuditsBriefCloneFrom(
    auditId: string,
    body: { source_audit_id: string },
  ): Promise<{ brief: unknown; gates: unknown; validation: unknown }> {
    return apiFetch<{ brief: unknown; gates: unknown; validation: unknown }>(apiAuditsBriefCloneFrom(auditId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async postAuditsBriefIntelligenceWording(auditId: string): Promise<AuditBriefIntelligenceWordingResponse> {
    return apiFetch<AuditBriefIntelligenceWordingResponse>(apiAuditsBriefIntelligenceWording(auditId), {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async getBrief(auditId: string) {
    const payload = await apiFetch<{
      product_mode?: string;
      coverage_package?: AuditCoveragePackage;
      brief: IntakeBrief | null;
      questions: BriefQuestion[];
      validation: {
        passed: boolean;
        sla_met: boolean;
        answered_required: number;
        total_required: number;
        answered_recommended: number;
        total_recommended: number;
        missing_required: Array<{ id: string; question: string }>;
      };
      gates: {
        canStartSnapshot: boolean;
        canStartExpress: boolean;
        canStartFull: boolean;
        canStartPipeline: boolean;
        missingRequiredIds: string[];
        recommendedToImproveIds: string[];
        intakeProgress: {
          progressPct: number;
          readinessBadge: 'low' | 'medium' | 'high';
          nextBestAction: 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';
        };
      };
      intakeProgress: {
        progressPct: number;
        readinessBadge: 'low' | 'medium' | 'high';
        nextBestAction: 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';
      };
      readiness?: BriefSchemaSnapshot['readiness'];
      critical_signals?: BriefSchemaSnapshot['critical_signals'];
      remediation_queue?: string[];
      next_recommended?: string[];
    }>(`${API_PATHS.audits}/${auditId}/brief`);
    assertIntakePayloadShape(payload);
    return payload;
  },

  async postBriefAnalyticsEvents(auditId: string, payload: BriefIntakeAnalyticsBatchPayload) {
    return apiFetch<{ ok: true; received: number }>(`${API_PATHS.audits}/${auditId}/brief/analytics-events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async saveBrief(
    auditId: string,
    responses: Record<string, unknown>,
    opts?: { collection_mode?: IntakeBriefCollectionMode; intake_versions?: IntakeVersionTuple | null },
  ) {
    const body: Record<string, unknown> = { responses };
    if (opts?.collection_mode) {
      body.collection_mode = opts.collection_mode;
    }
    if (opts?.intake_versions != null) {
      body.intake_versions = opts.intake_versions;
    }
    const payload = await apiFetch<{
      brief: IntakeBrief;
      validation: { passed: boolean; sla_met: boolean; answered_required: number; total_required: number };
      gates: {
        canStartSnapshot: boolean;
        canStartExpress: boolean;
        canStartFull: boolean;
        canStartPipeline: boolean;
        missingRequiredIds: string[];
        recommendedToImproveIds: string[];
        intakeProgress: {
          progressPct: number;
          readinessBadge: 'low' | 'medium' | 'high';
          nextBestAction: 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';
        };
      };
      intakeProgress: {
        progressPct: number;
        readinessBadge: 'low' | 'medium' | 'high';
        nextBestAction: 'complete_required' | 'add_recommended' | 'confirm_prefill' | 'none';
      };
    }>(`${API_PATHS.audits}/${auditId}/brief`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    assertIntakePayloadShape(payload);
    return payload;
  },

  async getPublicLegalDocuments() {
    return publicApiFetch<{
      bundle: string;
      terms_of_service: { version: string; path: string };
      privacy_policy: { version: string; path: string };
      data_processing_agreement: { version: string; path: string };
      legal_notice: { version: string; path: string };
      cookies_policy: { version: string; path: string };
    }>(API_PATHS.publicLegalDocuments);
  },

  async getProfile() {
    return apiFetch<{
      id: string;
      role: string;
      email: string | null;
      full_name: string | null;
      can_manage_platform_settings?: boolean;
    }>(API_PATHS.profile);
  },

  async patchProfile(params: { full_name?: string | null }) {
    return apiFetch<{
      id: string;
      role: string;
      email: string | null;
      full_name: string | null;
      can_manage_platform_settings?: boolean;
    }>(API_PATHS.profile, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async getLegalConsents() {
    return apiFetch<LegalConsentsResponse>(API_PATHS.profileLegalConsents);
  },

  async postLegalConsents(params: {
    source: LegalConsentSource;
    events: Array<{ consent_key: LegalConsentKey; accepted: boolean }>;
  }) {
    return apiFetch<LegalConsentsResponse>(API_PATHS.profileLegalConsents, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /** Platform admin: move audit from `cancelled` and best-effort schedule owner `pipeline/next`. */
  async resumePlatformPipelineFromCancelled(auditId: string) {
    return apiFetch<{
      status: string;
      current_phase: number;
      resumed: boolean;
      execution_scheduled?: boolean;
    }>(apiPlatformAuditPipelineResumeCancelled(auditId), { method: 'POST' });
  },

  async getPlatformSelfServeOwner() {
    return apiFetch<{
      stored_owner_user_id: string | null;
      effective_owner_user_id: string | null;
      effective_ready: boolean;
      /** Deprecated: always false; kept for API compatibility. */
      env_fallback_active: boolean;
      implicit_fallback_active: boolean;
      consultants: Array<{ id: string; full_name: string | null; email: string | null }>;
      can_manage: boolean;
    }>(API_PATHS.platformSelfServeOwner);
  },

  async patchPlatformSelfServeOwner(params: { owner_user_id: string | null }) {
    return apiFetch<{
      ok: boolean;
      stored_owner_user_id: string | null;
      effective_ready: boolean;
      effective_owner_user_id: string | null;
      env_fallback_active: boolean;
      implicit_fallback_active: boolean;
    }>(API_PATHS.platformSelfServeOwner, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },
};
