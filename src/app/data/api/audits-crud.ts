import { API_PATHS } from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { AuditMeta, AuditState } from '../auditTypes';

export const auditsCrudApi = {
  async createAudit(
    companyUrl: string,
    companyName?: string,
    industry?: string,
    productMode: 'express' | 'full' = 'full',
    options?: { noPublicWebsite?: boolean },
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
    return apiFetch<{ id: string; status: string }>(API_PATHS.audits, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async listAudits(limit = 50, offset = 0) {
    const res = await apiFetch<{ data: AuditMeta[]; total: number; limit: number; offset: number }>(
      `${API_PATHS.audits}?limit=${limit}&offset=${offset}`,
    );
    return res;
  },

  async getAudit(id: string) {
    return apiFetch<AuditState>(`${API_PATHS.audits}/${id}`);
  },

  async deleteAudit(id: string) {
    return apiFetch<{ deleted: boolean }>(`${API_PATHS.audits}/${id}`, { method: 'DELETE' });
  },

  /** Client: promote completed `free_snapshot` to express/full and seed intake from scraped context (or fresh). */
  async upgradeAuditFromSnapshot(
    id: string,
    body: { target_mode: 'express' | 'full'; use_scraped_context: boolean },
  ) {
    return apiFetch<{
      ok: boolean;
      snapshot_scrape_limited?: boolean;
      snapshot_scrape_robots_blocked?: boolean;
    }>(`${API_PATHS.audits}/${id}/upgrade-from-snapshot`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
