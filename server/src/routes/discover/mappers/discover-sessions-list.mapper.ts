import type { DiscoverySessionListRow } from '../services/discover-session.repository.js';

export type DiscoverSessionListItemDto = {
  session_token: string;
  maturity_level: number;
  findings: unknown;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  audit_id: string | null;
  created_at: string;
  biz_description: string | null;
  industry: string | null;
  consultant_id: string | null;
};

/**
 * Extract display fields from answers JSONB; drop the full answers blob from the API response.
 * PII is visible only when the session is claimed by the current consultant.
 */
export function mapDiscoverySessionListRow(
  row: DiscoverySessionListRow,
  currentConsultantId: string,
): DiscoverSessionListItemDto {
  const ans = (row.answers as Record<string, unknown>) ?? {};
  const industryFromBank = typeof ans.a2 === 'string' ? ans.a2.trim() || null : null;
  const bizFromBank = typeof ans.a1 === 'string' ? ans.a1.trim() || null : null;
  const isOwnedByCurrentConsultant = row.consultant_id === currentConsultantId;
  return {
    session_token: row.session_token,
    maturity_level: row.maturity_level,
    findings: row.findings,
    // Unclaimed sessions remain visible for queue triage, but PII is hidden until claimed.
    contact_name: isOwnedByCurrentConsultant ? row.contact_name : null,
    contact_email: isOwnedByCurrentConsultant ? row.contact_email : null,
    contact_phone: isOwnedByCurrentConsultant ? row.contact_phone : null,
    contact_company: isOwnedByCurrentConsultant ? row.contact_company : null,
    audit_id: row.audit_id,
    created_at: row.created_at,
    biz_description:
      bizFromBank ?? (typeof ans.biz_description === 'string' ? ans.biz_description.trim() || null : null),
    industry: industryFromBank ?? (typeof ans.industry === 'string' ? ans.industry.trim() || null : null),
    consultant_id: row.consultant_id ?? null,
  };
}
