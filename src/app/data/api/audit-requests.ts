import { GLC_AUDITS_AND_AUDIT_REQUESTS_LIST } from '@glc/route-limits';
import { API_PATHS } from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { AuditRequest } from '../audit/contracts/core/audit-meta.types';

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
    return apiFetch<AuditRequest>(API_PATHS.auditRequests, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /** List audit requests with server-enforced caps (`@glc/route-limits`). */
  async listAuditRequests(
    limit: number = GLC_AUDITS_AND_AUDIT_REQUESTS_LIST.defaultLimit,
    offset: number = 0,
  ) {
    return apiFetch<{ data: AuditRequest[]; total: number; limit: number; offset: number }>(
      `${API_PATHS.auditRequests}?limit=${limit}&offset=${offset}`,
    );
  },

  async getAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`${API_PATHS.auditRequests}/${id}`);
  },

  async updateAuditRequest(
    id: string,
    updates: Partial<Pick<AuditRequest, 'url' | 'industry' | 'product_mode' | 'brief_snapshot' | 'client_notes'>>,
  ) {
    return apiFetch<AuditRequest>(`${API_PATHS.auditRequests}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async submitAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`${API_PATHS.auditRequests}/${id}/submit`, { method: 'POST' });
  },

  async approveAuditRequest(id: string, consultant_note?: string) {
    return apiFetch<{ audit_request: AuditRequest; audit: { id: string; status: string } }>(
      `${API_PATHS.auditRequests}/${id}/approve`,
      { method: 'POST', body: JSON.stringify({ consultant_note }) },
    );
  },

  async rejectAuditRequest(id: string, consultant_note?: string) {
    return apiFetch<AuditRequest>(`${API_PATHS.auditRequests}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ consultant_note }),
    });
  },

  async deliverAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`${API_PATHS.auditRequests}/${id}/deliver`, { method: 'POST' });
  },
};
