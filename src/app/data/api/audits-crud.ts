import { API_PATHS } from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { DomainKey } from '@glc/intake-core';
import type { AuditCoveragePackage, AuditDepth, AuditMeta } from '../audit/contracts/core/audit-meta.types';
import type { AuditState } from '../audit/contracts/state/audit-state.types';

function normalizeAuditState(raw: AuditState): AuditState {
  const reportCoverage = raw.report_coverage;
  if (!reportCoverage) {
    return raw;
  }

  return {
    ...raw,
    report_coverage: {
      covered_domains: Array.isArray(reportCoverage.covered_domains)
        ? reportCoverage.covered_domains
        : [],
      not_covered_domains: Array.isArray(reportCoverage.not_covered_domains)
        ? reportCoverage.not_covered_domains
        : [],
      coverage_ratio:
        typeof reportCoverage.coverage_ratio === 'number'
          ? reportCoverage.coverage_ratio
          : 0,
      coverage_adjusted_score:
        typeof reportCoverage.coverage_adjusted_score === 'number'
          ? reportCoverage.coverage_adjusted_score
          : null,
      comparability_note:
        typeof reportCoverage.comparability_note === 'string'
          ? reportCoverage.comparability_note
          : '',
    },
  };
}

export const auditsCrudApi = {
  async createAudit(
    companyUrl: string,
    companyName?: string,
    industry?: string,
    productMode: 'express' | 'full' = 'full',
    options?: {
      noPublicWebsite?: boolean;
      executionPlan?: {
        selected_domains: DomainKey[];
        depth: AuditDepth;
        source?: 'user_selected' | 'system_default';
        recommended_domains?: DomainKey[];
        coverage_package?: AuditCoveragePackage;
        include_strategy?: boolean;
      };
    },
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
    if (options?.executionPlan) {
      body.execution_plan = options.executionPlan;
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
    const audit = await apiFetch<AuditState>(`${API_PATHS.audits}/${id}`);
    return normalizeAuditState(audit);
  },

  async deleteAudit(id: string) {
    return apiFetch<{ deleted: boolean }>(`${API_PATHS.audits}/${id}`, { method: 'DELETE' });
  },

  /** Client: promote completed `free_snapshot` to starter/pro/complete and seed intake from scraped context (or fresh). */
  async upgradeAuditFromSnapshot(
    id: string,
    body: {
      coverage_package: 'starter' | 'pro' | 'complete';
      use_scraped_context: boolean;
    },
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
