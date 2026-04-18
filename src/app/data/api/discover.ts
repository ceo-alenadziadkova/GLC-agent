import { API_PATHS } from '../../config/api-paths';
import { apiFetch, publicApiFetch } from '../api-http';
import type { IntakeVersionTuple } from '../audit/contracts/intake/intake-brief.types';

/** Response shape for GET /api/discover/ui-fragment (server `PublicDiscoveryUiFragment`). */
export type DiscoveryUiFragmentPayload = {
  version: string;
  policyVersion: string;
  questionBankVersion: string;
  intake_versions?: IntakeVersionTuple;
  questions: Array<{
    id: string;
    question: string;
    hint?: string;
    type: 'free_text' | 'single_choice' | 'multi_choice';
    options?: string[];
    optional?: boolean;
  }>;
};

export type DiscoveryAnalyticsBatchPayload = {
  surface: 'public_discovery';
  client_session_id: string;
  experiment_variant?: 'A' | 'B';
  discovery_session_token?: string;
  intake_versions?: Partial<IntakeVersionTuple>;
  events: Array<{
    event_type:
      | 'question_shown'
      | 'question_answered'
      | 'question_skipped'
      | 'wizard_completed'
      | 'results_viewed';
    question_id?: string;
    step_index?: number;
    client_ts?: string;
  }>;
};

let uiFragmentInFlight: Promise<DiscoveryUiFragmentPayload> | null = null;
let uiFragmentCache: DiscoveryUiFragmentPayload | null = null;

export function resetDiscoverApiUiFragmentCacheForTests(): void {
  uiFragmentInFlight = null;
  uiFragmentCache = null;
}

export const discoverApi = {
  /** Public: save a completed discovery session. Returns a session token. */
  async saveDiscoverySession(data: {
    answers: Record<string, unknown>;
    maturity_level: number;
    findings: unknown[];
  }) {
    return publicApiFetch<{ token: string; created_at: string; contact_edit_key: string }>(API_PATHS.discover, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Public: server-driven Discovery wizard copy and option lists. */
  async getUiFragment() {
    if (uiFragmentCache) return uiFragmentCache;
    if (uiFragmentInFlight) return uiFragmentInFlight;
    uiFragmentInFlight = publicApiFetch<DiscoveryUiFragmentPayload>(API_PATHS.discoverUiFragment)
      .then((payload) => {
        uiFragmentCache = payload;
        return payload;
      })
      .finally(() => {
        uiFragmentInFlight = null;
      });
    return uiFragmentInFlight;
  },

  /** Public: batched funnel analytics (non-blocking for callers). */
  async postAnalyticsEvents(payload: DiscoveryAnalyticsBatchPayload) {
    return publicApiFetch<{ ok: true; received: number }>(API_PATHS.discoverAnalyticsEvents, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Public: load a saved discovery session by token. */
  async getDiscoverySession(token: string) {
    return publicApiFetch<{
      answers: Record<string, unknown>;
      maturity_level: number;
      findings: unknown[];
      created_at: string;
      audit_id: string | null;
    }>(`${API_PATHS.discover}/${encodeURIComponent(token)}`);
  },

  /** Public: attach contact info to a discovery session (called from results page). */
  async saveDiscoveryContact(
    token: string,
    contactEditKey: string,
    contact: {
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
      contact_company?: string;
    },
  ) {
    return publicApiFetch<{ ok: true }>(`${API_PATHS.discover}/${encodeURIComponent(token)}/contact`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...contact,
        contact_edit_key: contactEditKey,
      }),
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
    }>(API_PATHS.discoverSessions);
  },

  /** Consultant: convert a discovery session into a full audit. */
  async convertDiscoverySession(token: string) {
    return apiFetch<{ audit_id: string }>(`${API_PATHS.discover}/${encodeURIComponent(token)}/convert`, {
      method: 'POST',
    });
  },
};
