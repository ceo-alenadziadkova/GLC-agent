import { apiFetch } from '../api-http';
import { assertIntakePayloadShape } from '../api-payload-asserts';
import type { IntakeBrief, IntakeBriefCollectionMode, IntakeVersionTuple } from '../auditTypes';
import type { BriefQuestion } from '../briefQuestions';

export const briefProfilePlatformApi = {
  async getBrief(auditId: string) {
    const payload = await apiFetch<{
      product_mode?: string;
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
    }>(`/api/audits/${auditId}/brief`);
    assertIntakePayloadShape(payload);
    return payload;
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
    }>(`/api/audits/${auditId}/brief`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    assertIntakePayloadShape(payload);
    return payload;
  },

  async getProfile() {
    return apiFetch<{ id: string; role: string; email: string | null; full_name: string | null }>('/api/profile');
  },

  async patchProfile(params: { full_name?: string | null }) {
    return apiFetch<{ id: string; role: string; email: string | null; full_name: string | null }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async getPlatformSelfServeOwner() {
    return apiFetch<{
      stored_owner_user_id: string | null;
      effective_owner_user_id: string | null;
      effective_ready: boolean;
      env_fallback_active: boolean;
      consultants: Array<{ id: string; full_name: string | null; email: string | null }>;
      can_manage: boolean;
    }>('/api/platform/self-serve-owner');
  },

  async patchPlatformSelfServeOwner(params: { owner_user_id: string | null }) {
    return apiFetch<{
      ok: boolean;
      stored_owner_user_id: string | null;
      effective_ready: boolean;
      effective_owner_user_id: string | null;
      env_fallback_active: boolean;
    }>('/api/platform/self-serve-owner', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },
};
