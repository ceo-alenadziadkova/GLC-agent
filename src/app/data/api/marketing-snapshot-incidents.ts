import { getClientEnvironmentSummary } from '../../lib/client-environment';
import { API_URL, apiFetch, createTraceparent, getAuthHeaders, publicApiFetch } from '../api-http';

export const marketingSnapshotIncidentsApi = {
  /** After login, attach a public free_snapshot audit to the current user (`audits.client_id`). */
  async claimSnapshot(snapshotToken: string) {
    return apiFetch<{
      ok: boolean;
      audit_id: string;
      already_claimed: boolean;
    }>('/api/snapshot/claim', {
      method: 'POST',
      body: JSON.stringify({ snapshot_token: snapshotToken }),
    });
  },

  /** Public: marketing site short brief (no auth). */
  async submitMarketingBrief(body: {
    name: string;
    company?: string;
    website?: string;
    no_website: boolean;
    concern: string;
    improve: string;
    urgency: string;
    contact_method: string;
    unsure_choice: boolean;
  }) {
    return publicApiFetch<{ id: string; created_at: string; recommended_route: string }>('/api/marketing/brief', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Registered sessions only: best-effort incident report for support (204 response).
   * Returns false if unauthenticated, network fails, or server rejects.
   */
  async reportUiIncident(args: { ref: string; path: string; kind: string; detail?: string }): Promise<boolean> {
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders.Authorization) return false;
      const response = await fetch(`${API_URL}/api/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          traceparent: createTraceparent(),
          'x-operation-id': crypto.randomUUID(),
          ...authHeaders,
        },
        body: JSON.stringify({
          level: 'error',
          source: 'spa_ui_incident',
          message: args.kind,
          context: {
            client_env: getClientEnvironmentSummary(),
            ref: args.ref,
            path: args.path.slice(0, 512),
            detail: args.detail?.slice(0, 800),
          },
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(12_000),
      });
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  },
};
