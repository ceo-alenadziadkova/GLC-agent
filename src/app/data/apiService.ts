import { supabase } from '../lib/supabase';
import type { AuditMeta, AuditState, AuditRequest, NotificationItem } from './auditTypes';
import type { BriefQuestion, BriefResponses } from './briefQuestions';

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
  urgency_rank: number;
}

export interface DashboardSlaRiskItem {
  id: string;
  company_name: string | null;
  company_url: string;
  created_at: string;
  days_open: number;
  priority: DashboardPriority;
  urgency_rank: number;
}

export interface DashboardFailureItem {
  id: string;
  company_name: string | null;
  company_url: string;
  updated_at: string;
  priority: DashboardPriority;
  urgency_rank: number;
}

export interface DashboardPendingRequestItem {
  id: string;
  url: string;
  industry: string | null;
  created_at: string;
  priority: DashboardPriority;
  urgency_rank: number;
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
    generated_at: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function assertIntakePayloadShape(payload: unknown): asserts payload is {
  intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string };
  gates: { canStartSnapshot: boolean; canStartExpress: boolean; canStartFull: boolean };
} {
  const p = payload as Record<string, unknown>;
  const gates = p?.gates as Record<string, unknown> | undefined;
  const intakeProgress = p?.intakeProgress as Record<string, unknown> | undefined;
  if (!gates || !intakeProgress) throw new Error('Invalid API payload: missing intakeProgress/gates');
  if (typeof gates.canStartSnapshot !== 'boolean' || typeof gates.canStartExpress !== 'boolean' || typeof gates.canStartFull !== 'boolean') {
    throw new Error('Invalid API payload: invalid gates shape');
  }
  if (typeof intakeProgress.progressPct !== 'number' || typeof intakeProgress.readinessBadge !== 'string' || typeof intakeProgress.nextBestAction !== 'string') {
    throw new Error('Invalid API payload: invalid intakeProgress shape');
  }
}

function assertPipelineStartShape(payload: unknown): asserts payload is {
  status: string;
  phase: number;
  intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string };
} {
  const p = payload as Record<string, unknown>;
  if (typeof p?.status !== 'string' || typeof p?.phase !== 'number') {
    throw new Error('Invalid API payload: invalid pipeline start shape');
  }
  const intakeProgress = p?.intakeProgress as Record<string, unknown> | undefined;
  if (!intakeProgress) throw new Error('Invalid API payload: missing intakeProgress in pipeline start');
  if (typeof intakeProgress.progressPct !== 'number' || typeof intakeProgress.readinessBadge !== 'string' || typeof intakeProgress.nextBestAction !== 'string') {
    throw new Error('Invalid API payload: invalid intakeProgress in pipeline start');
  }
}

function assertPipelineStatusShape(payload: unknown): asserts payload is {
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  product_mode: string;
  events: Array<{
    id: number;
    audit_id: string;
    phase: number;
    event_type: string;
    message: string | null;
    data: Record<string, unknown>;
    created_at: string;
  }>;
  reviews: Array<{
    after_phase: number;
    status: string;
    consultant_notes: string | null;
    interview_notes: string | null;
  }>;
} {
  const p = payload as Record<string, unknown>;
  if (typeof p?.status !== 'string') {
    throw new Error('Invalid API payload: pipeline status missing status');
  }
  if (typeof p?.current_phase !== 'number') {
    throw new Error('Invalid API payload: pipeline status missing current_phase');
  }
  if (typeof p?.tokens_used !== 'number' || typeof p?.token_budget !== 'number') {
    throw new Error('Invalid API payload: pipeline status missing token fields');
  }
  if (typeof p?.product_mode !== 'string') {
    throw new Error('Invalid API payload: pipeline status missing product_mode');
  }
  if (!Array.isArray(p?.events)) {
    throw new Error('Invalid API payload: pipeline status events must be an array');
  }
  if (!Array.isArray(p?.reviews)) {
    throw new Error('Invalid API payload: pipeline status reviews must be an array');
  }
  for (let i = 0; i < p.events.length; i++) {
    const e = p.events[i] as Record<string, unknown>;
    if (typeof e?.id !== 'number' || typeof e?.audit_id !== 'string' || typeof e?.phase !== 'number') {
      throw new Error(`Invalid API payload: pipeline event[${i}] missing id/audit_id/phase`);
    }
    if (typeof e?.event_type !== 'string' || (e?.message !== null && typeof e?.message !== 'string')) {
      throw new Error(`Invalid API payload: pipeline event[${i}] invalid event_type/message`);
    }
    if (e?.data === null || typeof e?.data !== 'object' || Array.isArray(e.data)) {
      throw new Error(`Invalid API payload: pipeline event[${i}] data must be an object`);
    }
    if (typeof e?.created_at !== 'string') {
      throw new Error(`Invalid API payload: pipeline event[${i}] missing created_at`);
    }
  }
  for (let i = 0; i < p.reviews.length; i++) {
    const r = p.reviews[i] as Record<string, unknown>;
    if (typeof r?.after_phase !== 'number' || typeof r?.status !== 'string') {
      throw new Error(`Invalid API payload: pipeline review[${i}] missing after_phase/status`);
    }
    if (r?.consultant_notes !== null && typeof r?.consultant_notes !== 'string') {
      throw new Error(`Invalid API payload: pipeline review[${i}] invalid consultant_notes`);
    }
    if (r?.interview_notes !== null && typeof r?.interview_notes !== 'string') {
      throw new Error(`Invalid API payload: pipeline review[${i}] invalid interview_notes`);
    }
  }
}

