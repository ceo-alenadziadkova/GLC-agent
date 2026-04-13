import {
  apiAuditsQualityGate,
  apiAuditsReportQuery,
  apiAuditsReview,
} from '../../config/api-paths';
import { API_URL, apiFetch, getAuthHeaders } from '../api-http';
import type { QualityGateReport } from '../auditTypes';

export const auditsReviewsReportsApi = {
  async approveReview(id: string, phase: number, consultantNotes?: string, interviewNotes?: string) {
    return apiFetch(apiAuditsReview(id, phase), {
      method: 'POST',
      body: JSON.stringify({ consultant_notes: consultantNotes, interview_notes: interviewNotes }),
    });
  },

  async getQualityGate(id: string, phase: number) {
    return apiFetch<QualityGateReport | null>(apiAuditsQualityGate(id, phase));
  },

  async getReport(
    id: string,
    format: 'markdown' | 'json' = 'json',
    profile: 'full' | 'owner' | 'tech' | 'marketing' | 'onepager' = 'full',
  ) {
    return apiFetch<{
      audit_id: string;
      company: string;
      profile: string;
      profile_label: string;
      generated_at: string;
      coverage: {
        covered_domains: string[];
        not_covered_domains: string[];
        coverage_ratio: number;
        coverage_adjusted_score: number | null;
        comparability_note: string;
      };
      markdown: string;
    }>(
      apiAuditsReportQuery(id, format, profile),
    );
  },

  /** Downloads branded A4 PDF report with auth headers. Triggers browser file save. */
  async downloadReportPdf(auditId: string, profile: 'full' | 'owner' | 'tech' | 'marketing' | 'onepager' = 'full') {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_URL}${apiAuditsReportQuery(auditId, 'pdf', profile)}`, {
      headers: authHeaders,
    });
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
    const res = await fetch(`${API_URL}${apiAuditsReportQuery(auditId, 'csv', profile)}`, {
      headers: authHeaders,
    });
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
};
