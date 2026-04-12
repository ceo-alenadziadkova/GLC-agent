import { LOG_INCIDENT_POST_TIMEOUT_MS } from '../../config/http-client-defaults';
import { API_PATHS } from '../../config/api-paths';
import { getClientEnvironmentSummary } from '../../lib/client-environment';
import { apiFetch, apiPostAck, getAuthHeaders, publicApiFetch } from '../api-http';

export const marketingSnapshotIncidentsApi = {
  /** After login, attach a public free_snapshot audit to the current user (`audits.client_id`). */
  async claimSnapshot(snapshotToken: string) {
    return apiFetch<{
      ok: boolean;
      audit_id: string;
      already_claimed: boolean;
    }>(API_PATHS.snapshotClaim, {
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
    /** Omitted or empty from the public brief form; column still stored server-side. */
    urgency?: string;
    contact_method: string;
    unsure_choice: boolean;
    /** Required when `!unsure_choice && !no_website`. */
    preferred_audit_depth?: 'express' | 'full';
  }) {
    return publicApiFetch<{ id: string; created_at: string; recommended_route: string }>(API_PATHS.marketingBrief, {
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
      await apiPostAck(
        API_PATHS.log,
        {
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
        },
        { clientTimeoutMs: LOG_INCIDENT_POST_TIMEOUT_MS },
      );
      return true;
    } catch {
      return false;
    }
  },
};
