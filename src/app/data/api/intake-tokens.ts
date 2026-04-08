import { apiFetch, publicApiFetch } from '../api-http';
import type { BriefQuestion, BriefResponses } from '../briefQuestions';

export const intakeTokensApi = {
  async createIntakeToken(data: { audit_id?: string; metadata?: Record<string, string> }) {
    return apiFetch<{ token: string; url: string; expires_at: string }>('/api/intake', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Tie a pre-brief token to an audit and merge any submitted client answers into intake_brief. */
  async linkIntakeTokenToAudit(token: string, auditId: string) {
    return apiFetch<{ ok: true }>('/api/intake/link-audit', {
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
    }>('/api/intake/submissions');
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
    }>(`/api/intake/prefill/${encodeURIComponent(token)}`);
  },

  async getIntakeToken(token: string) {
    return publicApiFetch<{
      metadata: Record<string, unknown>;
      questions: BriefQuestion[];
      responses: Record<string, unknown>;
      submitted_at: string | null;
      expires_at: string;
    }>(`/api/intake/${encodeURIComponent(token)}`);
  },

  async submitIntakeResponses(token: string, responses: BriefResponses) {
    return publicApiFetch<{ ok: true; submitted_at: string }>(`/api/intake/${encodeURIComponent(token)}/respond`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  },
};
