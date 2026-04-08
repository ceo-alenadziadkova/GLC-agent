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
    return apiFetch<{ id: string; status: string }>('/api/audits', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async listAudits(limit = 50, offset = 0) {
    const res = await apiFetch<{ data: AuditMeta[]; total: number; limit: number; offset: number }>(
      `/api/audits?limit=${limit}&offset=${offset}`,
    );
    return res;
  },

  async getAudit(id: string) {
    return apiFetch<AuditState>(`/api/audits/${id}`);
  },

  async deleteAudit(id: string) {
    return apiFetch<{ deleted: boolean }>(`/api/audits/${id}`, { method: 'DELETE' });
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
    }>(`/api/audits/${id}/upgrade-from-snapshot`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
