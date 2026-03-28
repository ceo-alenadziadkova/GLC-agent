import { supabase } from '../lib/supabase';
import type { AuditMeta, AuditState, AuditRequest } from './auditTypes';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();

  // 30s timeout — prevents hanging indefinitely if server is unreachable
  const timeoutSignal = AbortSignal.timeout(30_000);
  const signal = options.signal
    ? AbortSignal.any([options.signal as AbortSignal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? `API error: ${response.status}`);
  }

  return response.json();
}

// ─── API Service ───────────────────────────────────────────

export const api = {
  // Audits CRUD
  async createAudit(companyUrl: string, companyName?: string, industry?: string) {
    return apiFetch<{ id: string; status: string }>('/api/audits', {
      method: 'POST',
      body: JSON.stringify({ company_url: companyUrl, company_name: companyName, industry }),
    });
  },

  async listAudits(limit = 50, offset = 0) {
    const res = await apiFetch<{ data: AuditMeta[]; total: number; limit: number; offset: number }>(
      `/api/audits?limit=${limit}&offset=${offset}`
    );
    return res; // { data, total, limit, offset }
  },

  async getAudit(id: string) {
    return apiFetch<AuditState>(`/api/audits/${id}`);
  },

  async deleteAudit(id: string) {
    return apiFetch<{ deleted: boolean }>(`/api/audits/${id}`, { method: 'DELETE' });
  },

  // Pipeline
  async startPipeline(id: string) {
    return apiFetch<{ status: string; phase: number }>(`/api/audits/${id}/pipeline/start`, { method: 'POST' });
  },

  async runNextPhase(id: string) {
    return apiFetch<{ status: string; phase: number }>(`/api/audits/${id}/pipeline/next`, { method: 'POST' });
  },

  async retryPhase(id: string, phase: number) {
    return apiFetch<{ status: string; phase: number }>(`/api/audits/${id}/pipeline/retry`, {
      method: 'POST',
      body: JSON.stringify({ phase }),
    });
  },

  async getPipelineStatus(id: string) {
    return apiFetch<{
      status: string;
      current_phase: number;
      tokens_used: number;
      token_budget: number;
      events: Array<{ id: number; phase: number; event_type: string; message: string; data: Record<string, unknown>; created_at: string }>;
      reviews: Array<{ after_phase: number; status: string; consultant_notes: string | null; interview_notes: string | null }>;
    }>(`/api/audits/${id}/pipeline/status`);
  },

  // Reviews
  async approveReview(id: string, phase: number, consultantNotes?: string, interviewNotes?: string) {
    return apiFetch(`/api/audits/${id}/reviews/${phase}`, {
      method: 'POST',
      body: JSON.stringify({ consultant_notes: consultantNotes, interview_notes: interviewNotes }),
    });
  },

  // Reports
  async getReport(id: string, format: 'markdown' | 'json' = 'json') {
    return apiFetch<{ audit_id: string; company: string; generated_at: string; markdown: string }>(
      `/api/audits/${id}/report?format=${format}`
    );
  },

  // Profile
  async getProfile() {
    return apiFetch<{ id: string; role: string; full_name: string | null; created_at: string }>('/api/profile');
  },

  // Audit Requests (client portal)
  async createAuditRequest(params: {
    url: string;
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
      `/api/audit-requests?limit=${limit}&offset=${offset}`
    );
  },

  async getAuditRequest(id: string) {
    return apiFetch<AuditRequest>(`/api/audit-requests/${id}`);
  },

  async updateAuditRequest(id: string, updates: Partial<Pick<AuditRequest, 'url' | 'industry' | 'product_mode' | 'brief_snapshot' | 'client_notes'>>) {
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
      { method: 'POST', body: JSON.stringify({ consultant_note }) }
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
