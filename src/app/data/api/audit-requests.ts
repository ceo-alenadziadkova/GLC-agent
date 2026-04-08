import { apiFetch } from '../api-http';
import type { AuditRequest } from '../auditTypes';

export const auditRequestsApi = {
  async createAuditRequest(params: {
    url: string;
    /** When true, server stores the canonical no-public-website placeholder URL. */
    no_public_website?: boolean;
    industry?: string;
    product_mode?: 'express' | 'full';
    brief_snapshot?: Record<string, unknown>;
    client_notes?: string;
  }) {
    return apiFetch<AuditRequest>('/api/audit-requests', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async listAuditRequests(limit = 50, offset = 0) {
    return apiFetch<{ data: AuditRequest[]; total: number; limit: number; offset: number }>(
      `/api/audit-requests?limit=${limit}&offset=${offset}`,
    );
  },

  async getAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`/api/audit-requests/${id}`);
  },

  async updateAuditRequest(
    id: string,
    updates: Partial<Pick<AuditRequest, 'url' | 'industry' | 'product_mode' | 'brief_snapshot' | 'client_notes'>>,
  ) {
    return apiFetch<AuditRequest>(`/api/audit-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async submitAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`/api/audit-requests/${id}/submit`, { method: 'POST' });
  },

  async approveAuditRequest(id: string, consultant_note?: string) {
    return apiFetch<{ audit_request: AuditRequest; audit: { id: string; status: string } }>(
      `/api/audit-requests/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ consultant_note }) },
    );
  },

  async rejectAuditRequest(id: string, consultant_note?: string) {
    return apiFetch<AuditRequest>(`/api/audit-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ consultant_note }),
    });
  },

  async deliverAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`/api/audit-requests/${id}/deliver`, { method: 'POST' });
  },
};