function assertPipelineMutationShape(payload: unknown, label: string): asserts payload is { status: string; phase: number } {
  const p = payload as Record<string, unknown>;
  if (typeof p?.status !== 'string' || typeof p?.phase !== 'number') {
    throw new Error(`Invalid API payload: ${label} missing status/phase`);
  }
}

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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status);
  }

  return response.json();
}

/** Public intake/snapshot calls — no Authorization header. */
async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(error.error ?? `API error: ${response.status}`, response.status);
  }

  return response.json();
}

// ─── API Service ───────────────────────────────────────────

export const api = {
  // Audits CRUD
  async createAudit(
    companyUrl: string,
    companyName?: string,
    industry?: string,
    productMode: 'express' | 'full' = 'full',
    options?: { noPublicWebsite?: boolean }
  ) {
    const body: Record<string, unknown> = {
      company_name: companyName ?? null,
      industry: industry ?? null,
      product_mode: productMode,
    };
    if (options?.noPublicWebsite) {
      body.no_public_website = true;
    } else {
      body.company_url = companyUrl;
    }
    return apiFetch<{ id: string; status: string }>('/api/audits', {
      method: 'POST',
      body: JSON.stringify(body),
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
    const payload = await apiFetch<{ status: string; phase: number; intakeProgress: { progressPct: number; readinessBadge: string; nextBestAction: string } }>(
      `/api/audits/${id}/pipeline/start`,
      { method: 'POST' }
    );
    assertPipelineStartShape(payload);
    return payload;
  },

  async runNextPhase(id: string) {
    const payload = await apiFetch<{ status: string; phase: number }>(`/api/audits/${id}/pipeline/next`, { method: 'POST' });
    assertPipelineMutationShape(payload, 'pipeline next');
    return payload;
  },

  async retryPhase(id: string, phase: number) {
    const payload = await apiFetch<{ status: string; phase: number }>(`/api/audits/${id}/pipeline/retry`, {
      method: 'POST',
      body: JSON.stringify({ phase }),
    });
    assertPipelineMutationShape(payload, 'pipeline retry');
    return payload;
  },

  async getPipelineStatus(id: string) {
    const payload = await apiFetch<{
      status: string;
      current_phase: number;
      tokens_used: number;
      token_budget: number;
      product_mode: string;
      events: Array<{
        id: number;
        audit_id: string;
        phase: number;
        event_type: string;
        message: string | null;
        data: Record<string, unknown>;
        created_at: string;
      }>;
      reviews: Array<{ after_phase: number; status: string; consultant_notes: string | null; interview_notes: string | null }>;
    }>(`/api/audits/${id}/pipeline/status`);
    assertPipelineStatusShape(payload);
    return payload;
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
    const payload = await apiFetch<{
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
    opts?: { collection_mode?: import('../data/auditTypes').IntakeBriefCollectionMode },
  ) {
    const body: Record<string, unknown> = { responses };
    if (opts?.collection_mode) {
      body.collection_mode = opts.collection_mode;
    }
    const payload = await apiFetch<{
      brief: import('../data/auditTypes').IntakeBrief;
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

  // Profile
  async getProfile() {
    return apiFetch<{ id: string; role: string; email: string | null; full_name: string | null }>('/api/profile');
  },

  async patchProfile(params: { full_name?: string | null }) {
    return apiFetch<{ id: string; role: string; email: string | null; full_name: string | null }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  // Audit Requests (client portal)
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

  // Notifications
  async listNotifications(limit = 30, offset = 0, unreadOnly = false) {
    const q = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      unreadOnly: unreadOnly ? 'true' : 'false',
    });
    return apiFetch<{ data: NotificationItem[]; total: number; limit: number; offset: number }>(
      `/api/notifications?${q.toString()}`,
    );
  },

  async getUnreadNotificationCount() {
    return apiFetch<{ unread: number }>('/api/notifications/unread-count');
  },

  async markNotificationRead(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return apiFetch<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' });
  },

  // Pre-brief intake tokens (consultant creates; client uses public GET/respond)
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

  // ── Discovery (Mode C) ──────────────────────────────────────────────────────

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
      created_at: string;
      audit_id: string | null;
    }>(`/api/discover/${encodeURIComponent(token)}`);
  },

  /** Public: attach contact info to a discovery session (called from results page). */
  async saveDiscoveryContact(token: string, contact: {
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }) {
    return publicApiFetch<{ ok: true }>(`/api/discover/${encodeURIComponent(token)}/contact`, {
      method: 'PATCH',
      body: JSON.stringify(contact),
    });
  },

  /** Consultant: list all discovery sessions (most recent first). */
  async listDiscoverySessions() {
    return apiFetch<{
      sessions: Array<{
        session_token:   string;
        maturity_level:  number;
        findings:        unknown[];
        contact_name:    string | null;
        contact_email:   string | null;
        contact_phone:   string | null;
        audit_id:        string | null;
        created_at:      string;
        biz_description: string | null;
        industry:        string | null;
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
