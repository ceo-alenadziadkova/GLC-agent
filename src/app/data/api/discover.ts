import { apiFetch, publicApiFetch } from '../api-http';

export const discoverApi = {
  /** Public: save a completed discovery session. Returns a session token. */
  async saveDiscoverySession(data: {
    answers: Record<string, unknown>;
    maturity_level: number;
    findings: unknown[];
  }) {
    return publicApiFetch<{ token: string; created_at: string }>('/api/discover', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Public: load a saved discovery session by token. */
  async getDiscoverySession(token: string) {
    return publicApiFetch<{
      answers: Record<string, unknown>;
      maturity_level: number;
      findings: unknown[];
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      contact_company: string | null;
      created_at: string;
      audit_id: string | null;
    }>(`/api/discover/${encodeURIComponent(token)}`);
  },

  /** Public: attach contact info to a discovery session (called from results page). */
  async saveDiscoveryContact(
    token: string,
    contact: {
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      contact_company?: string;
    },
  ) {
    return publicApiFetch<{ ok: true }>(`/api/discover/${encodeURIComponent(token)}/contact`, {
      method: 'PATCH',
      body: JSON.stringify(contact),
    });
  },

  /** Consultant: list all discovery sessions (most recent first). */
  async listDiscoverySessions() {
    return apiFetch<{
      sessions: Array<{
        session_token: string;
        maturity_level: number;
        findings: unknown[];
        contact_name: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        contact_company: string | null;
        audit_id: string | null;
        created_at: string;
        biz_description: string | null;
        industry: string | null;
      }>;
    }>('/api/discover/sessions');
  },

  /** Consultant: convert a discovery session into a full audit. */
  async convertDiscoverySession(token: string) {
    return apiFetch<{ audit_id: string }>(`/api/discover/${encodeURIComponent(token)}/convert`, {
      method: 'POST',
    });
  },
};
