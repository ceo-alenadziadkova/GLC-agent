import { supabase } from '../lib/supabase';
import type { AuditMeta, AuditState, AuditRequest } from './auditTypes';

// ─── Dashboard types ──────────────────────────────────────────────────────────

export type DashboardPriority = 'high' | 'medium' | 'low';

export interface DashboardKpis {
  total_audits: number;
  active_audits: number;
  avg_score: number | null;
  awaiting_review: number;
}

export interface DashboardReviewGateItem {
  id: string;
  company_name: string | null;
  company_url: string;
  status: string;
  updated_at: string;
  priority: DashboardPriority;
}

export interface DashboardSlaRiskItem {
  id: string;
  company_name: string | null;
  company_url: string;
  created_at: string;
  days_open: number;
  priority: DashboardPriority;
}

export interface DashboardFailureItem {
  id: string;
  company_name: string | null;
  company_url: string;
  updated_at: string;
  priority: DashboardPriority;
}

export interface DashboardPendingRequestItem {
  id: string;
  url: string;
  industry: string | null;
  created_at: string;
  priority: DashboardPriority;
}

export interface DashboardActionItems {
  review_gates: DashboardReviewGateItem[];
  sla_risks: DashboardSlaRiskItem[];
  recent_failures: DashboardFailureItem[];
  pending_requests: DashboardPendingRequestItem[];
}

export interface DashboardActivityEvent {
  id: number;
  audit_id: string;
  phase: number;
  event_type: string;
  message: string | null;
  created_at: string;
  company_name: string | null;
  company_url: string;
}

export interface DashboardScoreDistribution {
  band_1: number;  // 1.0–1.9
  band_2: number;  // 2.0–2.9
  band_3: number;  // 3.0–3.9
  band_4: number;  // 4.0–5.0
  total_scored: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  action_items: DashboardActionItems;
  activity_feed: DashboardActivityEvent[];
  score_distribution: DashboardScoreDistribution;
  meta: {
    degraded_sections: Array<'kpis' | 'action_items' | 'activity_feed' | 'score_distribution'>;
  };
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function createTraceparent(): string {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  return `00-${traceId}-${spanId}-01`;
}

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
      traceparent: createTraceparent(),
      'x-operation-id': crypto.randomUUID(),
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
  async createAudit(companyUrl: string, companyName?: string, industry?: string, productMode: 'express' | 'full' = 'full') {
    return apiFetch<{ id: string; status: string }>('/api/audits', {
      method: 'POST',
      body: JSON.stringify({ company_url: companyUrl, company_name: companyName, industry, product_mode: productMode }),
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

  async getQualityGate(id: string, phase: number) {
    return apiFetch<import('./auditTypes').QualityGateReport | null>(`/api/audits/${id}/quality-gate/${phase}`);
  },

  // Reports
  async getReport(id: string, format: 'markdown' | 'json' = 'json', profile: 'full' | 'owner' | 'tech' | 'marketing' | 'onepager' = 'full') {
    return apiFetch<{ audit_id: string; company: string; profile: string; profile_label: string; generated_at: string; markdown: string }>(
      `/api/audits/${id}/report?format=${format}&profile=${profile}`
    );
  },

  /** Downloads branded A4 PDF report with auth headers. Triggers browser file save. */
  async downloadReportPdf(auditId: string, profile: 'full' | 'owner' | 'tech' | 'marketing' | 'onepager' = 'full') {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(
      `${API_URL}/api/audits/${auditId}/report?format=pdf&profile=${profile}`,
      { headers: authHeaders }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? `API error: ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${auditId}-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Downloads action-plan CSV with auth headers. Triggers browser file save. */
  async downloadReportCsv(auditId: string, profile: 'full' | 'owner' | 'tech' | 'marketing' | 'onepager' = 'full') {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(
      `${API_URL}/api/audits/${auditId}/report?format=csv&profile=${profile}`,
      { headers: authHeaders }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? `API error: ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${auditId}-action-plan.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Intake Brief
  async getBrief(auditId: string) {
    return apiFetch<{
      brief: import('../data/auditTypes').IntakeBrief | null;
      questions: import('../data/briefQuestions').BriefQuestion[];
      validation: {
        passed: boolean;
        sla_met: boolean;
        answered_required: number;
        total_required: number;
        answered_recommended: number;
        total_recommended: number;
        missing_required: Array<{ id: string; question: string }>;
      };
    }>(`/api/audits/${auditId}/brief`);
  },

  async saveBrief(auditId: string, responses: Record<string, unknown>) {
    return apiFetch<{
      brief: import('../data/auditTypes').IntakeBrief;
      validation: { passed: boolean; sla_met: boolean; answered_required: number; total_required: number };
    }>(`/api/audits/${auditId}/brief`, {
      method: 'PUT',
      body: JSON.stringify({ responses }),
    });
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

  // Analytics
  async getDashboard() {
    return apiFetch<DashboardData>('/api/analytics/dashboard');
  },
};
